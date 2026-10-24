import type { RenderQualityInput, RenderQualityProfile } from './types';

/**
 * Maximum physical framebuffer pixel budgets.
 * - Compact/mobile budget (1.35M pixels) allows full 2x DPR on 320x568 (727k px)
 *   and 390x844 / 844x390 (1.316M px) while capping 3x DPR phones at 2.0x and
 *   scaling down large tablets so mobile fill-rate stays bounded.
 * - Desktop budget (2.4M pixels) allows sharp high-DPI rendering on standard
 *   viewports while bounding 4K/5K windows.
 */
export const MOBILE_PIXEL_BUDGET = 1_350_000;
export const DESKTOP_PIXEL_BUDGET = 2_400_000;
export const MAX_MOBILE_DPR = 2;
export const MAX_DESKTOP_DPR = 1.75;

export function isCompactViewport(
  width: number,
  height: number,
  coarsePointer = false
): boolean {
  return coarsePointer || width <= 760 || height <= 500;
}

export function computeBoundedPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
  compact: boolean
): number {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeDpr = Math.max(
    1,
    Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1
  );
  const maxDpr = compact ? MAX_MOBILE_DPR : MAX_DESKTOP_DPR;
  const maxPixels = compact ? MOBILE_PIXEL_BUDGET : DESKTOP_PIXEL_BUDGET;
  const area = safeWidth * safeHeight;
  const budgetDpr = Math.sqrt(maxPixels / area);
  let target = Math.min(safeDpr, maxDpr, budgetDpr);
  // Large CSS viewports need DPR below 1. Keep full precision and verify the
  // same floored dimensions Three.js uses, including floating-point boundaries.
  while (
    Math.floor(safeWidth * target) * Math.floor(safeHeight * target) >
    maxPixels
  ) {
    target *= 1 - Number.EPSILON;
  }
  return target;
}

export function computeAdaptiveFov(
  width: number,
  height: number,
  compact: boolean
): number {
  const aspect = Math.max(1, width) / Math.max(1, height);
  if (aspect < 1) {
    // Portrait viewports lose horizontal FOV rapidly when vertical FOV is fixed.
    // Smoothly widen vertical FOV up to 72 deg on narrow portrait screens.
    const portraitBoost = Math.min(7, (1 - aspect) * 13);
    return Math.round((65 + portraitBoost) * 10) / 10;
  }
  return compact ? 66 : 65;
}

export function computeRenderQuality(
  input: RenderQualityInput
): RenderQualityProfile {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const compact = isCompactViewport(
    width,
    height,
    input.coarsePointer ?? false
  );
  const pixelRatio = computeBoundedPixelRatio(
    width,
    height,
    input.devicePixelRatio,
    compact
  );
  const drawingBufferWidth = Math.max(1, Math.floor(width * pixelRatio));
  const drawingBufferHeight = Math.max(1, Math.floor(height * pixelRatio));
  return {
    compact,
    pixelRatio,
    drawingBufferWidth,
    drawingBufferHeight,
    totalPixels: drawingBufferWidth * drawingBufferHeight,
    fov: computeAdaptiveFov(width, height, compact),
    antialias: true,
    shadowMapSize: compact ? 1024 : 2048,
    maxAnisotropy: compact ? 8 : 8,
  };
}
