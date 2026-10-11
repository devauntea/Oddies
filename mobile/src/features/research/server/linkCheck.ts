/**
 * Drops links that are definitely gone before they reach the user. Search indexes keep pages long
 * after they're deleted (study-guide PDFs especially), and a 404 in the reader is a dead end.
 *
 * Only a definite answer counts as dead: 404/410, or a host that no longer exists. Anything
 * ambiguous (403 from bot protection, timeouts, 5xx) keeps the link, so a strict site never
 * loses a good result. Plain HEAD requests: no Nimble credits.
 */

export type FindDeadLinksFn = (urls: string[]) => Promise<Set<string>>;

export type LinkStatus = 'alive' | 'dead' | 'unknown';

const DEAD_STATUSES = new Set([404, 410]);
const DEAD_ERROR_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const TIMEOUT_MS = 4_000;
// Some sites answer non-browser user agents differently, so look like Mobile Safari.
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<{ status: number; body?: { cancel(): Promise<void> } | null }>;

function errorCode(error: unknown): string | undefined {
  const cause = (error as { cause?: { code?: unknown } } | undefined)?.cause;
  return typeof cause?.code === 'string' ? cause.code : undefined;
}

async function request(
  url: string,
  method: 'HEAD' | 'GET',
  fetchFn: FetchLike,
): Promise<LinkStatus> {
  try {
    const response = await fetchFn(url, {
      method,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Only the status matters; don't download the page.
    void response.body?.cancel().catch(() => {});
    if (DEAD_STATUSES.has(response.status)) return 'dead';
    return response.status < 400 ? 'alive' : 'unknown';
  } catch (error) {
    const code = errorCode(error);
    return code && DEAD_ERROR_CODES.has(code) ? 'dead' : 'unknown';
  }
}

/** HEAD first (cheap); some servers wrongly 404 a HEAD, so a dead verdict is confirmed with GET. */
export async function checkLink(url: string, fetchFn: FetchLike = fetch): Promise<LinkStatus> {
  const head = await request(url, 'HEAD', fetchFn);
  return head === 'dead' ? request(url, 'GET', fetchFn) : head;
}

export function createDeadLinkFinder(fetchFn: FetchLike = fetch): FindDeadLinksFn {
  return async (urls) => {
    const statuses = await Promise.all(urls.map((url) => checkLink(url, fetchFn)));
    return new Set(urls.filter((_, i) => statuses[i] === 'dead'));
  };
}
