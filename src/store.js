// All reads and writes to SQLite live here. Every function takes the db first.
const { HttpError } = require('./errors');

const STEP_TYPES = ['read', 'attend', 'apply', 'contact', 'practice'];
const STATUSES = ['active', 'dormant'];
const MAX_ODDIES = 8;
const MAX_MILESTONES = 8;
// A milestone lights up once this many of its steps are done.
const STEPS_TO_REACH = 2;

function toOddie(row) {
  return { ...row, interests: JSON.parse(row.interests) };
}

function toMilestone(row) {
  return { ...row, reached: Boolean(row.reached) };
}

function toStep(row) {
  return { ...row, done: Boolean(row.done) };
}

function text(value, field, max, { required = true } = {}) {
  const clean = typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (required && !clean) throw new HttpError(400, 'invalid_input', `${field} is required`);
  return clean;
}

function interestList(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list
    .map((item) => String(item).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 8);
}

function horizon(value) {
  const years = Math.round(Number(value));
  return Number.isFinite(years) ? Math.min(Math.max(years, 1), 60) : 10;
}

// Turns a draft from the intake page (or the seed) into rows we can save.
function cleanOddie(input, index) {
  const milestones = (Array.isArray(input.milestones) ? input.milestones : [])
    .map((m) => (typeof m === 'string' ? { title: m, reached: false } : m))
    .map((m) => ({ title: text(m && m.title, 'milestone title', 120, { required: false }), reached: Boolean(m && m.reached) }))
    .filter((m) => m.title)
    .slice(0, MAX_MILESTONES);
  if (!milestones.length) throw new HttpError(400, 'invalid_input', `oddie ${index + 1} needs at least one milestone`);
  return {
    name: text(input.name, 'name', 80),
    life: text(input.life, 'life', 240),
    interests: interestList(input.interests),
    persona_brief: text(input.persona_brief, 'persona_brief', 2000, { required: false }),
    horizon_years: horizon(input.horizon_years),
    status: STATUSES.includes(input.status) ? input.status : 'active',
    milestones,
  };
}

function getSelf(db) {
  return db.prepare('SELECT name, city, summary, now_date FROM self WHERE id = 1').get() || null;
}

function setSelf(db, self, today) {
  db.prepare(
    `INSERT INTO self (id, name, city, summary, now_date) VALUES (1, @name, @city, @summary, @now_date)
     ON CONFLICT(id) DO UPDATE SET name = @name, city = @city, summary = @summary, now_date = @now_date`
  ).run({
    name: text(self.name, 'self.name', 80),
    city: text(self.city, 'self.city', 80),
    summary: text(self.summary, 'self.summary', 2000),
    now_date: today,
  });
}

function listOddies(db) {
  const oddies = db.prepare('SELECT * FROM oddie ORDER BY branch_order, id').all().map(toOddie);
  const milestones = db.prepare('SELECT * FROM milestone ORDER BY oddie_id, position').all().map(toMilestone);
  for (const oddie of oddies) oddie.milestones = milestones.filter((m) => m.oddie_id === oddie.id);
  return oddies;
}

function getOddie(db, id) {
  const row = db.prepare('SELECT * FROM oddie WHERE id = ?').get(Number(id));
  if (!row) throw new HttpError(404, 'oddie_not_found', 'No oddie with that id');
  const oddie = toOddie(row);
  oddie.milestones = db
    .prepare('SELECT * FROM milestone WHERE oddie_id = ? ORDER BY position')
    .all(oddie.id)
    .map(toMilestone);
  return oddie;
}

