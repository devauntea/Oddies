import motionProfiles from '../../../../assets/rig/motion-profiles.json';
import rawLayout from '../../../../assets/scene-layout.json';
import type { SceneLayout, SceneWorld, WorldId } from './types';

/** The shared scene layout. The web app reads the same file from `/assets/scene-layout.json`. */
export const sceneLayout = rawLayout as SceneLayout;

export const WORLD_IDS: readonly WorldId[] = sceneLayout.worlds.map((world) => world.id);

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && (WORLD_IDS as readonly string[]).includes(value);
}

export function findWorld(id: string | undefined): SceneWorld | undefined {
  return sceneLayout.worlds.find((world) => world.id === id);
}

/** Breathing cycle per personality, from the character rig's motion profiles. */
export function breathSecondsFor(outfit: string): number {
  const profile = (motionProfiles as Record<string, { breathSeconds: number } | undefined>)[outfit];
  return profile?.breathSeconds ?? sceneLayout.motion.breathe.durationMs / 1000;
}
