import AsyncStorage from '@react-native-async-storage/async-storage';

import { hashString } from '../core/ids';
import type { ResearchPack, ResearchRequest } from '../types';

/**
 * Last good research pack per branch, kept on the device so reopening a branch is instant
 * (and still works offline) while a fresh pack loads in the background.
 *
 * Bump the version if the ResearchPack shape changes in a way old packs can't satisfy.
 */
const PREFIX = 'oddies.research.pack.v1:';

/** Identifies a branch's research. Ignores `refresh` and `pathId`: they don't change content. */
export function packCacheKey(request: ResearchRequest): string {
  const { topic, level, goal, lanes, country, locale } = request;
  return (
    PREFIX + hashString(JSON.stringify([topic.toLowerCase(), level, goal, lanes, country, locale]))
  );
}

export async function loadCachedPack(key: string): Promise<ResearchPack | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const pack = JSON.parse(raw) as ResearchPack;
    // Cheap shape check so a corrupt entry can't crash the screen.
    return Array.isArray(pack.tasks) && Array.isArray(pack.resources) ? pack : null;
  } catch {
    return null;
  }
}

export async function saveCachedPack(key: string, pack: ResearchPack): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(pack));
  } catch {
    // Storage full or unavailable: caching is best-effort.
  }
}
