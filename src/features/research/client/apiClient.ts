import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ApiErrorBody, ReadableDocument, ResearchPack, ResearchRequest } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Where the API routes live:
 * 1. EXPO_PUBLIC_API_URL when set (preview/production builds, e.g. your EAS Hosting URL).
 * 2. Web: same origin.
 * 3. Native dev: the Metro dev server that also serves the API routes.
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (Platform.OS === 'web') return '';
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri}`;
  throw new Error('EXPO_PUBLIC_API_URL is not set. See .env.example.');
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data ? data.error : 'Request failed.';
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export function fetchResearchPack(
  request: ResearchRequest,
  signal?: AbortSignal,
): Promise<ResearchPack> {
  return postJson<ResearchPack>('/api/research', request, signal);
}

export function fetchDocument(url: string, signal?: AbortSignal): Promise<ReadableDocument> {
  return postJson<ReadableDocument>('/api/document', { url }, signal);
}
