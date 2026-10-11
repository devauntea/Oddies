const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'oddies.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS self (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  summary TEXT NOT NULL,
  now_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oddie (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  life TEXT NOT NULL,
  interests TEXT NOT NULL DEFAULT '[]',
  persona_brief TEXT NOT NULL DEFAULT '',
  horizon_years INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant')),
  branch_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS milestone (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oddie_id INTEGER NOT NULL REFERENCES oddie(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  reached INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS day_pick (
  date TEXT PRIMARY KEY,
  oddie_id INTEGER NOT NULL REFERENCES oddie(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS step (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oddie_id INTEGER NOT NULL REFERENCES oddie(id) ON DELETE CASCADE,
  milestone_id INTEGER REFERENCES milestone(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('read', 'attend', 'apply', 'contact', 'practice')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  found_on TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oddie_id INTEGER NOT NULL REFERENCES oddie(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'oddie')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS milestone_oddie ON milestone (oddie_id, position);
CREATE INDEX IF NOT EXISTS step_oddie_day ON step (oddie_id, found_on);
CREATE INDEX IF NOT EXISTS chat_oddie ON chat_message (oddie_id, id);
`;

const TABLES = ['chat_message', 'step', 'day_pick', 'milestone', 'oddie', 'self'];

function openDb(file = process.env.DB_PATH || DEFAULT_DB_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

// Empties every table and restarts the id counters.
function wipe(db) {
  db.transaction(() => {
    for (const table of TABLES) db.prepare(`DELETE FROM ${table}`).run();
    db.prepare('DELETE FROM sqlite_sequence').run();
  })();
}

module.exports = { openDb, wipe };
