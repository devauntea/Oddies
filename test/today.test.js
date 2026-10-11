const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { keepRealSteps, readableText } = require('../src/today');
const { HttpError } = require('../src/errors');
const research = require('../src/research');

const PLAN = [
  { lane: 'events', query: 'portfolio review events New York' },
  { lane: 'overview', query: 'how to get started with design portfolios for beginners' },
  { lane: 'apply', query: 'junior designer programs accepting applications New York' },
];

const RESULTS = {
  [PLAN[0].query]: [
    { title: 'Portfolio review night', url: 'https://example.org/events/portfolio-night', snippet: 'Monthly review.' },
    { title: 'Designer meetup', url: 'https://example.org/meetups/designers/', snippet: 'Meets weekly.' },
  ],
  [PLAN[1].query]: [
    { title: 'How to build a portfolio', url: 'https://example.com/portfolio-guide', snippet: 'A guide.' },
    { title: 'Designer meetup', url: 'https://example.org/meetups/designers/?utm_source=x', snippet: 'Same meetup, tracked link.' },
  ],
  [PLAN[2].query]: [{ title: 'Studio apprenticeship', url: 'https://example.net/apprentice?year=2026', snippet: 'Applications open.' }],
};

// Gemini stand-in: answers the plan call with PLAN, then the pick call with `picks`.
// Pass an Error for either to make that call fail.
function fakeGemini(picks, plan = PLAN) {
  const calls = [];
  return {
    calls,
    configured: true,
    async generateJson(options) {
      calls.push(options);
      const answer = options.task === 'today.queries' ? plan : picks;
      if (answer instanceof Error) throw answer;
      return { data: options.task === 'today.queries' ? { queries: answer } : { steps: answer } };
    },
  };
}

// Nimble stand-in. `behaviour` maps a query to results, an Error, or 'hang'.
function fakeNimble(behaviour = RESULTS) {
  const searches = [];
  return {
    searches,
    configured: true,
    search(params, { signal, lane }) {
      searches.push({ ...params, lane });
      const outcome = behaviour[params.query];
      if (outcome === 'hang') {
        return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
      }
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve(outcome || []);
    },
  };
}

const GOOD_PICKS = [
  { type: 'attend', title: 'Go to the portfolio review night', url: 'https://example.org/events/portfolio-night', source: 'Example Org' },
  { type: 'read', title: 'Read the portfolio guide', url: 'https://example.com/portfolio-guide', source: 'Example' },
  { type: 'apply', title: 'Apply to the studio apprenticeship', url: 'https://example.net/apprentice?year=2026', source: 'Example Net' },
];

const down = new Error('nimble 500');
const ALL_DOWN = Object.fromEntries(PLAN.map((p) => [p.query, down]));
const ALL_HANG = Object.fromEntries(PLAN.map((p) => [p.query, 'hang']));

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
  assert.deepEqual(res.json.lanes, ['events', 'overview', 'apply']);
  assert.deepEqual(res.json.lane_results, { events: 2, overview: 1, apply: 1 }, 'the duplicate meetup counts once, for the first lane');
  assert.match(gemini.calls[0].contents, /New York, NY/, 'the plan prompt carries the city');
  assert.match(gemini.calls[0].contents, /Today is \d{4}-\d{2}-\d{2}/, 'and the date');
  assert.match(gemini.calls[1].contents, /\(lane: events, kind: event\) Portfolio review night/, 'the pick prompt lists Nimble results by lane');

  for (const step of res.json.steps) {
    assert.equal(step.milestone_id, res.json.milestone.id);
    assert.equal(step.done, false);
  }

  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.today_pick.oddie_id, 1);
  assert.equal(state.today_steps.length, 3);
  assert.equal(state.history.at(-1).oddie_id, 1);
});

test('everything Nimble found is kept as research, with its lane, query and link', async (t) => {
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble: fakeNimble() });
  t.after(app.close);
  const { milestone } = (await app.call('POST', '/api/today', { oddie_id: 1 })).json;

  const state = (await app.call('GET', '/api/state')).json;
  const designer = state.oddies.find((o) => o.id === 1);
  assert.equal(designer.research.length, 1);
  const research = designer.research[0];
  assert.equal(research.milestone_id, milestone.id);
  assert.deepEqual(research.lanes, [
    { lane: 'events', query: PLAN[0].query, count: 2 },
    { lane: 'overview', query: PLAN[1].query, count: 1 },
    { lane: 'apply', query: PLAN[2].query, count: 1 },
  ]);
  assert.equal(research.sources.length, 4, 'all four pages, not only the three picked');
  const meetup = research.sources.find((s) => s.title === 'Designer meetup');
  assert.equal(meetup.url, 'https://example.org/meetups/designers/');
  assert.equal(meetup.source, 'example.org');
  assert.equal(meetup.is_step, false, 'found but not picked');
  assert.equal(research.sources.filter((s) => s.is_step).length, 3);
  assert.deepEqual(state.oddies.find((o) => o.id === 2).research, [], 'other paths have none yet');

  // Searching the same milestone again replaces its sources instead of stacking them.
  await app.call('POST', '/api/today', { oddie_id: 1, refresh: true });
  assert.equal((await app.call('GET', '/api/state')).json.oddies[0].research[0].sources.length, 4);
});

