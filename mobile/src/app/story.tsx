import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { exportStory, memoryActions, StoryView, useMemories } from '@/features/memories';
import { profileStore, useProfile } from '@/features/profile';
import { getWorld, pathActions } from '@/features/worlds';
import { colors, spacing, typography } from '@/theme/tokens';
import { Button } from '@/ui';

/** Everything the user chose to keep, plus export and delete controls. */
export default function StoryScreen() {
  const { memories } = useMemories();
  const { profile } = useProfile();
  const [confirmWipe, setConfirmWipe] = useState(false);

  const share = () =>
    void Share.share({
      message: exportStory(memories, (id) => getWorld(id)?.name ?? id) || 'No saved moments yet.',
    });

  const wipe = async () => {
    await Promise.all([memoryActions.removeAll(), pathActions.removeAll(), profileStore.reset()]);
    router.dismissAll();
    router.replace('/onboarding');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {profile ? (
        <View style={styles.intro}>
          <Text style={styles.label}>Where you started</Text>
          <Text style={styles.body}>{profile.story}</Text>
        </View>
      ) : null}

      <StoryView memories={memories} />

      <View style={styles.controls}>
        <Text style={styles.label}>Your data</Text>
        <Text style={styles.caption}>Everything here is stored only on this device.</Text>
        <Button label="Export my story" onPress={share} disabled={memories.length === 0} />
        <Button
          label={confirmWipe ? 'Tap again to delete everything' : 'Delete all my data'}
          variant="link"
          onPress={() => (confirmWipe ? void wipe() : setConfirmWipe(true))}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.gutter, gap: spacing.xl },
  intro: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textMuted },
  body: { ...typography.body, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted },
  controls: { gap: spacing.sm },
});
