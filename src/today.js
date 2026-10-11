// Builds today's steps for one branch:
//   1. Gemini writes 3 search queries for the next unreached milestone.
//   2. Nimble runs them.
//   3. Gemini picks 3 to 5 steps from those results.
//   4. Any step whose URL Nimble did not return is dropped.
// If Nimble fails there are no steps. Nothing is ever made up.
const Sentry = require('@sentry/node');
const { HttpError } = require('./errors');
const store = require('./store');
const { QUERY_SYSTEM, queryPrompt, QUERY_SCHEMA, PICK_SYSTEM, pickPrompt, PICK_SCHEMA } = require('./prompts');

const NIMBLE_TIMEOUT_MS = 20_000;
const MAX_STEPS = 5;
const MAX_RESULTS_FOR_MODEL = 24;
const SNIPPET_CHARS = 320;

// Two URLs count as the same if they only differ by case of the host, a
// trailing slash, or a #fragment.
function urlKey(url) {
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return null;
  }
}

function hostOf(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

// Removes duplicates and anything that is not an http(s) link.
function dedupeResults(results) {
  const seen = new Map();
  for (const result of results) {
    const key = urlKey(result.url);
    if (key && !seen.has(key)) seen.set(key, result);
  }
  return [...seen.values()];
}

// The URL check. Keeps only steps whose URL is one Nimble returned, and saves
// the URL exactly as Nimble gave it.
function keepRealSteps(steps, results) {
  const real = new Map(results.map((r) => [urlKey(r.url), r]));
  const kept = [];
  const used = new Set();
  for (const step of Array.isArray(steps) ? steps : []) {
    if (!step || typeof step !== 'object') continue;
    const key = urlKey(step.url);
    const match = key && real.get(key);
    const title = typeof step.title === 'string' ? step.title.trim().slice(0, 200) : '';
    if (!match || used.has(key) || !title) continue;
    used.add(key);
    kept.push({
      type: store.STEP_TYPES.includes(step.type) ? step.type : 'read',
      title,
      url: match.url,
      source: (typeof step.source === 'string' && step.source.trim().slice(0, 80)) || hostOf(match.url),
    });
    if (kept.length === MAX_STEPS) break;
  }
  return kept;
}

// Runs every query through Nimble at once, with one shared time limit.
async function searchAll(nimble, queries) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NIMBLE_TIMEOUT_MS);
  try {
    const settled = await Promise.allSettled(queries.map((q) => nimble.search(q, { signal: controller.signal })));
    const results = dedupeResults(settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])));
    const failed = settled.filter((s) => s.status === 'rejected');
    if (!results.length) {
      if (controller.signal.aborted) {
        throw new HttpError(504, 'nimble_timeout', 'Search took longer than 20 seconds. Try again.', { retryable: true });
      }
      if (failed.length) {
        throw new HttpError(502, 'nimble_failed', 'Search is not working right now. Try again.', { retryable: true });
      }
      throw new HttpError(502, 'nimble_no_results', 'Search came back empty. Try again.', { retryable: true });
    }
    return { results, failed: failed.length };
  } finally {
    clearTimeout(timer);
  }
}

// Records the pick and returns { pick, milestone, steps }.
// Steps already found for this branch today are reused unless `refresh` is set.
async function buildToday({ db, gemini, nimble, oddieId, date, refresh = false }) {
  const oddie = store.getOddie(db, oddieId);
  const pick = store.setPick(db, date, oddie.id);
  const milestone = store.nextMilestone(db, oddie.id);

  const existing = store.stepsFor(db, oddie.id, date);
  if (existing.length && !refresh) return { pick, milestone, steps: existing, reused: true };

  if (!nimble || !nimble.configured) {
    throw new HttpError(503, 'nimble_not_configured', 'NIMBLE_API_KEY is not set on the server.', { retryable: true });
  }

  return Sentry.startSpan(
    {
      name: 'today.build_steps',
      op: 'oddies.today',
      attributes: { 'oddies.oddie_id': oddie.id, 'oddies.milestone': milestone ? milestone.title : '(all reached)' },
    },
    async (span) => {
      const self = store.getSelf(db);
      const context = { self, oddie, milestone, today: date };

      const { data: queryData } = await gemini.generateJson({
        task: 'today.queries',
        system: QUERY_SYSTEM,
        contents: queryPrompt(context),
        schema: QUERY_SCHEMA,
      });
      const queries = (Array.isArray(queryData.queries) ? queryData.queries : [])
        .map((q) => String(q).trim())
        .filter(Boolean)
        .slice(0, 3);
      if (!queries.length) throw new HttpError(502, 'gemini_failed', 'Could not write search queries. Try again.', { retryable: true });

      const { results, failed } = await searchAll(nimble, queries);

      const shortlist = results.slice(0, MAX_RESULTS_FOR_MODEL).map((r) => ({
        title: String(r.title || '').slice(0, 160),
        url: r.url,
        snippet: String(r.snippet || '').slice(0, SNIPPET_CHARS),
      }));
      const { data: pickData } = await gemini.generateJson({
        task: 'today.pick_steps',
        system: PICK_SYSTEM,
        contents: pickPrompt({ ...context, results: shortlist }),
        schema: PICK_SCHEMA,
      });

      const proposed = Array.isArray(pickData.steps) ? pickData.steps : [];
      const kept = keepRealSteps(proposed, results);
      span.setAttributes({
        'oddies.queries': queries.length,
        'oddies.searches_failed': failed,
        'oddies.results': results.length,
        'oddies.steps_proposed': proposed.length,
        'oddies.steps_kept': kept.length,
        'oddies.steps_dropped': proposed.length - kept.length,
      });
      if (!kept.length) {
        throw new HttpError(502, 'no_real_steps', 'None of the suggested steps matched a real search result. Try again.', {
          retryable: true,
        });
      }

      const steps = store.replaceSteps(db, {
        oddieId: oddie.id,
        milestoneId: milestone ? milestone.id : null,
        date,
        steps: kept,
      });
      return { pick, milestone, steps, reused: false };
    }
  );
}

module.exports = { buildToday, keepRealSteps, dedupeResults, urlKey, NIMBLE_TIMEOUT_MS };
