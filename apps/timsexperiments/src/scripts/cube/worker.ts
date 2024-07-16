import {
  explodeAndReassemble,
  RubiksCube,
  type CubeEventHandlersEventMap,
  type CubeEventListener,
} from '@timsexperiments/three-rubiks-cube';
import * as THREE from 'three';
import * as actions from './actions';

class WorkerCubeEventListener implements CubeEventListener {
  private listeners: {
    [key in keyof CubeEventHandlersEventMap]?: (
      ev: CubeEventHandlersEventMap[key]
    ) => any;
  } = {};

  addEventListener<K extends keyof CubeEventHandlersEventMap>(
    type: K,
    listener: (ev: CubeEventHandlersEventMap[K]) => any
  ): void {
    // @ts-ignore
    this.listeners[type] = listener;
  }

  dispatchEvent<K extends keyof CubeEventHandlersEventMap>(
    type: K,
    ev: CubeEventHandlersEventMap[K]
  ) {
    const listener = this.listeners[type];
    if (listener) {
      listener(ev);
    }
  }
}

const eventListener = new WorkerCubeEventListener();
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let cube: RubiksCube;
let camera: THREE.PerspectiveCamera;
let offscreenCanvas: OffscreenCanvas | null = null;
(self.window as any) = { innerWidth: 0, innerHeight: 0 };

self.addEventListener('message', (event) => {
  const {
    canvas,
    isDark,
    sizes,
    action,
    devicePixelRatio,
    boundingRect,
    innerWidth,
    innerHeight,
  } = event.data;

  if (canvas && !offscreenCanvas) {
    offscreenCanvas = canvas;
  }

  if (offscreenCanvas && boundingRect) {
    (offscreenCanvas as any).getBoundingClientRect = () => boundingRect;
  }

  if (innerWidth && innerHeight) {
    window.innerHeight = innerHeight;
    window.innerWidth = innerWidth;
  }

  if (action === actions.INIT && offscreenCanvas) {
    scene = new THREE.Scene();
    scene.background = isDark
      ? new THREE.Color(0x0a0b0a)
      : new THREE.Color(0xfafafa);

    camera = new THREE.PerspectiveCamera(75, sizes.aspect, 0.1, 500);
    camera.position.z = 7;
    camera.position.y = 4;
    camera.position.x = -4;

    cube = new RubiksCube(camera, canvas, {
      colors: [0xfafafa, 0xf8e749, 0x1772b8, 0x17b897, 0xb82217, 0xe59e19],
      listener: eventListener,
    });
    scene.add(cube);
    cube.castShadow = true;
    camera.lookAt(cube.position);

    const AmbientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(AmbientLight);

    const spotlight = new THREE.PointLight(0xffffff, 50);
    scene.add(spotlight);

    spotlight.position.set(-2, 8, 4);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    spotlight.shadow.camera.near = 5;
    spotlight.shadow.camera.far = 10;

    renderer = new THREE.WebGLRenderer({ canvas: offscreenCanvas });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(sizes.width, sizes.height, false); // Pass false to avoid setting style
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
      scene
    ).texture;

    function tick() {
      renderer.render(scene, camera);
      self.requestAnimationFrame(tick);
    }

    self.postMessage({ action: actions.HIDE_PLACEHOLDER });
    tick();
    startAnimation();
  } else if (action === actions.UPDATE_THEME) {
    scene.background = isDark
      ? new THREE.Color(0x0a0b0a)
      : new THREE.Color(0xfafafa);
  } else if (action === actions.RESIZE && renderer) {
    const { width, height, aspect } = sizes;
    renderer.setSize(width, height, false); // Pass false to avoid setting style
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  } else if (action === actions.DISPATCH_EVENT) {
    const { type, eventData } = event.data;
    eventListener.dispatchEvent(type, eventData);
  }
});

async function startAnimation() {
  cube.disableControls();
  await wait(500);
  await cube.shuffle(20, { duration: 200 });
  await explodeAndReassemble(cube, { duration: 1000 });
  await showWhatControlsDo();
  cube.enableControls();
}

