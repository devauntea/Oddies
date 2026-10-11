export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

/**
 * Per-instance in-memory cache. Good enough to stop repeat taps from spending Nimble credits;
 * swap for a shared store (KV, Redis) if the API ever runs on many instances.
 */
export function createTtlCache<T>({
  ttlMs,
  maxEntries,
  now = Date.now,
}: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}): TtlCache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      // Map preserves insertion order, so the first key is the oldest.
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
  };
}
