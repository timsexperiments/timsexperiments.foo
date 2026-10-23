import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  computeAdaptiveFov,
  computeBoundedPixelRatio,
  computeRenderQuality,
  isCompactViewport,
} from './quality';
import { computeFrameSchedule, easeInOutCubic } from './scheduler';
import { isWalkBlocked, readStick, walkStep } from './locomotion';
import type {
  CampusCallbacks,
  CampusController,
  CampusOptions,
  StationId,
} from './types';
import { buildWorld, views } from './world';

export type {
  CampusCallbacks,
  CampusController,
  CampusOptions,
  StationId,
} from './types';
export {
  buildWorld,
  computeAdaptiveFov,
  computeBoundedPixelRatio,
  computeFrameSchedule,
  computeRenderQuality,
  easeInOutCubic,
  isCompactViewport,
  views,
};

/** Controller-owned attached resources. Procedural textures belong to the world registry. */
export function disposeSceneResources(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (
      object instanceof THREE.DirectionalLight ||
      object instanceof THREE.PointLight ||
      object instanceof THREE.SpotLight
    )
      object.shadow.dispose();
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points ||
      object instanceof THREE.Line
    ) {
      geometries.add(object.geometry);
      if (Array.isArray(object.material))
        object.material.forEach((mat) => materials.add(mat));
      else materials.add(object.material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((mat) => mat.dispose());
}

/** Owns the canvas, its WebGL scene, quality budget, and input listeners. Call dispose on exit. */
export async function createCampus(
  canvas: HTMLCanvasElement,
  callbacks: CampusCallbacks,
  options: CampusOptions = {}
): Promise<CampusController> {
  const coarse = window.matchMedia('(any-pointer: coarse), (pointer: coarse)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialRect = canvas.getBoundingClientRect();
  const initialWidth = Math.max(1, initialRect.width || window.innerWidth || 1);
  const initialHeight = Math.max(
    1,
    initialRect.height || window.innerHeight || 1
  );
  let quality = computeRenderQuality({
    width: initialWidth,
    height: initialHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    coarsePointer: coarse.matches,
  });

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    callbacks.onError(
      'The lab could not start WebGL. All content is available in the page navigation.'
    );
    throw error;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070c0b);
  // Start fog past the north glass and 3D fascia logo so distant courtyard details stay crisp.
  scene.fog = new THREE.Fog(0x070c0b, 44, 118);

  const camera = new THREE.PerspectiveCamera(
    quality.fov,
    initialWidth / initialHeight,
    0.08,
    120
  );
  camera.rotation.order = 'YXZ';

  renderer.setPixelRatio(quality.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Architectural shadow casters and moonlight are static; bake shadows on demand instead of every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  let environment: THREE.WebGLRenderTarget | undefined;
  try {
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.36;
    room.dispose();
    generator.dispose();
  } catch {
    /* Moonlight and interior station lights still provide a complete scene. */
  }

  scene.add(new THREE.HemisphereLight(0x8cb8d0, 0x101816, 1.2));
  const moonLight = new THREE.DirectionalLight(0xbbe0ff, 2.95);
  moonLight.position.set(9.3, 7.6, -16);
  moonLight.target.position.set(-1.2, 0, 1.5);
  scene.add(moonLight, moonLight.target);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  moonLight.shadow.camera.left = -14;
  moonLight.shadow.camera.right = 14;
  moonLight.shadow.camera.top = 12;
  moonLight.shadow.camera.bottom = -12;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 40;
  moonLight.shadow.normalBias = 0.025;
  moonLight.shadow.bias = -0.0002;

  const fill = new THREE.DirectionalLight(0x6adcc4, 0.74);
  fill.position.set(-5, 4.5, 8);
  scene.add(fill);

  if (quality.compact) {
    // Compact rig keeps three warm ceiling lights and the host light; GPU cost is device dependent.
    for (const x of [-6, 0, 6]) {
      const light = new THREE.PointLight(0xffe4bc, 20, 12.5, 1.75);
      light.position.set(x, 3.3, -3.4);
      scene.add(light);
    }
    const hostLight = new THREE.PointLight(0xe4fcf7, 12.5, 8.5, 1.75);
    hostLight.position.set(3.2, 3.1, -1.2);
    scene.add(hostLight);
  } else {
    for (const x of [-4.2, 4.2]) {
      const windowWash = new THREE.PointLight(0x9ed4ff, 8.5, 13, 1.75);
      windowWash.position.set(x, 3.4, -6.3);
      scene.add(windowWash);
    }
    for (const x of [-6, 0, 6]) {
      const light = new THREE.PointLight(0xffe4bc, 18.5, 10.5, 1.8);
      light.position.set(x, 3.25, -3.15);
      scene.add(light);
    }
    const hostLight = new THREE.PointLight(0xe4fcf7, 11.5, 7.5, 1.8);
    hostLight.position.set(3.4, 3.1, -0.4);
    scene.add(hostLight);
    const screenGlow = new THREE.PointLight(0x17b897, 6.5, 4.6, 1.9);
    screenGlow.position.set(-0.6, 1.95, -3.7);
    scene.add(screenGlow);
    const logoWash = new THREE.PointLight(0xe4fcf7, 7.5, 6.5, 1.8);
    logoWash.position.set(0, 3.8, -5.7);
    scene.add(logoWash);
  }

  let disposed = false;
  let paused = false;
  let focused = true;
  let contextLost = false;
  let frame = 0;
  let idleTimer = 0;
  let lastTime = 0;
  let lastRenderedTime = 0;
  let elapsed = 0;
  let invalidated = true;
  let lastActiveTime = performance.now();
  let lastHoverCheck = 0;

  const running = () =>
    !disposed && !paused && focused && !document.hidden && !contextLost;

  const maxAnisotropy = Math.min(
    quality.maxAnisotropy,
    renderer.capabilities.getMaxAnisotropy() || quality.maxAnisotropy
  );

  function invalidate(refreshShadows = false, markInteraction = true) {
    if (disposed || contextLost) return;
    if (refreshShadows) renderer.shadowMap.needsUpdate = true;
    invalidated = true;
    if (markInteraction) lastActiveTime = performance.now();
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
    if (running()) {
      if (!frame) frame = window.requestAnimationFrame(render);
    } else {
      renderer.render(scene, camera);
    }
  }

  let world: ReturnType<typeof buildWorld>;
  try {
    world = buildWorld(
      scene,
      quality.compact,
      () => invalidate(true, false),
      maxAnisotropy
    );
  } catch (error) {
    renderer.dispose();
    environment?.dispose();
    callbacks.onError(
      'The lab could not be built. Please use the page navigation.'
    );
    throw error;
  }

  const keys = new Set<string>();
  const heldPointers = new Map<
    number,
    { button: HTMLButtonElement; code: string }
  >();
  const controlsScope = options.controlsRoot ?? document;
  const pad =
    options.walkPad !== undefined
      ? options.walkPad
      : controlsScope.querySelector<HTMLElement>('#scene-walk-pad');
  const padToggle =
    options.walkPadToggle !== undefined
      ? options.walkPadToggle
      : controlsScope.querySelector<HTMLButtonElement>(
          '#toggle-touch-controls'
        );
  let showPad = coarse.matches;
  function updatePad() {
    if (pad) pad.hidden = !showPad;
    padToggle?.setAttribute('aria-pressed', String(showPad));
  }
  updatePad();

  const events = new AbortController();
  const originalTouchAction = canvas.style.touchAction;
  const originalCursor = canvas.style.cursor;
  const originalTabIndex = canvas.getAttribute('tabindex');
  canvas.style.touchAction = 'none';
  if (originalTabIndex === null) canvas.tabIndex = 0;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const velocity = new THREE.Vector2();
  let gamepadSelectHeld = true;
  const controllerHint =
    controlsScope.querySelector<HTMLElement>('#controller-hint');

  function readController() {
    try {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find(
        (pad) => pad?.connected && pad.mapping === 'standard'
      );
      if (controllerHint) controllerHint.hidden = !pad;
      return pad ?? null;
    } catch {
      // Browsers or embedded previews may deny Gamepad API access.
      if (controllerHint) controllerHint.hidden = true;
      return null;
    }
  }
  let drag: {
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null = null;
  let transition: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    rotation: THREE.Quaternion;
    endRotation: THREE.Quaternion;
    start: number;
  } | null = null;

  const isField = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      !!target.closest(
        'input, textarea, select, button, a, [role="dialog"], [role="textbox"]'
      ));

  function resetInput() {
    velocity.set(0, 0);
    gamepadSelectHeld = true;
    keys.clear();
    for (const [id, { button }] of heldPointers) {
      heldPointers.delete(id);
      button.classList.remove('is-held');
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    if (drag && canvas.hasPointerCapture(drag.id))
      canvas.releasePointerCapture(drag.id);
    drag = null;
    canvas.style.cursor = originalCursor;
  }

  function snapTransition() {
    if (!transition) return;
    camera.position.copy(transition.to);
    camera.quaternion.copy(transition.endRotation);
    transition = null;
    world.update(elapsed, motion.matches);
    if (!contextLost) renderer.render(scene, camera);
  }

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    quality = computeRenderQuality({
      width,
      height,
      devicePixelRatio: window.devicePixelRatio || 1,
      coarsePointer: coarse.matches,
    });
    camera.aspect = width / height;
    camera.fov = quality.fov;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.setSize(width, height, false);
    invalidate(false, true);
  }

  function pose(station: StationId) {
    const view = views[station];
    const helper = new THREE.PerspectiveCamera();
    helper.position.copy(view.position);
    helper.lookAt(view.target);
    return { position: view.position, quaternion: helper.quaternion };
  }

  function navigate(station: StationId) {
    if (disposed || !Object.hasOwn(views, station)) return;
    resetInput();
    const destination = pose(station);
    if (motion.matches || paused) {
      transition = null;
      camera.position.copy(destination.position);
      camera.quaternion.copy(destination.quaternion);
      invalidate(false, true);
    } else {
      transition = {
        from: camera.position.clone(),
        to: destination.position.clone(),
        rotation: camera.quaternion.clone(),
        endRotation: destination.quaternion.clone(),
        start: elapsed,
      };
      invalidate(false, true);
    }
  }

  const initial = pose('arrival');
  camera.position.copy(initial.position);
  camera.quaternion.copy(initial.quaternion);

  function pick(x: number, y: number): StationId | undefined {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return undefined;
    pointer.set(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.targets, true)[0];
    let object: THREE.Object3D | undefined = hit?.object;
    while (object) {
      const station: unknown = object.userData.station;
      if (
        station === 'arrival' ||
        station === 'recipes' ||
        station === 'workbench' ||
        station === 'robot' ||
        station === 'contact'
      )
        return station;
      object = object.parent ?? undefined;
    }
    return undefined;
  }

  function interact(x: number, y: number) {
    const station = pick(x, y);
    if (station) {
      navigate(station);
      callbacks.onStation(station);
    }
  }

  const movementKeys = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyI',
    'KeyJ',
    'KeyK',
    'KeyL',
    'ShiftLeft',
    'ShiftRight',
  ]);

  window.addEventListener(
    'keydown',
    (event) => {
      if (
        !running() ||
        event.target !== canvas ||
        document.activeElement !== canvas ||
        isField(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.code === 'Tab') {
        resetInput();
        return;
      }
      if (movementKeys.has(event.code)) {
        event.preventDefault();
        keys.add(event.code);
        transition = null;
        invalidate(false, true);
      } else if (
        (event.code === 'KeyE' || event.code === 'Enter') &&
        !event.repeat &&
        event.target === canvas
      ) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        interact(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else if (event.code === 'Escape') {
        resetInput();
      }
    },
    { signal: events.signal }
  );

  window.addEventListener(
    'keyup',
    (event) => {
      keys.delete(event.code);
    },
    { signal: events.signal }
  );

  padToggle?.addEventListener(
    'click',
    () => {
      resetInput();
      showPad = !showPad;
      updatePad();
    },
    { signal: events.signal }
  );

  coarse.addEventListener(
    'change',
    () => {
      resetInput();
      showPad = coarse.matches;
      updatePad();
      resize();
    },
    { signal: events.signal }
  );

  for (const button of pad?.querySelectorAll<HTMLButtonElement>(
    '[data-walk]'
  ) ?? []) {
    button.addEventListener(
      'pointerdown',
      (event) => {
        const code = button.dataset.walk;
        if (!running() || event.button !== 0 || !code) return;
        event.preventDefault();
        heldPointers.set(event.pointerId, { button, code });
        button.classList.add('is-held');
        button.setPointerCapture(event.pointerId);
        transition = null;
        invalidate(false, true);
      },
      { signal: events.signal }
    );
    const release = (event: PointerEvent) => {
      heldPointers.delete(event.pointerId);
      if (![...heldPointers.values()].some((held) => held.button === button))
        button.classList.remove('is-held');
      if (button.hasPointerCapture(event.pointerId))
        button.releasePointerCapture(event.pointerId);
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(
        name,
        (event) => {
          if (event instanceof PointerEvent) release(event);
        },
        { signal: events.signal }
      );
    }
  }

  window.addEventListener(
    'orientationchange',
    () => {
      resetInput();
      resize();
    },
    { signal: events.signal }
  );

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (!running() || event.button !== 0 || drag) return;
      canvas.focus({ preventScroll: true });
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      canvas.setPointerCapture(event.pointerId);
    },
    { signal: events.signal }
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (!running()) return;
      if (drag && event.pointerId === drag.id) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5)
          drag.moved = true;
        if (drag.moved) {
          transition = null;
          euler.setFromQuaternion(camera.quaternion);
          euler.y -= (event.clientX - drag.lastX) * 0.003;
          euler.x = THREE.MathUtils.clamp(
            euler.x - (event.clientY - drag.lastY) * 0.003,
            -1.12,
            1.12
          );
          camera.quaternion.setFromEuler(euler);
          canvas.style.cursor = 'grabbing';
          invalidate(false, true);
        }
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      } else if (event.pointerType === 'mouse') {
        const now = performance.now();
        if (now - lastHoverCheck >= 32) {
          lastHoverCheck = now;
          canvas.style.cursor = pick(event.clientX, event.clientY)
            ? 'pointer'
            : 'grab';
        }
      }
    },
    { signal: events.signal }
  );

  canvas.addEventListener(
    'pointerup',
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const clicked = !drag.moved;
      const id = drag.id;
      drag = null;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      canvas.style.cursor = originalCursor;
      if (clicked && running()) interact(event.clientX, event.clientY);
    },
    { signal: events.signal }
  );

  canvas.addEventListener('pointercancel', resetInput, {
    signal: events.signal,
  });
  canvas.addEventListener(
    'lostpointercapture',
    () => {
      drag = null;
    },
    { signal: events.signal }
  );
  canvas.addEventListener('blur', resetInput, { signal: events.signal });
  for (const event of ['gamepadconnected', 'gamepaddisconnected']) {
    window.addEventListener(
      event,
      () => {
        resetInput();
        readController();
        invalidate(false, true);
      },
      { signal: events.signal }
    );
  }
  canvas.addEventListener('focus', () => invalidate(false, true), {
    signal: events.signal,
  });

  function stop() {
    resetInput();
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
    lastTime = 0;
  }

  function start() {
    if (running() && !frame) {
      invalidated = true;
      if (idleTimer) {
        window.clearTimeout(idleTimer);
        idleTimer = 0;
      }
      frame = window.requestAnimationFrame(render);
    }
  }

  window.addEventListener(
    'blur',
    () => {
      focused = false;
      stop();
    },
    { signal: events.signal }
  );
  window.addEventListener(
    'focus',
    () => {
      focused = true;
      start();
    },
    { signal: events.signal }
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
      else start();
    },
    { signal: events.signal }
  );
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      callbacks.onError(
        'The graphics context was interrupted. Re-enter the lab to restart it, or use the page navigation.'
      );
    },
    { signal: events.signal }
  );

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize, { signal: events.signal });
  motion.addEventListener(
    'change',
    () => {
      if (motion.matches && transition) snapTransition();
      else invalidate(false, true);
    },
    { signal: events.signal }
  );

  function blocked(x: number, z: number) {
    return isWalkBlocked(world.collisions, x, z);
  }

  function held(code: string) {
    if (keys.has(code)) return true;
    for (const input of heldPointers.values())
      if (input.code === code) return true;
    return false;
  }

  function render(time: number) {
    frame = 0;
    if (!running()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    elapsed += dt;

    const gamepad = document.activeElement === canvas ? readController() : null;
    const moveStick = readStick(gamepad?.axes ?? [], 0);
    const lookStick = readStick(gamepad?.axes ?? [], 2);
    const selecting = gamepad?.buttons[0]?.pressed ?? false;
    const selectPressed = selecting && !gamepadSelectHeld;
    gamepadSelectHeld = selecting;
    const hasMovementInput =
      keys.size > 0 ||
      heldPointers.size > 0 ||
      moveStick.x !== 0 ||
      moveStick.y !== 0 ||
      lookStick.x !== 0 ||
      lookStick.y !== 0;
    const isCoasting = velocity.lengthSq() > 0;
    const isDragging = drag !== null && drag.moved;
    const activeInput =
      hasMovementInput || isDragging || isCoasting || selectPressed;
    if (hasMovementInput) transition = null;
    if (activeInput || transition !== null) {
      lastActiveTime = time;
    }

    const schedule = computeFrameSchedule({
      running: true,
      activeInput,
      transitioning: transition !== null,
      invalidated,
      reducedMotion: motion.matches,
      compact: quality.compact,
      timeSinceActiveMs: Math.max(0, time - lastActiveTime),
    });
    invalidated = false;

    if (transition) {
      const progress = Math.min((elapsed - transition.start) / 1.45, 1);
      const eased = easeInOutCubic(progress);
      camera.position.lerpVectors(transition.from, transition.to, eased);
      camera.quaternion.slerpQuaternions(
        transition.rotation,
        transition.endRotation,
        eased
      );
      if (progress === 1) transition = null;
    } else if (hasMovementInput || isCoasting) {
      euler.setFromQuaternion(camera.quaternion);
      const turn =
        Number(held('KeyJ') || held('ArrowLeft')) -
        Number(held('KeyL') || held('ArrowRight')) -
        lookStick.x;
      const tilt =
        Number(held('KeyI') || held('ArrowUp')) -
        Number(held('KeyK') || held('ArrowDown')) -
        lookStick.y;
      euler.y += THREE.MathUtils.clamp(turn, -1, 1) * dt * 1.5;
      euler.x = THREE.MathUtils.clamp(
        euler.x + THREE.MathUtils.clamp(tilt, -1, 1) * dt * 1.5,
        -1.12,
        1.12
      );
      camera.quaternion.setFromEuler(euler);
      const forward = Number(held('KeyW')) - Number(held('KeyS')) - moveStick.y;
      const lateral = Number(held('KeyD')) - Number(held('KeyA')) + moveStick.x;
      const magnitude = Math.max(1, Math.hypot(forward, lateral));
      const speed =
        held('ShiftLeft') || held('ShiftRight') || gamepad?.buttons[10]?.pressed
          ? 3.7
          : 2.4;
      // Heading stays horizontal even when looking up or down. No head bob or camera roll.
      const targetX =
        ((Math.cos(euler.y) * lateral - Math.sin(euler.y) * forward) * speed) /
        magnitude;
      const targetZ =
        ((-Math.sin(euler.y) * lateral - Math.cos(euler.y) * forward) * speed) /
        magnitude;
      const stepX = walkStep(velocity.x, targetX, dt);
      const stepZ = walkStep(velocity.y, targetZ, dt);
      velocity.set(stepX.velocity, stepZ.velocity);
      const x = THREE.MathUtils.clamp(
        camera.position.x + stepX.distance,
        -9.15,
        9.15
      );
      const z = THREE.MathUtils.clamp(
        camera.position.z + stepZ.distance,
        -6.8,
        8.3
      );
      if (!blocked(x, camera.position.z)) camera.position.x = x;
      else velocity.x = 0;
      if (!blocked(camera.position.x, z)) camera.position.z = z;
      else velocity.y = 0;
    }

    if (selectPressed) {
      const rect = canvas.getBoundingClientRect();
      interact(rect.left + rect.width / 2, rect.top + rect.height / 2);
      // Opening a station can pause the controller synchronously.
      if (!running()) return;
    }

    const drawDue =
      schedule.nextMode !== 'idle-timeout' ||
      gamepad === null ||
      time - lastRenderedTime >= schedule.idleDelayMs;
    if (schedule.shouldRender && drawDue) {
      lastRenderedTime = time;
      world.update(elapsed, motion.matches);
      renderer.render(scene, camera);
    }

    const stillTransitioning = transition !== null;
    const nextSchedule = stillTransitioning
      ? schedule
      : computeFrameSchedule({
          running: running(),
          activeInput,
          transitioning: false,
          invalidated,
          reducedMotion: motion.matches,
          compact: quality.compact,
          timeSinceActiveMs: Math.max(0, time - lastActiveTime),
        });

    // A focused connected controller must be polled even when its sticks are idle.
    if (nextSchedule.nextMode === 'raf' || gamepad !== null) {
      if (!frame) frame = window.requestAnimationFrame(render);
    } else if (nextSchedule.nextMode === 'idle-timeout') {
      if (!idleTimer) {
        idleTimer = window.setTimeout(() => {
          idleTimer = 0;
          if (running() && !frame) frame = window.requestAnimationFrame(render);
        }, nextSchedule.idleDelayMs);
      }
    }
  }

  resize();
  renderer.render(scene, camera);
  start();
  callbacks.onReady();

  return {
    navigate,
    setPaused(value) {
      if (disposed) return;
      paused = value;
      if (paused) {
        snapTransition();
        stop();
      } else {
        focused = true;
        start();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      events.abort();
      resizeObserver.disconnect();
      world.dispose();
      canvas.style.touchAction = originalTouchAction;
      canvas.style.cursor = originalCursor;
      if (originalTabIndex === null) canvas.removeAttribute('tabindex');
      else canvas.setAttribute('tabindex', originalTabIndex);
      disposeSceneResources(scene);
      environment?.dispose();
      renderer.dispose();
    },
  };
}
