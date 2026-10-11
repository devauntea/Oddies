// Nimble Search API client.
// Docs: https://docs.nimbleway.com/api-reference/search/search
const Sentry = require('@sentry/node');
const { HttpError } = require('./errors');

const SEARCH_URL = 'https://sdk.nimbleway.com/v2/search';
const MAX_RESULTS = 8;
// "lite" returns title, URL and description only. It is the fastest depth,
// and that is all the step picker reads.
const SEARCH_DEPTH = 'lite';

function createNimble({ apiKey = process.env.NIMBLE_API_KEY, fetchImpl = fetch } = {}) {
  // Runs one search and returns [{ title, url, snippet }]. Each call is its
  // own Sentry span with the result count on it. Throws if Nimble fails.
  async function search(query, { signal } = {}) {
    if (!apiKey) throw new HttpError(503, 'nimble_not_configured', 'NIMBLE_API_KEY is not set on the server.');

    return Sentry.startSpan(
      {
        name: 'nimble search',
        op: 'nimble.search',
        attributes: { 'nimble.query': query, 'nimble.search_depth': SEARCH_DEPTH, 'nimble.max_results': MAX_RESULTS },
      },
      async (span) => {
        try {
          const res = await fetchImpl(SEARCH_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_results: MAX_RESULTS, search_depth: SEARCH_DEPTH }),
            signal,
          });
          span.setAttribute('http.response.status_code', res.status);
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Nimble search answered ${res.status}: ${body.slice(0, 200)}`);
          }

          const data = await res.json();
          const results = (Array.isArray(data.results) ? data.results : [])
            .filter((r) => r && typeof r.url === 'string' && r.url)
            .map((r) => ({ title: String(r.title || ''), url: r.url, snippet: String(r.description || '') }));
          span.setAttributes({
            'nimble.result_count': results.length,
            'nimble.request_id': String(data.request_id || ''),
          });
          return results;
        } catch (error) {
          span.setAttribute('nimble.result_count', 0);
          span.setStatus({ code: 2, message: signal && signal.aborted ? 'deadline_exceeded' : 'internal_error' });
          if (!(signal && signal.aborted)) Sentry.captureException(error);
          console.error(`Nimble search failed for "${query}":`, error.message);
          throw error;
        }
      }
    );
  }

  return { configured: Boolean(apiKey), search };
}

module.exports = { createNimble, SEARCH_URL };
