import { WORLDS, type World, type WorldId } from './worlds';

export interface UnderstoodStory {
  /** Short interest labels found in the user's words, in the order they appeared. */
  interests: string[];
  /** Worlds the story points at most, strongest first. Empty when nothing matched. */
  worldAffinity: WorldId[];
}

const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'about']);

/**
 * Understands a written intro without any AI: finds words that match a world's keywords and
 * returns them as editable interest chips. Deliberately literal, because the user reviews and
 * corrects the result before anything is created (style.md §9, Onboarding).
 */
export function understandStory(text: string): UnderstoodStory {
  const words = text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];
  const interests: string[] = [];
  const score = new Map<WorldId, number>();

  for (const word of words) {
    if (STOP.has(word)) continue;
    for (const world of WORLDS) {
      if (world.keywords.some((stem) => word.startsWith(stem))) {
        score.set(world.id, (score.get(world.id) ?? 0) + 1);
        if (!interests.includes(word)) interests.push(word);
      }
    }
  }

  const worldAffinity = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return { interests: interests.slice(0, 12), worldAffinity };
}

/**
 * What to research for a world: the user's own goal if they set one, else their first interest
 * that belongs to this world (e.g. "music" in Color Valley), else the world's default topic.
 */
export function researchTopicFor(world: World, interests: string[], customGoal?: string): string {
  const goal = customGoal?.trim();
  if (goal) return goal;
  const own = interests.find((interest) =>
    world.keywords.some((stem) => interest.toLowerCase().startsWith(stem)),
  );
  return own ?? world.researchTopic;
}
