// Local dev reads a .env file if there is one. On Fly the values come from secrets.
try {
  process.loadEnvFile();
} catch {
  // no .env file, which is fine
}

const { openDb } = require('./src/db');
const { seedIfEmpty } = require('./src/seed');
const { createApp } = require('./src/app');

const db = openDb();
if (seedIfEmpty(db)) console.log('Empty database, loaded the demo profile.');

const app = createApp({ db });
const port = Number(process.env.PORT) || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Oddies is listening on http://localhost:${port}`);
});
