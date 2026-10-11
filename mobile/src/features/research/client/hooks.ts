import type { ReadableDocument, ResearchPack, ResearchRequest } from '../types';
import { fetchDocument, fetchResearchPack } from './apiClient';
import { useAsync } from './useAsync';

/** Research pack for a branch. Pass `null` to skip fetching. */
export function useResearch(request: ResearchRequest | null) {
  const key = request ? JSON.stringify(request) : null;
  return useAsync<ResearchPack>(key, (signal) => fetchResearchPack(request!, signal));
}

/** Readable markdown for a resource URL. Pass `null` to skip fetching. */
export function useDocument(url: string | null) {
  return useAsync<ReadableDocument>(url, (signal) => fetchDocument(url!, signal));
}
