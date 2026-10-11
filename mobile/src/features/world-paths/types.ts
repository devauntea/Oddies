import type { WorldId } from '@/features/world-map';

export type Point = { x: number; y: number };

export type GoalIcon =
  | 'sprout'
  | 'lotus'
  | 'people'
  | 'id'
  | 'signpost'
  | 'search'
  | 'briefcase'
  | 'sketch'
  | 'palette'
  | 'image'
  | 'brush'
  | 'bulb'
  | 'flask'
  | 'rocket';

/** One milestone on a world's path. `requires` drives both unlocking and the drawn connections. */
export type Goal = {
  id: string;
  /** Short label on the path, e.g. "Meet a teacher". */
  title: string;
  /** Headline when this is the next action, e.g. "Talk to 3 customers". */
  nextTitle: string;
  description: string;
  /** One concrete thing to do. */
  action: string;
  /** Topic handed to live research ("Find real steps"). */
  research: string;
  icon: GoalIcon;
  requires: string[];
  /** Demo history only. In the real app, history comes from what the person confirms. */
  seedCompleted?: boolean;
};

export type WorldPath = {
  worldId: WorldId;
  /** What the personality says in the corner bubble. */
  speech: string;
  /** Reflection questions for the Talk sheet. */
  prompts: string[];
  goals: Goal[];
};

export type GoalProgress = { completed: boolean; note: string; plannedDate: string };
export type Progress = Record<string, GoalProgress>;
export type GoalStatus = 'completed' | 'available' | 'locked';
