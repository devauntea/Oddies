import { WORLD_PATHS } from '@/features/world-paths/data';
import { initialProgress } from '@/features/world-paths/paths';
import type { Progress } from '@/features/world-paths/types';

import { isPlanMessage, nextStepTitle, pathNudge } from '../core/nudge';

const TODAY = '2026-10-11';
const serenity = WORLD_PATHS.find((p) => p.worldId === 'serenity')!;
const founder = WORLD_PATHS.find((p) => p.worldId === 'founder')!;
// Seed data completes each path's first goal, so the second is the one available now.
const serenityNext = serenity.goals[1]!;
const serenityLocked = serenity.goals[2]!;
const founderNext = founder.goals[1]!;

function withPlans(plans: Record<string, string>): Progress {
  const progress = initialProgress(WORLD_PATHS);
  for (const [goalId, plannedDate] of Object.entries(plans)) {
    progress[goalId] = { ...progress[goalId]!, plannedDate };
  }
  return progress;
}

describe('pathNudge', () => {
  it('stays quiet when nothing is planned', () => {
    expect(pathNudge(WORLD_PATHS, initialProgress(WORLD_PATHS), TODAY)).toBeUndefined();
  });

  it('brings up a goal planned for today, from its world', () => {
    const nudge = pathNudge(WORLD_PATHS, withPlans({ [serenityNext.id]: TODAY }), TODAY)!;
    expect(nudge.when).toBe('today');
    expect(nudge.goal.id).toBe(serenityNext.id);
    expect(nudge.message.worldId).toBe('serenity');
    expect(nudge.message.text).toContain(serenityNext.nextTitle);
    expect(isPlanMessage(nudge.message)).toBe(true);
  });

  it('prefers today over a missed plan', () => {
    const progress = withPlans({ [founderNext.id]: '2026-10-01', [serenityNext.id]: TODAY });
    expect(pathNudge(WORLD_PATHS, progress, TODAY)?.goal.id).toBe(serenityNext.id);
  });

  it('picks the most recently missed plan and names its day', () => {
    const progress = withPlans({ [founderNext.id]: '2026-10-09', [serenityNext.id]: '2026-09-30' });
    const nudge = pathNudge(WORLD_PATHS, progress, TODAY)!;
    expect(nudge.when).toBe('missed');
    expect(nudge.goal.id).toBe(founderNext.id);
    expect(nudge.message.text).toContain('Oct 9');
  });

  it('ignores future plans, finished goals and goals that are still locked', () => {
    const future = withPlans({ [serenityNext.id]: '2026-10-20' });
    expect(pathNudge(WORLD_PATHS, future, TODAY)).toBeUndefined();

    const done = withPlans({ [serenityNext.id]: TODAY });
    done[serenityNext.id] = { ...done[serenityNext.id]!, completed: true };
    expect(pathNudge(WORLD_PATHS, done, TODAY)?.goal.id).not.toBe(serenityNext.id);

    const locked = withPlans({ [serenityLocked.id]: TODAY });
    expect(pathNudge(WORLD_PATHS, locked, TODAY)).toBeUndefined();
  });
});

describe('nextStepTitle', () => {
  it("names a world's next available goal", () => {
    const progress = initialProgress(WORLD_PATHS);
    expect(nextStepTitle(WORLD_PATHS, progress, 'serenity')).toBe(serenityNext.nextTitle);
  });

  it('is empty for no world or a finished path', () => {
    const progress = initialProgress(WORLD_PATHS);
    expect(nextStepTitle(WORLD_PATHS, progress, undefined)).toBeUndefined();
    for (const goal of serenity.goals)
      progress[goal.id] = { ...progress[goal.id]!, completed: true };
    expect(nextStepTitle(WORLD_PATHS, progress, 'serenity')).toBeUndefined();
  });
});
