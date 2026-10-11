const { openDb } = require('../src/db');
const { loadSeed } = require('../src/seed');
const { createApp } = require('../src/app');

// Starts the app on a free port with an in-memory, seeded database.
// `deps` can carry fake gemini and nimble clients.
async function startApp(deps = {}) {
  const db = openDb(':memory:');
  loadSeed(db);
  const app = createApp({ db, ...deps });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    return { status: res.status, json, text };
  };

  return { db, base, call, close: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { startApp };
