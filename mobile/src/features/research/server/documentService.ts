import type { ReadableDocument } from '../types';
import { buildMockDocument } from './fixtures';

export type ExtractFn = (url: string) => Promise<{ ok: boolean; markdown?: string; url?: string }>;

export class DocumentUnavailableError extends Error {
  constructor() {
    super("This page couldn't be loaded for reading. Try opening it in the browser instead.");
    this.name = 'DocumentUnavailableError';
  }
}

/** Keeps responses small enough for a phone; long pages should be opened in the browser. */
export const MAX_DOCUMENT_CHARS = 60_000;

function firstHeading(markdown: string): string | undefined {
  return markdown.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim();
}

export async function readDocument(
  url: string,
  deps: { extract: ExtractFn | null },
): Promise<ReadableDocument> {
  if (!deps.extract) return buildMockDocument(url);

  const result = await deps.extract(url);
  const markdown = result.markdown?.trim();
  if (!result.ok || !markdown) throw new DocumentUnavailableError();

  const truncated = markdown.length > MAX_DOCUMENT_CHARS;
  return {
    url: result.url ?? url,
    title: firstHeading(markdown),
    markdown: truncated ? markdown.slice(0, MAX_DOCUMENT_CHARS) : markdown,
    truncated,
    source: 'nimble',
  };
}
