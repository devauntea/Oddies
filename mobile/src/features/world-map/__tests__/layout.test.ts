import { findWorld, isWorldId, sceneLayout, WORLD_IDS } from '../layout';
import { cameraOffset, fitCanvas, pivotTranslation, waveRange } from '../math';
import { LAYER_SOURCES, PORTRAIT_SOURCES } from '../sources';
import type { Rect } from '../types';

const { canvas, layers, worlds } = sceneLayout;

function isInsideCanvas(rect: Rect) {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  return rect.x >= 0 && rect.y >= 0 && right <= canvas.width && bottom <= canvas.height;
}

describe('scene layout (assets/scene-layout.json)', () => {
  it('has a bundled image for every layer', () => {
    for (const layer of layers) {
      expect(LAYER_SOURCES[layer.id]).toBeDefined();
    }
  });

  it('gives every world a layer, a portrait and a hit area inside the canvas', () => {
    expect(WORLD_IDS).toEqual(['serenity', 'midnight', 'artist', 'founder']);
    for (const world of worlds) {
      expect(layers.some((layer) => layer.id === world.layer)).toBe(true);
      expect(PORTRAIT_SOURCES[world.id]).toBeDefined();
      expect(isInsideCanvas(world.hit)).toBe(true);
    }
  });

  it('lists layers in draw order', () => {
    const order = layers.map((layer) => layer.z);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('finds worlds by id', () => {
    expect(findWorld('artist')?.name).toBe('Color Valley');
    expect(findWorld('nowhere')).toBeUndefined();
    expect(isWorldId('founder')).toBe(true);
    expect(isWorldId('nowhere')).toBe(false);
  });
});

describe('map math', () => {
  it('fits the 2:3 canvas to a phone by width', () => {
    const fit = fitCanvas({ width: 390, height: 800 }, canvas);
    expect(fit.width).toBe(390);
    expect(fit.height).toBe(585);
  });

  it('fits the canvas to a wide screen by height', () => {
    const fit = fitCanvas({ width: 1200, height: 900 }, canvas);
    expect(fit.width).toBe(600);
    expect(fit.height).toBe(900);
  });

  it('brings the focus point to the middle of the zoomed canvas', () => {
    const zoom = 2.1;
    const focus = { x: 260, y: 332 };
    const offset = cameraOffset(focus, canvas, zoom);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // React Native scales around the center, then translates.
    expect(cx + zoom * (focus.x - cx) + offset.x).toBeCloseTo(cx);
    expect(cy + zoom * (focus.y - cy) + offset.y).toBeCloseTo(cy);
  });

  it('keeps the pivot still while scaling', () => {
    const rect = { x: 100, y: 200, width: 400, height: 600 };
    const pivot = { x: 300, y: 790 };
    const s = 1.02;
    const shift = pivotTranslation(rect, pivot, s);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    expect(cx + s * (pivot.x - cx) + shift.x).toBeCloseTo(pivot.x);
    expect(cy + s * (pivot.y - cy) + shift.y).toBeCloseTo(pivot.y);
  });

  it('builds a closed wave that peaks halfway', () => {
    const { inputRange, outputRange } = waveRange(0, 10);
    expect(inputRange[0]).toBe(0);
    expect(inputRange[inputRange.length - 1]).toBe(1);
    expect(outputRange[0]).toBeCloseTo(0);
    expect(outputRange[outputRange.length - 1]).toBeCloseTo(0);
    expect(Math.max(...outputRange)).toBeCloseTo(10);
  });
});
