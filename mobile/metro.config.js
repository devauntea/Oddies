// Learn more https://docs.expo.dev/guides/customizing-metro/
// getSentryExpoConfig wraps Expo's default config so Sentry can upload source maps.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
