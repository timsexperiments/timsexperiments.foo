import { RubiksCube } from '@timsexperiments/three-rubiks-cube';
import { explodeAndReassemble } from '@timsexperiments/three-rubiks-cube/async';
import * as THREE from 'three';

window.addEventListener('load', () =>
  setTimeout(() => {
    const isDark = document.documentElement.classList.contains('dark');

    const canvas = document.querySelector<HTMLCanvasElement>('canvas#cube')!;
    const sizes = {
      width: window.innerWidth / 1.5,
      height: window.innerHeight,
      get aspect() {
        return this.height !== 0 ? this.width / this.height : 0;
      },
    };

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth / 1.5;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    });

    const scene = new THREE.Scene();
    scene.background = isDark
      ? new THREE.Color(0x0a0b0a)
      : new THREE.Color(0xfafafa);

    const camera = new THREE.PerspectiveCamera(75, sizes.aspect, 0.1, 500);

    camera.position.z = 7;
    camera.position.y = 4;
    camera.position.x = -4;

    const cube = new RubiksCube(camera, canvas, {
      colors: [0xfafafa, 0xf8e749, 0x1772b8, 0x17b897, 0xb82217, 0xe59e19],
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

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
      scene
    ).texture;

    function tick() {
      renderer.render(scene, camera);

      window.requestAnimationFrame(tick);
    }

    hidePlaceholder();
    startAnimation();
    tick();

    const observer = new MutationObserver((mutations) => {
      if (!mutations.length) return;

      const mutation = mutations[0];
      const { target } = mutation;

      if (mutation.attributeName === 'class') {
        const isDark = (target as HTMLElement).classList.contains('dark');
        if (isDark) {
          scene.background = new THREE.Color(0x0a0b0a);
        } else {
          scene.background = new THREE.Color(0xfafafa);
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
    });

    async function showWhatControlsDo() {
      const controls =
        document.querySelector<HTMLDivElement>('#cube-controls')!;
      const wControl =
        document.querySelector<HTMLDivElement>('#cube-w-control')!;
      const aControl =
        document.querySelector<HTMLDivElement>('#cube-a-control')!;
      const sControl =
        document.querySelector<HTMLDivElement>('#cube-s-control')!;
      const dControl =
        document.querySelector<HTMLDivElement>('#cube-d-control')!;

      controls.classList.add('opacity-100');

      wControl.classList.add('animate-pulse', 'repeat-1');
      await wait(1000);
      cube.rotateCube('x', 'clockwise', {
        onComplete: async () => {
          await wait(500);
          aControl.classList.add('animate-pulse', 'repeat-1');
          await wait(1000);
          cube.rotateCube('y', 'clockwise', {
            onComplete: async () => {
              await wait(500);
              sControl.classList.add('animate-pulse', 'repeat-1');
              await wait(1000);
              cube.rotateCube('x', 'counterclockwise', {
                onComplete: async () => {
                  await wait(500);
                  dControl.classList.add('animate-pulse', 'repeat-1');
                  await wait(1000);
                  cube.rotateCube('y', 'counterclockwise', {
                    onComplete: async () => {
                      await wait(500);
                      controls.classList.add('opacity-0');
                      await wait(500);
                      controls.classList.add('hidden');
                      controls.classList.remove('flex');

                      await showPointerControls();
                    },
                  });
                },
              });
            },
          });
        },
      });
    }

    async function showPointerControls() {
      const pointerControls = document.querySelector<HTMLDivElement>(
        '#cube-pointer-controls'
      )!;
      const pointer = document.querySelector<SVGElement>(
        '#cube-pointer-controls svg'
      )!;

      pointerControls.classList.remove('opacity-0');
      pointerControls.classList.add('opacity-100');
      pointer.classList.add('animate-slide-down', 'repeat-1');
      await wait(200);
      cube.rotate('x', 1, 'clockwise', {
        duration: 800,
        onComplete: async () => {
          pointerControls.classList.remove('opacity-100');
          pointerControls.classList.add('opacity-0');
          pointer.classList.remove('animate-slide-down', 'repeat-1');
          await wait(500);
          pointerControls.classList.remove('opacity-0', 'translate-y-12');
          pointerControls.classList.add('opacity-100', '-translate-y-2');
          pointer.classList.add('animate-slide', 'repeat-1');
          await wait(200);
          cube.rotate('y', 2, 'clockwise', { duration: 800 });
          await wait(500);
          pointerControls.classList.remove('opacity-100');
          pointerControls.classList.add('opacity-0');
          await wait(800);
          pointerControls.classList.remove('flex');
          pointerControls.classList.add('hidden');
        },
      });
    }

    function hidePlaceholder() {
      const cubePlaceholder =
        document.querySelector<HTMLDivElement>('#cube-placeholder')!;

      cubePlaceholder.parentElement?.removeChild(cubePlaceholder);
    }

    function startAnimation() {
      setTimeout(() => {
        cube.shuffle(15, {
          onComplete: async () => {
            await explodeAndReassemble(cube, { range: 7 });
            await showWhatControlsDo();
          },
        });
      }, 1000);
    }

    function wait(timeout: number = 1000) {
      return new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }, 100)
);
