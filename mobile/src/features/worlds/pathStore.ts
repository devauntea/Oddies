import { createPersistedStore } from '@/lib/persistedStore';

import type { WorldId } from './core/worlds';

/** The user's own edits to a world's path. Milestones count only when the user confirms them. */
export interface PathState {
  goal?: string;
  confirmedMilestones: string[];
}

type AllPaths = Partial<Record<WorldId, PathState>>;

function isPaths(value: unknown): value is AllPaths {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const store = createPersistedStore<AllPaths>('oddies.paths.v1', {}, isPaths);
const EMPTY: PathState = { confirmedMilestones: [] };

export function usePath(worldId: WorldId) {
  const { value, hydrated } = store.use();
  return { path: value[worldId] ?? EMPTY, hydrated };
}

export const pathActions = {
  toggleMilestone: (worldId: WorldId, milestoneId: string) =>
    store.update((all) => {
      const current = all[worldId] ?? EMPTY;
      const has = current.confirmedMilestones.includes(milestoneId);
      const confirmedMilestones = has
        ? current.confirmedMilestones.filter((id) => id !== milestoneId)
        : [...current.confirmedMilestones, milestoneId];
      return { ...all, [worldId]: { ...current, confirmedMilestones } };
    }),
  setGoal: (worldId: WorldId, goal: string) =>
    store.update((all) => ({
      ...all,
      [worldId]: { ...(all[worldId] ?? EMPTY), goal: goal.trim() || undefined },
    })),
  removeAll: () => store.reset(),
};
