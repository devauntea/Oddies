const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|ref|ref_src)$/i;

/** Small, deterministic string hash (djb2). Not cryptographic; only used for stable ids. */
export function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Canonical form of a URL for de-duplication and id generation: lower-case host, no hash,
 * no tracking params, no trailing slash. Returns null for anything that isn't http(s).
 */
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '';
  return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function resourceIdFor(normalizedUrl: string): string {
  return `r_${hashString(normalizedUrl)}`;
}