test('a path can be researched without becoming today\'s pick', async (t) => {
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble: fakeNimble() });
  t.after(app.close);

  await app.call('POST', '/api/today', { oddie_id: 2 });
  const res = await app.call('POST', '/api/research', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.json.steps.length, 3);

  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.today_pick.oddie_id, 2, 'the pick did not move');
  assert.equal(state.oddies.find((o) => o.id === 1).research[0].sources.length, 4);
  assert.equal((await app.call('POST', '/api/research', {})).status, 400);
});

test('a failed search leaves no research behind', async (t) => {
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble: fakeNimble(ALL_DOWN) });
  t.after(app.close);
  await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.deepEqual((await app.call('GET', '/api/state')).json.oddies[0].research, [], 'a failed search leaves no sources');
});

test("each lane searches with the team's Nimble settings", async (t) => {
  const nimble = fakeNimble();
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble });
  t.after(app.close);
  await app.call('POST', '/api/today', { oddie_id: 1 });

  assert.deepEqual(nimble.searches[0], {
    query: PLAN[0].query,
    max_results: 6,
    search_depth: 'standard',
    output_format: 'plain_text',
    lane: 'events',
  });
  assert.equal(nimble.searches[1].lane, 'overview');
  assert.equal(nimble.searches[2].search_depth, 'lite');
  assert.deepEqual(research.buildSearch('documents', 'type study guide').content_type, ['documents']);
});

test('steps with URLs Nimble did not return are dropped', async (t) => {
  const gemini = fakeGemini([
    GOOD_PICKS[0],
    { type: 'attend', title: 'Go to an invented workshop', url: 'https://made-up.example/workshop', source: 'Nowhere' },
    { type: 'read', title: 'Read a page on the right site but a made up path', url: 'https://example.org/events/other', source: 'Example Org' },
    { type: 'contact', title: 'Not even a link', url: 'call them', source: 'Nobody' },
    GOOD_PICKS[1],
  ]);
  const app = await startApp({ gemini, nimble: fakeNimble() });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  const urls = res.json.steps.map((s) => s.url);
  // The two real picks survive, the three invented ones are gone, and the gap
  // is filled with another real result rather than left at two.
  assert.deepEqual(urls.slice(0, 2), ['https://example.org/events/portfolio-night', 'https://example.com/portfolio-guide']);
  assert.equal(urls.length, 3);
  const realUrls = Object.values(RESULTS).flat().map((r) => r.url);
  for (const url of urls) assert.ok(realUrls.includes(url), `${url} came from Nimble`);
  assert.ok(!urls.some((url) => /made-up|events\/other|call them/.test(url)));
});

test('if Gemini picks fewer than 3, the lane rules top it up to 3 from unused results', async (t) => {
  const app = await startApp({ gemini: fakeGemini([GOOD_PICKS[1]]), nimble: fakeNimble() });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.json.steps.map((s) => [s.type, s.url]),
    [
      ['read', 'https://example.com/portfolio-guide'],
      ['attend', 'https://example.org/events/portfolio-night'],
      ['apply', 'https://example.net/apprentice?year=2026'],
    ]
  );
});

test('if every suggested step is invented, the lane rules pick from the real results instead', async (t) => {
  const gemini = fakeGemini([{ type: 'read', title: 'Read this', url: 'https://made-up.example/a', source: 'x' }]);
  const app = await startApp({ gemini, nimble: fakeNimble() });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  const realUrls = Object.values(RESULTS).flat().map((r) => r.url);
  assert.ok(res.json.steps.length >= 2);
  for (const step of res.json.steps) assert.ok(realUrls.includes(step.url), `${step.url} came from Nimble`);
  assert.deepEqual(
    res.json.steps.map((s) => [s.type, s.title]),
    [
      ['read', 'Read "How to build a portfolio"'],
      ['attend', 'Check out: Portfolio review night'],
      ['apply', 'Apply: Studio apprenticeship'],
    ]
  );
});

test('if Gemini is down, the lane rules plan the searches and pick the steps', async (t) => {
  const failed = new HttpError(502, 'gemini_failed', 'The model did not answer.');
  const nimble = {
    searches: [],
    configured: true,
    async search(params, { lane }) {
      this.searches.push({ lane, query: params.query });
      return [{ title: `${lane} result`, url: `https://example.org/${lane}`, snippet: '' }];
    },
  };
  const app = await startApp({ gemini: fakeGemini(failed, failed), nimble });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.deepEqual(nimble.searches, [
    { lane: 'overview', query: 'how to publish a portfolio with five projects for beginners' },
    { lane: 'community', query: 'publish a portfolio with five projects community forum where beginners ask questions' },
    { lane: 'events', query: 'publish a portfolio with five projects workshops classes events New York, NY' },
  ]);
  assert.deepEqual(
    res.json.steps.map((s) => [s.type, s.url]),
    [
      ['read', 'https://example.org/overview'],
      ['contact', 'https://example.org/community'],
      ['attend', 'https://example.org/events'],
    ]
  );
});

