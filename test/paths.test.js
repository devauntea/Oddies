const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { HttpError } = require('../src/errors');

const DRAFT = (n) => ({
  name: `Sam the Role ${n}`,
  life: `Does job ${n} in city ${n}.`,
  interests: [`interest ${n}a`, `interest ${n}b`, `interest ${n}c`],
  persona_brief: `You did thing ${n} and gave up thing ${n}.`,
  horizon_years: 10 + n,
  milestones: [`Start ${n}`, `Continue ${n}`, `Keep going ${n}`, `Arrive ${n}`],
});

function fakeGemini(data) {
  const calls = [];
  return {
    calls,
    configured: true,
    async generateJson(options) {
      calls.push(options);
      if (data instanceof Error) throw data;
      return { data };
    },
  };
}

test('intake returns drafts and saves nothing', async (t) => {
  const gemini = fakeGemini({
    self: { name: 'Sam', city: 'Chicago, IL', summary: 'Sam is a teacher.' },
    oddies: [1, 2, 3, 4, 5].map(DRAFT),
  });
  const app = await startApp({ gemini });
  t.after(app.close);

  const res = await app.call('POST', '/api/intake', { text: 'I think about five lives.' });
  assert.equal(res.status, 200);
  assert.equal(res.json.self.city, 'Chicago, IL');
  assert.equal(res.json.oddies.length, 5);
  assert.deepEqual(res.json.oddies[0].milestones, ['Start 1', 'Continue 1', 'Keep going 1', 'Arrive 1']);

  assert.equal(gemini.calls[0].task, 'intake');
  assert.match(gemini.calls[0].contents, /I think about five lives\./);
  assert.equal(gemini.calls[0].schema.properties.oddies.minItems, 4);
  assert.equal(gemini.calls[0].schema.properties.oddies.maxItems, 6);
  assert.match(gemini.calls[0].system, /No interest may appear on more than one oddie/);
  assert.match(gemini.calls[0].system, /different city or setting/);
  assert.match(gemini.calls[0].system, /gives up a different thing/);

  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.self.name, 'June Alvarado', 'the saved tree is untouched');
});

test('intake caps at 6 drafts and fails under 4', async (t) => {
  const many = await startApp({ gemini: fakeGemini({ self: {}, oddies: [1, 2, 3, 4, 5, 6, 7, 8].map(DRAFT) }) });
  t.after(many.close);
  const capped = await many.call('POST', '/api/intake', { text: 'lots' });
  assert.equal(capped.json.oddies.length, 6);
  assert.equal(capped.json.self.name, 'You', 'missing self fields get plain defaults');

  const few = await startApp({ gemini: fakeGemini({ self: {}, oddies: [DRAFT(1), { name: 'broken' }, DRAFT(2)] }) });
  t.after(few.close);
  const res = await few.call('POST', '/api/intake', { text: 'few' });
  assert.equal(res.status, 502);
  assert.equal(res.json.error, 'intake_too_few');

  assert.equal((await few.call('POST', '/api/intake', { text: '' })).status, 400);
});

test('intake reports a model failure', async (t) => {
  const app = await startApp({ gemini: fakeGemini(new HttpError(502, 'gemini_failed', 'The model did not answer.')) });
  t.after(app.close);
  const res = await app.call('POST', '/api/intake', { text: 'hello' });
  assert.equal(res.status, 502);
  assert.equal(res.json.error, 'gemini_failed');
});

test('POST /api/oddies replaces the whole set', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await app.call('POST', '/api/oddies', {
    self: { name: 'Sam', city: 'Chicago, IL', summary: 'Sam is a teacher.' },
    oddies: [1, 2, 3, 4].map(DRAFT),
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.self.name, 'Sam');
  assert.equal(res.json.is_demo, false);
  assert.deepEqual(res.json.oddies.map((o) => o.name), ['Sam the Role 1', 'Sam the Role 2', 'Sam the Role 3', 'Sam the Role 4']);
  assert.ok(res.json.oddies.every((o) => o.milestones.every((m) => !m.reached)));
  assert.deepEqual(res.json.history, [], 'old picks are gone');

  assert.equal((await app.call('POST', '/api/oddies', { oddies: [] })).status, 400);
  assert.equal((await app.call('POST', '/api/oddies', { oddies: [{ name: 'No life' }] })).status, 400);
});

test('a path can be edited, and milestones keep progress by position', async (t) => {
  const app = await startApp();
  t.after(app.close);

  // Oddie 1 starts with 5 milestones, the first 2 reached.
  const res = await app.call('PATCH', '/api/oddies/1', {
    name: 'June the Type Designer',
    life: 'Draws typefaces in Berlin.',
    interests: ['type design', 'letterpress'],
    persona_brief: 'You moved to Berlin.',
    horizon_years: 9,
    milestones: ['Draw one alphabet', 'Release a free font', 'Sell a retail typeface'],
  });
  assert.equal(res.status, 200);
  const oddie = res.json.oddie;
  assert.equal(oddie.name, 'June the Type Designer');
  assert.equal(oddie.horizon_years, 9);
  assert.deepEqual(oddie.milestones.map((m) => [m.title, m.reached]), [
    ['Draw one alphabet', true],
    ['Release a free font', true],
    ['Sell a retail typeface', false],
  ]);

  const longer = await app.call('PATCH', '/api/oddies/1', {
    milestones: ['Draw one alphabet', 'Release a free font', 'Sell a retail typeface', 'Open a foundry'],
  });
  assert.equal(longer.json.oddie.milestones.length, 4);
  assert.equal(longer.json.oddie.milestones[3].reached, false);

  assert.equal((await app.call('PATCH', '/api/oddies/1', { milestones: [] })).status, 400);
});

test('a path can be added, up to the limit', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const added = await app.call('POST', '/api/oddies/add', DRAFT(9));
  assert.equal(added.status, 201);
  assert.equal(added.json.oddie.branch_order, 5, 'goes at the bottom of the tree');
  assert.equal(added.json.oddie.milestones.length, 4);

  await app.call('POST', '/api/oddies/add', DRAFT(10));
  await app.call('POST', '/api/oddies/add', DRAFT(11));
  const full = await app.call('POST', '/api/oddies/add', DRAFT(12));
  assert.equal(full.status, 400, 'the tree holds 8 paths');
  assert.equal((await app.call('GET', '/api/state')).json.oddies.length, 8);
});

test('demo reset wipes everything and reloads the seed', async (t) => {
  const app = await startApp();
  t.after(app.close);

  await app.call('POST', '/api/oddies', { self: { name: 'Sam', city: 'Chicago, IL', summary: 'Teacher.' }, oddies: [DRAFT(1)] });
  const reset = await app.call('POST', '/api/demo/reset');
  assert.equal(reset.status, 200);
  assert.equal(reset.json.is_demo, true);
  assert.deepEqual(reset.json.oddies.map((o) => o.name), [
    'June the Graphic Designer',
    'June the FBI Agent',
    'June the Buddhist Monk',
    'June the Painter',
    'June the Entrepreneur',
  ]);
  assert.equal(reset.json.oddies[0].id, 1, 'ids restart');
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 0);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM chat_message').get().n, 0);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM source').get().n, 0);
});

test('config.js exposes only the Sentry DSN and environment', async (t) => {
  const app = await startApp();
  t.after(app.close);
  const res = await app.call('GET', '/config.js');
  assert.equal(res.status, 200);
  assert.match(res.text, /^window\.ODDIES_CONFIG = \{"sentryDsn":"[^"]*","environment":"[a-z]+"\};$/);
});
