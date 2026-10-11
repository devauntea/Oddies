// Learn more https://docs.expo.dev/guides/customizing-metro/
// getSentryExpoConfig wraps Expo's default config so Sentry can upload source maps.
const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Map layers, the scene layout and design tokens live in /assets at the repo root so the web app
// and this app share one copy. Let Metro watch and bundle files from there.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../assets')];

module.exports = config;
