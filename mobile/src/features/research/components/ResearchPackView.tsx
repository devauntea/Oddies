import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

import { useResearch } from '../client/hooks';
import { useTaskProgress } from '../client/taskProgress';
import { planDay, TIME_BUDGETS } from '../core/budget';
import type { ResearchRequest, Resource } from '../types';
import { ResourceList } from './ResourceList';
import { TaskList } from './TaskList';

export interface ResearchPackViewProps {
  request: ResearchRequest;
  /** Decide where a resource opens (in-app reader, browser, ...). Owned by the screen. */
  onOpenResource: (resource: Resource) => void;
  /** Minutes the user has today. Defaults to 30; the budget chips let them change it. */
  initialMinutes?: number;
}

function ago(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

/** Self-contained research view for one branch: summary, today's tasks, and resources. */
export function ResearchPackView({
  request,
  onOpenResource,
  initialMinutes = 30,
}: ResearchPackViewProps) {
  const research = useResearch(request);
  const { isDone, toggle } = useTaskProgress();
  const [minutes, setMinutes] = useState<number>(initialMinutes);

  const pack = research.status === 'success' ? research.data : null;
  const plan = useMemo(() => (pack ? planDay(pack.tasks, minutes) : null), [pack, minutes]);

  if (!pack || !plan) {
    if (research.status === 'error') {
      return (
        <View style={styles.center}>
          <Text style={styles.error}>{research.error}</Text>
          <Pressable onPress={research.reload} accessibilityRole="button">
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.pathCurrent} />
        <Text style={styles.muted}>Researching {request.topic}…</Text>
      </View>
    );
  }

  const byId = new Map(pack.resources.map((r) => [r.id, r]));
  const openById = (id: string) => {
    const resource = byId.get(id);
    if (resource) onOpenResource(resource);
  };
  const done = plan.today.filter((t) => isDone(t.id)).length;
  const planned = plan.today.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statusRow}>
        <Text style={styles.notice}>
          {research.refreshing ? 'Updating…' : `Updated ${ago(pack.generatedAt)}`}
        </Text>
        <Pressable
          onPress={research.reload}
          disabled={research.refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh research"
          hitSlop={8}
        >
          <Text style={[styles.link, research.refreshing && styles.disabled]}>Refresh</Text>
        </Pressable>
      </View>

      {research.offlineError ? (
        <Text style={styles.notice}>
          Showing your saved copy. Couldn&apos;t refresh: {research.offlineError}
        </Text>
      ) : null}
      {pack.source === 'mock' ? (
        <Text style={styles.notice}>
          Mock data: set NIMBLE_API_KEY on the server for real results.
        </Text>
      ) : null}
      {pack.warnings.map((warning) => (
        <Text key={warning} style={styles.notice}>
          {warning}
        </Text>
      ))}

      {pack.summary ? (
        <View style={styles.section}>
          <Text style={styles.heading}>The lay of the land</Text>
          <Text style={styles.body}>{pack.summary.text}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.heading}>How much time do you have?</Text>
        <View style={styles.chips}>
          {TIME_BUDGETS.map((value) => (
            <Pressable
              key={value}
              onPress={() => setMinutes(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: minutes === value }}
              style={[styles.chip, minutes === value && styles.chipSelected]}
            >
              <Text style={styles.chipText}>{value} min</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>
          Today&apos;s steps ({done}/{plan.today.length}) · {planned} min
        </Text>
        <TaskList tasks={plan.today} isDone={isDone} onToggle={toggle} onOpenResource={openById} />
      </View>

      {plan.later.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>For later</Text>
          <TaskList
            tasks={plan.later}
            isDone={isDone}
            onToggle={toggle}
            onOpenResource={openById}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.heading}>Read, watch &amp; explore</Text>
        <ResourceList resources={pack.resources} onOpen={onOpenResource} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  link: { ...typography.body, color: colors.pathCurrent, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  notice: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.pathCurrent },
  chipText: { ...typography.body, color: colors.text },
});
