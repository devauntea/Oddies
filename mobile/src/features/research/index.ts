/**
 * Public, client-safe API of the research feature. Import from `@/features/research`, not from
 * deep paths, so the internals can be reorganised without touching other teams' code.
 *
 * Server code lives in `./server` and is only imported by `src/app/api/*` (lint-enforced).
 */
export type {
  Lane,
  Level,
  ReadableDocument,
  ResearchPack,
  ResearchRequest,
  ResearchSummary,
  ResearchTask,
  Resource,
  ResourceKind,
  TaskKind,
} from './types';
export { ALL_LANES } from './types';

export { ApiError, fetchDocument, fetchResearchPack } from './client/apiClient';
export { useDocument, useResearch } from './client/hooks';
export { setTaskDone, useTaskProgress } from './client/taskProgress';

export { MarkdownView } from './components/MarkdownView';
export { PillButton, type ResearchTone } from './components/parts';
export { ResearchPackView } from './components/ResearchPackView';
export { ResourceList } from './components/ResourceList';
export { TaskList } from './components/TaskList';

export { openResource, researchHref } from './navigation';
