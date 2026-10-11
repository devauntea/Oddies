/**
 * Result-quality rules. Heuristics, deliberately small: they remove the most common junk
 * (shopping and pin-board pages that can't be studied) and stop one site from filling the pack.
 */

/** Sent to Nimble as `exclude_domains` and re-checked locally in case a result slips through. */
export const BLOCKED_DOMAINS: readonly string[] = [
  'pinterest.com',
  'pinimg.com',
  'aliexpress.com',
  'temu.com',
];

export function isBlockedHost(host: string): boolean {
  return BLOCKED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Keeps at most `max` items per source host, preserving order (earlier lanes win). */
export function capPerHost<T extends { source: string }>(items: T[], max = 2): T[] {
  const counts = new Map<string, number>();
  return items.filter((item) => {
    const count = counts.get(item.source) ?? 0;
    if (count >= max) return false;
    counts.set(item.source, count + 1);
    return true;
  });
}
