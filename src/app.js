const path = require('node:path');
const express = require('express');
const { HttpError } = require('./errors');
const { todayISO } = require('./dates');
const { SEED, loadSeed } = require('./seed');
const { oddieSystemPrompt, INTAKE_SYSTEM, INTAKE_SCHEMA } = require('./prompts');
const { buildToday, readStep } = require('./today');
const store = require('./store');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_CHAT_CHARS = 2000;
const MAX_INTAKE_CHARS = 20000;

// The app has no accounts, so anyone with the URL can spend model and search
// credits. This caps each IP at AI_LIMIT calls per AI_WINDOW_MS.
const AI_LIMIT = 40;
const AI_WINDOW_MS = 10 * 60 * 1000;

function createAiLimiter() {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((at) => now - at < AI_WINDOW_MS);
    if (recent.length >= AI_LIMIT) {
      throw new HttpError(429, 'rate_limited', 'Too many requests. Wait a few minutes and try again.');
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}

function requireText(value, field, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new HttpError(400, 'invalid_input', `${field} is required`);
  if (text.length > max) throw new HttpError(400, 'invalid_input', `${field} is too long (max ${max} characters)`);
  return text;
}

// Builds the Express app. Everything it talks to is passed in, so tests can
// hand it an in-memory database and fake Gemini and Nimble clients.
function createApp({ db, gemini, nimble }) {
  const app = express();
  const limitAi = createAiLimiter();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '200kb' }));

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  // Settings the browser needs. A Sentry DSN is safe to show: it can only send events.
  app.get('/config.js', (req, res) => {
    const config = {
      sentryDsn: process.env.SENTRY_DSN || '',
      environment: process.env.FLY_APP_NAME ? 'production' : 'development',
    };
    res.type('application/javascript').set('Cache-Control', 'no-store');
    res.send(`window.ODDIES_CONFIG = ${JSON.stringify(config).replace(/</g, '\\u003c')};`);
  });

  const state = () => {
    const current = store.getState(db, todayISO());
    return {
      ...current,
      is_demo: Boolean(current.self) && current.self.name === SEED.self.name && current.self.summary === SEED.self.summary,
      services: { gemini: Boolean(gemini && gemini.configured), nimble: Boolean(nimble && nimble.configured) },
    };
  };

  app.get('/api/state', (req, res) => res.json(state()));

  // ---------- Intake ----------

  // Turns pasted text into 4 to 6 draft oddies. Nothing is saved here.
  app.post('/api/intake', limitAi, async (req, res) => {
    const text = requireText(req.body && req.body.text, 'text', MAX_INTAKE_CHARS);
    const { data } = await gemini.generateJson({
      task: 'intake',
      system: INTAKE_SYSTEM,
      contents: `Here is what the person pasted:\n\n${text}`,
      schema: INTAKE_SCHEMA,
    });

    const drafts = [];
    for (const [index, draft] of (Array.isArray(data.oddies) ? data.oddies : []).entries()) {
      try {
        const clean = store.cleanOddie(draft || {}, index);
        drafts.push({ ...clean, milestones: clean.milestones.map((m) => m.title) });
      } catch {
        // skip a draft the model left incomplete
      }
    }
    if (drafts.length < 4) {
      throw new HttpError(502, 'intake_too_few', 'The model returned too few usable lives. Try again, or add more detail.');
    }

    const self = data.self || {};
    res.json({
      self: {
        name: String(self.name || 'You').trim().slice(0, 80),
        city: String(self.city || 'Unknown').trim().slice(0, 80),
        summary: String(self.summary || '').trim().slice(0, 2000),
      },
      oddies: drafts.slice(0, 6),
    });
  });

  // ---------- Oddies ----------

  // Saves the reviewed drafts and replaces the current set.
  app.post('/api/oddies', (req, res) => {
    const body = req.body || {};
    store.replaceOddies(db, { self: body.self, oddies: body.oddies, today: todayISO() });
    res.json(state());
  });

  // Adds one path to the current set.
  app.post('/api/oddies/add', (req, res) => {
    res.status(201).json({ oddie: store.addOddie(db, req.body || {}) });
  });

  app.patch('/api/oddies/:id', (req, res) => {
    res.json({ oddie: store.updateOddie(db, req.params.id, req.body || {}) });
  });

  app.delete('/api/oddies/:id', (req, res) => {
    store.deleteOddie(db, req.params.id);
    res.json({ ok: true });
  });

  // ---------- Chat ----------

  app.get('/api/oddies/:id/chat', (req, res) => {
    const oddie = store.getOddie(db, req.params.id);
    res.json({ messages: store.chatHistory(db, oddie.id) });
  });

  app.post('/api/oddies/:id/chat', limitAi, async (req, res) => {
    const oddie = store.getOddie(db, req.params.id);
    const text = requireText(req.body && req.body.text, 'text', MAX_CHAT_CHARS);

    const system = oddieSystemPrompt({
      self: store.getSelf(db),
      oddie,
      progress: store.progressFor(db, oddie.id),
      today: todayISO(),
    });
    const contents = [
      ...store.chatHistory(db, oddie.id).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text }] },
    ];

    const { text: reply } = await gemini.generate({
      task: 'chat',
      system,
      contents,
      attributes: { 'oddies.oddie_id': oddie.id },
    });
    if (!reply.trim()) throw new HttpError(502, 'gemini_failed', 'The oddie had nothing to say. Try again.');

    const messages = store.addExchange(db, oddie.id, text, reply.trim());
    res.json({ reply: messages[1].text, messages });
  });

  // ---------- Today ----------

  app.post('/api/today', limitAi, async (req, res) => {
    const body = req.body || {};
    if (!Number.isInteger(body.oddie_id)) throw new HttpError(400, 'invalid_input', 'oddie_id is required');
    const result = await buildToday({
      db,
      gemini,
      nimble,
      oddieId: body.oddie_id,
      date: todayISO(),
      refresh: body.refresh === true,
    });
    res.json(result);
  });

  // Researches a branch's next milestone without making it today's pick.
  app.post('/api/research', limitAi, async (req, res) => {
    const body = req.body || {};
    if (!Number.isInteger(body.oddie_id)) throw new HttpError(400, 'invalid_input', 'oddie_id is required');
    const result = await buildToday({
      db,
      gemini,
      nimble,
      oddieId: body.oddie_id,
      date: todayISO(),
      refresh: true,
      setPick: false,
    });
    res.json(result);
  });

  app.patch('/api/steps/:id', (req, res) => {
    const done = req.body ? req.body.done : undefined;
    if (done !== undefined && typeof done !== 'boolean') throw new HttpError(400, 'invalid_input', 'done must be true or false');
    res.json(store.setStepDone(db, req.params.id, done));
  });

  // Loads a step's page as text (Nimble Extract) so it can be read in the app.
  app.post('/api/steps/:id/read', limitAi, async (req, res) => {
    res.json(await readStep({ db, nimble, stepId: req.params.id }));
  });

  // ---------- Demo ----------

  // Wipes the database and reloads the demo profile.
  app.post('/api/demo/reset', (req, res) => {
    loadSeed(db);
    res.json(state());
  });

  app.use('/api', (req, res) => {
    throw new HttpError(404, 'not_found', `No route for ${req.method} ${req.originalUrl}`);
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use((req, res) => {
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    if (!req.originalUrl.startsWith('/api')) return res.status(status).send('Something went wrong.');
    res.status(status).json({
      error: err.code || (status === 400 ? 'invalid_input' : 'server_error'),
      message: status >= 500 && !(err instanceof HttpError) ? 'Something went wrong on the server.' : err.message,
      ...(err.extra || {}),
    });
  });

  return app;
}

module.exports = { createApp };
