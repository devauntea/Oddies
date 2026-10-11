import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { CompanionState } from './core/daily';

/** On-device only. Bump the version if the shape changes. */
const KEY = 'oddies.companion.v1';
const INITIAL: CompanionState = { enabled: true };

let snapshot = { state: INITIAL, hydrated: false };
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: typeof snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function hydrate(): Promise<void> {
  hydrating ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      const parsed = raw ? (JSON.parse(raw) as Partial<CompanionState>) : {};
      emit({
        state: {
          enabled: parsed.enabled !== false,
          lastShownDay: typeof parsed.lastShownDay === 'string' ? parsed.lastShownDay : undefined,
        },
        hydrated: true,
      });
    })
    // Unreadable storage: behave like a first run rather than crash or nag forever.
    .catch(() => emit({ ...snapshot, hydrated: true }));
  return hydrating;
}

async function update(patch: Partial<CompanionState>): Promise<void> {
  await hydrate();
  emit({ state: { ...snapshot.state, ...patch }, hydrated: true });
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot.state));
  } catch {
    // Best effort: worst case she pops up again tomorrow-or-today.
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;

export function useCompanionState() {
  useEffect(() => {
    void hydrate();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const companionActions = {
  markShown: (day: string) => update({ lastShownDay: day }),
  setEnabled: (enabled: boolean) => update({ enabled }),
};
