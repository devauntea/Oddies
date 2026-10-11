/**
 * Shape of `assets/scene-layout.json`, the layout shared with the web app. All positions and
 * sizes are canvas units on the 1024 x 1536 map canvas.
 */
export type WorldId = 'serenity' | 'midnight' | 'artist' | 'founder';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;

export type SceneLayer = {
  id: string;
  file: string;
  z: number;
  x: number;
  y: number;
  scale: number;
  motion: string;
  world?: string;
  phase?: number;
};

export type SceneWorld = {
  id: WorldId;
  name: string;
  personality: string;
  outfit: string;
  traits: string[];
  theme: string;
  accent: string;
  patch: string;
  portrait: string;
  portraitSize: Size;
  invitation: string;
  route: string[];
  researchTopic: string;
  bounds: Rect;
  hit: Rect;
  focus: Point;
  layer: string;
  path: { d: string; length: number };
};

export type SceneLayout = {
  version: number;
  canvas: Size & { edgeTop: string; edgeBottom: string };
  layers: SceneLayer[];
  worlds: SceneWorld[];
  character: { layer: string; hit: Rect; pivot: Point };
  clearing: Point & { rx: number; ry: number };
  motion: {
    arrive: { durationMs: number; staggerMs: number; rise: number };
    breathe: { durationMs: number; scaleY: number };
    worldBob: { enabled: boolean; durationMs: number; amplitude: number };
    hello: { durationMs: number; lift: number };
    select: { durationMs: number; scale: number };
    pathAccent: { durationMs: number; width: number; color: string };
    enter: { durationMs: number; zoom: number };
    exit: { durationMs: number };
    sheet: { durationMs: number };
  };
};
