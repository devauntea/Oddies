// Sentry setup for the server. Loaded before everything else with
//   node --import ./instrument.js server.js
// so Sentry can trace Express, outgoing requests, and our own spans.
const Sentry = require('@sentry/node');

// Local dev reads a .env file if there is one. On Fly the values come from secrets.
try {
  process.loadEnvFile();
} catch {
  // no .env file, which is fine
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.FLY_APP_NAME ? 'production' : 'development',
    // Trace every request. Fine for a demo, lower it under real traffic.
    tracesSampleRate: 1.0,
    // src/gemini.js wraps every Gemini call in its own span with the model and
    // token counts. Sentry's built-in Gemini integration would record each
    // call a second time, so it is switched off.
    integrations: (integrations) => integrations.filter((integration) => integration.name !== 'Google_GenAI'),
    // The Sentry project is shared with the mobile app. This tag tells the two apart.
    initialScope: { tags: { app: 'oddies-web' } },
  });
  console.log('Sentry: on');
} else {
  console.log('Sentry: off (SENTRY_DSN not set)');
}
