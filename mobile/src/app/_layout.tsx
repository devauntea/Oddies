import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { initSentry, wrapWithSentry } from '@/observability/sentry';
import { colors } from '@/theme/tokens';

initSentry();

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
        <Stack.Screen name="research/index" options={{ title: 'Your own path' }} />
        <Stack.Screen name="research/[topic]" options={{ title: 'Research' }} />
        <Stack.Screen name="research/read" options={{ title: 'Read' }} />
      </Stack>
    </>
  );
}

export default wrapWithSentry(RootLayout);
