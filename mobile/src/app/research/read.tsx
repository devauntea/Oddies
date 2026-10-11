import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MarkdownView, PillButton, useDocument } from '@/features/research';
import { colors, spacing, typography } from '@/theme/tokens';

/**
 * In-app reader for study material. When a page has nothing readable (a dead link, an
 * interactive tool, a login wall), it opens the page in the browser instead and returns here
 * to the list once the browser is closed.
 */
export default function ReadScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const document = useDocument(url ?? null);
  const openInBrowser = () => url && void WebBrowser.openBrowserAsync(url);

  const failed = document.status === 'error';
  useEffect(() => {
    if (!failed || !url) return;
    void WebBrowser.openBrowserAsync(url).then(() => {
      if (router.canGoBack()) router.back();
    });
  }, [failed, url]);

  return document.status === 'success' ? (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <Text style={styles.source}>{hostOf(document.data.url)}</Text>
      <MarkdownView markdown={document.data.markdown} baseUrl={document.data.url} />
      {document.data.truncated ? (
        <Text style={styles.muted}>This page is long, so it was shortened.</Text>
      ) : null}
      <View style={styles.footer}>
        <PillButton label="Open the original page" onPress={openInBrowser} />
      </View>
    </ScrollView>
  ) : (
    <View style={[styles.screen, styles.center]}>
      {document.status === 'error' ? (
        <>
          <Text style={styles.muted}>{document.error}</Text>
          <PillButton label="Open in browser" onPress={openInBrowser} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={styles.muted}>Getting the page ready to read…</Text>
        </>
      )}
    </View>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  title: { ...typography.display, color: colors.text },
  source: { ...typography.overline, color: colors.textMuted, marginTop: -spacing.sm },
  muted: { ...typography.reading, color: colors.textMuted, textAlign: 'center' },
  footer: { marginTop: spacing.lg, alignItems: 'flex-start' },
});
