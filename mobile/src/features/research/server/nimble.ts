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
  return async (query, options) => {
    // The service enforces one deadline across all lanes, so no per-call retries here.
    const response = await nimble.search(
      { ...query, output_format: 'plain_text' },
      { signal: options?.signal, timeout: 20_000, maxRetries: 0 },
    );
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
    // main_content runs Readability first, so nav bars, footers and cookie banners are dropped.
    const response = await nimble.extract.run({
      url,
      formats: ['markdown'],
      markdown_backend: 'main_content',
    });
    return {
      ok: response.status === 'success',
      statusCode: response.status_code,
      markdown: response.data.markdown,
      url: response.url,
    };
  };
}
