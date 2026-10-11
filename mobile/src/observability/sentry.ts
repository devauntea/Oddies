import * as Sentry from '@sentry/react-native';

/**
 * Crash and error reporting. Call `initSentry()` once, at module scope in the root layout, so
 * it runs before anything renders.
 *
 * EXPO_PUBLIC_SENTRY_DSN is safe to ship in the app (a DSN only allows sending events). With no
 * DSN, Sentry is fully disabled, so local dev and CI stay quiet.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
    // Don't attach IP addresses, cookies or user data. The app holds personal life-planning
    // content, so keep it opt-in.
    sendDefaultPii: false,
    // Sample a fraction of transactions in production; raise while debugging performance.
    tracesSampleRate: __DEV__ ? 1 : 0.1,
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_IN_DEV === 'true',
  });
}

export const wrapWithSentry = Sentry.wrap;
export const captureException = Sentry.captureException;
