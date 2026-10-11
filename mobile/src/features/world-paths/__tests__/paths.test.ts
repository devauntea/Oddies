import { WORLD_PATHS } from '../data';
import {
  changeCompletion,
  connections,
  curveBetween,
  goalStatus,
  initialProgress,
  nextGoal,
  restoreProgress,
  validPlannedDate,
} from '../paths';
import type { Goal, Progress, WorldPath } from '../types';

function goal(id: string, requires: string[] = []): Goal {
  return {
    id,
    title: id,
    nextTitle: id,
    description: '',
    action: '',
    research: id,
    icon: 'sprout',
    requires,
  };
}

const path: WorldPath = {
  worldId: 'serenity',
  speech: '',
  prompts: [],
  goals: [goal('a'), goal('b', ['a']), goal('c', ['b'])],
};

function done(...ids: string[]): Progress {
  return Object.fromEntries(
    ids.map((id) => [id, { completed: true, note: 'keep me', plannedDate: '' }]),
  );
}

describe('path rules', () => {
  it('does not complete a future goal by skipping its requirements', () => {
    const before = done('a');
    expect(goalStatus(path.goals[2]!, before)).toBe('locked');
    expect(changeCompletion(path, before, 'c', true)).toBe(before);
  });

  it('unlocks the next goal when one is completed', () => {
    const updated = changeCompletion(path, done('a'), 'b', true);
    expect(goalStatus(path.goals[2]!, updated)).toBe('available');
    expect(nextGoal(path, updated)?.id).toBe('c');
  });

  it('undoing a goal undoes what depends on it, keeping notes and other worlds', () => {
    const updated = changeCompletion(path, done('a', 'b', 'c', 'other-world'), 'a', false);
    expect(updated.b?.completed).toBe(false);
    expect(updated.c?.completed).toBe(false);
    expect(updated.c?.note).toBe('keep me');
    expect(updated['other-world']?.completed).toBe(true);
  });

  it('needs every requirement of a branch join', () => {
    const branched: WorldPath = {
      ...path,
      goals: [goal('a'), goal('b', ['a']), goal('c', ['a']), goal('d', ['b', 'c'])],
    };
    expect(goalStatus(branched.goals[2]!, done('a', 'b'))).toBe('available');
    expect(goalStatus(branched.goals[3]!, done('a', 'b'))).toBe('locked');
    expect(goalStatus(branched.goals[3]!, done('a', 'b', 'c'))).toBe('available');
    expect(connections(branched)).toHaveLength(4);
  });

  it('restores saved progress, dropping unknown ids and repairing broken requirements', () => {
    const saved = JSON.stringify({ version: 1, goals: done('c', 'unknown') });
    const restored = restoreProgress(saved, [path]);
    expect(restored.c?.completed).toBe(false);
    expect('unknown' in restored).toBe(false);
    expect(() => restoreProgress('not-json', [path])).toThrow();
    expect(() => restoreProgress(JSON.stringify({ version: 2 }), [path])).toThrow();
  });

  it('accepts real calendar days only', () => {
    expect(validPlannedDate('2028-02-29')).toBe(true);
    expect(validPlannedDate('2027-02-29')).toBe(false);
    expect(validPlannedDate('2026-04-31')).toBe(false);
    expect(validPlannedDate('')).toBe(true);
  });

  it('draws a vertical S-curve between two goals', () => {
    expect(curveBetween({ x: 160, y: 1020 }, { x: 218, y: 760 })).toBe(
      'M 160 1020 C 160 890 218 890 218 760',
    );
  });
});

describe('world paths data', () => {
  it('gives each of the four worlds a linked path of unique goals', () => {
    expect(WORLD_PATHS.map((item) => item.worldId)).toEqual([
      'serenity',
      'midnight',
      'artist',
      'founder',
    ]);
    const ids = WORLD_PATHS.flatMap((item) => item.goals.map((entry) => entry.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of WORLD_PATHS) {
      expect(connections(item)).toHaveLength(item.goals.length - 1);
      expect(item.prompts.length).toBeGreaterThan(0);
    }
  });

  it('starts with only the demo history done, and the next step available', () => {
    const progress = initialProgress(WORLD_PATHS);
    for (const item of WORLD_PATHS) {
      expect(nextGoal(item, progress)?.id).toBe(item.goals[1]?.id);
    }
  });
});
