const test = require('node:test');
const assert = require('node:assert/strict');
const { createNimble } = require('../src/nimble');

// A stand-in for the Nimble SDK client.
function fakeSdk({ searchResponse, extractResponse, fail } = {}) {
  const calls = [];
  return {
    calls,
    async search(params, options) {
      calls.push({ method: 'search', params, options });
      if (fail) throw fail;
      return searchResponse;
    },
    extract: {
      async run(params) {
        calls.push({ method: 'extract.run', params });
        if (fail) throw fail;
        return extractResponse;
      },
    },
  };
}

test('search passes the params through with no retries and maps results', async () => {
  const sdk = fakeSdk({
    searchResponse: {
      total_results: 2,
      request_id: 'abc',
      results: [
        { title: 'Zen group', description: 'Sits on Tuesdays.', url: 'https://example.org/zen', content: '', metadata: {} },
        { title: 'No link', description: 'dropped' },
      ],
    },
  });
  const nimble = createNimble({ client: sdk });
  const params = { query: 'zen group brooklyn', max_results: 5, search_depth: 'lite', output_format: 'plain_text' };

  const results = await nimble.search(params, { lane: 'community' });
  assert.deepEqual(results, [{ title: 'Zen group', url: 'https://example.org/zen', snippet: 'Sits on Tuesdays.' }]);
  assert.deepEqual(sdk.calls[0].params, params);
  assert.equal(sdk.calls[0].options.maxRetries, 0);
  assert.equal(sdk.calls[0].options.timeout, 20_000);
});

test('a failed search throws', async () => {
  const nimble = createNimble({ client: fakeSdk({ fail: new Error('429 Rate limit exceeded') }) });
  await assert.rejects(() => nimble.search({ query: 'anything' }), /429/);
});

test('extract asks for markdown and reports whether it worked', async () => {
  const sdk = fakeSdk({ extractResponse: { status: 'success', url: 'https://example.org/a', data: { markdown: '# Title\n\nBody' } } });
  const nimble = createNimble({ client: sdk });

  const doc = await nimble.extract('https://example.org/a');
  assert.deepEqual(doc, { ok: true, markdown: '# Title\n\nBody', url: 'https://example.org/a' });
  assert.deepEqual(sdk.calls[0].params, { url: 'https://example.org/a', formats: ['markdown'] });
});

test('without a key the client says it is not configured', async () => {
  const nimble = createNimble({ apiKey: '' });
  assert.equal(nimble.configured, false);
  await assert.rejects(() => nimble.search({ query: 'anything' }), /NIMBLE_API_KEY is not set/);
  await assert.rejects(() => nimble.extract('https://example.org'), /NIMBLE_API_KEY is not set/);
});

test('with a key it builds the real SDK client', () => {
  assert.equal(createNimble({ apiKey: 'test-key' }).configured, true);
});
