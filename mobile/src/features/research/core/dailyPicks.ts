import type { Lane, Resource, ResearchTask } from '../types';

/** How many sources a pack hands the user for the day. Enough to act on, not a reading list. */
export const MAX_DAILY_RESOURCES = 5;

/** When filling spare slots, lanes not yet represented are tried in this order. */
const FILL_ORDER: readonly Lane[] = [
  'videos',
  'overview',
  'documents',
  'practice',
  'community',
  'events',
];

/**
 * Narrows the day's resources to `limit`. Resources that today's tasks point at always stay (the
 * task cards link to them); spare slots go to lanes that aren't represented yet, then to whatever
 * ranks highest. The result keeps the original (lane) order.
 */
export function pickDailyResources(
  resources: Resource[],
  tasks: ResearchTask[],
  limit: number = MAX_DAILY_RESOURCES,
): Resource[] {
  const picked = new Set<string>();
  const pick = (resource: Resource | undefined) => {
    if (resource && picked.size < limit) picked.add(resource.id);
  };

  const byId = new Map(resources.map((r) => [r.id, r]));
  for (const task of tasks) pick(task.resourceId ? byId.get(task.resourceId) : undefined);

  const lanesPicked = () => new Set(resources.filter((r) => picked.has(r.id)).map((r) => r.lane));
  for (const lane of FILL_ORDER) {
    if (!lanesPicked().has(lane)) pick(resources.find((r) => r.lane === lane));
  }
  for (const resource of resources) {
    if (!picked.has(resource.id)) pick(resource);
  }

  return resources.filter((r) => picked.has(r.id));
}
