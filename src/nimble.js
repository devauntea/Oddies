// The only file that talks to Nimble. Uses the official SDK, the same way the
// team's research feature does.
// Docs: https://docs.nimbleway.com/nimble-sdk/getting-started/overview
const Sentry = require('@sentry/node');
const { Nimble } = require('@nimble-way/nimble-js');
const { HttpError } = require('./errors');

const SEARCH_TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 45_000;

// How a page is fetched for the reader. Measured on 2026-10-11: with
// rendering off and main_content on, an article came back clean in about 2.3
// seconds. The SDK defaults took 37 seconds and led with the site's menus.
// So the quick way goes first, and a rendered fetch is the backup for pages
// that refuse a plain request.
const EXTRACT_TRIES = [
  { params: { render: false, markdown_backend: 'main_content' }, timeout: 12_000 },
  { params: { render: 'auto', markdown_backend: 'main_content' }, timeout: 40_000 },
];

// `client` lets tests pass a stand-in for the SDK.
function createNimble({ apiKey = process.env.NIMBLE_API_KEY, client } = {}) {
  const key = (apiKey || '').trim();
  // The SDK's own default is a 3 minute timeout with 2 retries, far too long
  // for someone watching a spinner.
  const nimble = client || (key ? new Nimble({ apiKey: key, timeout: EXTRACT_TIMEOUT_MS, maxRetries: 1 }) : null);

  function requireClient() {
    if (!nimble) throw new HttpError(503, 'nimble_not_configured', 'NIMBLE_API_KEY is not set on the server.');
  }

  // Runs one search. `params` is the Nimble search body from buildSearch().
  // Returns [{ title, url, snippet }]. Each call is its own Sentry span with
  // the result count on it. Throws if Nimble fails.
  async function search(params, { signal, lane = '' } = {}) {
    requireClient();
    return Sentry.startSpan(
      {
        name: 'nimble search',
        op: 'nimble.search',
        attributes: {
          'nimble.query': params.query,
          'nimble.lane': lane,
          'nimble.search_depth': params.search_depth || 'standard',
          'nimble.max_results': params.max_results || 10,
        },
      },
      async (span) => {
        try {
          // No retries: three searches share one 20 second limit.
          const response = await nimble.search(params, { signal, timeout: SEARCH_TIMEOUT_MS, maxRetries: 0 });
          const results = (Array.isArray(response.results) ? response.results : [])
            .filter((r) => r && typeof r.url === 'string' && r.url)
            .map((r) => ({ title: String(r.title || ''), url: r.url, snippet: String(r.description || '') }));
          span.setAttributes({
            'nimble.result_count': results.length,
            'nimble.request_id': String(response.request_id || ''),
          });
          return results;
        } catch (error) {
          const aborted = Boolean(signal && signal.aborted);
          span.setAttribute('nimble.result_count', 0);
          span.setStatus({ code: 2, message: aborted ? 'deadline_exceeded' : 'internal_error' });
          if (!aborted) Sentry.captureException(error);
          console.error(`Nimble search failed for "${params.query}":`, error.message);
          throw error;
        }
      }
    );
  }

  // Fetches one page as markdown with Nimble Extract, for reading in the app.
  async function extract(url) {
    requireClient();
    return Sentry.startSpan(
      { name: 'nimble extract', op: 'nimble.extract', attributes: { 'nimble.url': url } },
      async (span) => {
        let lastError = null;
        for (const [index, attempt] of EXTRACT_TRIES.entries()) {
          try {
            const response = await nimble.extract.run(
              { url, formats: ['markdown'], ...attempt.params },
              { timeout: attempt.timeout, maxRetries: 0 }
            );
            const markdown = String((response.data && response.data.markdown) || '').trim();
            if (response.status === 'success' && markdown) {
              span.setAttributes({
                'nimble.status': String(response.status),
                'nimble.markdown_chars': markdown.length,
                'nimble.extract_try': index + 1,
                'nimble.rendered': attempt.params.render !== false,
              });
              return { ok: true, markdown, url: response.url || url };
            }
            lastError = new Error(`Nimble extract returned ${response.status} with no text`);
          } catch (error) {
            lastError = error;
          }
          console.error(`Nimble extract try ${index + 1} failed for ${url}:`, lastError.message);
        }
        span.setAttribute('nimble.markdown_chars', 0);
        span.setStatus({ code: 2, message: 'internal_error' });
        Sentry.captureException(lastError);
        return { ok: false, markdown: '', url };
      }
    );
  }

  return { configured: Boolean(nimble), search, extract };
}

module.exports = { createNimble };
