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
const FILE_EXTENSION = /\.(pdf|docx?|pptx?|xlsx?)$/i;

/**
 * True for links to files (PDF, Word, PowerPoint...) rather than web pages. These can't go through
 * the in-app reader: the system browser's built-in viewer shows them properly instead.
 */
export function isFileUrl(url: string): boolean {
  try {
    return FILE_EXTENSION.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function refineKind(kind: ResourceKind, url: string, source: string): ResourceKind {
  // Only refine generic results; community/event lanes keep their meaning even on YouTube.
  if (kind !== 'article' && kind !== 'document') return kind;
  if (VIDEO_HOSTS.includes(source)) return 'video';
  if (isFileUrl(url)) return 'document';
  return kind;
}

/**
 * Search snippets often arrive as markdown ("# Title ## Intro **Key** [link](/x)"). Cards show
 * plain text, so strip the syntax, and drop a leading copy of the title, which is common.
 */
export function plainSnippet(text: string, title: string): string {
  const plain = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\n)\s*(?:[-*+]|\d+\.)\s+/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanTitle = title.trim();
  if (cleanTitle && plain.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    return plain.slice(cleanTitle.length).replace(/^[\s:–—-]+/, '');
  }
  return plain;
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
    description: truncate(plainSnippet(raw.description ?? '', title), MAX_DESCRIPTION),
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