// Replaces the whole set of oddies. Old steps, picks and chats go with them.
// Returns the new oddie ids in branch order.
function replaceOddies(db, { self, oddies, today }) {
  if (!Array.isArray(oddies) || !oddies.length) throw new HttpError(400, 'invalid_input', 'Send at least one oddie');
  if (oddies.length > MAX_ODDIES) throw new HttpError(400, 'invalid_input', `Send at most ${MAX_ODDIES} oddies`);
  const clean = oddies.map(cleanOddie);
  if (!self && !getSelf(db)) throw new HttpError(400, 'invalid_input', 'self is required the first time');

  const insertOddie = db.prepare(
    `INSERT INTO oddie (name, life, interests, persona_brief, horizon_years, status, branch_order)
     VALUES (@name, @life, @interests, @persona_brief, @horizon_years, @status, @branch_order)`
  );
  const insertMilestone = db.prepare(
    'INSERT INTO milestone (oddie_id, position, title, reached) VALUES (?, ?, ?, ?)'
  );

  return db.transaction(() => {
    db.prepare('DELETE FROM oddie').run(); // cascades to milestones, steps, picks, chats
    if (self) setSelf(db, self, today);
    return clean.map((oddie, order) => {
      const { lastInsertRowid } = insertOddie.run({
        ...oddie,
        interests: JSON.stringify(oddie.interests),
        milestones: undefined,
        branch_order: order,
      });
      oddie.milestones.forEach((m, position) => {
        insertMilestone.run(lastInsertRowid, position, m.title, m.reached ? 1 : 0);
      });
      return Number(lastInsertRowid);
    });
  })();
}

function updateOddie(db, id, patch) {
  const current = getOddie(db, id);
  const next = {
    id: current.id,
    name: 'name' in patch ? text(patch.name, 'name', 80) : current.name,
    life: 'life' in patch ? text(patch.life, 'life', 240) : current.life,
    interests: JSON.stringify('interests' in patch ? interestList(patch.interests) : current.interests),
    persona_brief:
      'persona_brief' in patch ? text(patch.persona_brief, 'persona_brief', 2000, { required: false }) : current.persona_brief,
    horizon_years: 'horizon_years' in patch ? horizon(patch.horizon_years) : current.horizon_years,
    status: current.status,
    branch_order: current.branch_order,
  };
  if ('status' in patch) {
    if (!STATUSES.includes(patch.status)) throw new HttpError(400, 'invalid_input', 'status must be active or dormant');
    next.status = patch.status;
  }
  if ('branch_order' in patch) {
    if (!Number.isInteger(patch.branch_order)) throw new HttpError(400, 'invalid_input', 'branch_order must be a whole number');
    next.branch_order = patch.branch_order;
  }
  db.prepare(
    `UPDATE oddie SET name = @name, life = @life, interests = @interests, persona_brief = @persona_brief,
     horizon_years = @horizon_years, status = @status, branch_order = @branch_order WHERE id = @id`
  ).run(next);
  return getOddie(db, id);
}

function deleteOddie(db, id) {
  const oddie = getOddie(db, id);
  db.prepare('DELETE FROM oddie WHERE id = ?').run(oddie.id);
}

// The first milestone on a branch that is not reached yet, or null if all are.
function nextMilestone(db, oddieId) {
  const row = db
    .prepare('SELECT * FROM milestone WHERE oddie_id = ? AND reached = 0 ORDER BY position LIMIT 1')
    .get(oddieId);
  return row ? toMilestone(row) : null;
}

function setPick(db, date, oddieId) {
  db.prepare(
    'INSERT INTO day_pick (date, oddie_id) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET oddie_id = excluded.oddie_id'
  ).run(date, oddieId);
  return { date, oddie_id: oddieId };
}

function getPick(db, date) {
  return db.prepare('SELECT date, oddie_id FROM day_pick WHERE date = ?').get(date) || null;
}

// The most recent picks, oldest first.
function listPicks(db, limit = 30) {
  return db
    .prepare(
      `SELECT p.date, p.oddie_id, o.name AS oddie_name FROM day_pick p
       JOIN oddie o ON o.id = p.oddie_id ORDER BY p.date DESC LIMIT ?`
    )
    .all(limit)
    .reverse();
}

function stepsFor(db, oddieId, date) {
  return db
    .prepare('SELECT * FROM step WHERE oddie_id = ? AND found_on = ? ORDER BY id')
    .all(oddieId, date)
    .map(toStep);
}

