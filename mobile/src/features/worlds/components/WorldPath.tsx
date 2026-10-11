import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MemoryCard, memoryActions, useMemories } from '@/features/memories';
import { openResource, researchHref, useResearch, useTaskProgress } from '@/features/research';
import { colors, radius, spacing, touch, typography } from '@/theme/tokens';
import { Button, Card } from '@/ui';

import { researchTopicFor } from '../core/interests';
import { pickNextAction } from '../core/nextAction';
import type { World } from '../core/worlds';
import { pathActions, usePath } from '../pathStore';
import { reflectHref } from '../navigation';

export interface WorldPathProps {
  world: World;
  interests: string[];
}

/**
 * A world's path (product brief, "What each path shows"):
 * - Already done: memories the user confirmed. Never invented.
 * - Next action: one concrete step, from live research on this world's topic.
 * - Future milestones: suggested, conditional steps the user can confirm, and an editable goal.
 */
export function WorldPath({ world, interests }: WorldPathProps) {
  const { path } = usePath(world.id);
  const topic = researchTopicFor(world, interests, path.goal);

  return (
    <View style={styles.container}>
      <AlreadyDone world={world} />
      <NextAction world={world} topic={topic} />
      <FutureMilestones
        world={world}
        confirmed={path.confirmedMilestones}
        goal={path.goal}
        topic={topic}
      />
    </View>
  );
}

function AlreadyDone({ world }: { world: World }) {
  const { memories } = useMemories();
  const mine = memories.filter((m) => m.worldId === world.id && m.kind === 'memory');
  const prompt = `${world.route[0]!.title}: what have you already done that points here?`;

  return (
    <Card eyebrow="Already done" title={world.route[0]!.title}>
      {mine.length === 0 ? (
        <Text style={styles.muted}>Nothing saved yet. Small things count.</Text>
      ) : (
        mine
          .slice(0, 3)
          .map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              hideWorld
              onEdit={(text) => void memoryActions.edit(memory.id, text)}
              onDelete={() => void memoryActions.remove(memory.id)}
            />
          ))
      )}
      <Button
        label="Add something you've done"
        variant="link"
        onPress={() => router.push(reflectHref(world.id, { kind: 'memory', prompt }))}
      />
    </Card>
  );
}

function NextAction({ world, topic }: { world: World; topic: string }) {
  const research = useResearch({ topic, pathId: world.id });
  const { isDone, toggle } = useTaskProgress();
  const pack = research.status === 'success' ? research.data : null;
  const next = pack ? pickNextAction(pack.tasks, isDone) : undefined;
  const resource = next?.resourceId
    ? pack?.resources.find((r) => r.id === next.resourceId)
    : undefined;

  return (
    <Card eyebrow="Next action">
      {!pack ? (
        research.status === 'error' ? (
          <>
            <Text style={styles.muted}>Couldn&apos;t find a first step right now.</Text>
            <Button label="Try again" variant="link" onPress={research.reload} />
          </>
        ) : (
          <View style={styles.row}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Looking for a first step on {topic}…</Text>
          </View>
        )
      ) : next ? (
        <>
          <Text style={styles.actionTitle}>{next.title}</Text>
          <Text style={styles.muted}>
            {next.detail} · about {next.estimatedMinutes} min
          </Text>
          {pack.source === 'mock' ? (
            <Text style={styles.caption}>Sample step: the server has no Nimble key yet.</Text>
          ) : null}
          <View style={styles.actions}>
            {resource ? <Button label="Open" onPress={() => openResource(resource)} /> : null}
            <Button label="I did it" onPress={() => void toggle(next.id)} />
          </View>
        </>
      ) : (
        <Text style={styles.muted}>You&apos;ve done every step for today. Lovely.</Text>
      )}
      <Button
        label="See today's steps and reading"
        variant="link"
        onPress={() => router.push(researchHref({ topic, pathId: world.id }))}
      />
    </Card>
  );
}

function FutureMilestones({
  world,
  confirmed,
  goal,
  topic,
}: {
  world: World;
  confirmed: string[];
  goal?: string;
  topic: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal ?? '');

  return (
    <Card eyebrow="Future milestones" title="One possible route">
      <Text style={styles.caption}>
        Imagined, not fixed. Tick a step only when you&apos;ve really done it.
      </Text>
      {world.route.slice(1).map((milestone) => {
        const done = confirmed.includes(milestone.id);
        return (
          <Pressable
            key={milestone.id}
            onPress={() => void pathActions.toggleMilestone(world.id, milestone.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            style={styles.milestone}
          >
            <View style={[styles.check, done && styles.checkDone]} />
            <View style={styles.flex}>
              <Text style={[styles.milestoneTitle, done && styles.milestoneDone]}>
                {milestone.title}
              </Text>
              {milestone.note ? <Text style={styles.caption}>{milestone.note}</Text> : null}
            </View>
          </Pressable>
        );
      })}

      <View style={styles.goal}>
        <Text style={styles.label}>Your focus here</Text>
        {editing ? (
          <>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={world.researchTopic}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              accessibilityLabel="Your focus for this world"
            />
            <View style={styles.actions}>
              <Button
                label="Save"
                variant="link"
                onPress={() => {
                  void pathActions.setGoal(world.id, draft);
                  setEditing(false);
                }}
              />
              <Button label="Cancel" variant="link" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.body}>{topic}</Text>
            <Button label="Change focus" variant="link" onPress={() => setEditing(true)} />
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  caption: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.label, color: colors.textMuted },
  actionTitle: { ...typography.bodyStrong, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  milestone: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  milestoneTitle: { ...typography.body, color: colors.text },
  milestoneDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  goal: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.sm + 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
});
