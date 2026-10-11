import { dayKey, messageForDay, nextMessage, shouldPopUp, speakingMs } from '../core/daily';
import { MESSAGES } from '../core/messages';
// The layout module only: the feature index pulls in native storage via the research hooks.
import { WORLD_IDS } from '@/features/world-map/layout';

const days = (start: string, count: number) => {
  const [y, m, d] = start.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => dayKey(new Date(y!, m! - 1, d! + i)));
};

describe('dayKey', () => {
  it('uses the local calendar day, zero padded', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('messageForDay', () => {
  it('is stable for a given day', () => {
    expect(messageForDay('2026-10-11')).toBe(messageForDay('2026-10-11'));
  });

  it('never repeats on consecutive days', () => {
    const run = days('2026-12-25', 30).map((d) => messageForDay(d).id);
    run.slice(1).forEach((id, i) => expect(id).not.toBe(run[i]));
  });

  it('shows every message once before any repeats, across a month boundary', () => {
    const ids = days('2026-10-20', MESSAGES.length).map((d) => messageForDay(d).id);
    expect(new Set(ids).size).toBe(MESSAGES.length);
  });

  it('works for a tiny library', () => {
    const one = [{ id: 'a', kind: 'advice' as const, text: 'x' }];
    expect(messageForDay('2026-10-11', one).id).toBe('a');
  });
});

describe('nextMessage', () => {
  it('cycles through the whole library', () => {
    let m = MESSAGES[0]!;
    const seen = new Set<string>();
    for (let i = 0; i < MESSAGES.length; i++) {
      seen.add(m.id);
      m = nextMessage(m);
    }
    expect(seen.size).toBe(MESSAGES.length);
    expect(m.id).toBe(MESSAGES[0]!.id);
  });
});

describe('shouldPopUp', () => {
  it('pops up once a day while enabled', () => {
    expect(shouldPopUp({ enabled: true }, '2026-10-11')).toBe(true);
    expect(shouldPopUp({ enabled: true, lastShownDay: '2026-10-11' }, '2026-10-11')).toBe(false);
    expect(shouldPopUp({ enabled: true, lastShownDay: '2026-10-10' }, '2026-10-11')).toBe(true);
  });

  it('never pops up by itself once turned off', () => {
    expect(shouldPopUp({ enabled: false }, '2026-10-11')).toBe(false);
  });
});

describe('message library', () => {
  it('has unique ids, short text, and only real worlds', () => {
    expect(new Set(MESSAGES.map((m) => m.id)).size).toBe(MESSAGES.length);
    for (const m of MESSAGES) {
      expect(m.text.length).toBeLessThanOrEqual(110);
      if (m.worldId) expect(WORLD_IDS).toContain(m.worldId);
    }
  });

  it('gives every world a voice', () => {
    for (const id of WORLD_IDS) expect(MESSAGES.some((m) => m.worldId === id)).toBe(true);
  });

  it('talks for a reading-length beat, within bounds', () => {
    expect(speakingMs('Hi')).toBe(1200);
    expect(speakingMs('x'.repeat(500))).toBe(4000);
  });
});
