import type { ResearchTask, TaskKind } from '../types';

/** Which tasks to keep first when time is short. Learning and doing beat the rest. */
const PRIORITY: readonly TaskKind[] = [
  'learn',
  'practice',
  'reflect',
  'conversation',
  'experience',
];

export const TIME_BUDGETS = [15, 30, 60, 90] as const;

export interface DayPlan {
  today: ResearchTask[];
  later: ResearchTask[];
}

/**
 * Splits tasks into "today" (fits the time the user has) and "later". Pure and order-stable:
 * both lists keep the original task order. With no budget everything is today.
 *
 * Always plans at least one real task (the shortest non-reflect one), even if it is longer than
 * the budget, so a short day never produces an empty list.
 */
export function planDay(tasks: ResearchTask[], minutes?: number): DayPlan {
  if (minutes === undefined) return { today: tasks, later: [] };

  const chosen = new Set<string>();
  let used = 0;
  const byPriority = [...tasks].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  for (const task of byPriority) {
    if (used + task.estimatedMinutes <= minutes) {
      chosen.add(task.id);
      used += task.estimatedMinutes;
    }
  }

  const hasRealTask = tasks.some((t) => chosen.has(t.id) && t.kind !== 'reflect');
  if (!hasRealTask) {
    const shortest = tasks
      .filter((t) => t.kind !== 'reflect')
      .sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0];
    if (shortest) chosen.add(shortest.id);
  }

  return {
    today: tasks.filter((t) => chosen.has(t.id)),
    later: tasks.filter((t) => !chosen.has(t.id)),
  };
}
