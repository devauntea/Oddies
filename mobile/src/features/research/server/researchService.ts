import {
  assemblePack,
  collectResultUrls,
  type LaneOutcome,
  type LaneSearchResult,
} from '../core/assemblePack';
import { buildQueryPlan, type SearchQuery } from '../core/queryPlan';
import type { NormalizedResearchRequest } from '../core/validate';
import type { ResearchPack } from '../types';
import { createTtlCache, type TtlCache } from './cache';
import { buildMockLaneResult } from './fixtures';
import type { FindDeadLinksFn } from './linkCheck';

/** `signal` is aborted when the shared deadline passes. Implementations should honour it. */
export type SearchFn = (
  query: SearchQuery,
  options?: { signal?: AbortSignal },
) => Promise<LaneSearchResult>;

/** All lane searches share this limit, so a phone never waits on a stuck lane. */
export const SEARCH_DEADLINE_MS = 20_000;

export class ResearchUnavailableError extends Error {
  constructor() {
    super('Research is unavailable right now. Please try again shortly.');
    this.name = 'ResearchUnavailableError';
  }
}

export class ResearchTimeoutError extends Error {
  constructor() {
    super('Research took too long. Please try again.');
    this.name = 'ResearchTimeoutError';
  }
}

export interface ResearchServiceDeps {
  /** Null when no Nimble key is configured: the service then serves mock data. */
  search: SearchFn | null;
  /** Finds results that are gone (404s) so they're left out. Skipped when absent. */
  findDeadLinks?: FindDeadLinksFn;
  cache?: TtlCache<ResearchPack>;
  now?: () => Date;
  log?: (message: string, error: unknown) => void;
  deadlineMs?: number;
}

/** Default cache: identical requests within 30 minutes reuse the pack and save credits. */
export const defaultResearchCache = createTtlCache<ResearchPack>({
  ttlMs: 30 * 60 * 1000,
  maxEntries: 200,
});

function cacheKey(request: NormalizedResearchRequest): string {
  const { topic, level, goal, lanes, country, locale } = request;
  return JSON.stringify([topic.toLowerCase(), level, goal, lanes, country, locale]);
}

export async function runResearch(
  request: NormalizedResearchRequest,
  deps: ResearchServiceDeps,
): Promise<ResearchPack> {
  const now = deps.now ?? (() => new Date());
  const plan = buildQueryPlan(request);

  if (!deps.search) {
    const outcomes: LaneOutcome[] = plan.map((planned) => ({
      planned,
      ok: true,
      result: buildMockLaneResult(planned, request.topic),
    }));
    return assemblePack(request, outcomes, { source: 'mock', now: now() });
  }

  const key = cacheKey(request);
  const cached = request.refresh ? undefined : deps.cache?.get(key);
  // pathId is not part of the key: re-stamp it so the caller always gets its own back.
  if (cached) return { ...cached, pathId: request.pathId };

  const search = deps.search;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.deadlineMs ?? SEARCH_DEADLINE_MS);
  let settled: PromiseSettledResult<LaneSearchResult>[];
  try {
    settled = await Promise.allSettled(
      plan.map((planned) => search(planned.query, { signal: controller.signal })),
    );
  } finally {
    clearTimeout(timer);
  }
  const outcomes: LaneOutcome[] = settled.map((result, i) => {
    const planned = plan[i]!;
    if (result.status === 'fulfilled') return { planned, ok: true, result: result.value };
    deps.log?.(`Nimble search failed for lane "${planned.lane}"`, result.reason);
    return { planned, ok: false };
  });

  if (outcomes.every((outcome) => !outcome.ok)) {
    throw controller.signal.aborted ? new ResearchTimeoutError() : new ResearchUnavailableError();
  }

  let deadUrls = new Set<string>();
  if (deps.findDeadLinks) {
    try {
      deadUrls = await deps.findDeadLinks(collectResultUrls(outcomes));
    } catch (error) {
      // Link checking is a nicety: if it breaks, show everything rather than nothing.
      deps.log?.('Link check failed', error);
    }
  }

  const pack = assemblePack(request, outcomes, { source: 'nimble', now: now(), deadUrls });
  // Only cache complete packs, so a transient lane failure isn't remembered for 30 minutes.
  if (pack.warnings.length === 0) deps.cache?.set(key, pack);
  return pack;
}
