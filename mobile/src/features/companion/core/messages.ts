import type { WorldId } from '@/features/world-map/types';

/**
 * The daily companion's library. Written to the playbook's tone (style.md §12): short, warm and
 * concrete; inviting rather than telling the user who they are. Affirmations name something the
 * user can choose; advice is one small, doable step. Messages tied to a world speak from that
 * world's perspective and can open it.
 *
 * Ids are stable: progress and "seen" state key on them, so don't renumber. Add new ones at the end.
 */
export type MessageKind = 'affirmation' | 'advice';

export interface CompanionMessage {
  id: string;
  kind: MessageKind;
  text: string;
  /** The world this thought comes from, if any. */
  worldId?: WorldId;
  /** Overrides the default "For you today" / "A small step" line above the text. */
  eyebrow?: string;
}

export const MESSAGES: readonly CompanionMessage[] = [
  // The present self
  {
    id: 'self-1',
    kind: 'affirmation',
    text: 'You don’t have to pick one life today. You only have to take one step.',
  },
  {
    id: 'self-2',
    kind: 'affirmation',
    text: 'Every version of you starts from right here. That’s a good place to be.',
  },
  {
    id: 'self-3',
    kind: 'affirmation',
    text: 'Curiosity counts as progress. You’re allowed to just explore.',
  },
  {
    id: 'self-4',
    kind: 'affirmation',
    text: 'What you’ve already lived is not a detour. It’s material.',
  },
  {
    id: 'self-5',
    kind: 'affirmation',
    text: 'You can change direction and still keep everything you’ve learned.',
  },
  {
    id: 'self-6',
    kind: 'advice',
    text: 'Pick the world that tugs at you most today and spend ten minutes there.',
  },
  {
    id: 'self-7',
    kind: 'advice',
    text: 'Write down one thing you did this week that felt like you. Small counts.',
  },
  {
    id: 'self-8',
    kind: 'advice',
    text: 'Ask yourself: what would make today feel a little more like my life?',
  },
  {
    id: 'self-9',
    kind: 'advice',
    text: 'Notice when you lose track of time today. That’s a clue worth keeping.',
  },
  {
    id: 'self-10',
    kind: 'advice',
    text: 'Tell one person about a path you’re curious about. Saying it out loud helps.',
  },

  // Quiet Peaks · The Monk
  {
    id: 'serenity-1',
    kind: 'affirmation',
    worldId: 'serenity',
    text: 'Stillness isn’t standing still. You can rest and still be moving.',
  },
  {
    id: 'serenity-2',
    kind: 'advice',
    worldId: 'serenity',
    text: 'Try three slow breaths before you open your next app.',
  },
  {
    id: 'serenity-3',
    kind: 'advice',
    worldId: 'serenity',
    text: 'Take a short walk without your phone and see what you notice.',
  },
  {
    id: 'serenity-4',
    kind: 'affirmation',
    worldId: 'serenity',
    text: 'You’re allowed to want a quieter life. That wish deserves room.',
  },

  // Midnight City · The Agent
  {
    id: 'midnight-1',
    kind: 'affirmation',
    worldId: 'midnight',
    text: 'Your questions are a strength. Keep asking the one nobody else asks.',
  },
  {
    id: 'midnight-2',
    kind: 'advice',
    worldId: 'midnight',
    text: 'Look up one real requirement for a path you’re curious about. Facts make dreams clearer.',
  },
  {
    id: 'midnight-3',
    kind: 'advice',
    worldId: 'midnight',
    text: 'Pick one thing you’ve assumed about yourself and look for evidence either way.',
  },
  {
    id: 'midnight-4',
    kind: 'affirmation',
    worldId: 'midnight',
    text: 'Courage can be quiet. Doing the next small thing is brave too.',
  },

  // Color Valley · The Painter
  {
    id: 'artist-1',
    kind: 'affirmation',
    worldId: 'artist',
    text: 'You don’t need permission to make something. Messy first tries count.',
  },
  {
    id: 'artist-2',
    kind: 'advice',
    worldId: 'artist',
    text: 'Make one tiny thing today: a sketch, a line, a photo. Done beats perfect.',
  },
  {
    id: 'artist-3',
    kind: 'advice',
    worldId: 'artist',
    text: 'Save one thing you made before. Seeing your own work again is fuel.',
  },
  {
    id: 'artist-4',
    kind: 'affirmation',
    worldId: 'artist',
    text: 'The way you see things is worth sharing, even when it feels unfinished.',
  },

  // Idea Gardens · The Founder
  {
    id: 'founder-1',
    kind: 'affirmation',
    worldId: 'founder',
    text: 'An idea in a notebook is already a beginning. You started something.',
  },
  {
    id: 'founder-2',
    kind: 'advice',
    worldId: 'founder',
    text: 'Ask one person what annoys them about their day. Listen for a pattern.',
  },
  {
    id: 'founder-3',
    kind: 'advice',
    worldId: 'founder',
    text: 'Write your idea in one sentence. If it’s hard, that’s useful to know.',
  },
  {
    id: 'founder-4',
    kind: 'affirmation',
    worldId: 'founder',
    text: 'You can test a dream for a weekend before betting a year on it.',
  },
];
