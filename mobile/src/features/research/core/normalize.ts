import type { Lane, Resource, ResourceKind } from '../types';
import { hostnameOf, normalizeUrl, resourceIdFor } from './ids';
import { isBlockedHost } from './quality';

/** The fields we read from a Nimble search result. */
export interface RawSearchResult {
  title: string;
  url: string;
  description?: string;
}

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'm.youtube.com'];
const MAX_DESCRIPTION = 280;

function refineKind(kind: ResourceKind, url: string, source: string): ResourceKind {
  // Only refine generic results; community/event lanes keep their meaning even on YouTube.
  if (kind !== 'article' && kind !== 'document') return kind;
  if (VIDEO_HOSTS.includes(source)) return 'video';
  if (/\.(pdf|docx?|pptx?)$/i.test(new URL(url).pathname)) return 'document';
  return kind;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function toResource(raw: RawSearchResult, lane: Lane, kind: ResourceKind): Resource | null {
  const url = normalizeUrl(raw.url);
  if (!url) return null;
  const source = hostnameOf(url);
  if (isBlockedHost(source)) return null;
  const title = raw.title?.trim() || source;
  return {
    id: resourceIdFor(url),
    kind: refineKind(kind, url, source),
    lane,
    title,
    url,
    source,
    description: truncate((raw.description ?? '').replace(/\s+/g, ' ').trim(), MAX_DESCRIPTION),
  };
}

/** Keeps the first occurrence of each resource id (lanes earlier in the plan win). */
export function dedupeResources(resources: Resource[]): Resource[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.id)) return false;
    seen.add(resource.id);
    return true;
  });
}
