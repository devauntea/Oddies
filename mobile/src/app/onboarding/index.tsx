import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onboardingDraft } from '@/features/profile';
import { PersonalityAvatar } from '@/features/worlds';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { Button } from '@/ui';

const MIN_STORY = 20;

/**
 * Onboarding, step 1: share a little about yourself. Written for now; the voice introduction
 * from the playbook needs speech-to-text and is a follow-up.
 */
export default function ShareScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(onboardingDraft.get().name);
  const [story, setStory] = useState(onboardingDraft.get().story);
  const ready = story.trim().length >= MIN_STORY;

  const next = () => {
    onboardingDraft.set({ name: name.trim(), story: story.trim() });
    router.push('/onboarding/review');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PersonalityAvatar personality="present" height={220} style={styles.avatar} />
        <Text style={styles.title} accessibilityRole="header">
          One you, many possibilities.
        </Text>
        <Text style={styles.body}>
          Tell us a little about yourself: what you do, what you love, what you keep daydreaming
          about. We&apos;ll turn it into a map of lives you could explore.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>What should we call you? (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoComplete="given-name"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your story</Text>
          <TextInput
            value={story}
            onChangeText={setStory}
            placeholder="I work in operations, paint on weekends, sit with a Zen group on Tuesdays, and keep a notebook of business ideas…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.story]}
            multiline
            accessibilityHint={`At least ${MIN_STORY} characters`}
          />
          <Text style={styles.caption}>
            Only what you write here is used. It stays on this device.
          </Text>
        </View>

        <Button label="Continue" variant="primary" onPress={next} disabled={!ready} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  avatar: { alignSelf: 'center' },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.text },
  field: { gap: spacing.xs + 2 },
  label: { ...typography.label, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
  input: {
    ...typography.body,
    color: colors.text,
    padding: spacing.sm + 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  story: { minHeight: 160, textAlignVertical: 'top' },
});
