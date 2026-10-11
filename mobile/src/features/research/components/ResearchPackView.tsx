import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { useResearch } from '../client/hooks';
import { useTaskProgress } from '../client/taskProgress';
import type { ResearchRequest, Resource } from '../types';
import { ResourceList } from './ResourceList';
import { TaskList } from './TaskList';

export interface ResearchPackViewProps {
  request: ResearchRequest;
  /** Decide where a resource opens (in-app reader, browser, ...). Owned by the screen. */
  onOpenResource: (resource: Resource) => void;
}

/** Self-contained research view for one branch: summary, today's tasks, and resources. */
export function ResearchPackView({ request, onOpenResource }: ResearchPackViewProps) {
  const research = useResearch(request);
  const { isDone, toggle } = useTaskProgress();

  if (research.status === 'idle' || research.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.pathCurrent} />
        <Text style={styles.muted}>Researching {request.topic}…</Text>
      </View>
    );
  }

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

  const pack = research.data;
  const byId = new Map(pack.resources.map((r) => [r.id, r]));
  const done = pack.tasks.filter((t) => isDone(t.id)).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
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
        <Text style={styles.heading}>
          Today&apos;s steps ({done}/{pack.tasks.length})
        </Text>
        <TaskList
          tasks={pack.tasks}
          isDone={isDone}
          onToggle={toggle}
          onOpenResource={(id) => {
            const resource = byId.get(id);
            if (resource) onOpenResource(resource);
          }}
        />
      </View>

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
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  link: { ...typography.body, color: colors.pathCurrent, fontWeight: '600' },
  notice: { ...typography.caption, color: colors.textMuted },
});
