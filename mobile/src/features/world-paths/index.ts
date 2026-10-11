/**
 * Public API of the world paths feature: each world's milestones from what the person has done
 * to possible futures, the corner companion who talks with them, and saved progress.
 * Import from `@/features/world-paths`.
 */
export type { Goal, GoalStatus, Progress, WorldPath } from './types';
export { findPath, WORLD_PATHS } from './data';
export { goalStatus, nextGoal } from './paths';
export { useGoalProgress } from './progressStore';
export { WorldPathScreen } from './WorldPathScreen';
