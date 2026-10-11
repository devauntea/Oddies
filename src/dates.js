// Dates are local calendar days as YYYY-MM-DD. The server's zone comes from the
// TZ env var (set in fly.toml), so "today" matches the user's day, not UTC.

function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

module.exports = { todayISO, addDays };
