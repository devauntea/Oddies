import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KIND_LABEL, MEMORY_KINDS, memoryActions, type MemoryKind } from '@/features/memories';
import { getWorld, PersonalityAvatar, SHARED_PROMPTS } from '@/features/worlds';
import { colors, radius, scene, spacing, typography } from '@/theme/tokens';
import { Button, Chip } from '@/ui';

/**
 * Conversation sheet. For now the version of you asks reflection questions and the user
 * answers in writing; nothing is generated, and only what the user saves is kept. Spoken
 * conversation (voice in, voiced replies) plugs in here later.
 */
export default function ReflectScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; prompt?: string }>();
  const world = getWorld(params.id);
  const prompts = useMemo(
    () => (params.prompt ? [params.prompt] : world ? [world.prompt, ...SHARED_PROMPTS] : []),
    [params.prompt, world],
  );
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<MemoryKind>(
    MEMORY_KINDS.includes(params.kind as MemoryKind) ? (params.kind as MemoryKind) : 'insight',
  );
  const [saved, setSaved] = useState(false);

  if (!world) return <Redirect href="/" />;
  const prompt = prompts[index % prompts.length]!;

  const save = async () => {
    await memoryActions.add({ kind, text, worldId: world.id, prompt });
    setSaved(true);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.speaker}>
          <View style={[styles.portrait, { backgroundColor: scene[world.sceneColor] }]}>
            <PersonalityAvatar personality={world.personality} height={120} />
          </View>
          <View style={styles.bubble}>
            <Text style={styles.who}>{world.version}</Text>
            <Text style={styles.prompt} accessibilityLiveRegion="polite">
              {prompt}
            </Text>
          </View>
        </View>

        {saved ? (
          <View style={styles.savedBox}>
            <Text style={styles.savedTitle}>Saved to your story.</Text>
            <Text style={styles.body}>Would you like to keep going?</Text>
            <View style={styles.row}>
              <Button
                label="Another question"
                onPress={() => {
                  setSaved(false);
                  setIndex(index + 1);
                }}
              />
              <Button label="Done" variant="primary" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write your answer…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              style={styles.input}
              accessibilityLabel={prompt}
            />
            <View style={styles.kinds}>
              <Text style={styles.label}>Save it as</Text>
              <View style={styles.row}>
                {MEMORY_KINDS.map((k) => (
                  <Chip
                    key={k}
                    label={KIND_LABEL[k]}
                    selected={kind === k}
                    onPress={() => setKind(k)}
                  />
                ))}
              </View>
            </View>
            <Button
              label="Save this moment"
              variant="primary"
              onPress={() => void save()}
              disabled={!text.trim()}
            />
            {prompts.length > 1 ? (
              <Button
                label="Ask me something else"
                variant="link"
                onPress={() => setIndex(index + 1)}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.gutter, gap: spacing.md },
  speaker: { flexDirection: 'row', gap: spacing.sm + 4, alignItems: 'flex-end' },
  portrait: {
    width: 84,
    height: 120,
    borderRadius: radius.card,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bubble: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.background,
  },
  who: { ...typography.label, color: colors.textMuted },
  prompt: { ...typography.sheetTitle, fontSize: 20, lineHeight: 27, color: colors.text },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 140,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  kinds: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  savedBox: { gap: spacing.sm },
  savedTitle: { ...typography.sheetTitle, color: colors.text },
  body: { ...typography.body, color: colors.text },
});
