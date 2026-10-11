import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDocument } from '@/features/research';
import { colors, spacing, typography } from '@/theme/tokens';

/**
 * In-app reader for study material. Shows the page as plain markdown text for now; the design
 * pass can swap in a markdown renderer without touching the data layer.
 */
export default function ReadScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const document = useDocument(url ?? null);
  const openInBrowser = () => url && void WebBrowser.openBrowserAsync(url);

  return (
    <>
      <Stack.Screen options={{ title: title ?? 'Read' }} />
      {document.status === 'success' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.body} selectable>
            {document.data.markdown}
          </Text>
          {document.data.truncated ? (
            <Text style={styles.muted}>This page is long, so it was shortened.</Text>
          ) : null}
          <Pressable onPress={openInBrowser} accessibilityRole="link">
            <Text style={styles.link}>Open the original page</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          {document.status === 'error' ? (
            <>
              <Text style={styles.error}>{document.error}</Text>
              <Pressable onPress={openInBrowser} accessibilityRole="link">
                <Text style={styles.link}>Open in browser</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.pathCurrent} />
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  link: { ...typography.body, color: colors.pathCurrent, fontWeight: '600' },
});
