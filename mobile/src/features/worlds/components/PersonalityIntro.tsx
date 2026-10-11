import { StyleSheet, Text, View } from 'react-native';

import { colors, palette, spacing, typography } from '@/theme/tokens';

import type { World } from '../core/worlds';

/** World name, the version of you who lives here, and one personal invitation. */
export function PersonalityIntro({ world, name }: { world: World; name?: string }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.version, { color: palette[world.accent] }]}>
        {name ? `${name} as ${world.version.toLowerCase()}` : world.version}
      </Text>
      <Text style={styles.title} accessibilityRole="header">
        {world.name}
      </Text>
      <Text style={styles.invitation}>{world.invitation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2 },
  version: { ...typography.label, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.title, color: colors.text },
  invitation: { ...typography.body, color: colors.text },
});
