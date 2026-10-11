const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayISO } = require('../src/dates');

test('GET /api/state returns the seeded tree', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const { status, json } = await app.call('GET', '/api/state');
  assert.equal(status, 200);
  assert.equal(json.self.name, 'June Alvarado');
  assert.equal(json.self.city, 'New York, NY');
  assert.equal(json.self.now_date, todayISO());
  assert.equal(json.is_demo, true);
  assert.equal(json.oddies.length, 5);
  assert.deepEqual(json.oddies.map((o) => o.branch_order), [0, 1, 2, 3, 4]);

  for (const oddie of json.oddies) {
    assert.ok(Array.isArray(oddie.interests) && oddie.interests.length >= 3, `${oddie.name} has interests`);
    assert.ok(oddie.milestones.length >= 4 && oddie.milestones.length <= 6, `${oddie.name} has 4 to 6 milestones`);
    assert.equal(oddie.status, 'active');
  }

  const reached = json.oddies.flatMap((o) => o.milestones).filter((m) => m.reached).length;
  assert.equal(reached, 7, 'a few milestones start out reached');

  // No two oddies share an interest.
  const interests = json.oddies.flatMap((o) => o.interests);
  assert.equal(new Set(interests).size, interests.length);
});

test('the seed has no steps and no pick for today', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const { json } = await app.call('GET', '/api/state');
  assert.equal(json.today_pick, null);
  assert.deepEqual(json.today_steps, []);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 0);
  assert.equal(json.history.length, 4);
  assert.ok(json.history.every((pick) => pick.date < todayISO()));
});

test('pages and unknown routes', async (t) => {
  const app = await startApp();
  t.after(app.close);

  assert.equal((await app.call('GET', '/')).status, 200);
  assert.equal((await app.call('GET', '/healthz')).json.ok, true);

  const missingPage = await app.call('GET', '/nope');
  assert.equal(missingPage.status, 404);
  assert.match(missingPage.text, /Page not found/);

  const missingApi = await app.call('GET', '/api/nope');
  assert.equal(missingApi.status, 404);
  assert.equal(missingApi.json.error, 'not_found');
});
