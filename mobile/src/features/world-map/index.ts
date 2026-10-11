/**
 * Public API of the world map feature: the home map, a world's introduction and the scene layout
 * shared with the web app (`assets/scene-layout.json`). Import from `@/features/world-map`.
 */
export type { Rect, SceneLayer, SceneLayout, SceneWorld, WorldId } from './types';
export { findWorld, isWorldId, sceneLayout, WORLD_IDS } from './layout';
export { fitCanvas } from './math';
export { WorldIntro } from './WorldIntro';
export { WorldMap } from './WorldMap';
export { WorldMapScreen } from './WorldMapScreen';
