import { toResource } from '../core/normalize';
import { buildTasks } from '../core/taskBuilder';
import type { Lane, Resource, ResourceKind } from '../types';

function resource(lane: Lane, kind: ResourceKind, path: string): Resource {
  return toResource({ title: `${lane} ${path}`, url: `https://example.com/${path}` }, lane, kind)!;
}

describe('buildTasks', () => {
  it('builds one task per step of the prototyping loop', () => {
    const tasks = buildTasks({ topic: 'music', level: 'beginner', resources: [] });
    expect(tasks.map((t) => t.kind)).toEqual([
      'learn',
      'practice',
      'conversation',
      'experience',
      'reflect',
    ]);
    expect(tasks.every((t) => !t.resourceId)).toBe(true);
  });

  it('anchors tasks to matching resources', () => {
    const doc = resource('documents', 'document', 'guide.pdf');
    const practice = resource('practice', 'article', 'drills');
    const community = resource('community', 'community', 'forum');
    const event = resource('events', 'event', 'workshop');
    const tasks = buildTasks({
      topic: 'music',
      level: 'intermediate',
      resources: [practice, doc, community, event],
    });

    expect(tasks.find((t) => t.kind === 'learn')).toMatchObject({
      resourceId: doc.id,
      estimatedMinutes: 25,
    });
    expect(tasks.find((t) => t.kind === 'practice')).toMatchObject({
      resourceId: practice.id,
      estimatedMinutes: 30,
    });
    expect(tasks.find((t) => t.kind === 'conversation')?.resourceId).toBe(community.id);
    expect(tasks.find((t) => t.kind === 'experience')?.resourceId).toBe(event.id);
  });

  it('prefers a study doc, then an overview article, then a video for the learn step', () => {
    const video = resource('overview', 'video', 'watch');
    const article = resource('overview', 'article', 'intro');
    expect(
      buildTasks({ topic: 'music', level: 'beginner', resources: [video, article] })[0]?.resourceId,
    ).toBe(article.id);
    const [watch] = buildTasks({ topic: 'music', level: 'beginner', resources: [video] });
    expect(watch?.title).toBe('Watch "overview watch"');
  });

  it('produces stable ids so progress survives a re-fetch', () => {
    const first = buildTasks({ topic: 'Music', level: 'beginner', resources: [] });
    const second = buildTasks({ topic: 'music', level: 'advanced', resources: [] });
    expect(first.map((t) => t.id)).toEqual(second.map((t) => t.id));
    expect(new Set(first.map((t) => t.id)).size).toBe(first.length);
  });
});
