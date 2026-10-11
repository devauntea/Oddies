import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PillButton, researchHref, type Level } from '@/features/research';
import { colors, radius, spacing, touch, typography } from '@/theme/tokens';

/**
 * Free-text branch picker, reached from the home map's "Or name your own path". Each world on the
 * map also hands off to research directly:
 *
 *   router.push(researchHref({ topic, level, pathId }))
 */
const SAMPLE_BRANCHES = ['music', 'cooking', 'photography', 'coding', 'running'];
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default function PickBranch() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<Level>('beginner');

  const go = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2) router.push(researchHref({ topic: trimmed, level }));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          What feels exciting today?
        </Text>
        <Text style={styles.lead}>
          Name a path you&apos;re curious about. We&apos;ll find real things to read, watch and try.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.overline}>Try one of these</Text>
        <View style={styles.row}>
          {SAMPLE_BRANCHES.map((branch) => (
            <Pressable
              key={branch}
              accessibilityRole="button"
              onPress={() => go(branch)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipText}>{branch}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.overline}>Or name your own</Text>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          onSubmitEditing={() => go(topic)}
          placeholder="e.g. learning to DJ"
          placeholderTextColor={colors.textMuted}
          returnKeyType="go"
          accessibilityLabel="Your own path"
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.overline}>Where you&apos;re starting</Text>
        <View style={styles.row}>
          {LEVELS.map((value) => {
            const selected = level === value;
            return (
              <Pressable
                key={value}
                onPress={() => setLevel(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PillButton
        primary
        label="Find real steps"
        disabled={topic.trim().length < 2}
        onPress={() => go(topic)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
  intro: { gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  lead: { ...typography.reading, color: colors.textMuted },
  section: { gap: spacing.md },
  overline: { ...typography.overline, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: { backgroundColor: colors.accentSoft },
  chipSelected: { borderColor: colors.text, backgroundColor: colors.accentSoft },
  chipText: { ...typography.button, fontWeight: '400', color: colors.text },
  chipTextSelected: { fontWeight: '700' },
  input: {
    ...typography.reading,
    minHeight: touch.min + spacing.sm,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
