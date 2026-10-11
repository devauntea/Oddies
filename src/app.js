const path = require('node:path');
const express = require('express');
const { HttpError } = require('./errors');
const { todayISO } = require('./dates');
const { SEED, loadSeed } = require('./seed');
const store = require('./store');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Builds the Express app. Everything it talks to is passed in, so tests can
// hand it an in-memory database and fake Gemini and Nimble clients.
function createApp({ db, gemini, nimble, config = {} }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '200kb' }));

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  const state = () => {
    const current = store.getState(db, todayISO());
    return {
      ...current,
      is_demo: Boolean(current.self) && current.self.name === SEED.self.name && current.self.summary === SEED.self.summary,
      services: { gemini: Boolean(gemini && gemini.configured), nimble: Boolean(nimble && nimble.configured) },
    };
  };

  app.get('/api/state', (req, res) => res.json(state()));

  app.use('/api', (req, res) => {
    throw new HttpError(404, 'not_found', `No route for ${req.method} ${req.originalUrl}`);
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use((req, res) => {
    res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    if (!req.originalUrl.startsWith('/api')) return res.status(status).send('Something went wrong.');
    res.status(status).json({
      error: err.code || (status === 400 ? 'invalid_input' : 'server_error'),
      message: status >= 500 && !(err instanceof HttpError) ? 'Something went wrong on the server.' : err.message,
      ...(err.extra || {}),
    });
  });

  return app;
}

module.exports = { createApp };
