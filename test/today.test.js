const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { keepRealSteps, urlKey } = require('../src/today');

const RESULTS = {
  classes: [
    { title: 'Violin repair weekend intensive', url: 'https://example.org/classes/repair-weekend', snippet: 'Two day class.' },
    { title: 'Luthier meetup', url: 'https://example.org/meetups/luthiers/', snippet: 'Monthly meetup.' },
  ],
  reading: [
    { title: 'How bass bars work', url: 'https://example.com/bass-bars', snippet: 'A guide.' },
    { title: 'Luthier meetup', url: 'https://example.org/meetups/luthiers/', snippet: 'Duplicate of the meetup.' },
  ],
  apply: [{ title: 'Apprentice program', url: 'https://example.net/apprentice?year=2026', snippet: 'Applications open.' }],
};

// Gemini stand-in: answers the query call, then the pick call with `picks`.
function fakeGemini(picks) {
  const calls = [];
  return {
    calls,
    configured: true,
    async generateJson(options) {
      calls.push(options);
      if (options.task === 'today.queries') return { data: { queries: ['classes', 'reading', 'apply'] } };
      return { data: { steps: picks } };
    },
  };
}

// Nimble stand-in. `behaviour` maps a query to results, an Error, or 'hang'.
function fakeNimble(behaviour = RESULTS) {
  const queries = [];
  return {
    queries,
    configured: true,
    search(query, { signal }) {
      queries.push(query);
      const outcome = behaviour[query];
      if (outcome === 'hang') {
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
      }
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve(outcome || []);
    },
  };
}

const GOOD_PICKS = [
  { type: 'attend', title: 'Sign up for the repair weekend', url: 'https://example.org/classes/repair-weekend', source: 'Example Org' },
  { type: 'read', title: 'Read the bass bar guide', url: 'https://example.com/bass-bars', source: 'Example' },
  { type: 'apply', title: 'Apply to the apprentice program', url: 'https://example.net/apprentice?year=2026', source: 'Example Net' },
];

test('today records the pick and returns steps for the next unreached milestone', async (t) => {
  const gemini = fakeGemini(GOOD_PICKS);
  const nimble = fakeNimble();
  const app = await startApp({ gemini, nimble });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.json.pick.oddie_id, 1);
  assert.equal(res.json.milestone.title, 'Publish a portfolio with five projects');
  assert.equal(res.json.steps.length, 3);
  assert.deepEqual(nimble.queries, ['classes', 'reading', 'apply']);
  assert.match(gemini.calls[0].contents, /New York, NY/, 'the query prompt carries the city');
  assert.match(gemini.calls[0].contents, /Today is \d{4}-\d{2}-\d{2}/, 'and the date');
  assert.match(gemini.calls[1].contents, /https:\/\/example\.org\/classes\/repair-weekend/, 'the pick prompt lists Nimble results');

  for (const step of res.json.steps) {
    assert.equal(step.milestone_id, res.json.milestone.id);
    assert.equal(step.done, false);
  }

  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.today_pick.oddie_id, 1);
  assert.equal(state.today_steps.length, 3);
  assert.equal(state.history.at(-1).oddie_id, 1);
});

test('steps with URLs Nimble did not return are dropped', async (t) => {
  const gemini = fakeGemini([
    GOOD_PICKS[0],
    { type: 'attend', title: 'Go to an invented workshop', url: 'https://made-up.example/workshop', source: 'Nowhere' },
    { type: 'read', title: 'Read a page on the right site but a made up path', url: 'https://example.org/classes/other', source: 'Example Org' },
    { type: 'contact', title: 'Not even a link', url: 'call them', source: 'Nobody' },
    GOOD_PICKS[1],
  ]);
  const app = await startApp({ gemini, nimble: fakeNimble() });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.json.steps.map((s) => s.url),
    ['https://example.org/classes/repair-weekend', 'https://example.com/bass-bars']
  );
});

test('if every suggested step is invented, there are no steps and no fallback', async (t) => {
  const gemini = fakeGemini([{ type: 'read', title: 'Read this', url: 'https://made-up.example/a', source: 'x' }]);
  const app = await startApp({ gemini, nimble: fakeNimble() });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 502);
  assert.equal(res.json.error, 'no_real_steps');
  assert.equal(res.json.retryable, true);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 0);
});

