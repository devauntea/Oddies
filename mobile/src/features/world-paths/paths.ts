import type { Goal, GoalProgress, GoalStatus, Point, Progress, WorldPath } from './types';

/**
 * Path rules, kept pure so they are easy to test. A goal is available once everything it
 * `requires` is completed; the same `requires` lists draw the connections, so the picture and the
 * rules can never disagree. Branches work too: several goals may require one id, and one goal may
 * require several.
 */

export function emptyEntry(): GoalProgress {
  return { completed: false, note: '', plannedDate: '' };
}

export function initialProgress(paths: readonly WorldPath[]): Progress {
  const progress: Progress = {};
  for (const path of paths) {
    for (const goal of path.goals) {
      progress[goal.id] = { ...emptyEntry(), completed: goal.seedCompleted === true };
    }
  }
  return progress;
}

export function goalStatus(goal: Goal, progress: Progress): GoalStatus {
  if (progress[goal.id]?.completed) return 'completed';
  return goal.requires.every((id) => progress[id]?.completed) ? 'available' : 'locked';
}

/** The first goal that can be done now, or undefined when the whole path is complete. */
export function nextGoal(path: WorldPath, progress: Progress): Goal | undefined {
  return path.goals.find((goal) => goalStatus(goal, progress) === 'available');
}

export function completedCount(path: WorldPath, progress: Progress): number {
  return path.goals.filter((goal) => progress[goal.id]?.completed).length;
}

export function connections(path: WorldPath): { from: Goal; to: Goal }[] {
  const byId = new Map(path.goals.map((goal) => [goal.id, goal]));
  return path.goals.flatMap((to) =>
    to.requires.flatMap((id) => {
      const from = byId.get(id);
      return from ? [{ from, to }] : [];
    }),
  );
}

/** A soft vertical S-curve between two goals, as an SVG path. */
export function curveBetween(from: Point, to: Point): string {
  const middleY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${middleY} ${to.x} ${middleY} ${to.x} ${to.y}`;
}

/**
 * Marks a goal done or not done. Completing needs every requirement done first. Undoing a goal
 * also undoes everything that depended on it, but keeps their notes and dates.
 */
export function changeCompletion(
  path: WorldPath,
  progress: Progress,
  goalId: string,
  completed: boolean,
): Progress {
  const goal = path.goals.find((item) => item.id === goalId);
  if (!goal) return progress;
  if (completed && goal.requires.some((id) => !progress[id]?.completed)) return progress;

  const updated: Progress = {
    ...progress,
    [goalId]: { ...emptyEntry(), ...progress[goalId], completed },
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of path.goals) {
      const entry = updated[item.id];
      if (entry?.completed && item.requires.some((id) => !updated[id]?.completed)) {
        updated[item.id] = { ...entry, completed: false };
        changed = true;
      }
    }
  }
  return updated;
}

/** An optional plan date: empty, or a real calendar day written YYYY-MM-DD. */
export function validPlannedDate(value: string): boolean {
  if (!value) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Reads saved progress (`{ version: 1, goals }`). Unknown goals are dropped, missing ones start
 * empty, bad values are cleaned, and a goal saved as done with an unfinished requirement is
 * repaired. Throws on a format it does not recognise.
 */
export function restoreProgress(serialized: string | null, paths: readonly WorldPath[]): Progress {
  if (serialized === null) return initialProgress(paths);
  const value: unknown = JSON.parse(serialized);
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.goals)) {
    throw new Error('Unsupported progress format');
  }
  const saved = value.goals;
  let result: Progress = {};
  for (const path of paths) {
    for (const goal of path.goals) {
      const item = saved[goal.id];
      const entry = isRecord(item) ? item : {};
      const note = typeof entry.note === 'string' ? entry.note.slice(0, 4000) : '';
      const date = typeof entry.plannedDate === 'string' ? entry.plannedDate : '';
      result[goal.id] = {
        completed: entry.completed === true,
        note,
        plannedDate: validPlannedDate(date) ? date : '',
      };
    }
    for (const goal of path.goals) {
      const broken = goal.requires.some((id) => !result[id]?.completed);
      if (result[goal.id]?.completed && broken) {
        result = changeCompletion(path, result, goal.id, false);
      }
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
