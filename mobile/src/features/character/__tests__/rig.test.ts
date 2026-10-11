import { rig, sampleTrack } from '../rig';
import { PART_SOURCES } from '../sources';

const { canvas, parts, pivots, tracks } = rig;

describe('character rig (assets/character/rig.json)', () => {
  it('has a bundled image for every part, inside the character canvas', () => {
    for (const [name, part] of Object.entries(parts)) {
      expect(PART_SOURCES[name as keyof typeof parts]).toBeDefined();
      expect(part.x + part.width).toBeLessThanOrEqual(canvas.width);
      expect(part.y + part.height).toBeLessThanOrEqual(canvas.height);
    }
  });

  it('keeps the feet on the ground', () => {
    expect(pivots.feet.y).toBeLessThanOrEqual(canvas.height);
    expect(pivots.feet.y).toBeGreaterThan(parts.body.y + parts.body.height * 0.9);
  });

  it('loops idle tracks seamlessly', () => {
    for (const track of [tracks.breath, tracks.head, tracks.mouth]) {
      const first = track[0];
      const last = track[track.length - 1];
      expect(first?.value).toBe(last?.value);
    }
  });

  it('ends the hello wave back at rest and hidden', () => {
    expect(sampleTrack(tracks.wave, rig.helloDurationMs)).toBe(0);
    expect(sampleTrack(tracks.waveOpacity, rig.helloDurationMs)).toBe(0);
    expect(sampleTrack(tracks.waveOpacity, rig.helloDurationMs / 2)).toBe(1);
  });

  it('closes the mouth between speaking beats', () => {
    expect(sampleTrack(tracks.mouth, 0, true)).toBe(0);
    expect(sampleTrack(tracks.mouth, 260, true)).toBe(0);
    expect(sampleTrack(tracks.mouth, 90, true)).toBeCloseTo(0.8);
  });
});
