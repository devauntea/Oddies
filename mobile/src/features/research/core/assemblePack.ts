import type { Lane, Resource, ResearchPack, ResearchSummary } from '../types';
import { pickDailyResources } from './dailyPicks';
import { normalizeUrl } from './ids';
import { dedupeResources, toResource, type RawSearchResult } from './normalize';
import { capPerHost } from './quality';
import type { PlannedSearch } from './queryPlan';
import { buildTasks } from './taskBuilder';
import type { NormalizedResearchRequest } from './validate';

/** What one lane's search returned. Mirrors the parts of Nimble's SearchResponse we use. */
export interface LaneSearchResult {
  results: RawSearchResult[];
  answer?: string | null;
  answer_citations?: { marker: number; result_index: number }[] | null;
}

export type LaneOutcome =
  | { planned: PlannedSearch; ok: true; result: LaneSearchResult }
  | { planned: PlannedSearch; ok: false };

const LANE_LABEL: Record<Lane, string> = {
  overview: 'overview',
  documents: 'study documents',
  videos: 'videos',
  practice: 'practice ideas',
  community: 'communities',
  events: 'events',
};

/**
 * The overview answer, citing only resources the user actually gets. Markers for sources that
 * were dropped (dead, or not among the day's picks) are removed from the text too, so no "[3]"
 * points at nothing.
 */
function buildSummary(
  outcome: LaneOutcome | undefined,
  isKept: (resourceId: string) => boolean,
): ResearchSummary | undefined {
  if (!outcome?.ok || !outcome.result.answer) return undefined;
  const { results, answer, answer_citations } = outcome.result;
  const citations = (answer_citations ?? []).flatMap(({ marker, result_index }) => {
    const raw = results[result_index];
    const resource = raw && toResource(raw, outcome.planned.lane, outcome.planned.kind);
    return resource && isKept(resource.id) ? [{ marker, resourceId: resource.id }] : [];
  });
  const markers = new Set(citations.map((c) => c.marker));
  const text = answer
    .replace(/\s*\[(\d+)\]/g, (match, n: string) => (markers.has(Number(n)) ? match : ''))
    .trim();
  return { text, citations };
}

/** Normalised URLs of every result across lanes, for link checking before assembly. */
export function collectResultUrls(outcomes: LaneOutcome[]): string[] {
  const urls = new Set<string>();
  for (const outcome of outcomes) {
    if (!outcome.ok) continue;
    for (const raw of outcome.result.results) {
      const url = normalizeUrl(raw.url);
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

/**
 * Pure: turns per-lane search outcomes into the pack the app renders.
 * Failed lanes become user-safe warnings; they never fail the whole pack.
 * Results whose normalised URL is in `deadUrls` (e.g. 404s) are left out entirely, one site
 * fills at most 2 slots, and the rest are narrowed to the day's few sources
 * (see `pickDailyResources`). Citations only point at sources the user gets.
 */
export function assemblePack(
  request: NormalizedResearchRequest,
  outcomes: LaneOutcome[],
  options: { source: ResearchPack['source']; now: Date; deadUrls?: ReadonlySet<string> },
): ResearchPack {
  const isDead = (resource: Resource) => options.deadUrls?.has(resource.url) ?? false;
  const resources: Resource[] = [];
  const warnings: string[] = [];

  for (const outcome of outcomes) {
    if (!outcome.ok) {
      warnings.push(`Couldn't load ${LANE_LABEL[outcome.planned.lane]} right now.`);
      continue;
    }
    for (const raw of outcome.result.results) {
      const resource = toResource(raw, outcome.planned.lane, outcome.planned.kind);
      if (resource && !isDead(resource)) resources.push(resource);
    }
  }

  const unique = capPerHost(dedupeResources(resources));
  // Tasks choose from every result; the user then gets only the day's handful of sources.
  const tasks = buildTasks({ topic: request.topic, level: request.level, resources: unique });
  const daily = pickDailyResources(unique, tasks);
  const kept = new Set(daily.map((r) => r.id));

  return {
    topic: request.topic,
    level: request.level,
    ...(request.pathId && { pathId: request.pathId }),
    generatedAt: options.now.toISOString(),
    source: options.source,
    summary: buildSummary(
      outcomes.find((o) => o.planned.lane === 'overview'),
      (id) => kept.has(id),
    ),
    resources: daily,
    tasks,
    warnings,
  };
}
