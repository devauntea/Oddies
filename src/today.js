// Builds today's steps for one branch:
//   1. Gemini picks 3 research lanes for the next unreached milestone and
//      writes one search query for each (see src/research.js for the lanes).
//   2. Nimble runs the 3 searches, with each lane's own settings.
//   3. Gemini picks 3 to 5 steps from those results.
//   4. Any step whose URL Nimble did not return is dropped.
// If Gemini is the part that fails, the lane rules build the plan or the steps
// instead, still from Nimble results only. If Nimble fails there are no steps.
// Nothing is ever made up.
const Sentry = require('@sentry/node');
const { HttpError } = require('./errors');
const store = require('./store');
const research = require('./research');
const { QUERY_SYSTEM, queryPrompt, QUERY_SCHEMA, PICK_SYSTEM, pickPrompt, PICK_SCHEMA } = require('./prompts');

const NIMBLE_TIMEOUT_MS = 20_000;
const MAX_RESULTS_FOR_MODEL = 24;
const MAX_DOCUMENT_CHARS = 60_000;

// The URL check. Keeps only steps whose URL is one Nimble returned, and saves
// the URL exactly as Nimble gave it.
function keepRealSteps(steps, resources) {
  const real = new Map(resources.map((r) => [r.key, r]));
  const kept = [];
  const used = new Set();
  for (const step of Array.isArray(steps) ? steps : []) {
    if (!step || typeof step !== 'object') continue;
    const key = research.normalizeUrl(step.url);
    const match = key && real.get(key);
    const title = typeof step.title === 'string' ? step.title.trim().slice(0, 200) : '';
    if (!match || used.has(key) || !title) continue;
    used.add(key);
    kept.push({
      // An unknown type falls back to the type of the lane the result came from.
      type: store.STEP_TYPES.includes(step.type) ? step.type : research.LANES[match.lane].type,
      title,
      url: match.url,
      source: (typeof step.source === 'string' && step.source.trim().slice(0, 80)) || match.source,
    });
    if (kept.length === research.MAX_STEPS) break;
  }
  return kept;
}

// Checks the plan Gemini wrote: known lanes, each used once, a query on each.
function cleanPlan(queries) {
  const plan = [];
  for (const item of Array.isArray(queries) ? queries : []) {
    const lane = item && item.lane;
    const query = item && typeof item.query === 'string' ? item.query.trim().slice(0, 200) : '';
    if (!research.LANES[lane] || !query || plan.some((p) => p.lane === lane)) continue;
    plan.push({ lane, query });
    if (plan.length === 3) break;
  }
  return plan;
}

// Step 1. Gemini writes the plan. If it cannot, the lane rules do.
async function planSearches({ gemini, context }) {
  try {
    const { data } = await gemini.generateJson({
      task: 'today.queries',
      system: QUERY_SYSTEM,
      contents: queryPrompt(context),
      schema: QUERY_SCHEMA,
    });
    const plan = cleanPlan(data.queries);
    if (plan.length) return { plan, source: 'gemini' };
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
  }
  const subject = context.milestone ? context.milestone.title : context.oddie.interests[0] || context.oddie.life;
  return { plan: research.fallbackPlan({ subject, city: context.self.city }), source: 'lane_rules' };
}

// Step 2. Runs every planned search through Nimble at once, with one shared time limit.
async function searchAll(nimble, plan) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NIMBLE_TIMEOUT_MS);
  try {
    const settled = await Promise.allSettled(
      plan.map(({ lane, query }) => nimble.search(research.buildSearch(lane, query), { signal: controller.signal, lane }))
    );
    const resources = research.dedupeResources(
      settled.flatMap((s, i) => (s.status === 'fulfilled' ? s.value.map((raw) => research.toResource(raw, plan[i].lane)) : []))
    );
    const failed = settled.filter((s) => s.status === 'rejected').length;
    if (!resources.length) {
      if (controller.signal.aborted) {
        throw new HttpError(504, 'nimble_timeout', 'Search took longer than 20 seconds. Try again.', { retryable: true });
      }
      if (failed) {
        throw new HttpError(502, 'nimble_failed', 'Search is not working right now. Try again.', { retryable: true });
      }
      throw new HttpError(502, 'nimble_no_results', 'Search came back empty. Try again.', { retryable: true });
    }
    return { resources, failed };
  } finally {
    clearTimeout(timer);
  }
}

