/**
 * Shared contract for the research feature.
 *
 * These types cross the network boundary (client <-> `src/app/api/*`), so treat changes like
 * an API change: add optional fields freely, but coordinate before renaming or removing one.
 */

export type Level = 'beginner' | 'intermediate' | 'advanced';

/**
 * A "lane" is one angle of research on a topic. Each lane becomes one Nimble search.
 * Lanes map onto Designing Your Life ideas: learn the field (overview, documents), try it
 * (practice), talk to people doing it (community = prototype conversations), and go see it
 * (events = prototype experiences).
 */
export type Lane = 'overview' | 'documents' | 'practice' | 'community' | 'events';

export const ALL_LANES: readonly Lane[] = [
  'overview',
  'documents',
  'practice',
  'community',
  'events',
];

/** What the timeline / branch picker hands to the research tool. */
export interface ResearchRequest {
  /** The branch the user chose for today, e.g. "music" or "learning to DJ". */
  topic: string;
  level?: Level;
  /** Optional free-text goal, e.g. "play a song for my friends". Sharpens the queries. */
  goal?: string;
  /** Id of the life-path branch on the timeline. Echoed back, never interpreted here. */
  pathId?: string;
  /** Subset of lanes to run. Defaults to all of them. Fewer lanes = fewer Nimble credits. */
  lanes?: Lane[];
  /** ISO country code for geo-targeted results, e.g. "US". */
  country?: string;
  /** Language code, e.g. "en". */
  locale?: string;
  /** Skip the server cache and search again. Used by "refresh". */
  refresh?: boolean;
}

export type ResourceKind = 'article' | 'document' | 'video' | 'community' | 'event';

export interface Resource {
  /** Stable id derived from the URL, so it survives re-fetches. */
  id: string;
  kind: ResourceKind;
  lane: Lane;
  title: string;
  url: string;
  /** Hostname without "www.", for display. */
  source: string;
  description: string;
}

/**
 * Task kinds follow the Odyssey Plan prototyping loop:
 * learn -> practice -> conversation -> experience -> reflect.
 */
export type TaskKind = 'learn' | 'practice' | 'conversation' | 'experience' | 'reflect';

export interface ResearchTask {
  /** Stable id (topic + kind + resource), so completion state persists across re-fetches. */
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  estimatedMinutes: number;
  /** The resource this task is built around, if any. */
  resourceId?: string;
}

export interface ResearchSummary {
  text: string;
  /** Maps "[n]" markers in `text` to resources. */
  citations: { marker: number; resourceId: string }[];
}

export interface ResearchPack {
  topic: string;
  level: Level;
  pathId?: string;
  /** ISO timestamp. */
  generatedAt: string;
  /** "mock" when the server has no NIMBLE_API_KEY. The UI should say so. */
  source: 'nimble' | 'mock';
  summary?: ResearchSummary;
  resources: Resource[];
  tasks: ResearchTask[];
  /** Non-fatal problems, e.g. one lane failed. Safe to show to the user. */
  warnings: string[];
}

/** A page fetched through Nimble Extract, for the in-app reader. */
export interface ReadableDocument {
  url: string;
  title?: string;
  markdown: string;
  /** True when the content was cut to keep the response small. */
  truncated: boolean;
  source: 'nimble' | 'mock';
}

export interface ApiErrorBody {
  error: string;
}
