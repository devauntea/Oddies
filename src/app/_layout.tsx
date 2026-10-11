import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme/tokens';

export default function RootLayout() {
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
        <Stack.Screen name="index" options={{ title: 'Oddies' }} />
        <Stack.Screen name="research/[topic]" options={{ title: 'Research' }} />
        <Stack.Screen name="research/read" options={{ title: 'Read' }} />
      </Stack>
    </>
  );
}
