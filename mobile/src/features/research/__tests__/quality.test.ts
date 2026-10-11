import { assemblePack, type LaneOutcome } from '../core/assemblePack';
import { capPerHost, isBlockedHost } from '../core/quality';
import { buildQueryPlan } from '../core/queryPlan';
import { toResource } from '../core/normalize';
import { parseResearchRequest } from '../core/validate';

const request = (() => {
  const parsed = parseResearchRequest({ topic: 'music' });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
})();

describe('quality rules', () => {
  it('blocks listed domains and their subdomains only', () => {
    expect(isBlockedHost('pinterest.com')).toBe(true);
    expect(isBlockedHost('uk.pinterest.com')).toBe(true);
    expect(isBlockedHost('notpinterest.com')).toBe(false);
  });

  it('drops blocked results at normalisation time', () => {
    expect(
      toResource({ title: 'pin', url: 'https://www.pinterest.com/x' }, 'practice', 'article'),
    ).toBeNull();
  });

  it('caps results per host, keeping the earliest', () => {
    const items = ['a', 'a', 'b', 'a', 'b'].map((source, i) => ({ source, i }));
    expect(capPerHost(items, 2).map((x) => x.i)).toEqual([0, 1, 2, 4]);
  });

  it('asks Nimble to exclude blocked domains on every lane', () => {
    for (const planned of buildQueryPlan(request)) {
      expect(planned.query.exclude_domains).toContain('pinterest.com');
    }
  });

  it('limits one site to two resources and drops citations to filtered results', () => {
    const results = [1, 2, 3].map((n) => ({ title: `t${n}`, url: `https://same.com/${n}` }));
    const [overview] = buildQueryPlan({ ...request, lanes: ['overview'] });
    const outcomes: LaneOutcome[] = [
      {
        planned: overview!,
        ok: true,
        result: {
          results,
          answer: 'x [1] y [3]',
          answer_citations: [
            { marker: 1, result_index: 0 },
            { marker: 3, result_index: 2 },
          ],
        },
      },
    ];
    const pack = assemblePack(request, outcomes, { source: 'nimble', now: new Date(0) });
    expect(pack.resources).toHaveLength(2);
    expect(pack.summary?.citations.map((c) => c.marker)).toEqual([1]);
  });
});
