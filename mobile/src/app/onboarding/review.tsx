import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { onboardingDraft, saveProfile } from '@/features/profile';
import { getWorld, understandStory } from '@/features/worlds';
import { colors, radius, scene, spacing, typography } from '@/theme/tokens';
import { Button, Chip } from '@/ui';

/** Onboarding, step 2: review and correct what the app understood before creating worlds. */
export default function ReviewScreen() {
  const draft = onboardingDraft.get();
  const understood = useMemo(() => understandStory(draft.story), [draft.story]);
  const [interests, setInterests] = useState<string[]>(understood.interests);
  const [extra, setExtra] = useState('');

  const add = () => {
    const value = extra.trim().toLowerCase();
    if (value && !interests.includes(value)) setInterests([...interests, value]);
    setExtra('');
  };

  const create = async () => {
    await saveProfile({
      name: draft.name || undefined,
      story: draft.story,
      interests,
      createdAt: new Date().toISOString(),
    });
    onboardingDraft.clear();
    router.dismissAll();
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        Here&apos;s what we heard
      </Text>
      <Text style={styles.body}>
        Remove anything that isn&apos;t right, or add what we missed. These shape the research in
        each world.
      </Text>

      <View style={styles.chips}>
        {interests.length === 0 ? (
          <Text style={styles.muted}>We didn&apos;t pick out any interests. Add a few below.</Text>
        ) : (
          interests.map((interest) => (
            <Chip
              key={interest}
              label={`${interest}  ×`}
              accessibilityLabel={`Remove ${interest}`}
              onPress={() => setInterests(interests.filter((i) => i !== interest))}
            />
          ))
        )}
      </View>

      <View style={styles.addRow}>
        <TextInput
          value={extra}
          onChangeText={setExtra}
          onSubmitEditing={add}
          placeholder="Add an interest"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
        />
        <Button label="Add" onPress={add} disabled={!extra.trim()} />
      </View>

      {understood.worldAffinity.length > 0 ? (
        <View style={styles.affinity}>
          <Text style={styles.label}>Your story points most toward</Text>
          <View style={styles.chips}>
            {understood.worldAffinity.map((id) => {
              const world = getWorld(id)!;
              return <Chip key={id} label={world.name} dot={scene[world.sceneColor]} />;
            })}
          </View>
        </View>
      ) : null}

      <Button label="Create my worlds" variant="primary" onPress={() => void create()} />
      <Button label="Edit my story" variant="link" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.gutter, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  label: { ...typography.label, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    padding: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  affinity: { gap: spacing.sm },
});
