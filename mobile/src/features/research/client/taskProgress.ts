import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Which research tasks the user has completed, persisted on-device.
 * Task ids are stable across re-fetches (see core/taskBuilder), so progress survives refreshes.
 *
 * Bump the key version if the stored shape changes.
 */
const STORAGE_KEY = 'oddies.research.taskProgress.v1';

/** taskId -> ISO timestamp of completion. */
type Progress = Record<string, string>;

const EMPTY_PROGRESS: Progress = {};
let progress: Progress = EMPTY_PROGRESS;
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw) progress = { ...(JSON.parse(raw) as Progress), ...progress };
    })
    .catch(() => {
      // Corrupt or unavailable storage: start fresh rather than crash.
    })
    .finally(emit);
  return loaded;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const next = { ...progress };
  if (done) next[taskId] = new Date().toISOString();
  else delete next[taskId];
  progress = next;
  emit();
  await load();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useTaskProgress() {
  useEffect(() => {
    void load();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => progress,
    () => EMPTY_PROGRESS,
  );
  const isDone = useCallback((taskId: string) => taskId in snapshot, [snapshot]);
  const toggle = useCallback((taskId: string) => setTaskDone(taskId, !(taskId in progress)), []);
  return { isDone, toggle };
}
