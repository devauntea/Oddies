import type { Point, Rect, SceneLayer, Size } from './types';

/** Largest uniform scale that fits the canvas inside `available` (no cropping, no distortion). */
export function fitCanvas(available: Size, canvas: Size): Size & { scale: number } {
  const byWidth = available.width / canvas.width;
  const byHeight = available.height / canvas.height;
  const scale = Math.max(0, Math.min(byWidth, byHeight));
  return { scale, width: canvas.width * scale, height: canvas.height * scale };
}

/** Every layer file is a full canvas drawn at (x, y) and scaled uniformly. */
export function layerRect(layer: SceneLayer, canvas: Size): Rect {
  return {
    x: layer.x,
    y: layer.y,
    width: canvas.width * layer.scale,
    height: canvas.height * layer.scale,
  };
}

export function scaleRect(rect: Rect, k: number): Rect {
  return { x: rect.x * k, y: rect.y * k, width: rect.width * k, height: rect.height * k };
}

/** A rect as absolute-position style values. */
export function positionOf(rect: Rect) {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * React Native scales views around their center. To scale by `s` around `pivot` instead, add
 * this translation (same units as the inputs).
 */
export function pivotTranslation(rect: Rect, pivot: Point, s: number): Point {
  const center = rectCenter(rect);
  return { x: (1 - s) * (pivot.x - center.x), y: (1 - s) * (pivot.y - center.y) };
}

/** Translation that brings `focus` to the middle of the canvas when it is zoomed by `zoom`. */
export function cameraOffset(focus: Point, canvas: Size, zoom: number): Point {
  return { x: zoom * (canvas.width / 2 - focus.x), y: zoom * (canvas.height / 2 - focus.y) };
}

/**
 * One smooth cycle from `from` to `to` and back, sampled so a linear 0..1 driver can play it.
 * `phase` (0..1) shifts the cycle, which staggers several layers on one driver.
 */
export function waveRange(
  from: number,
  to: number,
  phase = 0,
  samples = 16,
): { inputRange: number[]; outputRange: number[] } {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    inputRange.push(t);
    outputRange.push(from + ((to - from) * (1 - Math.cos(2 * Math.PI * (t + phase)))) / 2);
  }
  return { inputRange, outputRange };
}
