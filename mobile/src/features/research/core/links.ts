/**
 * Turns a link found inside an extracted page into something the app can open: relative links
 * ("/products") are resolved against the page URL. Returns null for links that only make sense
 * on the original page (in-page anchors, javascript:, mailto: and friends), which the reader then
 * shows as plain text.
 */
export function resolveLink(href: string, pageUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  try {
    const url = new URL(trimmed, pageUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
