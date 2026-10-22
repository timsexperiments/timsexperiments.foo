import { describe, expect, test } from 'bun:test';
import { readStick, walkStep } from './locomotion';

describe('first-person locomotion', () => {
  test('ignores stick drift, absent axes and invalid values', () => {
    expect(readStick([0.1, -0.1], 0)).toEqual({ x: 0, y: 0 });
    expect(readStick([], 2)).toEqual({ x: 0, y: 0 });
    expect(readStick([NaN, Infinity], 0)).toEqual({ x: 0, y: 0 });
  });

  test('preserves analog speed and bounds diagonal input', () => {
    const slow = readStick([0, -0.5], 0);
    expect(slow.y).toBeLessThan(0);
    expect(Math.abs(slow.y)).toBeLessThan(0.5);
    const diagonal = readStick([1, -1], 0);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.x).toBeCloseTo(-diagonal.y);
    expect(readStick([0, 0, -1, 0], 2)).toEqual({ x: -1, y: 0 });
  });

  test('accelerates and brakes without an instant speed change', () => {
    const start = walkStep(0, 2.4, 1 / 60);
    expect(start.velocity).toBeGreaterThan(0);
    expect(start.velocity).toBeLessThan(2.4);
    expect(start.distance).toBeLessThan(2.4 / 60);
    const stop = walkStep(2.4, 0, 1 / 60);
    expect(stop.velocity).toBeGreaterThan(0);
    expect(stop.velocity).toBeLessThan(2.4);
    expect(stop.distance).toBeGreaterThan(0);
  });

  test('covers the same distance at 30, 60 and 120 fps and settles fully', () => {
    const simulate = (fps: number) => {
      let velocity = 0;
      let distance = 0;
      for (let i = 0; i < fps * 2; i++) {
        const next = walkStep(velocity, i < fps ? 2.4 : 0, 1 / fps);
        velocity = next.velocity;
        distance += next.distance;
      }
      return { velocity, distance };
    };
    const a = simulate(30);
    for (const fps of [60, 120]) {
      const b = simulate(fps);
      expect(b.velocity).toBe(0);
      expect(b.distance).toBeCloseTo(a.distance, 3);
    }
    expect(walkStep(0, 0, 0)).toEqual({ velocity: 0, distance: 0 });
    expect(walkStep(2.4, -2.4, 1 / 60).velocity).toBeGreaterThan(-2.4);
  });
});
