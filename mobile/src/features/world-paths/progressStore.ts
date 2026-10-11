import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { WORLD_PATHS } from './data';
import { changeCompletion, emptyEntry, initialProgress, restoreProgress } from './paths';
import type { Progress } from './types';

/**
 * Goal progress, notes and plan dates, kept on the device with AsyncStorage. One small shared
 * store, so every screen sees the same progress without a provider. Writes are queued so a slow
 * save can never overwrite a newer one.
 */
const STORAGE_KEY = 'oddies:goal-progress:v1';

type Snapshot = { progress: Progress; ready: boolean; error: string | null };

let snapshot: Snapshot = { progress: initialProgress(WORLD_PATHS), ready: false, error: null };
const listeners = new Set<() => void>();
let loadStarted = false;
let writes: Promise<void> = Promise.resolve();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

async function load() {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    setSnapshot({ ...snapshot, progress: restoreProgress(saved, WORLD_PATHS), ready: true });
  } catch {
    setSnapshot({ ...snapshot, ready: true, error: 'Your saved progress could not be loaded.' });
  }
}

function persist(progress: Progress) {
  const payload = JSON.stringify({ version: 1, goals: progress });
  writes = writes.then(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, payload);
      if (snapshot.error) setSnapshot({ ...snapshot, error: null });
    } catch {
      setSnapshot({ ...snapshot, error: 'Your last change could not be saved.' });
    }
  });
}

function update(progress: Progress) {
  setSnapshot({ ...snapshot, progress });
  persist(progress);
}

/** Marks a goal done or not done, following the path's rules. */
export function completeGoal(worldId: string, goalId: string, completed: boolean) {
  const path = WORLD_PATHS.find((item) => item.worldId === worldId);
  if (!path || !snapshot.ready) return;
  update(changeCompletion(path, snapshot.progress, goalId, completed));
}

/** Saves the note and plan date of a goal. */
export function saveGoalPlan(goalId: string, note: string, plannedDate: string) {
  if (!snapshot.ready) return;
  const entry = { ...emptyEntry(), ...snapshot.progress[goalId], note, plannedDate };
  update({ ...snapshot.progress, [goalId]: entry });
}

export function useGoalProgress(): Snapshot {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void load();
  }, []);
  return state;
}
