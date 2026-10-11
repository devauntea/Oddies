import Nimble from '@nimble-way/nimble-js';

import type { ExtractFn } from './documentService';
import type { SearchFn } from './researchService';

/**
 * The only file that talks to the Nimble SDK. Everything else depends on the small
 * `SearchFn` / `ExtractFn` interfaces, which keeps the rest of the feature testable without
 * network access and makes it easy to swap providers later.
 *
 * Docs: https://docs.nimbleway.com/nimble-sdk/getting-started/overview
 */

let client: Nimble | null | undefined;

function getClient(): Nimble | null {
  if (client === undefined) {
    const apiKey = process.env.NIMBLE_API_KEY?.trim();
    // A phone waiting on a spinner shouldn't sit through the SDK's 3-minute default.
    client = apiKey ? new Nimble({ apiKey, timeout: 45_000, maxRetries: 1 }) : null;
  }
  return client;
}

/** Null when NIMBLE_API_KEY is unset, which switches the services to mock data. */
export function nimbleSearch(): SearchFn | null {
  const nimble = getClient();
  if (!nimble) return null;
  return async (query) => {
    const response = await nimble.search({ ...query, output_format: 'plain_text' });
    return {
      results: response.results,
      answer: response.answer,
      answer_citations: response.answer_citations,
    };
  };
}

export function nimbleExtract(): ExtractFn | null {
  const nimble = getClient();
  if (!nimble) return null;
  return async (url) => {
    const response = await nimble.extract.run({ url, formats: ['markdown'] });
    return {
      ok: response.status === 'success',
      markdown: response.data.markdown,
      url: response.url,
    };
  };
}