test('a Nimble failure is an error with retry, never made-up steps', async (t) => {
  const gemini = fakeGemini(GOOD_PICKS);
  const app = await startApp({ gemini, nimble: fakeNimble(ALL_DOWN) });
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
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble: fakeNimble(ALL_HANG) });
  t.after(app.close);

  const pending = app.call('POST', '/api/today', { oddie_id: 1 });
  // Let the request reach the searches, then jump the clock past 20 seconds.
  for (let i = 0; i < 50; i += 1) await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(20_000);
  const res = await pending;
  assert.equal(res.status, 504);
  assert.equal(res.json.error, 'nimble_timeout');
  assert.equal(res.json.retryable, true);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM step').get().n, 0);
});

test('one failed search out of three still gives steps from the others', async (t) => {
  const app = await startApp({
    gemini: fakeGemini(GOOD_PICKS),
    nimble: fakeNimble({ ...RESULTS, [PLAN[2].query]: down }),
  });
  t.after(app.close);

  const res = await app.call('POST', '/api/today', { oddie_id: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.json.steps.length, 3, 'still three steps, topped up from the lanes that answered');
  assert.ok(!res.json.steps.some((s) => s.url.includes('apprentice')), 'the apply result never came back, so it is not a step');
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

test("a step's page can be read in the app, but only a saved step's", async (t) => {
  const extracted = [];
  const nimble = {
    ...fakeNimble(),
    async extract(url) {
      extracted.push(url);
      if (url.includes('apprentice')) return { ok: false, markdown: '' };
      return { ok: true, markdown: '# The Guide\n\nStart with five projects.', url };
    },
  };
  const app = await startApp({ gemini: fakeGemini(GOOD_PICKS), nimble });
  t.after(app.close);
  const { steps } = (await app.call('POST', '/api/today', { oddie_id: 1 })).json;

  const guide = steps.find((s) => s.type === 'read');
  const doc = await app.call('POST', `/api/steps/${guide.id}/read`);
  assert.equal(doc.status, 200);
  assert.equal(doc.json.title, 'The Guide');
  assert.match(doc.json.markdown, /Start with five projects/);
  assert.equal(doc.json.truncated, false);
  assert.deepEqual(extracted, ['https://example.com/portfolio-guide']);

  const blocked = await app.call('POST', `/api/steps/${steps.find((s) => s.type === 'apply').id}/read`);
  assert.equal(blocked.status, 502);
  assert.equal(blocked.json.error, 'document_unavailable');

  assert.equal((await app.call('POST', '/api/steps/999/read')).status, 404);

  assert.equal(
    readableText('![banner](https://x.test/a.jpg)\nRead the [full guide](https://x.test/guide) first.   \n\n\n\nThen paint.'),
    'Read the full guide first.\n\nThen paint.'
  );
});

test('keepRealSteps matches URLs loosely but saves the URL Nimble gave', () => {
  const resources = [research.toResource({ title: 'Meetup', url: 'https://Example.org/meetups/designers/?utm_source=news', snippet: '' }, 'events')];
  const kept = keepRealSteps(
    [
      { type: 'attend', title: 'Go to the meetup', url: 'https://example.org/meetups/designers#rsvp', source: '' },
      { type: 'attend', title: 'Same meetup again', url: 'https://example.org/meetups/designers/', source: 'dupe' },
      { type: 'dance', title: 'A made up path', url: 'https://example.org/meetups/designers/x', source: '' },
      null,
    ],
    resources
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].url, 'https://Example.org/meetups/designers/?utm_source=news');
  assert.equal(kept[0].source, 'example.org', 'falls back to the host when the model gives no source');

  const unknownType = keepRealSteps([{ type: 'dance', title: 'Go', url: 'https://example.org/meetups/designers', source: '' }], resources);
  assert.equal(unknownType[0].type, 'attend', "an unknown type becomes the lane's type");

  assert.equal(research.normalizeUrl('javascript:alert(1)'), null);
  assert.equal(research.normalizeUrl('not a url'), null);
  assert.equal(research.toResource({ title: 'Talk', url: 'https://www.youtube.com/watch?v=1' }, 'overview').kind, 'video');
  assert.equal(research.toResource({ title: 'Guide', url: 'https://example.org/guide.pdf' }, 'overview').kind, 'document');
  const messy = research.toResource({ title: '## Retreat | Zen', url: 'https://example.org/r', snippet: 'Options #### Dates: **Dec 17** [details](https://x.test)' }, 'events');
  assert.equal(messy.title, 'Retreat Zen');
  assert.equal(messy.snippet, 'Options Dates: Dec 17 details');
});
