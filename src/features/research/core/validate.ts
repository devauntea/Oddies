import { ALL_LANES, type Lane, type Level, type ResearchRequest } from '../types';

const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced'];

/** A request after validation: defaults applied, strings trimmed. */
export type NormalizedResearchRequest = Omit<ResearchRequest, 'level' | 'lanes'> & {
  level: Level;
  lanes: Lane[];
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : undefined;
}

export function parseResearchRequest(body: unknown): ParseResult<NormalizedResearchRequest> {
  if (typeof body !== 'object' || body === null) return fail('Body must be a JSON object.');
  const input = body as Record<string, unknown>;

  const topic = cleanText(input.topic);
  if (!topic || topic.length < 2 || topic.length > 80) {
    return fail('`topic` must be 2-80 characters.');
  }

  let level: Level = 'beginner';
  if (input.level !== undefined) {
    if (!LEVELS.includes(input.level as Level)) {
      return fail(`\`level\` must be one of: ${LEVELS.join(', ')}.`);
    }
    level = input.level as Level;
  }

  let lanes: Lane[] = [...ALL_LANES];
  if (input.lanes !== undefined) {
    if (!Array.isArray(input.lanes) || input.lanes.length === 0) {
      return fail('`lanes` must be a non-empty array.');
    }
    const unknown = input.lanes.filter((lane) => !ALL_LANES.includes(lane as Lane));
    if (unknown.length > 0) return fail(`Unknown lanes: ${unknown.join(', ')}.`);
    lanes = ALL_LANES.filter((lane) => (input.lanes as unknown[]).includes(lane));
  }

  const goal = cleanText(input.goal);
  if (goal && goal.length > 200) return fail('`goal` must be at most 200 characters.');

  const pathId = cleanText(input.pathId);
  if (pathId && pathId.length > 100) return fail('`pathId` must be at most 100 characters.');

  const country = cleanText(input.country)?.toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) return fail('`country` must be a 2-letter code.');

  const locale = cleanText(input.locale);
  if (locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    return fail('`locale` must look like "en" or "en-US".');
  }

  return { ok: true, value: { topic, level, lanes, goal, pathId, country, locale } };
}

export function parseDocumentRequest(body: unknown): ParseResult<{ url: string }> {
  if (typeof body !== 'object' || body === null) return fail('Body must be a JSON object.');
  const raw = (body as Record<string, unknown>).url;
  if (typeof raw !== 'string' || raw.length > 2048) return fail('`url` is required.');
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return fail('`url` must be http(s).');
    }
    return { ok: true, value: { url: url.toString() } };
  } catch {
    return fail('`url` is not a valid URL.');
  }
}
