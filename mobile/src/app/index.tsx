import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/features/profile';
import { WorldMapCanvas, worldHref } from '@/features/worlds';
import { colors, spacing, typography } from '@/theme/tokens';
import { Button } from '@/ui';

const MAX_MAP_WIDTH = 520;

/** Home map: the present self in the middle, four possible worlds around her. */
export default function Home() {
  const { profile, hydrated } = useProfile();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!hydrated) return <View style={styles.screen} />;
  if (!profile) return <Redirect href="/onboarding" />;

  const mapWidth = Math.min(width, MAX_MAP_WIDTH);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {/* Placeholder until the approved Oddies wordmark artwork is added to assets. */}
          <Text style={styles.wordmark} accessibilityRole="header">
            Oddies
          </Text>
          <Text style={styles.tagline}>
            {profile.name ? `${profile.name}, one you.` : 'One you.'} Many possibilities.
          </Text>
        </View>
        <View
          style={[styles.mapFrame, { width: mapWidth, borderRadius: mapWidth < width ? 24 : 0 }]}
        >
          <WorldMapCanvas width={mapWidth} onSelectWorld={(id) => router.push(worldHref(id))} />
        </View>
        <Text style={styles.hint}>Tap a world to meet that version of you.</Text>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button label="Your story" onPress={() => router.push('/story')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', paddingBottom: 96, gap: spacing.md },
  header: { alignSelf: 'stretch', paddingHorizontal: spacing.gutter, gap: 2 },
  wordmark: { ...typography.title, fontSize: 34, lineHeight: 40, color: colors.text },
  tagline: { ...typography.body, color: colors.textMuted },
  mapFrame: { overflow: 'hidden' },
  hint: { ...typography.caption, color: colors.textMuted },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
});
