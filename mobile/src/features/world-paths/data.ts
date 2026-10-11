import type { WorldId } from '@/features/world-map';

import type { Goal, GoalIcon, WorldPath } from './types';

type Step = {
  title: string;
  nextTitle: string;
  description: string;
  action: string;
  research: string;
  icon: GoalIcon;
};

/**
 * Builds a simple linear path: each step requires the one before. The first step is completed
 * as demo history only; in the real app that history comes from what the person confirms.
 */
function linearPath(worldId: WorldId, speech: string, prompts: string[], steps: Step[]): WorldPath {
  const goals: Goal[] = steps.map((step, index) => ({
    ...step,
    id: `${worldId}.${index + 1}`,
    requires: index === 0 ? [] : [`${worldId}.${index}`],
    seedCompleted: index === 0,
  }));
  return { worldId, speech, prompts, goals };
}

const SHARED_PROMPTS = [
  'Tell me about a time you felt that way.',
  'If you followed this path for a year, what would you want to change?',
  'What is one small thing you could try this week?',
];

export const WORLD_PATHS: WorldPath[] = [
  linearPath(
    'serenity',
    'One calm step at a time.',
    ['What part of a quieter life feels most like you?', ...SHARED_PROMPTS],
    [
      {
        title: 'First meditation',
        nextTitle: 'Remember your first sit',
        description: 'A practice you have already tried. Add a note about how it felt.',
        action: 'Write down how your first meditation went.',
        research: 'meditation for beginners',
        icon: 'sprout',
      },
      {
        title: 'Daily practice',
        nextTitle: 'Meditate five minutes',
        description: 'A small routine you can keep before making it longer.',
        action: 'Set aside five minutes a day to meditate this week.',
        research: 'daily meditation habit',
        icon: 'lotus',
      },
      {
        title: 'Meet a teacher',
        nextTitle: 'Meet a teacher',
        description: 'Explore which kind of guidance fits your intention and your life.',
        action: 'Find and reach out to a teacher who resonates with you.',
        research: 'meditation teacher near me',
        icon: 'people',
      },
      {
        title: 'Explore a retreat',
        nextTitle: 'Compare two retreats',
        description: 'A future possibility you can fit to your time, wishes and budget.',
        action: 'Compare two retreats or communities.',
        research: 'meditation retreat for beginners',
        icon: 'sprout',
      },
    ],
  ),
  linearPath(
    'midnight',
    "Let's map your next move.",
    ['What draws you to hard questions?', ...SHARED_PROMPTS],
    [
      {
        title: 'Your experience',
        nextTitle: 'Add your experience',
        description: 'Skills and experience you have confirmed yourself.',
        action: 'Add one relevant experience.',
        research: 'skills for investigative careers',
        icon: 'id',
      },
      {
        title: 'Explore your route',
        nextTitle: 'Name the role',
        description: 'Clarify which investigative role interests you, and why.',
        action: 'Name the role you want to explore.',
        research: 'investigative career paths',
        icon: 'signpost',
      },
      {
        title: 'Check eligibility',
        nextTitle: 'Check eligibility',
        description: 'Look up the current requirements on the official source for that role.',
        action: 'Review the requirements and make a checklist.',
        research: 'FBI special agent eligibility requirements',
        icon: 'search',
      },
      {
        title: 'Prepare for selection',
        nextTitle: 'Close one gap',
        description: 'This depends on the real requirements of the role and on your situation.',
        action: 'Pick one concrete gap to work on.',
        research: 'how to prepare for federal agent selection',
        icon: 'briefcase',
      },
    ],
  ),
  linearPath(
    'artist',
    'Your next sketch starts here.',
    ['What would you love to make if no one was watching?', ...SHARED_PROMPTS],
    [
      {
        title: 'First sketches',
        nextTitle: 'Keep an early sketch',
        description: 'An earlier piece, or a small memory of your practice.',
        action: 'Add a note about an earlier sketch.',
        research: 'drawing for beginners',
        icon: 'sketch',
      },
      {
        title: 'Weekly practice',
        nextTitle: 'Create 3 studies',
        description: 'A simple creative routine you can keep.',
        action: 'Make three small studies this week.',
        research: 'weekly painting practice exercises',
        icon: 'palette',
      },
      {
        title: 'Build a portfolio',
        nextTitle: 'Pick five pieces',
        description: 'Work that shows the direction you want to explore.',
        action: 'Choose five pieces for your portfolio.',
        research: 'how to build an art portfolio',
        icon: 'image',
      },
      {
        title: 'Share your work',
        nextTitle: 'Share one piece',
        description: 'Where you could share it, and what feedback you want.',
        action: 'Share one piece with someone you trust.',
        research: 'where to share art online',
        icon: 'brush',
      },
    ],
  ),
  linearPath(
    'founder',
    "Let's test one small idea.",
    ['What problem would you love to solve first?', ...SHARED_PROMPTS],
    [
      {
        title: 'Your idea',
        nextTitle: 'Describe the problem',
        description: 'An idea you chose to explore, without assuming it is a business yet.',
        action: 'Describe the problem you want to solve.',
        research: 'how to validate a business idea',
        icon: 'bulb',
      },
      {
        title: 'Find your audience',
        nextTitle: 'Talk to 3 customers',
        description: 'Listen to real experiences before deciding on a solution.',
        action: 'Have 3 casual conversations to learn about their needs.',
        research: 'customer discovery interviews',
        icon: 'people',
      },
      {
        title: 'Test your offer',
        nextTitle: 'Test your offer',
        description: 'A small test that teaches you a lot for little effort.',
        action: 'Design one small test of your offer.',
        research: 'how to test a product offer',
        icon: 'flask',
      },
      {
        title: 'Launch and learn',
        nextTitle: 'Plan a first launch',
        description: 'A future possibility that changes with what your tests teach you.',
        action: 'Decide what a first launch should teach you.',
        research: 'how to launch a small business',
        icon: 'rocket',
      },
    ],
  ),
];

export function findPath(worldId: string | undefined): WorldPath | undefined {
  return WORLD_PATHS.find((path) => path.worldId === worldId);
}
