/**
 * Public API of the world map feature: the home map, a world's introduction and the scene layout
 * shared with the web app (`assets/scene-layout.json`). Import from `@/features/world-map`.
 */
export type { Rect, SceneLayer, SceneLayout, SceneWorld, WorldId } from './types';
export { breathSecondsFor, findWorld, isWorldId, sceneLayout, WORLD_IDS } from './layout';
export { fitCanvas } from './math';
export { LAYER_SOURCES, PORTRAIT_SOURCES } from './sources';
export { WorldMap } from './WorldMap';
export { WorldMapScreen } from './WorldMapScreen';
