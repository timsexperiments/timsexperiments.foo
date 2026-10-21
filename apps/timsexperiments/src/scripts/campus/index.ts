import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWorld, views } from './world';

export type StationId =
  | 'arrival'
  | 'recipes'
  | 'workbench'
  | 'robot'
  | 'contact';
type Callbacks = {
  onStation: (station: StationId) => void;
  onReady: () => void;
  onError: (message: string) => void;
};

/** Owns only the canvas, its WebGL scene and input listeners. Call dispose on exit. */
export async function createCampus(
  canvas: HTMLCanvasElement,
  callbacks: Callbacks
): Promise<{
  navigate: (station: StationId) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}> {
  const mobile = window.matchMedia(
    '(max-width: 760px), (pointer: coarse)'
  ).matches;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
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
  scene.fog = new THREE.Fog(0x070c0b, 38, 102);
  const camera = new THREE.PerspectiveCamera(mobile ? 68 : 65, 1, 0.08, 120);
  camera.rotation.order = 'YXZ';
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5)
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  scene.add(new THREE.HemisphereLight(0x8cb8d0, 0x101816, 1.18));
  const moonLight = new THREE.DirectionalLight(0xbbe0ff, 2.95);
  moonLight.position.set(9.3, 7.6, -16);
  moonLight.target.position.set(-1.2, 0, 1.5);
  scene.add(moonLight, moonLight.target);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  moonLight.shadow.camera.left = -15;
  moonLight.shadow.camera.right = 15;
  moonLight.shadow.camera.top = 13;
  moonLight.shadow.camera.bottom = -13;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 42;
  moonLight.shadow.normalBias = 0.03;
  moonLight.shadow.bias = -0.00015;
  const fill = new THREE.DirectionalLight(0x6adcc4, 0.72);
  fill.position.set(-5, 4.5, 8);
  scene.add(fill);
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

  let disposed = false;
  let paused = false;
  let focused = true;
  let contextLost = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  const running = () =>
    !disposed && !paused && focused && !document.hidden && !contextLost;

  let world: ReturnType<typeof buildWorld>;
  try {
    world = buildWorld(scene, mobile, () => {
      if (!disposed && !contextLost && !running()) {
        renderer.render(scene, camera);
      }
    });
  } catch (error) {
    renderer.dispose();
    environment?.dispose();
    callbacks.onError(
      'The lab could not be built. Please use the page navigation.'
    );
    throw error;
  }

  const keys = new Set<string>();
  const heldPointers = new Map<number, { button: HTMLButtonElement; code: string }>();
  const pad = document.querySelector<HTMLElement>('#scene-walk-pad');
  const padToggle = document.querySelector<HTMLButtonElement>('#toggle-touch-controls');
  const coarse = window.matchMedia('(any-pointer: coarse)');
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
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
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
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!running() && !contextLost) renderer.render(scene, camera);
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
      if (!contextLost) renderer.render(scene, camera);
    } else {
      transition = {
        from: camera.position.clone(),
        to: destination.position.clone(),
        rotation: camera.quaternion.clone(),
        endRotation: destination.quaternion.clone(),
        start: elapsed,
      };
    }
  }
  const initial = pose('arrival');
  camera.position.copy(initial.position);
  camera.quaternion.copy(initial.quaternion);
  function pick(x: number, y: number): StationId | undefined {
    const rect = canvas.getBoundingClientRect();
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
      } else if (
        (event.code === 'KeyE' || event.code === 'Enter') &&
        !event.repeat &&
        event.target === canvas
      ) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        interact(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else if (event.code === 'Escape') resetInput();
    },
    { signal: events.signal }
  );
  window.addEventListener('keyup', (event) => keys.delete(event.code), {
    signal: events.signal,
  });
  padToggle?.addEventListener('click', () => {
    resetInput();
    showPad = !showPad;
    updatePad();
  }, { signal: events.signal });
  coarse.addEventListener('change', () => {
    resetInput();
    showPad = coarse.matches;
    updatePad();
  }, { signal: events.signal });
  for (const button of pad?.querySelectorAll<HTMLButtonElement>('[data-walk]') ?? []) {
    button.addEventListener('pointerdown', event => {
      const code = button.dataset.walk;
      if (!running() || event.button !== 0 || !code) return;
      event.preventDefault();
      heldPointers.set(event.pointerId, { button, code });
      button.classList.add('is-held');
      button.setPointerCapture(event.pointerId);
      transition = null;
    }, { signal: events.signal });
    const release = (event: PointerEvent) => {
      heldPointers.delete(event.pointerId);
      if (![...heldPointers.values()].some(held => held.button === button))
        button.classList.remove('is-held');
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
      button.addEventListener(name, event => {
        if (event instanceof PointerEvent) release(event);
      }, { signal: events.signal });
  }
  window.addEventListener('orientationchange', resetInput, { signal: events.signal });
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
        }
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      } else if (event.pointerType === 'mouse')
        canvas.style.cursor = pick(event.clientX, event.clientY)
          ? 'pointer'
          : 'grab';
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
  function stop() {
    resetInput();
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function start() {
    if (running() && !frame) frame = requestAnimationFrame(render);
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
    },
    { signal: events.signal }
  );
  function blocked(x: number, z: number) {
    return world.collisions.some(
      (bounds) =>
        x > bounds.minX - 0.22 &&
        x < bounds.maxX + 0.22 &&
        z > bounds.minZ - 0.22 &&
        z < bounds.maxZ + 0.22
    );
  }
  function held(code: string) {
    if (keys.has(code)) return true;
    for (const input of heldPointers.values()) if (input.code === code) return true;
    return false;
  }
  function render(time: number) {
    frame = 0;
    if (!running()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    elapsed += dt;
    if (transition) {
      const progress = Math.min((elapsed - transition.start) / 1.45, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(transition.from, transition.to, eased);
      camera.quaternion.slerpQuaternions(
        transition.rotation,
        transition.endRotation,
        eased
      );
      if (progress === 1) transition = null;
    } else if (keys.size || heldPointers.size) {
      euler.setFromQuaternion(camera.quaternion);
      euler.y += (Number(held('KeyJ')) - Number(held('KeyL'))) * dt * 1.25;
      euler.x = THREE.MathUtils.clamp(euler.x + (Number(held('KeyI')) - Number(held('KeyK'))) * dt * 1.25, -1.12, 1.12);
      camera.quaternion.setFromEuler(euler);
      const forward =
        Number(held('KeyW') || held('ArrowUp')) -
        Number(held('KeyS') || held('ArrowDown'));
      const lateral =
        Number(held('KeyD') || held('ArrowRight')) -
        Number(held('KeyA') || held('ArrowLeft'));
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      right.crossVectors(direction, camera.up);
      direction.multiplyScalar(forward).addScaledVector(right, lateral);
      if (direction.lengthSq())
        direction
          .normalize()
          .multiplyScalar(
            dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.7 : 2.4)
          );
      const x = THREE.MathUtils.clamp(
        camera.position.x + direction.x,
        -9.15,
        9.15
      );
      const z = THREE.MathUtils.clamp(
        camera.position.z + direction.z,
        -6.8,
        8.3
      );
      if (!blocked(x, camera.position.z)) camera.position.x = x;
      if (!blocked(camera.position.x, z)) camera.position.z = z;
    }
    world.update(elapsed, motion.matches);
    renderer.render(scene, camera);
    start();
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
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
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
      moonLight.shadow.dispose();
      environment?.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      // A subsequent renderer may reuse this canvas context. Reset upload state
      // after CanvasTextures so Three's initial 3D fallback textures are valid.
      const gl = renderer.getContext();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      renderer.dispose();
    },
  };
}
