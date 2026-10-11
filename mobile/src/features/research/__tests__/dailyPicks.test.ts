import { MAX_DAILY_RESOURCES, pickDailyResources } from '../core/dailyPicks';
import type { Lane, Resource, ResearchTask, ResourceKind } from '../types';

function resource(lane: Lane, n: number, kind: ResourceKind = 'article'): Resource {
  return {
    id: `${lane}-${n}`,
    kind,
    lane,
    title: `${lane} ${n}`,
    url: `https://example.com/${lane}/${n}`,
    source: 'example.com',
    description: '',
  };
}

function task(resourceId?: string): ResearchTask {
  return {
    id: `t-${resourceId}`,
    kind: 'learn',
    title: 't',
    detail: '',
    estimatedMinutes: 5,
    resourceId,
  };
}

const all = [
  ...[1, 2, 3].map((n) => resource('overview', n)),
  ...[1, 2].map((n) => resource('documents', n, 'document')),
  ...[1, 2].map((n) => resource('videos', n, 'video')),
  ...[1, 2].map((n) => resource('practice', n)),
  ...[1, 2].map((n) => resource('community', n, 'community')),
  ...[1, 2].map((n) => resource('events', n, 'event')),
];

describe('pickDailyResources', () => {
  it('caps the day at five sources', () => {
    expect(pickDailyResources(all, [])).toHaveLength(MAX_DAILY_RESOURCES);
  });

  it("always keeps the resources today's tasks link to, then fills with a video", () => {
    const tasks = [
      task('documents-1'),
      task('practice-2'),
      task('community-1'),
      task('events-1'),
      task(),
    ];
    expect(pickDailyResources(all, tasks).map((r) => r.id)).toEqual([
      'documents-1',
      'videos-1',
      'practice-2',
      'community-1',
      'events-1',
    ]);
  });

  it('spreads spare slots across lanes before doubling up', () => {
    const picks = pickDailyResources(all, [task('overview-1')]);
    expect(new Set(picks.map((r) => r.lane)).size).toBe(5);
  });

  it('returns everything when there are fewer than five', () => {
    const few = all.slice(0, 3);
    expect(pickDailyResources(few, [])).toEqual(few);
  });
});
