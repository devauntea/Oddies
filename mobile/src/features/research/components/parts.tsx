import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, colors, radius, scene, spacing, touch, typography } from '@/theme/tokens';

import type { ResourceKind, TaskKind } from '../types';

/**
 * Small building blocks for the research screens, styled after the playbook (style.md §8) and
 * the web app's Today panel: plum pill for the one primary action, quiet outlined pills for the
 * rest, and soft color pills that say what kind of step or source something is.
 */

/** A world's colors, when research was opened from one of the four worlds on the map. */
export interface ResearchTone {
  /** Short label, e.g. "Quiet Peaks · The Monk". */
  label: string;
  /** Strong color for small marks (the dot). */
  accent: string;
  /** Light color for fills (selected chips, progress). */
  soft: string;
}

export const TASK_KIND: Record<TaskKind, { label: string; color: string }> = {
  learn: { label: 'Learn', color: colors.accentSoft },
  practice: { label: 'Practice', color: scene.grassCenter },
  conversation: { label: 'Talk to someone', color: scene.founder },
  experience: { label: 'Go see it', color: scene.serenity },
  reflect: { label: 'Reflect', color: scene.artist },
};

export const RESOURCE_KIND: Record<ResourceKind, { label: string; action: string; color: string }> =
  {
    video: { label: 'Video', action: 'Watch', color: scene.artist },
    document: { label: 'Study doc', action: 'Read', color: colors.accentSoft },
    article: { label: 'Article', action: 'Read', color: scene.path },
    community: { label: 'Community', action: 'Visit', color: scene.founder },
    event: { label: 'Event', action: 'See details', color: scene.serenity },
  };

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  /** One per screen (style.md §8). Everything else stays quiet. */
  primary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  compact?: boolean;
}

export function PillButton({
  label,
  onPress,
  primary,
  disabled,
  accessibilityLabel,
  compact,
}: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={compact ? 6 : 0}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        primary && styles.buttonPrimary,
        pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonPressed),
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.overline}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: { ...typography.label, fontWeight: '700', color: colors.text },
  button: {
    minHeight: touch.min + 4,
    paddingHorizontal: spacing.lg + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: radius.pill,
  },
  buttonCompact: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.text },
  buttonPressed: { backgroundColor: colors.accentSoft },
  // The web app darkens a pressed primary button to navy.
  buttonPrimaryPressed: { backgroundColor: brand.navy, borderColor: brand.navy },
  buttonText: { ...typography.button, color: colors.text },
  buttonTextPrimary: { color: colors.onPrimary },
  disabled: { opacity: 0.5 },
  notice: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
  },
  noticeText: { ...typography.label, fontWeight: '400', color: colors.text },
  overline: { ...typography.overline, color: colors.textMuted },
});
