import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export interface PersistedStore<T> {
  /** Current value and whether it has been read from storage yet. */
  use(): { value: T; hydrated: boolean };
  /** Applies an update after hydration and persists it. */
  update(fn: (previous: T) => T): Promise<void>;
  /** For tests and "delete my data". */
  reset(): Promise<void>;
}

/**
 * A tiny on-device store: one AsyncStorage key, shared across screens via
 * useSyncExternalStore. `isValid` guards against old or corrupt data (it is then ignored).
 *
 * Bump the version in `key` when the stored shape changes incompatibly.
 */
export function createPersistedStore<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): PersistedStore<T> {
  let snapshot = { value: initial, hydrated: false };
  let hydrating: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: typeof snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  function hydrate(): Promise<void> {
    hydrating ??= AsyncStorage.getItem(key)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : undefined;
        emit({ value: isValid(parsed) ? parsed : snapshot.value, hydrated: true });
      })
      .catch(() => emit({ ...snapshot, hydrated: true }));
    return hydrating;
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const getSnapshot = () => snapshot;

  return {
    use() {
      useEffect(() => {
        void hydrate();
      }, []);
      return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    },
    async update(fn) {
      await hydrate();
      emit({ value: fn(snapshot.value), hydrated: true });
      try {
        await AsyncStorage.setItem(key, JSON.stringify(snapshot.value));
      } catch {
        // Storage unavailable: keep the in-memory value for this session.
      }
    },
    async reset() {
      await hydrate();
      emit({ value: initial, hydrated: true });
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
