import type { CollisionBounds } from './types';

/** Radial dead zone preserves stick direction and slow analog movement. */
export function readStick(axes: readonly number[], offset: number) {
  const rawX = axes[offset] ?? 0;
  const rawY = axes[offset + 1] ?? 0;
  const x = Number.isFinite(rawX) ? Math.max(-1, Math.min(1, rawX)) : 0;
  const y = Number.isFinite(rawY) ? Math.max(-1, Math.min(1, rawY)) : 0;
  const length = Math.hypot(x, y);
  const deadZone = 0.18;
  if (length <= deadZone) return { x: 0, y: 0 };
  const scale = (Math.min(length, 1) - deadZone) / (1 - deadZone) / length;
  return { x: x * scale, y: y * scale };
}

/** Exact integration of exponential acceleration, independent of frame rate. */
export function walkStep(velocity: number, target: number, dt: number) {
  const response = target === 0 ? 18 : 12;
  const decay = Math.exp(-response * dt);
  const nextVelocity = target + (velocity - target) * decay;
  return {
    velocity: Math.abs(nextVelocity) < 0.001 ? 0 : nextVelocity,
    distance: target * dt + ((velocity - target) * (1 - decay)) / response,
  };
}

/** Camera clearance covers hardware as well as the wall or station silhouette. */
export function isWalkBlocked(
  collisions: readonly CollisionBounds[],
  x: number,
  z: number
): boolean {
  return collisions.some(
    (bounds) =>
      x > bounds.minX - 0.22 &&
      x < bounds.maxX + 0.22 &&
      z > bounds.minZ - 0.22 &&
      z < bounds.maxZ + 0.22
  );
}
