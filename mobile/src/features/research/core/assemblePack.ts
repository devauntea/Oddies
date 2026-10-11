import type { Lane, Resource, ResearchPack, ResearchSummary } from '../types';
import { dedupeResources, toResource, type RawSearchResult } from './normalize';
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
  practice: 'practice ideas',
  community: 'communities',
  events: 'events',
};

function buildSummary(outcome: LaneOutcome | undefined): ResearchSummary | undefined {
  if (!outcome?.ok || !outcome.result.answer) return undefined;
  const { results, answer, answer_citations } = outcome.result;
  const citations = (answer_citations ?? []).flatMap(({ marker, result_index }) => {
    const raw = results[result_index];
    const resource = raw && toResource(raw, outcome.planned.lane, outcome.planned.kind);
    return resource ? [{ marker, resourceId: resource.id }] : [];
  });
  return { text: answer, citations };
}

/**
 * Pure: turns per-lane search outcomes into the pack the app renders.
 * Failed lanes become user-safe warnings; they never fail the whole pack.
 */
export function assemblePack(
  request: NormalizedResearchRequest,
  outcomes: LaneOutcome[],
  options: { source: ResearchPack['source']; now: Date },
): ResearchPack {
  const resources: Resource[] = [];
  const warnings: string[] = [];

  for (const outcome of outcomes) {
    if (!outcome.ok) {
      warnings.push(`Couldn't load ${LANE_LABEL[outcome.planned.lane]} right now.`);
      continue;
    }
    for (const raw of outcome.result.results) {
      const resource = toResource(raw, outcome.planned.lane, outcome.planned.kind);
      if (resource) resources.push(resource);
    }
  }

  const unique = dedupeResources(resources);

  return {
    topic: request.topic,
    level: request.level,
    ...(request.pathId && { pathId: request.pathId }),
    generatedAt: options.now.toISOString(),
    source: options.source,
    summary: buildSummary(outcomes.find((o) => o.planned.lane === 'overview')),
    resources: unique,
    tasks: buildTasks({ topic: request.topic, level: request.level, resources: unique }),
    warnings,
  };
}
