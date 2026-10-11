import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/features/profile';
import {
  getWorld,
  PersonalityAvatar,
  PersonalityIntro,
  reflectHref,
  WorldPath,
} from '@/features/worlds';
import { colors, palette, radius, scene, spacing } from '@/theme/tokens';
import { Button } from '@/ui';

/** Entering a world: meet that version of you, then see the path from here. */
export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const world = getWorld(id);
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();

  if (!world) return <Redirect href="/" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      <View
        style={[
          styles.scene,
          { backgroundColor: scene[world.sceneColor], paddingTop: insets.top + spacing.sm },
        ]}
      >
        <View style={styles.topBar}>
          <Button
            label="‹ Map"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityHint="Back to your map"
          />
        </View>
        <PersonalityAvatar personality={world.personality} height={300} style={styles.avatar} />
      </View>

      <View style={styles.sheet}>
        <PersonalityIntro world={world} name={profile?.name} />
        <Button
          label={`Talk with ${world.version.toLowerCase()}`}
          variant="primary"
          onPress={() => router.push(reflectHref(world.id))}
        />
        <WorldPath world={world} interests={profile?.interests ?? []} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scene: { alignItems: 'center', paddingBottom: spacing.xl },
  topBar: { alignSelf: 'stretch', paddingHorizontal: spacing.gutter },
  avatar: { marginTop: spacing.sm },
  sheet: {
    marginTop: -spacing.lg,
    padding: spacing.gutter,
    gap: spacing.md,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: palette.ivory,
  },
});
