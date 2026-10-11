import { createPersistedStore } from '@/lib/persistedStore';

import { addMemory, editMemory, removeMemory, type Memory } from './core/memories';

function isMemoryList(value: unknown): value is Memory[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) =>
        m && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.kind === 'string',
    )
  );
}

const store = createPersistedStore<Memory[]>('oddies.memories.v1', [], isMemoryList);

export function useMemories() {
  const { value, hydrated } = store.use();
  return { memories: value, hydrated };
}

export const memoryActions = {
  add: (input: Pick<Memory, 'kind' | 'text' | 'worldId' | 'prompt'>) =>
    store.update((list) => addMemory(list, input, new Date())),
  edit: (id: string, text: string) =>
    store.update((list) => editMemory(list, id, text, new Date())),
  remove: (id: string) => store.update((list) => removeMemory(list, id)),
  removeAll: () => store.reset(),
};
