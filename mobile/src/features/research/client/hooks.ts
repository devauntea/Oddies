import { useEffect, useState } from 'react';

import type { ReadableDocument, ResearchPack, ResearchRequest } from '../types';
import { fetchDocument, fetchResearchPack } from './apiClient';
import { loadCachedPack, packCacheKey, saveCachedPack } from './packCache';
import { useAsync, type AsyncState } from './useAsync';

export type ResearchState = AsyncState<ResearchPack> & {
  /** Fetch again, bypassing the server cache. */
  reload: () => void;
  /** Data is the on-device copy and a network fetch is in flight. */
  refreshing: boolean;
  /** Showing the on-device copy because the latest fetch failed. */
  offlineError?: string;
};

/**
 * Research pack for a branch, stale-while-revalidate: the last good pack on this device shows
 * immediately while a fresh one loads. Pass `null` to skip fetching.
 */
export function useResearch(request: ResearchRequest | null): ResearchState {
  const cacheKey = request ? packCacheKey(request) : null;
  const [attempt, setAttempt] = useState(0);
  const [cached, setCached] = useState<{ key: string; pack: ResearchPack } | null>(null);

  useEffect(() => {
    if (!cacheKey) return;
    let cancelled = false;
    void loadCachedPack(cacheKey).then((pack) => {
      // Never overwrite a pack the network already delivered.
      if (!cancelled && pack) setCached((current) => current ?? { key: cacheKey, pack });
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  const fetchKey = request && cacheKey ? `${JSON.stringify(request)}#${attempt}` : null;
  const network = useAsync<ResearchPack>(fetchKey, async (signal) => {
    // The first fetch may use the server cache; any retry or refresh searches again.
    const pack = await fetchResearchPack({ ...request!, refresh: attempt > 0 }, signal);
    if (cacheKey) {
      setCached({ key: cacheKey, pack });
      void saveCachedPack(cacheKey, pack);
    }
    return pack;
  });

  const reload = () => setAttempt((n) => n + 1);
  const local = cached && cached.key === cacheKey ? cached.pack : null;

  if (network.status === 'success') {
    return { status: 'success', data: network.data, reload, refreshing: false };
  }
  if (local) {
    return {
      status: 'success',
      data: local,
      reload,
      refreshing: network.status === 'loading',
      offlineError: network.status === 'error' ? network.error : undefined,
    };
  }
  if (network.status === 'error')
    return { status: 'error', error: network.error, reload, refreshing: false };
  return { status: network.status, reload, refreshing: false };
}

/** Readable markdown for a resource URL. Pass `null` to skip fetching. */
export function useDocument(url: string | null) {
  return useAsync<ReadableDocument>(url, (signal) => fetchDocument(url!, signal));
}