test('a Nimble failure is an error with retry, never made-up steps', async (t) => {
  const down = new Error('nimble 500');
  const gemini = fakeGemini(GOOD_PICKS);
  const app = await startApp({ gemini, nimble: fakeNimble({ classes: down, reading: down, apply: down }) });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 502);
  assert.equal(res.json.error, 'nimble_failed');
  assert.equal(res.json.retryable, true);
  assert.equal(gemini.calls.length, 1, 'the pick call never runs');
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 0);

  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.today_pick.oddie_id, 1, 'the pick itself is still recorded');
});

test('a Nimble timeout is reported as a timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const app = await startApp({
    gemini: fakeGemini(GOOD_PICKS),
    nimble: fakeNimble({ classes: 'hang', reading: 'hang', apply: 'hang' }),
  });
  t.after(app.close);

  const pending = app.call('POST', '/api/today', { oddie_id: 1 });
  // Let the request reach the searches, then jump the clock past 20 seconds.
  for (let i = 0; i < 50; i += 1) await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(20_000);
  const res = await pending;
  assert.equal(res.status, 504);
  assert.equal(res.json.error, 'nimble_timeout');
  assert.equal(res.json.retryable, true);
});

test('one failed search out of three still gives steps from the others', async (t) => {
  const app = await startApp({
    gemini: fakeGemini(GOOD_PICKS),
    nimble: fakeNimble({ ...RESULTS, apply: new Error('nimble 500') }),
  });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.json.steps.length, 2, 'the apply step is gone because its result never came back');
});

test('asking again the same day reuses steps unless refresh is set', async (t) => {
  const gemini = fakeGemini(GOOD_PICKS);
  const app = await startApp({ gemini, nimble: fakeNimble() });
  t.after(app.close);

  await app.call('POST', '/api/today', { oddie_id: 1 });
  const again = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(again.json.reused, true);
  assert.equal(gemini.calls.length, 2);

  await app.call('POST', '/api/today', { oddie_id: 1, refresh: true });
  assert.equal(gemini.calls.length, 4);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 3, 'old undone steps were replaced, not stacked');
});

test('two done steps light the milestone, and unchecking puts it out', async (t) => {
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble: fakeNimble() });
  t.after(app.close);

  const { steps, milestone } = (await app.call('POST', '/api/today', { oddie_id: 1 })).json;

  const one = await app.call('PATCH', `/api/steps/${steps[0].id}`, { done: true });
  assert.equal(one.json.step.done, true);
  assert.equal(one.json.milestone.reached, false, 'one step is not enough');

  const two = await app.call('PATCH', `/api/steps/${steps[1].id}`, { done: true });
  assert.equal(two.json.milestone.id, milestone.id);
  assert.equal(two.json.milestone.reached, true, 'two done steps reach the milestone');

  const state = (await app.call('GET', '/api/state')).json;
  const designer = state.oddies.find((o) => o.id === 1);
  assert.equal(designer.milestones.filter((m) => m.reached).length, 3);

  const undone = await app.call('PATCH', `/api/steps/${steps[1].id}`);
  assert.equal(undone.json.step.done, false, 'no body flips the step');
  assert.equal(undone.json.milestone.reached, false);

  assert.equal((await app.call('PATCH', '/api/steps/999', { done: true })).status, 404);
});

test('today needs a real oddie and a Nimble key', async (t) => {
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS) });
  t.after(app.close);

  assert.equal((await app.call('POST', '/api/today', {})).status, 400);
  assert.equal((await app.call('POST', '/api/today', { oddie_id: 99 })).status, 404);
  const noKey = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(noKey.status, 503);
  assert.equal(noKey.json.error, 'nimble_not_configured');
});

test('keepRealSteps matches URLs loosely but saves the URL Nimble gave', () => {
  const results = [{ title: 'Meetup', url: 'https://Example.org/meetups/luthiers/', snippet: '' }];
  const kept = keepRealSteps(
    [
      { type: 'attend', title: 'Go to the meetup', url: 'https://example.org/meetups/luthiers#rsvp', source: '' },
      { type: 'attend', title: 'Same meetup again', url: 'https://example.org/meetups/luthiers/', source: 'dupe' },
      { type: 'dance', title: 'Unknown type falls back to read', url: 'https://example.org/meetups/luthiers/x', source: '' },
      null,
    ],
    results
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].url, 'https://Example.org/meetups/luthiers/');
  assert.equal(kept[0].source, 'example.org', 'falls back to the host when the model gives no source');
  assert.equal(urlKey('javascript:alert(1)'), null);
  assert.equal(urlKey('not a url'), null);
});
