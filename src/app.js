const path = require('node:path');
const express = require('express');
const { HttpError } = require('./errors');
const { todayISO } = require('./dates');
const { SEED, loadSeed } = require('./seed');
const { oddieSystemPrompt } = require('./prompts');
const { buildToday } = require('./today');
const store = require('./store');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_CHAT_CHARS = 2000;

// The app has no accounts, so anyone with the URL can spend model and search
// credits. This caps each IP at AI_LIMIT calls per AI_WINDOW_MS.
const AI_LIMIT = 40;
const AI_WINDOW_MS = 10 * 60 * 1000;

function createAiLimiter() {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((at) => now - at < AI_WINDOW_MS);
    if (recent.length >= AI_LIMIT) {
      throw new HttpError(429, 'rate_limited', 'Too many requests. Wait a few minutes and try again.');
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}

function requireText(value, field, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new HttpError(400, 'invalid_input', `${field} is required`);
  if (text.length > max) throw new HttpError(400, 'invalid_input', `${field} is too long (max ${max} characters)`);
  return text;
}

// Builds the Express app. Everything it talks to is passed in, so tests can
// hand it an in-memory database and fake Gemini and Nimble clients.
function createApp({ db, gemini, nimble }) {
  const app = express();
  const limitAi = createAiLimiter();
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

  // ---------- Oddies ----------

  app.patch('/api/oddies/:id', (req, res) => {
    res.json({ oddie: store.updateOddie(db, req.params.id, req.body || {}) });
  });

  app.delete('/api/oddies/:id', (req, res) => {
    store.deleteOddie(db, req.params.id);
    res.json({ ok: true });
  });

  // ---------- Chat ----------

  app.get('/api/oddies/:id/chat', (req, res) => {
    const oddie = store.getOddie(db, req.params.id);
    res.json({ messages: store.chatHistory(db, oddie.id) });
  });

  app.post('/api/oddies/:id/chat', limitAi, async (req, res) => {
    const oddie = store.getOddie(db, req.params.id);
    const text = requireText(req.body && req.body.text, 'text', MAX_CHAT_CHARS);

    const system = oddieSystemPrompt({
      self: store.getSelf(db),
      oddie,
      progress: store.progressFor(db, oddie.id),
      today: todayISO(),
    });
    const contents = [
      ...store.chatHistory(db, oddie.id).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text }] },
    ];

    const { text: reply } = await gemini.generate({
      task: 'chat',
      system,
      contents,
      attributes: { 'oddies.oddie_id': oddie.id },
    });
    if (!reply.trim()) throw new HttpError(502, 'gemini_failed', 'The oddie had nothing to say. Try again.');

    const messages = store.addExchange(db, oddie.id, text, reply.trim());
    res.json({ reply: messages[1].text, messages });
  });

  // ---------- Today ----------

  app.post('/api/today', limitAi, async (req, res) => {
    const body = req.body || {};
    if (!Number.isInteger(body.oddie_id)) throw new HttpError(400, 'invalid_input', 'oddie_id is required');
    const result = await buildToday({
      db,
      gemini,
      nimble,
      oddieId: body.oddie_id,
      date: todayISO(),
      refresh: body.refresh === true,
    });
    res.json(result);
  });

  app.patch('/api/steps/:id', (req, res) => {
    const done = req.body ? req.body.done : undefined;
    if (done !== undefined && typeof done !== 'boolean') throw new HttpError(400, 'invalid_input', 'done must be true or false');
    res.json(store.setStepDone(db, req.params.id, done));
  });

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
