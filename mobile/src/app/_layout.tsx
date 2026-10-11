import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { initSentry, wrapWithSentry } from '@/observability/sentry';
import { colors } from '@/theme/tokens';

initSentry();

/**
 * Research screens carry their own large titles, so the bar is just a back chevron on ivory:
 * no divider, and no previous route's name (the world screen has no title to show).
 */
const researchHeader = {
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
} as const;

function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Oddies', headerShown: false }} />
        <Stack.Screen name="world/[id]" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="you" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="research/index" options={{ title: '', ...researchHeader }} />
        <Stack.Screen name="research/[topic]" options={{ title: '', ...researchHeader }} />
        <Stack.Screen name="research/read" options={{ title: '', ...researchHeader }} />
      </Stack>
    </>
  );
}

export default wrapWithSentry(RootLayout);
