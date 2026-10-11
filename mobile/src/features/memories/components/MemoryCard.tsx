import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { getWorld } from '@/features/worlds/core/worlds';
import { colors, radius, scene, shadows, spacing, typography } from '@/theme/tokens';
import { Button } from '@/ui';

import type { Memory, MemoryKind } from '../core/memories';

export const KIND_LABEL: Record<MemoryKind, string> = {
  memory: 'Memory',
  insight: 'Insight',
  dream: 'Dream',
};

export interface MemoryCardProps {
  memory: Memory;
  onEdit?: (text: string) => void;
  onDelete?: () => void;
  /** Hide the world name when the card is already shown inside that world. */
  hideWorld?: boolean;
}

/** One saved moment: small context, the user's words, and clear edit/delete actions. */
export function MemoryCard({ memory, onEdit, onDelete, hideWorld }: MemoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const world = memory.worldId ? getWorld(memory.worldId) : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        {world && !hideWorld ? (
          <View style={[styles.dot, { backgroundColor: scene[world.sceneColor] }]} />
        ) : null}
        <Text style={styles.metaText}>
          {KIND_LABEL[memory.kind]}
          {world && !hideWorld ? ` · ${world.name}` : ''} ·{' '}
          {new Date(memory.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {memory.prompt ? <Text style={styles.prompt}>{memory.prompt}</Text> : null}

      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          style={styles.input}
          accessibilityLabel="Edit this memory"
        />
      ) : (
        <Text style={styles.text}>{memory.text}</Text>
      )}

      {onEdit || onDelete ? (
        <View style={styles.actions}>
          {editing ? (
            <>
              <Button
                label="Save"
                variant="link"
                onPress={() => {
                  onEdit?.(draft);
                  setEditing(false);
                }}
              />
              <Button
                label="Cancel"
                variant="link"
                onPress={() => {
                  setDraft(memory.text);
                  setEditing(false);
                }}
              />
            </>
          ) : (
            <>
              {onEdit ? (
                <Button label="Edit" variant="link" onPress={() => setEditing(true)} />
              ) : null}
              {onDelete ? (
                <Button
                  label={confirmDelete ? 'Tap again to delete' : 'Delete'}
                  variant="link"
                  onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
  prompt: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  text: { ...typography.body, color: colors.text },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 88,
    padding: spacing.sm + 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: spacing.lg },
});
