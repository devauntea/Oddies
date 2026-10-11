import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, touch, typography } from '@/theme/tokens';

import { useResearch } from '../client/hooks';
import { useTaskProgress } from '../client/taskProgress';
import { planDay, TIME_BUDGETS } from '../core/budget';
import type { ResearchRequest, Resource } from '../types';
import { Notice, PillButton, RESOURCE_KIND, SectionLabel, type ResearchTone } from './parts';
import { ResourceList } from './ResourceList';
import { TaskList } from './TaskList';

export interface ResearchPackViewProps {
  request: ResearchRequest;
  /** Decide where a resource opens (in-app reader, browser, ...). Owned by the screen. */
  onOpenResource: (resource: Resource) => void;
  /** Minutes the user has today. Defaults to 30; the budget chips let them change it. */
  initialMinutes?: number;
  /** The world this was opened from, if any: its name and colors theme the screen. */
  tone?: ResearchTone;
}

function ago(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Self-contained research view for one branch: summary, today's tasks, and resources. */
export function ResearchPackView({
  request,
  onOpenResource,
  initialMinutes = 30,
  tone,
}: ResearchPackViewProps) {
  const research = useResearch(request);
  const { isDone, toggle } = useTaskProgress();
  const [minutes, setMinutes] = useState<number>(initialMinutes);

  const pack = research.status === 'success' ? research.data : null;
  const plan = useMemo(() => (pack ? planDay(pack.tasks, minutes) : null), [pack, minutes]);
  const highlight = tone?.soft ?? colors.accentSoft;

  const header = (
    <View style={styles.header}>
      {tone ? (
        <View style={styles.toneRow}>
          <View style={[styles.dot, { backgroundColor: tone.accent }]} />
          <Text style={styles.toneLabel}>{tone.label}</Text>
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {capitalize(request.topic)}
      </Text>
    </View>
  );

  if (!pack || !plan) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>{header}</View>
        <View style={styles.center}>
          {research.status === 'error' ? (
            <>
              <Text style={styles.centerTitle}>That didn&apos;t work</Text>
              <Text style={styles.centerText}>{research.error}</Text>
              <PillButton primary label="Try again" onPress={research.reload} />
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.text} size="large" />
              <Text style={styles.centerTitle}>Finding real steps</Text>
              <Text style={styles.centerText}>
                Looking for things to read, watch and try for {request.topic}.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const byId = new Map(pack.resources.map((r) => [r.id, r]));
  const openById = (id: string) => {
    const resource = byId.get(id);
    if (resource) onOpenResource(resource);
  };
  const actionLabel = (id: string) => {
    const resource = byId.get(id);
    return resource ? RESOURCE_KIND[resource.kind].action : 'Open';
  };
  const done = plan.today.filter((t) => isDone(t.id)).length;
  const planned = plan.today.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const progress = plan.today.length > 0 ? done / plan.today.length : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {header}

      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {research.refreshing ? 'Updating…' : `Updated ${ago(pack.generatedAt)}`}
        </Text>
        <PillButton
          compact
          label="Refresh"
          accessibilityLabel="Refresh research"
          disabled={research.refreshing}
          onPress={research.reload}
        />
      </View>

      {research.offlineError ? (
        <Notice>Showing your saved copy. Couldn&apos;t refresh: {research.offlineError}</Notice>
      ) : null}
      {pack.source === 'mock' ? (
        <Notice>Sample data: set NIMBLE_API_KEY on the server for real results.</Notice>
      ) : null}
      {pack.warnings.map((warning) => (
        <Notice key={warning}>{warning}</Notice>
      ))}

      {pack.summary ? (
        <View style={styles.summary}>
          <SectionLabel>The lay of the land</SectionLabel>
          <Text style={styles.reading}>{pack.summary.text}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>Time you have today</SectionLabel>
        <View style={styles.chips}>
          {TIME_BUDGETS.map((value) => {
            const selected = minutes === value;
            return (
              <Pressable
                key={value}
                onPress={() => setMinutes(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${value} minutes`}
                style={[
                  styles.chip,
                  selected && [styles.chipSelected, { backgroundColor: highlight }],
                ]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {value} min
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Today&apos;s steps
        </Text>
        <View style={styles.progressRow}>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: plan.today.length, now: done }}
          >
            <View
              style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.text }]}
            />
          </View>
          <Text style={styles.progressText}>
            {done} of {plan.today.length} · {planned} min
          </Text>
        </View>
        <TaskList
          tasks={plan.today}
          isDone={isDone}
          onToggle={toggle}
          onOpenResource={openById}
          actionLabel={actionLabel}
        />
      </View>

      {plan.later.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>For later</SectionLabel>
          <TaskList
            muted
            tasks={plan.later}
            isDone={isDone}
            onToggle={toggle}
            onOpenResource={openById}
            actionLabel={actionLabel}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Read, watch &amp; explore
        </Text>
        <ResourceList resources={pack.resources} onOpen={onOpenResource} />
      </View>
    </ScrollView>
  );
}

const GUTTER = spacing.lg + spacing.xs;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
  header: { gap: spacing.xs },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  toneLabel: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.display, color: colors.text },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -spacing.md,
  },
  status: { ...typography.label, fontWeight: '400', color: colors.textMuted },
  summary: {
    gap: spacing.sm,
    padding: spacing.lg + spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  reading: { ...typography.reading, color: colors.text },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.sheetTitle, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touch.min,
    minWidth: 72,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.text },
  chipText: { ...typography.button, fontWeight: '400', color: colors.text },
  chipTextSelected: { fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  progressText: { ...typography.label, color: colors.textMuted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  centerTitle: { ...typography.sheetTitle, color: colors.text, textAlign: 'center' },
  centerText: { ...typography.reading, color: colors.textMuted, textAlign: 'center' },
});