async function showWhatControlsDo() {
  const controlsSelector = '#cube-controls';
  const wControlSelector = '#cube-w-control';
  const aControlSelector = '#cube-a-control';
  const sControlSelector = '#cube-s-control';
  const dControlSelector = '#cube-d-control';

  self.postMessage({ action: actions.UNHIDE, selector: controlsSelector });
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: wControlSelector,
    classes: ['animate-pulse', 'repeat-1'],
  });
  await wait(1000);
  await cube.rotateCube('x', 'clockwise');
  await wait(500);
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: aControlSelector,
    classes: ['animate-pulse', 'repeat-1'],
  });
  await wait(1000);
  await cube.rotateCube('y', 'clockwise');
  await wait(500);
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: sControlSelector,
    classes: ['animate-pulse', 'repeat-1'],
  });
  await wait(1000);
  await cube.rotateCube('x', 'counterclockwise');
  await wait(500);
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: dControlSelector,
    classes: ['animate-pulse', 'repeat-1'],
  });
  await wait(1000);
  await cube.rotateCube('y', 'counterclockwise');
  await wait(500);
  self.postMessage({ action: actions.HIDE, selector: controlsSelector });
  await wait(500);
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: controlsSelector,
    classes: ['hidden'],
  });
  self.postMessage({
    action: actions.REMOVE_CLASSES,
    selector: controlsSelector,
    classes: ['flex'],
  });

  await showPointerControls();
}

async function showPointerControls() {
  const pointerControlsSelector = '#cube-pointer-controls';
  const pointerSelector = '#cube-pointer-controls svg';

  self.postMessage({
    action: actions.UNHIDE,
    selector: pointerControlsSelector,
  });
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: pointerSelector,
    classes: ['animate-slide-down', 'repeat-1'],
  });
  await wait(200);
  await cube.rotateSlice('x', 1, 'clockwise', {
    duration: 800,
  });
  self.postMessage({
    action: actions.HIDE,
    selector: pointerSelector,
  });
  self.postMessage({
    action: actions.REMOVE_CLASSES,
    selector: pointerSelector,
    classes: ['animate-slide-down', 'repeat-1'],
  });
  await wait(500);
  self.postMessage({
    action: actions.REMOVE_CLASSES,
    selector: pointerControlsSelector,
    classes: ['opacity-0', 'translate-y-12'],
  });
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: pointerControlsSelector,
    classes: ['opacity-100', '-translate-y-2'],
  });
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: pointerSelector,
    classes: ['animate-slide', 'repeat-1'],
  });
  await wait(200);
  await cube.rotateSlice('y', 2, 'clockwise', { duration: 800 });
  await wait(500);
  self.postMessage({
    action: actions.HIDE,
    selector: pointerSelector,
  });
  await wait(800);
  self.postMessage({
    action: actions.REMOVE_CLASSES,
    selector: pointerControlsSelector,
    classes: ['flex'],
  });
  self.postMessage({
    action: actions.ADD_CLASSES,
    selector: pointerControlsSelector,
    classes: ['hidden'],
  });
}

// pointerControls.classList.remove('opacity-100');
//           pointerControls.classList.add('opacity-0');
//           pointer.classList.remove('animate-slide-down', 'repeat-1');
//           await wait(500);
//           pointerControls.classList.remove('opacity-0', 'translate-y-12');
//           pointerControls.classList.add('opacity-100', '-translate-y-2');
//           pointer.classList.add('animate-slide', 'repeat-1');
//           await wait(200);
//           cube.rotate('y', 2, 'clockwise', { duration: 800 });
//           await wait(500);
//           pointerControls.classList.remove('opacity-100');
//           pointerControls.classList.add('opacity-0');
//           await wait(800);
//           pointerControls.classList.remove('flex');
//           pointerControls.classList.add('hidden');

function wait(timeout: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
