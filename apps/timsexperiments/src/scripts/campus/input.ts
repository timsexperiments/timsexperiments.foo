import { readStick } from './locomotion';

export type WalkMode = 'joystick' | 'arrows';
export const WALK_MODE_KEY = 'campus.walk-mode';

export function readWalkMode(storage: Pick<Storage, 'getItem'>): WalkMode {
  try {
    return storage.getItem(WALK_MODE_KEY) === 'arrows' ? 'arrows' : 'joystick';
  } catch {
    return 'joystick';
  }
}

export function saveWalkMode(
  storage: Pick<Storage, 'setItem'>,
  mode: WalkMode
) {
  try {
    storage.setItem(WALK_MODE_KEY, mode);
  } catch {
    // Private browsing and denied storage still allow controls for this visit.
  }
}

type StickPointer = Pick<
  PointerEvent,
  | 'pointerId'
  | 'button'
  | 'clientX'
  | 'clientY'
  | 'preventDefault'
  | 'stopPropagation'
>;
type StickEvent =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'lostpointercapture';

/** Small DOM boundary, also usable with an in-memory capture surface in tests. */
type StickSurface = {
  addEventListener: (
    name: StickEvent,
    listener: (event: StickPointer) => void
  ) => void;
  removeEventListener: (
    name: StickEvent,
    listener: (event: StickPointer) => void
  ) => void;
  getBoundingClientRect: () => Pick<
    DOMRect,
    'left' | 'top' | 'width' | 'height'
  >;
  setPointerCapture: (id: number) => void;
  hasPointerCapture: (id: number) => boolean;
  releasePointerCapture: (id: number) => void;
};

export type StickSample = {
  x: number;
  y: number;
  knobX: number;
  knobY: number;
};

/** Fixed-center stick. One captured pointer owns it until release or reset. */
export function createAnalogStick({
  surface,
  canStart,
  onChange,
}: {
  surface: StickSurface;
  canStart: () => boolean;
  onChange: (sample: StickSample) => void;
}) {
  let owner: { id: number; x: number; y: number; radius: number } | null = null;
  let disposed = false;

  function sample(event: StickPointer) {
    if (!owner || owner.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const x = (event.clientX - owner.x) / owner.radius;
    const y = (event.clientY - owner.y) / owner.radius;
    const length = Math.max(1, Math.hypot(x, y));
    const clampedX = x / length;
    const clampedY = y / length;
    const movement = readStick([clampedX, clampedY], 0);
    onChange({
      ...movement,
      knobX: clampedX * owner.radius,
      knobY: clampedY * owner.radius,
    });
  }

  function reset() {
    const previous = owner;
    owner = null; // Release may synchronously dispatch lostpointercapture.
    if (previous && surface.hasPointerCapture(previous.id))
      surface.releasePointerCapture(previous.id);
    onChange({ x: 0, y: 0, knobX: 0, knobY: 0 });
  }

  function down(event: StickPointer) {
    if (disposed || owner || event.button !== 0 || !canStart()) return;
    const rect = surface.getBoundingClientRect();
    owner = {
      id: event.pointerId,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: Math.max(1, Math.min(rect.width, rect.height) / 2 - 22),
    };
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      reset();
      return;
    }
    sample(event);
  }

  function end(event: StickPointer) {
    if (event.pointerId !== owner?.id) return;
    event.preventDefault();
    event.stopPropagation();
    reset();
  }

  const listeners: [StickEvent, (event: StickPointer) => void][] = [
    ['pointerdown', down],
    ['pointermove', sample],
    ['pointerup', end],
    ['pointercancel', end],
    ['lostpointercapture', end],
  ];
  for (const [name, listener] of listeners)
    surface.addEventListener(name, listener);
  return {
    reset,
    dispose() {
      disposed = true;
      reset();
      for (const [name, listener] of listeners)
        surface.removeEventListener(name, listener);
    },
  };
}
