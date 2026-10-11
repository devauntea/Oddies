import { MESSAGES, type CompanionMessage } from './messages';

/** Local calendar day as "YYYY-MM-DD". The companion's "today". */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days since 1970-01-01 for a day key, so consecutive days are consecutive integers. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

/**
 * Today's message. Deterministic, so the same day always shows the same thought (on reopen, and
 * across devices). Walks the library with a stride that is coprime with its length, so
 * neighbouring days get different messages and every message comes up before any repeats.
 */
export function messageForDay(
  key: string,
  library: readonly CompanionMessage[] = MESSAGES,
): CompanionMessage {
  const n = library.length;
  if (n === 0) throw new Error('Companion library is empty.');
  const stride = coprimeStride(n);
  const index = (((dayNumber(key) * stride) % n) + n) % n;
  return library[index]!;
}

/** "Another one": the message after `current` in the library. */
export function nextMessage(
  current: CompanionMessage,
  library: readonly CompanionMessage[] = MESSAGES,
): CompanionMessage {
  const i = library.findIndex((m) => m.id === current.id);
  return library[(i + 1 + library.length) % library.length]!;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function coprimeStride(n: number): number {
  // A stride near the golden ratio spreads consecutive days across the library.
  let stride = Math.max(1, Math.round(n * 0.618));
  while (gcd(stride, n) !== 1) stride += 1;
  return stride;
}

export interface CompanionState {
  /** Day key the pop-up last appeared on its own. */
  lastShownDay?: string;
  /** False when the user turned the daily pop-up off. They can still open her manually. */
  enabled: boolean;
}

/** The companion pops up by itself at most once a day, and never once turned off. */
export function shouldPopUp(state: CompanionState, today: string): boolean {
  return state.enabled && state.lastShownDay !== today;
}

/** How long she "talks" while the bubble appears: reading pace, capped so it never drags. */
export function speakingMs(text: string): number {
  return Math.min(4000, Math.max(1200, text.length * 45));
}
