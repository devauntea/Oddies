import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { researchHref, type Level } from '@/features/research';
import { colors, radius, spacing, typography } from '@/theme/tokens';

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
    <View style={styles.container}>
      <Text style={styles.title}>What feels exciting today?</Text>

      <View style={styles.row}>
        {SAMPLE_BRANCHES.map((branch) => (
          <Pressable key={branch} style={styles.chip} onPress={() => go(branch)}>
            <Text style={styles.chipText}>{branch}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={topic}
        onChangeText={setTopic}
        onSubmitEditing={() => go(topic)}
        placeholder="Or type your own branch…"
        placeholderTextColor={colors.textMuted}
        returnKeyType="go"
        style={styles.input}
      />

      <View style={styles.row}>
        {LEVELS.map((value) => (
          <Pressable
            key={value}
            onPress={() => setLevel(value)}
            accessibilityState={{ selected: level === value }}
            style={[styles.chip, level === value && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.title, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
