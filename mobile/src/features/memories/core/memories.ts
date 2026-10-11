import type { WorldId } from '@/features/worlds/core/worlds';

/**
 * Something the user chose to keep: a memory (already happened), an insight (realised today)
 * or a dream (wanted). Only ever written by the user; the app never invents one.
 */
export type MemoryKind = 'memory' | 'insight' | 'dream';

export interface Memory {
  id: string;
  kind: MemoryKind;
  text: string;
  /** The world it was saved in, if any. */
  worldId?: WorldId;
  /** The question it answered, for context when revisiting. */
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

export const MEMORY_KINDS: readonly MemoryKind[] = ['memory', 'insight', 'dream'];

export const MAX_MEMORY_LENGTH = 2000;

export function newMemoryId(now: Date, random: () => number = Math.random): string {
  return `m_${now.getTime().toString(36)}${Math.floor(random() * 1e6).toString(36)}`;
}

export function addMemory(
  list: Memory[],
  input: Pick<Memory, 'kind' | 'text' | 'worldId' | 'prompt'>,
  now: Date,
  id = newMemoryId(now),
): Memory[] {
  const text = input.text.trim().slice(0, MAX_MEMORY_LENGTH);
  if (!text) return list;
  const at = now.toISOString();
  return [{ ...input, text, id, createdAt: at, updatedAt: at }, ...list];
}

export function editMemory(list: Memory[], id: string, text: string, now: Date): Memory[] {
  const trimmed = text.trim().slice(0, MAX_MEMORY_LENGTH);
  if (!trimmed) return list;
  return list.map((m) => (m.id === id ? { ...m, text: trimmed, updatedAt: now.toISOString() } : m));
}

export function removeMemory(list: Memory[], id: string): Memory[] {
  return list.filter((m) => m.id !== id);
}

/** Newest first, grouped by calendar day (local time) for the story view. */
export function groupByDay(list: Memory[]): { day: string; items: Memory[] }[] {
  const groups = new Map<string, Memory[]>();
  for (const memory of [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const day = new Date(memory.createdAt).toDateString();
    groups.set(day, [...(groups.get(day) ?? []), memory]);
  }
  return [...groups.entries()].map(([day, items]) => ({ day, items }));
}

/** Plain-text export the user can share or keep (product brief: export controls). */
export function exportStory(list: Memory[], worldName: (id: WorldId) => string): string {
  return groupByDay(list)
    .map(({ day, items }) =>
      [
        day,
        ...items.map((m) => {
          const where = m.worldId ? ` · ${worldName(m.worldId)}` : '';
          return `- [${m.kind}${where}] ${m.text}`;
        }),
      ].join('\n'),
    )
    .join('\n\n');
}
