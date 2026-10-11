import { planDay, type ResearchTask } from '@/features/research';

/**
 * The one concrete step to show on a world's path: the first unfinished task that fits a short
 * day, skipping the reflection (that has its own place). Falls back to any unfinished task.
 */
export function pickNextAction(
  tasks: ResearchTask[],
  isDone: (taskId: string) => boolean,
  minutes = 30,
): ResearchTask | undefined {
  const open = (t: ResearchTask) => !isDone(t.id) && t.kind !== 'reflect';
  return planDay(tasks, minutes).today.find(open) ?? tasks.find(open);
}
