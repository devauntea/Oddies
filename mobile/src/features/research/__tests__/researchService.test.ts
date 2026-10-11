/**
 * @jest-environment node
 */
import type { LaneSearchResult } from '../core/assemblePack';
import type { SearchQuery } from '../core/queryPlan';
import { parseResearchRequest, type NormalizedResearchRequest } from '../core/validate';
import { createTtlCache } from '../server/cache';
import {
  ResearchTimeoutError,
  ResearchUnavailableError,
  runResearch,
} from '../server/researchService';
import type { ResearchPack } from '../types';

const now = () => new Date('2026-01-01T00:00:00Z');

function request(body: object = { topic: 'music' }): NormalizedResearchRequest {
  const parsed = parseResearchRequest(body);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

const overviewResult: LaneSearchResult = {
  results: [
    { title: 'Start here', url: 'https://example.com/start', description: 'Intro' },
    { title: 'Theory', url: 'https://example.com/theory?utm_source=x', description: 'Basics' },
  ],
  answer: 'Learn the basics [1] then theory [2].',
  answer_citations: [
    { marker: 1, result_index: 0 },
    { marker: 2, result_index: 1 },
    { marker: 3, result_index: 9 },
  ],
};

function fakeSearch(byLane: (query: SearchQuery) => LaneSearchResult | Error) {
  return jest.fn(async (query: SearchQuery) => {
    const result = byLane(query);
    if (result instanceof Error) throw result;
    return result;
  });
}

describe('runResearch', () => {
  it('serves mock data when Nimble is not configured', async () => {
    const pack = await runResearch(request(), { search: null, now });
    expect(pack.source).toBe('mock');
    expect(pack.resources.length).toBeGreaterThan(0);
    expect(pack.resources.length).toBeLessThanOrEqual(5);
    expect(pack.tasks).toHaveLength(5);
    expect(pack.summary?.text).toBeTruthy();
  });

  it('assembles a pack from every lane, narrowed to five sources', async () => {
    const search = fakeSearch((q) =>
      q.include_answer
        ? overviewResult
        : {
            results: [
              // One site per lane, so the 2-per-site cap doesn't hide the 5-source pick.
              { title: q.query, url: `https://${q.query.split(' ').join('-')}.example/page` },
            ],
          },
    );
    const pack = await runResearch(request({ topic: 'music', pathId: 'branch-1' }), {
      search,
      now,
    });

    expect(search).toHaveBeenCalledTimes(6);
    expect(pack).toMatchObject({
      source: 'nimble',
      topic: 'music',
      pathId: 'branch-1',
      warnings: [],
    });
    expect(pack.generatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(pack.resources).toHaveLength(5);
    // Every task's resource is among the five, so "Open resource" always works.
    const ids = new Set(pack.resources.map((r) => r.id));
    expect(pack.tasks.every((t) => !t.resourceId || ids.has(t.resourceId))).toBe(true);
    // Citations, and their markers in the text, only point at sources the user gets.
    for (const { marker, resourceId } of pack.summary!.citations) {
      expect(ids.has(resourceId)).toBe(true);
      expect(pack.summary!.text).toContain(`[${marker}]`);
    }
    expect(pack.summary!.text.match(/\[\d+\]/g) ?? []).toHaveLength(pack.summary!.citations.length);
  });

  it('maps answer citations to resources', async () => {
    const search = fakeSearch(() => overviewResult);
    const pack = await runResearch(request({ topic: 'music', lanes: ['overview'] }), {
      search,
      now,
    });
    expect(pack.summary?.text).toBe(overviewResult.answer);
    // The out-of-range citation (result_index 9) is dropped.
    expect(pack.summary?.citations.map((c) => c.marker)).toEqual([1, 2]);
  });

  it('leaves out dead links, including from summary citations', async () => {
    const search = fakeSearch((q) => (q.include_answer ? overviewResult : { results: [] }));
    const findDeadLinks = jest.fn(async () => new Set(['https://example.com/start']));
    const pack = await runResearch(request({ topic: 'music', lanes: ['overview'] }), {
      search,
      findDeadLinks,
      now,
    });

    expect(findDeadLinks).toHaveBeenCalledWith([
      'https://example.com/start',
      'https://example.com/theory',
    ]);
    expect(pack.resources.map((r) => r.url)).toEqual(['https://example.com/theory']);
    expect(pack.summary?.citations.map((c) => c.marker)).toEqual([2]);
    expect(pack.summary?.text).toBe('Learn the basics then theory [2].');
  });

  it('keeps every result when link checking fails', async () => {
    const log = jest.fn();
    const search = fakeSearch((q) => (q.include_answer ? overviewResult : { results: [] }));
    const findDeadLinks = jest.fn(async () => {
      throw new Error('offline');
    });
    const pack = await runResearch(request({ topic: 'music', lanes: ['overview'] }), {
      search,
      findDeadLinks,
      now,
      log,
    });

    expect(pack.resources).toHaveLength(2);
    expect(log).toHaveBeenCalledWith('Link check failed', expect.any(Error));
  });

  it('turns a failed lane into a warning instead of failing the pack', async () => {
    const log = jest.fn();
    const search = fakeSearch((q) => (q.content_type ? new Error('boom') : { results: [] }));
    const pack = await runResearch(request(), { search, now, log });
    expect(pack.warnings).toEqual(["Couldn't load study documents right now."]);
    expect(log).toHaveBeenCalledWith(
      'Nimble search failed for lane "documents"',
      expect.any(Error),
    );
  });

  it('throws when every lane fails', async () => {
    const search = fakeSearch(() => new Error('down'));
    await expect(runResearch(request(), { search, now })).rejects.toBeInstanceOf(
      ResearchUnavailableError,
    );
  });

  it('caches complete packs and re-stamps the caller pathId', async () => {
    const cache = createTtlCache<ResearchPack>({ ttlMs: 60_000, maxEntries: 10 });
    const search = fakeSearch(() => ({ results: [] }));

    await runResearch(request({ topic: 'Music', pathId: 'a' }), { search, cache, now });
    const second = await runResearch(request({ topic: 'music', pathId: 'b' }), {
      search,
      cache,
      now,
    });

    expect(search).toHaveBeenCalledTimes(6);
    expect(second.pathId).toBe('b');
  });

  it('does not cache packs with warnings', async () => {
    const cache = createTtlCache<ResearchPack>({ ttlMs: 60_000, maxEntries: 10 });
    const search = fakeSearch((q) => (q.time_range ? new Error('flaky') : { results: [] }));

    await runResearch(request(), { search, cache, now });
    await runResearch(request(), { search, cache, now });

    expect(search).toHaveBeenCalledTimes(12);
  });
});

describe('runResearch deadline and refresh', () => {
  it('aborts slow searches at the shared deadline and reports a timeout', async () => {
    const search = jest.fn(
      (_query: SearchQuery, options?: { signal?: AbortSignal }) =>
        new Promise<LaneSearchResult>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(runResearch(request(), { search, now, deadlineMs: 20 })).rejects.toBeInstanceOf(
      ResearchTimeoutError,
    );
    expect(search).toHaveBeenCalledTimes(6);
  });

  it('keeps lanes that finish before the deadline', async () => {
    const search = jest.fn((query: SearchQuery, options?: { signal?: AbortSignal }) =>
      query.include_answer
        ? Promise.resolve<LaneSearchResult>({
            results: [{ title: 'Fast', url: 'https://example.com/fast' }],
          })
        : new Promise<LaneSearchResult>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
    );
    const pack = await runResearch(request(), { search, now, deadlineMs: 20, log: jest.fn() });
    expect(pack.resources.map((r) => r.title)).toEqual(['Fast']);
    expect(pack.warnings).toHaveLength(5);
  });

  it('skips the cache read on refresh but still stores the new pack', async () => {
    const cache = createTtlCache<ResearchPack>({ ttlMs: 60_000, maxEntries: 10 });
    const search = fakeSearch(() => ({ results: [] }));

    await runResearch(request(), { search, cache, now });
    await runResearch({ ...request(), refresh: true }, { search, cache, now });
    expect(search).toHaveBeenCalledTimes(12);

    await runResearch(request(), { search, cache, now });
    expect(search).toHaveBeenCalledTimes(12);
  });
});

describe('createTtlCache', () => {
  it('expires entries and evicts the oldest beyond capacity', () => {
    let time = 0;
    const cache = createTtlCache<number>({ ttlMs: 100, maxEntries: 2, now: () => time });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    time = 100;
    expect(cache.get('b')).toBeUndefined();
  });
});
