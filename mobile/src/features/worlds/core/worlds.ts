import type { Personality } from '../art/characterRig';

export type WorldId = 'serenity' | 'midnight' | 'artist' | 'founder';

export interface Milestone {
  id: string;
  title: string;
  /** Shown under the title, e.g. a reminder to check official requirements. */
  note?: string;
}

export interface World {
  id: WorldId;
  /** Place name, e.g. "Quiet Peaks". Fraunces title on the world screen. */
  name: string;
  /** The version of you who lives here, e.g. "The Monk". */
  version: string;
  personality: Personality;
  /** Possible goal (product brief). */
  goal: string;
  /** Reflection theme (style.md §6). */
  theme: string;
  /** One personal invitation. Preserves agency: "Imagine…", "What draws you…". */
  invitation: string;
  /** Default research topic when the user hasn't said anything more specific. */
  researchTopic: string;
  /** Words in the user's own story that point at this world. Lower-case stems. */
  keywords: string[];
  /** Illustrative route (product brief). The first step is about what's already done. */
  route: Milestone[];
  /** World-specific reflection question, asked alongside the shared ones. */
  prompt: string;
  /** Token key into `scene` / `palette` for this world's color. */
  sceneColor: 'serenity' | 'midnight' | 'artist' | 'founder';
  accent: 'saffron' | 'navy' | 'coral' | 'iris';
}

export const WORLDS: readonly World[] = [
  {
    id: 'serenity',
    name: 'Quiet Peaks',
    version: 'The Monk',
    personality: 'monk',
    goal: 'Contemplative practice or monastic life',
    theme: 'Calm, meaning, inner life',
    invitation: 'Imagine a life with more stillness in it. What would you want more room for?',
    researchTopic: 'meditation practice',
    keywords: [
      'meditat',
      'zen',
      'mindful',
      'calm',
      'yoga',
      'retreat',
      'spiritual',
      'buddh',
      'pray',
      'monk',
      'monaster',
    ],
    route: [
      { id: 'serenity-past', title: 'Your practice so far' },
      { id: 'serenity-regular', title: 'Meditate regularly' },
      { id: 'serenity-teacher', title: 'Speak with a teacher' },
      { id: 'serenity-retreat', title: 'Explore a retreat or community' },
    ],
    prompt: 'When did you last feel truly still? What was around you?',
    sceneColor: 'serenity',
    accent: 'saffron',
  },
  {
    id: 'midnight',
    name: 'Midnight City',
    version: 'The Agent',
    personality: 'agent',
    goal: 'An investigative career, such as FBI agent',
    theme: 'Curiosity, investigation, courage',
    invitation:
      'Imagine following your curiosity into hard questions. What would you want to find out?',
    researchTopic: 'becoming an FBI special agent',
    keywords: [
      'investigat',
      'crime',
      'detective',
      'justice',
      'lawyer',
      'legal',
      'fbi',
      'police',
      'mystery',
      'case',
      'security',
      'forensic',
    ],
    route: [
      { id: 'midnight-past', title: 'Relevant experience' },
      {
        id: 'midnight-eligibility',
        title: 'Verify official eligibility',
        note: 'Check current official entry requirements before planning further.',
      },
      { id: 'midnight-gaps', title: 'Identify the gaps' },
      { id: 'midnight-selection', title: 'Prepare for selection' },
    ],
    prompt: 'What kind of question can you not stop thinking about once you start?',
    sceneColor: 'midnight',
    accent: 'navy',
  },
  {
    id: 'artist',
    name: 'Color Valley',
    version: 'The Artist',
    personality: 'artist',
    goal: 'A creative practice or art career',
    theme: 'Expression, craft, creativity',
    invitation: 'Imagine making things every day. What would you love to create?',
    researchTopic: 'painting',
    keywords: [
      'paint',
      'art',
      'draw',
      'design',
      'music',
      'poster',
      'illustrat',
      'photo',
      'craft',
      'creative',
      'film',
      'singing',
      'writ',
    ],
    route: [
      { id: 'artist-past', title: 'Previous work' },
      { id: 'artist-practice', title: 'Practice consistently' },
      { id: 'artist-portfolio', title: 'Build a portfolio' },
      { id: 'artist-share', title: 'Share or exhibit your work' },
    ],
    prompt: 'What did you make, ever, that you were secretly proud of?',
    sceneColor: 'artist',
    accent: 'coral',
  },
  {
    id: 'founder',
    name: 'Idea Gardens',
    version: 'The Founder',
    personality: 'founder',
    goal: 'Build a business',
    theme: 'Building, entrepreneurship, possibility',
    invitation: 'Imagine building something of your own. What problem keeps pulling at you?',
    researchTopic: 'starting a small business',
    keywords: [
      'business',
      'startup',
      'idea',
      'build',
      'company',
      'entrepreneur',
      'product',
      'customer',
      'sell',
      'founder',
      'launch',
    ],
    route: [
      { id: 'founder-past', title: 'Your existing idea' },
      { id: 'founder-customers', title: 'Talk to customers' },
      { id: 'founder-offer', title: 'Test an offer' },
      { id: 'founder-launch', title: 'Launch and learn' },
    ],
    prompt: 'Which everyday annoyance do you keep imagining a fix for?',
    sceneColor: 'founder',
    accent: 'iris',
  },
];

/** Shared reflection questions (style.md §12). */
export const SHARED_PROMPTS: readonly string[] = [
  'What part of this world feels most like you?',
  'Tell me about a time you felt that way.',
  'If you followed this path for a year, what would you want to change?',
  'What is one small thing you could try this week?',
];

export function getWorld(id: string | undefined): World | undefined {
  return WORLDS.find((world) => world.id === id);
}

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && WORLDS.some((world) => world.id === value);
}
