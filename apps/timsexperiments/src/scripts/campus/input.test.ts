import { describe, expect, test } from 'bun:test';
import {
  createAnalogStick,
  readWalkMode,
  saveWalkMode,
  WALK_MODE_KEY,
  type StickSample,
} from './input';

type Surface = Parameters<typeof createAnalogStick>[0]['surface'];
type Listener = Parameters<Surface['addEventListener']>[1];
type EventName = Parameters<Surface['addEventListener']>[0];

function fixture() {
  const listeners = new Map<EventName, Listener>();
  const captures = new Set<number>();
  let sample: StickSample = { x: 0, y: 0, knobX: 0, knobY: 0 };
  let enabled = true;
  let captureFails = false;
  const surface: Surface = {
    addEventListener: (name, listener) => {
      listeners.set(name, listener);
    },
    removeEventListener: (name) => {
      listeners.delete(name);
    },
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 120,
      height: 120,
    }),
    setPointerCapture: (id) => {
      if (captureFails) throw new Error('Pointer no longer active');
      captures.add(id);
    },
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => {
      captures.delete(id);
      send('lostpointercapture', id);
    },
  };
  function send(name: EventName, id: number, x = 70, y = 80, button = 0) {
    let prevented = false;
    let stopped = false;
    listeners.get(name)?.({
      pointerId: id,
      clientX: x,
      clientY: y,
      button,
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {
        stopped = true;
      },
    });
    return { prevented, stopped };
  }
  const stick = createAnalogStick({
    surface,
    canStart: () => enabled,
    onChange(value) {
      sample = value;
    },
  });
  return {
    stick,
    send,
    captures,
    listeners,
    sample: () => sample,
    disable() {
      enabled = false;
    },
    failCapture() {
      captureFails = true;
    },
  };
}

const zero = { x: 0, y: 0, knobX: 0, knobY: 0 };

describe('touch joystick ownership and analog movement', () => {
  test('radial dead zone, analog speed, diagonal normalization and knob clamp', () => {
    const f = fixture();
    expect(f.send('pointerdown', 1)).toEqual({
      prevented: true,
      stopped: true,
    });
    f.send('pointermove', 1, 74, 76);
    expect(f.sample().x).toBe(0);
    expect(f.sample().y).toBe(0);
    f.send('pointermove', 1, 70, 61); // half radius
    expect(f.sample().y).toBeCloseTo(-(0.5 - 0.18) / 0.82);
    expect(f.sample().x).toBe(0);
    f.send('pointermove', 1, 450, -300);
    expect(Math.hypot(f.sample().x, f.sample().y)).toBeCloseTo(1);
    expect(f.sample().x).toBeCloseTo(-f.sample().y);
    expect(Math.hypot(f.sample().knobX, f.sample().knobY)).toBeCloseTo(38);
  });

  test('second finger cannot move, release, cancel or steal the stick', () => {
    const f = fixture();
    f.send('pointerdown', 1, 70, 42);
    const held = f.sample();
    for (const event of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ] satisfies EventName[])
      expect(f.send(event, 2, 108, 80)).toEqual({
        prevented: false,
        stopped: false,
      });
    expect(f.sample()).toEqual(held);
    expect(f.captures).toEqual(new Set([1]));
    f.send('pointerup', 1);
    expect(f.sample()).toEqual(zero);
    expect(f.captures.size).toBe(0);
  });

  for (const event of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] satisfies EventName[]) {
    test(`${event} clears the owned pointer and allows a fresh gesture`, () => {
      const f = fixture();
      f.send('pointerdown', 7, 108, 80);
      expect(f.sample().x).toBe(1);
      f.send(event, 7);
      expect(f.sample()).toEqual(zero);
      expect(f.captures.size).toBe(0);
      f.send('pointermove', 7, 70, 42);
      expect(f.sample()).toEqual(zero);
      f.send('pointerdown', 8, 70, 42);
      expect(f.sample().y).toBe(-1);
    });
  }

  test('reset on pause, mode change or blur clears capture even with synchronous lost capture', () => {
    const f = fixture();
    f.send('pointerdown', 3, 70, 42);
    f.stick.reset();
    f.stick.reset();
    expect(f.sample()).toEqual(zero);
    expect(f.captures.size).toBe(0);
    f.send('pointermove', 3, 108, 80);
    expect(f.sample()).toEqual(zero);
  });

  test('paused input, secondary button and failed capture never start movement', () => {
    const paused = fixture();
    paused.disable();
    paused.send('pointerdown', 1, 108, 80);
    expect(paused.sample()).toEqual(zero);
    const f = fixture();
    f.send('pointerdown', 1, 108, 80, 2);
    expect(f.captures.size).toBe(0);
    f.failCapture();
    f.send('pointerdown', 2, 108, 80);
    expect(f.sample()).toEqual(zero);
  });

  test('dispose zeroes movement, releases capture and removes every listener', () => {
    const f = fixture();
    f.send('pointerdown', 1, 108, 80);
    f.stick.dispose();
    f.stick.dispose();
    expect(f.sample()).toEqual(zero);
    expect(f.captures.size).toBe(0);
    expect(f.listeners.size).toBe(0);
    f.send('pointerdown', 2, 108, 80);
    expect(f.sample()).toEqual(zero);
  });
});

test('mode preference defaults to joystick and survives denied or corrupt storage', () => {
  expect(readWalkMode({ getItem: () => null })).toBe('joystick');
  expect(readWalkMode({ getItem: () => 'unexpected' })).toBe('joystick');
  expect(readWalkMode({ getItem: () => 'arrows' })).toBe('arrows');
  expect(
    readWalkMode({
      getItem() {
        throw new Error('denied');
      },
    })
  ).toBe('joystick');
  let saved = '';
  saveWalkMode(
    {
      setItem(key, value) {
        saved = `${key}:${value}`;
      },
    },
    'arrows'
  );
  expect(saved).toBe(`${WALK_MODE_KEY}:arrows`);
  expect(() =>
    saveWalkMode(
      {
        setItem() {
          throw new Error('denied');
        },
      },
      'joystick'
    )
  ).not.toThrow();
});