// Swaps in a fresh set of steps for one branch on one day. Steps the user
// already finished that day are kept.
function replaceSteps(db, { oddieId, milestoneId, date, steps }) {
  const insert = db.prepare(
    `INSERT INTO step (oddie_id, milestone_id, type, title, url, source, found_on, done)
     VALUES (@oddie_id, @milestone_id, @type, @title, @url, @source, @found_on, 0)`
  );
  db.transaction(() => {
    db.prepare('DELETE FROM step WHERE oddie_id = ? AND found_on = ? AND done = 0').run(oddieId, date);
    const kept = new Set(stepsFor(db, oddieId, date).map((s) => s.url));
    for (const step of steps) {
      if (kept.has(step.url)) continue;
      kept.add(step.url);
      insert.run({
        oddie_id: oddieId,
        milestone_id: milestoneId,
        type: STEP_TYPES.includes(step.type) ? step.type : 'read',
        title: step.title,
        url: step.url,
        source: step.source || '',
        found_on: date,
      });
    }
  })();
  return stepsFor(db, oddieId, date);
}

// Sets a step done or not done (flips it when `done` is left out), then
// updates its milestone: reached when STEPS_TO_REACH of its steps are done.
function setStepDone(db, id, done) {
  const row = db.prepare('SELECT * FROM step WHERE id = ?').get(Number(id));
  if (!row) throw new HttpError(404, 'step_not_found', 'No step with that id');
  const next = typeof done === 'boolean' ? done : !row.done;

  return db.transaction(() => {
    db.prepare('UPDATE step SET done = ? WHERE id = ?').run(next ? 1 : 0, row.id);
    let milestone = null;
    if (row.milestone_id) {
      const { count } = db
        .prepare('SELECT COUNT(*) AS count FROM step WHERE milestone_id = ? AND done = 1')
        .get(row.milestone_id);
      db.prepare('UPDATE milestone SET reached = ? WHERE id = ?').run(count >= STEPS_TO_REACH ? 1 : 0, row.milestone_id);
      milestone = toMilestone(db.prepare('SELECT * FROM milestone WHERE id = ?').get(row.milestone_id));
    }
    return { step: toStep({ ...row, done: next ? 1 : 0 }), milestone };
  })();
}

// What the user has really done on a branch. Goes into the oddie's system prompt.
function progressFor(db, oddieId) {
  const milestones = db
    .prepare('SELECT * FROM milestone WHERE oddie_id = ? ORDER BY position')
    .all(oddieId)
    .map(toMilestone);
  const stepsDone = db
    .prepare('SELECT type, title, found_on FROM step WHERE oddie_id = ? AND done = 1 ORDER BY id')
    .all(oddieId);
  const daysPicked = db.prepare('SELECT COUNT(*) AS count FROM day_pick WHERE oddie_id = ?').get(oddieId).count;
  return { milestones, stepsDone, daysPicked };
}

function chatHistory(db, oddieId, limit = 40) {
  return db
    .prepare('SELECT * FROM chat_message WHERE oddie_id = ? ORDER BY id DESC LIMIT ?')
    .all(oddieId, limit)
    .reverse();
}

// Saves one user message and the oddie's reply together, so a failed model
// call never leaves a question hanging in the history.
function addExchange(db, oddieId, userText, replyText) {
  const insert = db.prepare('INSERT INTO chat_message (oddie_id, role, text, created_at) VALUES (?, ?, ?, ?)');
  return db.transaction(() => {
    const at = new Date().toISOString();
    const user = insert.run(oddieId, 'user', userText, at).lastInsertRowid;
    const reply = insert.run(oddieId, 'oddie', replyText, at).lastInsertRowid;
    return db.prepare('SELECT * FROM chat_message WHERE id IN (?, ?) ORDER BY id').all(user, reply);
  })();
}

// Everything the tree page needs in one read.
function getState(db, today) {
  db.prepare('UPDATE self SET now_date = ? WHERE id = 1 AND now_date <> ?').run(today, today);
  const pick = getPick(db, today);
  return {
    self: getSelf(db),
    today,
    oddies: listOddies(db),
    today_pick: pick,
    today_steps: pick ? stepsFor(db, pick.oddie_id, today) : [],
    history: listPicks(db),
  };
}

module.exports = {
  STEP_TYPES,
  STEPS_TO_REACH,
  getSelf,
  setSelf,
  listOddies,
  getOddie,
  replaceOddies,
  updateOddie,
  deleteOddie,
  nextMilestone,
  setPick,
  getPick,
  listPicks,
  stepsFor,
  replaceSteps,
  setStepDone,
  progressFor,
  chatHistory,
  addExchange,
  getState,
};
