// Starts Sentry in the browser. Needs the Sentry CDN bundle and /config.js
// loaded before it. Does nothing when no DSN is configured.
(function () {
  var config = window.ODDIES_CONFIG || {};
  if (!window.Sentry || !config.sentryDsn) return;

  window.Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    // Traces page loads and fetch calls. Calls to our own /api carry the trace
    // id, so a click in the browser and the Gemini and Nimble spans it causes
    // on the server show up as one trace.
    integrations: [window.Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
  window.Sentry.setTag('page', document.body.dataset.page || 'unknown');
})();
