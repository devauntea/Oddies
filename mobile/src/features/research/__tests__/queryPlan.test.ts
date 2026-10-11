import { buildQueryPlan } from '../core/queryPlan';
import { parseResearchRequest } from '../core/validate';

function plan(body: object) {
  const parsed = parseResearchRequest(body);
  if (!parsed.ok) throw new Error(parsed.error);
  return buildQueryPlan(parsed.value);
}

describe('buildQueryPlan', () => {
  it('plans one search per lane', () => {
    expect(plan({ topic: 'music' }).map((p) => p.lane)).toEqual([
      'overview',
      'documents',
      'videos',
      'practice',
      'community',
      'events',
    ]);
  });

  it('asks for an AI answer only on the overview lane', () => {
    const withAnswer = plan({ topic: 'music' }).filter((p) => p.query.include_answer);
    expect(withAnswer.map((p) => p.lane)).toEqual(['overview']);
  });

  it('restricts the documents lane to document content types', () => {
    const documents = plan({ topic: 'music' }).find((p) => p.lane === 'documents');
    expect(documents?.query.content_type).toEqual(['documents']);
  });

  it('restricts the videos lane to YouTube', () => {
    const videos = plan({ topic: 'music' }).find((p) => p.lane === 'videos');
    expect(videos).toMatchObject({ kind: 'video', query: { include_domains: ['youtube.com'] } });
  });

  it('weaves level and goal into the queries', () => {
    const [overview] = plan({
      topic: 'music',
      level: 'advanced',
      goal: 'write a song',
      lanes: ['overview'],
    });
    expect(overview?.query.query).toBe('how to get started with music advanced to write a song');
  });

  it('passes geo settings through and omits them when absent', () => {
    const [withGeo] = plan({ topic: 'music', country: 'gb', locale: 'en', lanes: ['overview'] });
    expect(withGeo?.query).toMatchObject({ country: 'GB', locale: 'en' });
    const [withoutGeo] = plan({ topic: 'music', lanes: ['overview'] });
    expect(withoutGeo?.query).not.toHaveProperty('country');
  });
});
