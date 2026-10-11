import type { Href } from 'expo-router';

import type { MemoryKind } from '@/features/memories';

import type { WorldId } from './core/worlds';

export function worldHref(id: WorldId): Href {
  return { pathname: '/world/[id]', params: { id } };
}

export function reflectHref(
  id: WorldId,
  options: { kind?: MemoryKind; prompt?: string } = {},
): Href {
  return {
    pathname: '/world/[id]/reflect',
    params: {
      id,
      ...(options.kind && { kind: options.kind }),
      ...(options.prompt && { prompt: options.prompt }),
    },
  };
}
