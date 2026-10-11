import type { Lane, Level, ResourceKind } from '../types';
import { BLOCKED_DOMAINS } from './quality';
import type { NormalizedResearchRequest } from './validate';

/**
 * The subset of Nimble's `POST /v2/search` body we use. Kept local (rather than importing the
 * SDK's `SearchParams`) so this file stays pure and runs anywhere, including tests.
 */
export interface SearchQuery {
  query: string;
  max_results: number;
  search_depth?: 'lite' | 'standard';
  include_answer?: boolean;
  /** Semantic groups ('documents') or formats ('pdf'). Only valid with the general focus. */
  content_type?: string[];
  time_range?: 'week' | 'month' | 'year';
  /** Nimble allows at most 50. */
  exclude_domains?: string[];
  /** Only return results from these domains. */
  include_domains?: string[];
  country?: string;
  locale?: string;
}

export interface PlannedSearch {
  lane: Lane;
  /** Default kind for results from this lane; normalisation may refine it (e.g. video). */
  kind: ResourceKind;
  query: SearchQuery;
}

const LEVEL_PHRASE: Record<Level, string> = {
  beginner: 'for beginners',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

/** One Nimble search per requested lane. Order is stable and matches `ALL_LANES`. */
export function buildQueryPlan(request: NormalizedResearchRequest): PlannedSearch[] {
  const { topic, level, goal, lanes, country, locale } = request;
  const lvl = LEVEL_PHRASE[level];
  const forGoal = goal ? ` to ${goal}` : '';
  const geoOnly = { ...(country && { country }), ...(locale && { locale }) };
  const geo = { exclude_domains: [...BLOCKED_DOMAINS], ...geoOnly };

  const plans: Record<Lane, PlannedSearch> = {
    overview: {
      lane: 'overview',
      kind: 'article',
      query: {
        query: `how to get started with ${topic} ${lvl}${forGoal}`,
        max_results: 6,
        search_depth: 'standard',
        include_answer: true,
        ...geo,
      },
    },
    documents: {
      lane: 'documents',
      kind: 'document',
      query: {
        query: `${topic} ${lvl} study guide`,
        max_results: 4,
        search_depth: 'lite',
        content_type: ['documents'],
        ...geo,
      },
    },
    videos: {
      lane: 'videos',
      kind: 'video',
      query: {
        query: `${topic} ${lvl} lesson${forGoal}`,
        max_results: 4,
        search_depth: 'lite',
        // An allow-list makes the junk-domain block list moot.
        include_domains: ['youtube.com'],
        ...geoOnly,
      },
    },
    practice: {
      lane: 'practice',
      kind: 'article',
      query: {
        query: `${topic} practice exercises ${lvl}${forGoal}`,
        max_results: 5,
        search_depth: 'lite',
        ...geo,
      },
    },
    community: {
      lane: 'community',
      kind: 'community',
      query: {
        query: `${topic} community forum where ${level}s ask questions`,
        max_results: 5,
        search_depth: 'lite',
        ...geo,
      },
    },
    events: {
      lane: 'events',
      kind: 'event',
      query: {
        query: `${topic} workshops classes events`,
        max_results: 4,
        search_depth: 'lite',
        time_range: 'month',
        ...geo,
      },
    },
  };

  return lanes.map((lane) => plans[lane]);
}
