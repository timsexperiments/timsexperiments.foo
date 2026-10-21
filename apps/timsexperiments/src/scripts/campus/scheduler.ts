export type FrameScheduleInput = {
  running: boolean;
  activeInput: boolean;
  transitioning: boolean;
  invalidated: boolean;
  reducedMotion: boolean;
  compact: boolean;
  timeSinceActiveMs: number;
};

export type FrameScheduleDecision = {
  shouldRender: boolean;
  nextMode: 'none' | 'raf' | 'idle-timeout';
  idleDelayMs: number;
};

/** Active settle window (ms) after any input, resize, or asset invalidation. */
export const ACTIVE_SETTLE_MS = 450;

/** Ambient idle frame intervals (ms) when only the subtle robot breathing animates. */
export const MOBILE_IDLE_INTERVAL_MS = 66;
export const DESKTOP_IDLE_INTERVAL_MS = 40;

/** Cubic ease-in-out curve matching the handwritten cube transform helper. */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function computeFrameSchedule(
  input: FrameScheduleInput
): FrameScheduleDecision {
  if (!input.running) {
    return { shouldRender: false, nextMode: 'none', idleDelayMs: 0 };
  }

  const isActivelyAnimating =
    input.activeInput ||
    input.transitioning ||
    input.invalidated ||
    input.timeSinceActiveMs < ACTIVE_SETTLE_MS;

  if (input.reducedMotion) {
    const shouldRender =
      input.activeInput || input.transitioning || input.invalidated;
    const keepRunning = input.activeInput || input.transitioning;
    return {
      shouldRender,
      nextMode: keepRunning ? 'raf' : 'none',
      idleDelayMs: 0,
    };
  }

  if (isActivelyAnimating) {
    return {
      shouldRender: true,
      nextMode: 'raf',
      idleDelayMs: 0,
    };
  }

  return {
    shouldRender: true,
    nextMode: 'idle-timeout',
    idleDelayMs: input.compact
      ? MOBILE_IDLE_INTERVAL_MS
      : DESKTOP_IDLE_INTERVAL_MS,
  };
}
