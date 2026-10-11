// Direct module imports: the world-paths index pulls in screens that lead back to the home map.
import { goalStatus, nextGoal } from '@/features/world-paths/paths';
import type { Goal, Progress, WorldPath } from '@/features/world-paths/types';

import type { CompanionMessage } from './messages';

/**
 * A nudge grounded in the user's own plan on a world path (a goal they gave a date to). Only
 * goals that can be done now (status "available") count; nothing here is invented.
 */
export interface PathNudge {
  message: CompanionMessage;
  goal: Goal;
  /** "today": planned for today. "missed": the planned day has passed and it isn't done. */
  when: 'today' | 'missed';
}

/** Prefers a goal planned for today; otherwise the most recently missed one. */
export function pathNudge(
  paths: readonly WorldPath[],
  progress: Progress,
  today: string,
): PathNudge | undefined {
  let missed: { path: WorldPath; goal: Goal; date: string } | undefined;

  for (const path of paths) {
    for (const goal of path.goals) {
      const date = progress[goal.id]?.plannedDate;
      if (!date || goalStatus(goal, progress) !== 'available') continue;
      if (date === today) return build(path, goal, 'today');
      if (date < today && (!missed || date > missed.date)) missed = { path, goal, date };
    }
  }
  return missed ? build(missed.path, missed.goal, 'missed', missed.date) : undefined;
}

function build(path: WorldPath, goal: Goal, when: PathNudge['when'], date?: string): PathNudge {
  const text =
    when === 'today'
      ? `Today’s the day you planned: ${goal.nextTitle}. Even five minutes counts.`
      : `You’d planned to ${lowerFirst(goal.nextTitle)} on ${formatDay(date!)}. Does it still feel right, or pick a new day?`;
  return {
    goal,
    when,
    message: {
      id: `plan:${goal.id}`,
      kind: 'advice',
      worldId: path.worldId,
      eyebrow: when === 'today' ? 'Your plan for today' : 'Picking back up',
      text,
    },
  };
}

/** The next step on a world's path, for "Next on your path: …" under a world's message. */
export function nextStepTitle(
  paths: readonly WorldPath[],
  progress: Progress,
  worldId: string | undefined,
): string | undefined {
  const path = paths.find((p) => p.worldId === worldId);
  return path ? nextGoal(path, progress)?.nextTitle : undefined;
}

export function isPlanMessage(message: CompanionMessage): boolean {
  return message.id.startsWith('plan:');
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "2026-10-09" → "Oct 9", without depending on the device's Intl support. */
function formatDay(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[(m ?? 1) - 1]} ${d}`;
}