// Steps 3 and 4. Gemini picks, the URL check filters. If that leaves nothing,
// the lane rules pick from the same results.
async function pickSteps({ gemini, context, resources }) {
  let proposed = [];
  try {
    const { data } = await gemini.generateJson({
      task: 'today.pick_steps',
      system: PICK_SYSTEM,
      contents: pickPrompt({ ...context, results: resources.slice(0, MAX_RESULTS_FOR_MODEL) }),
      schema: PICK_SCHEMA,
    });
    proposed = Array.isArray(data.steps) ? data.steps : [];
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
  }
  const kept = keepRealSteps(proposed, resources);
  if (kept.length) return { steps: kept, proposed: proposed.length, source: 'gemini' };
  return { steps: research.stepsFromLanes(resources), proposed: proposed.length, source: 'lane_rules' };
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
      const context = { self: store.getSelf(db), oddie, milestone, today: date };

      const { plan, source: planSource } = await planSearches({ gemini, context });
      const { resources, failed } = await searchAll(nimble, plan);
      const { steps: kept, proposed, source: pickSource } = await pickSteps({ gemini, context, resources });

      span.setAttributes({
        'oddies.lanes': plan.map((p) => p.lane).join(','),
        'oddies.plan_source': planSource,
        'oddies.pick_source': pickSource,
        'oddies.searches_failed': failed,
        'oddies.results': resources.length,
        'oddies.steps_proposed': proposed,
        'oddies.steps_kept': kept.length,
        'oddies.steps_dropped': pickSource === 'gemini' ? proposed - kept.length : proposed,
      });
      if (!kept.length) {
        throw new HttpError(502, 'no_real_steps', 'Search did not return anything usable. Try again.', { retryable: true });
      }

      const steps = store.replaceSteps(db, {
        oddieId: oddie.id,
        milestoneId: milestone ? milestone.id : null,
        date,
        steps: kept,
      });
      return { pick, milestone, steps, lanes: plan.map((p) => p.lane), reused: false };
    }
  );
}

// Loads a step's page as markdown through Nimble Extract so it can be read in
// the app. Only URLs of saved steps can be read, so this is not an open proxy.
async function readStep({ db, nimble, stepId }) {
  const step = db.prepare('SELECT * FROM step WHERE id = ?').get(Number(stepId));
  if (!step) throw new HttpError(404, 'step_not_found', 'No step with that id');
  if (!nimble || !nimble.configured) {
    throw new HttpError(503, 'nimble_not_configured', 'NIMBLE_API_KEY is not set on the server.');
  }

  const unavailable = () =>
    new HttpError(502, 'document_unavailable', 'This page could not be loaded for reading. Open it in the browser instead.');
  let result;
  try {
    result = await nimble.extract(step.url);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unavailable();
  }
  if (!result.ok || !result.markdown) throw unavailable();

  const truncated = result.markdown.length > MAX_DOCUMENT_CHARS;
  const heading = result.markdown.match(/^#{1,2}\s+(.+)$/m);
  return {
    step_id: step.id,
    url: step.url,
    title: heading ? heading[1].trim() : step.title,
    markdown: truncated ? result.markdown.slice(0, MAX_DOCUMENT_CHARS) : result.markdown,
    truncated,
  };
}

module.exports = { buildToday, readStep, keepRealSteps, cleanPlan, NIMBLE_TIMEOUT_MS };
