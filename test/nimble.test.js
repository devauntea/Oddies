const test = require('node:test');
const assert = require('node:assert/strict');
const { createNimble, SEARCH_URL } = require('../src/nimble');

function fakeFetch(status, body) {
  const calls = [];
  const impl = async (url, options) => {
    calls.push({ url, options });
    return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { impl, calls };
}

test('search posts to the documented endpoint and maps results', async () => {
  const { impl, calls } = fakeFetch(200, {
    total_results: 2,
    request_id: 'abc',
    results: [
      { title: 'Zen group', description: 'Sits on Tuesdays.', url: 'https://example.org/zen', content: '', metadata: {} },
      { title: 'No link', description: 'dropped' },
    ],
  });
  const nimble = createNimble({ apiKey: 'test-key', fetchImpl: impl });

  const results = await nimble.search('zen group brooklyn');
  assert.deepEqual(results, [{ title: 'Zen group', url: 'https://example.org/zen', snippet: 'Sits on Tuesdays.' }]);

  assert.equal(calls[0].url, SEARCH_URL);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), { query: 'zen group brooklyn', max_results: 8, search_depth: 'lite' });
});

test('a non-200 answer throws', async () => {
  const { impl } = fakeFetch(429, { status: 'failed', msg: 'Rate limit exceeded' });
  const nimble = createNimble({ apiKey: 'test-key', fetchImpl: impl });
  await assert.rejects(() => nimble.search('anything'), /Nimble search answered 429/);
});

test('without a key the client says it is not configured', async () => {
  const nimble = createNimble({ apiKey: '' });
  assert.equal(nimble.configured, false);
  await assert.rejects(() => nimble.search('anything'), /NIMBLE_API_KEY is not set/);
});
