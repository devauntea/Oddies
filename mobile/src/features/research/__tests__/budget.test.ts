import { planDay } from '../core/budget';
import { buildTasks } from '../core/taskBuilder';
import type { ResearchTask } from '../types';

const tasks = buildTasks({ topic: 'music', level: 'beginner', resources: [] });
const minutesOf = (list: ResearchTask[]) => list.reduce((sum, t) => sum + t.estimatedMinutes, 0);

describe('planDay', () => {
  it('keeps everything today when there is no budget', () => {
    expect(planDay(tasks)).toEqual({ today: tasks, later: [] });
  });

  it('never exceeds the budget when something fits, and keeps original order', () => {
    const { today, later } = planDay(tasks, 30);
    expect(minutesOf(today)).toBeLessThanOrEqual(30);
    expect(today.map((t) => t.kind)).toEqual(['learn', 'reflect']);
    expect([...today, ...later].map((t) => t.id).sort()).toEqual(tasks.map((t) => t.id).sort());
    expect(later.map((t) => t.kind)).toEqual(['practice', 'conversation', 'experience']);
  });

  it('prioritises learning and doing over talking and going when time is tight', () => {
    const { today } = planDay(tasks, 40);
    expect(today.map((t) => t.kind)).toEqual(['learn', 'practice', 'reflect']);
  });

  it('puts every task today when the budget is generous', () => {
    expect(planDay(tasks, 90).later).toEqual([]);
  });

  it('still plans one real task when the budget is smaller than any task', () => {
    const { today } = planDay(tasks, 5);
    expect(today.some((t) => t.kind !== 'reflect')).toBe(true);
    expect(today.filter((t) => t.kind !== 'reflect')).toHaveLength(1);
  });
});
