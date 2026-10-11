import type { ReadableDocument } from '../types';
import { buildMockDocument } from './fixtures';

export type ExtractFn = (
  url: string,
) => Promise<{ ok: boolean; statusCode?: number; markdown?: string; url?: string }>;

export class DocumentUnavailableError extends Error {
  constructor() {
    super("This page can't be shown in the reader. Opening it in the browser instead.");
    this.name = 'DocumentUnavailableError';
  }
}

/** Keeps responses small enough for a phone; long pages should be opened in the browser. */
export const MAX_DOCUMENT_CHARS = 60_000;

/**
 * Below this much prose there's nothing worth reading in-app: typically an interactive tool,
 * an index page or a login wall. Those work better in the browser.
 */
export const MIN_READABLE_CHARS = 400;

function firstHeading(markdown: string): string | undefined {
  return markdown.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim();
}

/** Visible text length: link targets, images and markdown symbols don't count. */
function proseLength(markdown: string): number {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

function isReadable(result: Awaited<ReturnType<ExtractFn>>, markdown: string): boolean {
  if (!result.ok || (result.statusCode ?? 200) >= 400) return false;
  // Extracting a PDF returns the raw file bytes, not text.
  if (markdown.startsWith('%PDF')) return false;
  return proseLength(markdown) >= MIN_READABLE_CHARS;
}

export async function readDocument(
  url: string,
  deps: { extract: ExtractFn | null },
): Promise<ReadableDocument> {
  if (!deps.extract) return buildMockDocument(url);

  const result = await deps.extract(url);
  const markdown = result.markdown?.trim() ?? '';
  if (!isReadable(result, markdown)) throw new DocumentUnavailableError();

  const truncated = markdown.length > MAX_DOCUMENT_CHARS;
  return {
    url: result.url ?? url,
    title: firstHeading(markdown),
    markdown: truncated ? markdown.slice(0, MAX_DOCUMENT_CHARS) : markdown,
    truncated,
    source: 'nimble',
  };
}
