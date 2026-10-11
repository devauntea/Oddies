import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { initSentry, wrapWithSentry } from '@/observability/sentry';
import { FONT_ASSETS } from '@/theme/fonts';
import { colors, typography } from '@/theme/tokens';

initSentry();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  // Render with system fonts if loading fails, rather than a blank app.
  if (!fontsLoaded && !fontError)
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: typography.heading.fontFamily },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/review" options={{ title: '' }} />
        <Stack.Screen name="world/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="world/[id]/reflect"
          options={{ presentation: 'modal', title: '', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="story" options={{ title: 'Your story' }} />
        <Stack.Screen name="research/[topic]" options={{ title: 'Research' }} />
        <Stack.Screen name="research/read" options={{ title: 'Read' }} />
      </Stack>
    </>
  );
}

export default wrapWithSentry(RootLayout);
