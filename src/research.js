// The research plan behind Today's steps.
//
// Ported from the team's research feature (branch claude/vigilant-mayer-merd1u,
// src/features/research): the same search lanes, the same Nimble settings per
// lane, the same URL cleanup, and the same rules for turning a result into a
// task. The lanes follow the prototyping loop from Designing Your Life: learn
// the field, try it, talk to people doing it, go see it.
//
// What is different here: Gemini chooses 3 lanes and writes their queries (the
// rules below are the fallback), steps use this app's five step types, and
// there is no mock mode and no generic task. Every step is a real Nimble result.
//
// One setting changed after testing against live Nimble on 2026-10-11: the
// events lane no longer uses time_range 'month'. With it, "oil painting
// classes New York" returned general category pages. Without it, the same
// search returned specific classes (92NY, a weekly class on Eventbrite).

// One lane is one Nimble search.
//   type:   the step type a result from this lane becomes
//   kind:   what a result from this lane usually is
//   params: Nimble search settings for the lane
//   shape:  the query pattern, where X is the subject
const LANES = {
  overview: {
    type: 'read',
    kind: 'article',
    params: { max_results: 6, search_depth: 'standard' },
    shape: 'how to get started with X for beginners',
    purpose: 'learn the field',
  },
  documents: {
    type: 'read',
    kind: 'document',
    params: { max_results: 4, search_depth: 'lite', content_type: ['documents'] },
    shape: 'X study guide',
    purpose: 'a real study document to read',
  },
  practice: {
    type: 'practice',
    kind: 'article',
    params: { max_results: 5, search_depth: 'lite' },
    shape: 'X practice exercises',
    purpose: 'something hands-on to try',
  },
  community: {
    type: 'contact',
    kind: 'community',
    params: { max_results: 5, search_depth: 'lite' },
    shape: 'X community forum where beginners ask questions',
    purpose: 'people already on this path, to ask one question (a prototype conversation)',
  },
  events: {
    type: 'attend',
    kind: 'event',
    params: { max_results: 6, search_depth: 'standard' },
    shape: 'X workshops classes events CITY',
    purpose: 'a class, workshop or meetup to go to in the next few weeks (a prototype experience)',
  },
  // Not in the team's research feature. Added for this app's "apply" step type.
  apply: {
    type: 'apply',
    kind: 'article',
    params: { max_results: 5, search_depth: 'lite' },
    shape: 'X programs accepting applications CITY',
    purpose: 'a program, role or form to apply to',
  },
};

const LANE_NAMES = Object.keys(LANES);
// Used when Gemini cannot write the plan.
const FALLBACK_LANES = ['overview', 'community', 'events'];

const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|ref|ref_src)$/i;
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'm.youtube.com'];
const MAX_DESCRIPTION = 280;
const MAX_STEPS = 5;

// The body for one Nimble search.
function buildSearch(lane, query) {
  return { query, ...LANES[lane].params, output_format: 'plain_text' };
}

// The plan with no model involved: three lanes, queries built from the
// milestone and the city.
function fallbackPlan({ subject, city }) {
  const x = subject.replace(/[."]/g, '').trim();
  const lower = x.charAt(0).toLowerCase() + x.slice(1);
  const queries = {
    overview: `how to ${lower} for beginners`,
    community: `${lower} community forum where beginners ask questions`,
    events: `${lower} workshops classes events ${city}`,
  };
  return FALLBACK_LANES.map((lane) => ({ lane, query: queries[lane] }));
}

// Canonical form of a URL for comparing: lower-case host, no #fragment, no
// tracking parameters, no trailing slash. Null for anything that is not http(s).
function normalizeUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '';
  return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function refineKind(kind, url, source) {
  // Only generic results are refined. Community and event lanes keep their meaning.
  if (kind !== 'article' && kind !== 'document') return kind;
  if (VIDEO_HOSTS.includes(source)) return 'video';
  if (/\.(pdf|docx?|pptx?)$/i.test(new URL(url).pathname)) return 'document';
  return kind;
}

// Search text can carry markdown marks (#, *, backticks, link syntax). Plain words only.
function plain(text) {
  return String(text || '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>|]{1,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

// Turns one raw Nimble result into a resource. `url` stays exactly as Nimble
// returned it. `key` is the cleaned form used to compare URLs.
function toResource(raw, lane) {
  const key = normalizeUrl(raw && raw.url);
  if (!key) return null;
  const source = hostnameOf(key);
  return {
    key,
    url: String(raw.url).trim(),
    lane,
    kind: refineKind(LANES[lane].kind, key, source),
    title: plain(raw.title) || source,
    source,
    snippet: truncate(plain(raw.snippet || raw.description), MAX_DESCRIPTION),
  };
}

// Keeps the first resource for each URL, so earlier lanes win.
function dedupeResources(resources) {
  const seen = new Set();
  return resources.filter((resource) => {
    if (!resource || seen.has(resource.key)) return false;
    seen.add(resource.key);
    return true;
  });
}

// Builds steps straight from the lanes, with no model: one study resource, one
// to practice, one community, one event, one to apply to. Used when Gemini's
// pick fails or none of its steps survive the URL check.
function stepsFromLanes(resources) {
  const find = (test) => resources.find(test);
  const study =
    find((r) => r.kind === 'document') ||
    find((r) => r.lane === 'overview' && r.kind === 'article') ||
    find((r) => r.kind === 'video');
  const picks = [
    study && { resource: study, type: 'read', title: `${study.kind === 'video' ? 'Watch' : 'Read'} "${study.title}"` },
    ...['practice', 'community', 'events', 'apply'].map((lane) => {
      const resource = find((r) => r.lane === lane && r !== study);
      if (!resource) return null;
      const titles = {
        practice: `Try: ${resource.title}`,
        community: `Ask one question on ${resource.source}`,
        events: `Check out: ${resource.title}`,
        apply: `Apply: ${resource.title}`,
      };
      return { resource, type: LANES[lane].type, title: titles[lane] };
    }),
  ].filter(Boolean);

  return picks.slice(0, MAX_STEPS).map(({ resource, type, title }) => ({
    type,
    title: title.slice(0, 200),
    url: resource.url,
    source: resource.source,
  }));
}

module.exports = {
  LANES,
  LANE_NAMES,
  MAX_STEPS,
  buildSearch,
  fallbackPlan,
  normalizeUrl,
  hostnameOf,
  toResource,
  dedupeResources,
  stepsFromLanes,
};
