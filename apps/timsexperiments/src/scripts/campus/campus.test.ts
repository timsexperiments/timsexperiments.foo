import { describe, expect, it, spyOn } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DESKTOP_PIXEL_BUDGET, MOBILE_PIXEL_BUDGET } from './quality';
import {
  computeAdaptiveFov,
  computeBoundedPixelRatio,
  computeFrameSchedule,
  computeRenderQuality,
  disposeSceneResources,
  easeInOutCubic,
  isCompactViewport,
  type StationId,
} from './index';
import { buildWorld, views } from './world';
import { isWalkBlocked } from './locomotion';

async function withWorldCanvas(run: () => void | Promise<void>): Promise<void> {
  const origDocument = globalThis.document;
  const origImage = globalThis.Image;
  try {
    const mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: () => {},
      fillText: () => {},
      drawImage: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
    };
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => mockCtx,
      }),
    } as unknown as Document;
    class MockImage {
      onload: (() => void) | null = null;
      private _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (this.onload) this.onload();
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    await run();
  } finally {
    globalThis.document = origDocument;
    globalThis.Image = origImage;
  }
}

describe('campus night world', () => {
  it('preserves all station views and StationId keys', () => {
    const expectedIds: StationId[] = [
      'arrival',
      'recipes',
      'workbench',
      'robot',
      'contact',
    ];
    expect(Object.keys(views)).toEqual(expectedIds);
    for (const id of expectedIds) {
      expect(views[id].position).toBeInstanceOf(THREE.Vector3);
      expect(views[id].target).toBeInstanceOf(THREE.Vector3);
    }
  });

  it('includes the canonical dark extruded logo GLB in src/assets/campus', () => {
    const glbPath = join(
      import.meta.dir,
      '../../assets/campus/tims-experiments-dark.glb'
    );
    const buffer = readFileSync(glbPath);
    expect(buffer.byteLength).toBe(2995948);
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    expect(view.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(2995948);
  });

  it('builds night sky stars, moon, dark theme architecture, and interactive stations', async () => {
    await withWorldCanvas(() => {
      const scene = new THREE.Scene();
      let invalidated = 0;
      const world = buildWorld(scene, false, () => {
        invalidated++;
      });

      // Fallback SVG logo triggers invalidation immediately when Image loads
      expect(invalidated).toBeGreaterThanOrEqual(1);

      // Verify all four interactive stations are registered on targets
      const stationTargets = new Set<string>();
      for (const target of world.targets) {
        if (typeof target.userData.station === 'string') {
          stationTargets.add(target.userData.station);
        }
      }
      expect(stationTargets).toEqual(
        new Set(['recipes', 'workbench', 'robot', 'contact'])
      );
      expect(world.collisions.length).toBe(12);

      // Verify starfield Points exist and ignore fog so stars remain crisp
      const pointClouds: THREE.Points[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points) pointClouds.push(obj);
      });
      expect(pointClouds.length).toBeGreaterThanOrEqual(2);
      for (const pts of pointClouds) {
        const mat = pts.material as THREE.PointsMaterial;
        expect(mat.fog).toBe(false);
      }

      // Verify moon mesh positioned in upper-right window view with fog disabled
      let foundMoon = false;
      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.geometry instanceof THREE.SphereGeometry &&
          Math.abs(obj.position.z - -32) < 1 &&
          obj.material instanceof THREE.MeshBasicMaterial
        ) {
          foundMoon = true;
          expect(obj.material.fog).toBe(false);
        }
      });
      expect(foundMoon).toBe(true);

      // Verify curated shadow casters, shared geometries, and anisotropic textures
      let meshCount = 0;
      let castShadowCount = 0;
      let instancedMeshCount = 0;
      const instanceCounts: number[] = [];
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();

      scene.traverse((obj) => {
        if (obj instanceof THREE.InstancedMesh) {
          instancedMeshCount++;
          instanceCounts.push(obj.count);
        }
        if (obj instanceof THREE.Mesh) {
          meshCount++;
          if (obj.castShadow) castShadowCount++;
          geometries.add(obj.geometry);
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          for (const mat of mats) {
            if (!mat) continue;
            materials.add(mat);
            const map = (mat as THREE.MeshBasicMaterial).map;
            if (map instanceof THREE.Texture) {
              textures.add(map);
              // Transparent glass and text planes must never cast opaque shadows
              if (mat instanceof THREE.MeshBasicMaterial) {
                expect(obj.castShadow).toBe(false);
              }
            }
            if (mat.transparent && mat.opacity < 0.2) {
              expect(obj.castShadow).toBe(false);
            }
          }
        }
      });

      // The envelope and its small details add bounded material batches, not individual draws.
      expect(instancedMeshCount).toBeLessThanOrEqual(17);
      expect(instanceCounts).toContain(42);
      expect(instanceCounts).toContain(52);
      const architecture = scene.getObjectByName('facility-architecture');
      expect(architecture).toBeDefined();
      expect(architecture?.children.length).toBeLessThanOrEqual(16);
      expect(meshCount).toBeLessThan(490);
      // Shadow casters are curated to major architectural/station silhouettes (< 60 vs 577 before)
      expect(castShadowCount).toBeGreaterThan(15);
      expect(castShadowCount).toBeLessThan(60);
      // Geometry and texture caches prevent duplicate allocations (94 vs 581 geometries, <=22 vs 36 textures)
      expect(geometries.size).toBeLessThan(100);
      expect(textures.size).toBeLessThanOrEqual(22);

      // All baked casters must stay fixed while the head still visibly animates.
      scene.updateMatrixWorld(true);
      const casters = new Map<THREE.Object3D, THREE.Matrix4>();
      const robotMeshes = new Map<THREE.Mesh, THREE.Matrix4>();
      scene.traverse((object) => {
        if (object.castShadow) casters.set(object, object.matrixWorld.clone());
      });
      const robot = world.targets.find(
        (target) => target.userData.station === 'robot'
      );
      expect(robot).toBeDefined();
      robot?.traverse((object) => {
        if (object instanceof THREE.Mesh)
          robotMeshes.set(object, object.matrixWorld.clone());
      });
      expect(
        [...casters.keys()].filter(
          (object) => object instanceof THREE.Mesh && robotMeshes.has(object)
        )
      ).toHaveLength(5);
      for (const time of [1.2, 2.4, 6.8]) {
        world.update(time, false);
        scene.updateMatrixWorld(true);
        for (const [object, matrix] of casters)
          expect(object.matrixWorld.equals(matrix)).toBe(true);
      }
      const movingMeshes = [...robotMeshes].filter(
        ([object, matrix]) => !object.matrixWorld.equals(matrix)
      );
      expect(movingMeshes.length).toBeGreaterThan(0);
      for (const [object] of movingMeshes)
        expect(object.castShadow).toBe(false);
      const animatedPose = new Map(
        movingMeshes.map(([object]) => [object, object.matrixWorld.clone()])
      );
      world.update(9, true);
      scene.updateMatrixWorld(true);
      for (const [object, matrix] of animatedPose)
        expect(object.matrixWorld.equals(matrix)).toBe(true);

      // Exercise the exact controller cleanup helper with real Three disposal events.
      const disposalCounts = new Map<object, number>();
      const track = (resource: {
        addEventListener(type: 'dispose', listener: () => void): void;
      }) => {
        if (disposalCounts.has(resource)) return;
        disposalCounts.set(resource, 0);
        resource.addEventListener('dispose', () => {
          disposalCounts.set(resource, (disposalCounts.get(resource) ?? 0) + 1);
        });
      };
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) track(object);
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          track(object.geometry);
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            track(mat);
            if ('map' in mat && mat.map instanceof THREE.Texture)
              track(mat.map);
          }
        }
      });
      const light = new THREE.DirectionalLight();
      light.shadow.map = new THREE.WebGLRenderTarget(16, 16);
      light.shadow.mapPass = new THREE.WebGLRenderTarget(16, 16);
      track(light.shadow.map);
      track(light.shadow.mapPass);
      scene.add(light);
      world.dispose();
      world.dispose(); // Registry cleanup is idempotent; scene resources still have one owner.
      disposeSceneResources(scene);
      for (const count of disposalCounts.values()) expect(count).toBe(1);
    });
  });

  for (const mobile of [false, true]) {
    it(`encloses the walls and ceiling and retains station routes (${mobile ? 'mobile' : 'desktop'})`, async () => {
      await withWorldCanvas(() => {
        const scene = new THREE.Scene();
        const world = buildWorld(scene, mobile);
        try {
          const architecture = scene.getObjectByName('facility-architecture');
          expect(architecture).toBeDefined();
          if (!architecture) throw new Error('Missing facility envelope');
          scene.updateMatrixWorld(true);
          const ray = new THREE.Raycaster();
          // Include glass corners, roof curbs, wall tops, the threshold and closed leaf.
          for (const x of [
            -9.8, -9.6, -5.04, -5, -4.98, 0, 4.98, 5, 5.04, 9.6, 9.8,
          ]) {
            for (const z of [-7.25, -3.5, 0.5, 4.5, 8.75]) {
              ray.set(new THREE.Vector3(x, 1.7, z), new THREE.Vector3(0, 1, 0));
              expect(
                ray.intersectObject(architecture, true).length
              ).toBeGreaterThan(0);
            }
            for (const y of [0.12, 1.7, 4.9, 5.4]) {
              for (const direction of [-1, 1]) {
                ray.set(
                  new THREE.Vector3(x, y, 0.75),
                  new THREE.Vector3(0, 0, direction)
                );
                expect(
                  ray.intersectObject(architecture, true).length
                ).toBeGreaterThan(0);
              }
            }
          }
          for (const z of [-7.25, -3.5, 0.5, 4.5, 8.75]) {
            for (const side of [-1, 1]) {
              ray.set(
                new THREE.Vector3(0, 1.7, z),
                new THREE.Vector3(side, 0, 0)
              );
              expect(
                ray.intersectObject(architecture, true).length
              ).toBeGreaterThan(0);
            }
          }

          const clear = (x: number, z: number) =>
            !isWalkBlocked(world.collisions, x, z);
          // Every station connects through the open aisle south of the robot, then along
          // its own approach. Sampling segments catches furniture and camera clearance.
          const segment = (from: [number, number], to: [number, number]) => {
            const steps = Math.ceil(
              Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.08
            );
            for (let i = 0; i <= steps; i++) {
              const t = steps === 0 ? 0 : i / steps;
              expect(
                clear(
                  from[0] + (to[0] - from[0]) * t,
                  from[1] + (to[1] - from[1]) * t
                )
              ).toBe(true);
            }
          };
          for (const { position } of Object.values(views)) {
            segment([0, 7.6], [position.x, 7.6]);
            segment([position.x, 7.6], [position.x, position.z]);
          }
          // Follow the perimeter with detours around the four solid planters.
          const perimeter: [number, number][] = [
            [-9.15, -6.8],
            [8.1, -6.8],
            [8.1, -5.7],
            [9.15, -5.7],
            [9.15, 3.1],
            [8.1, 3.1],
            [8.1, 4.9],
            [9.15, 4.9],
            [9.15, 8.3],
            [-9.15, 8.3],
            [-9.15, 5.9],
            [-8.1, 5.9],
            [-8.1, 4.1],
            [-9.15, 4.1],
            [-9.15, -2.1],
            [-8.1, -2.1],
            [-8.1, -3.8],
            [-9.15, -3.8],
            [-9.15, -6.8],
          ];
          for (let i = 1; i < perimeter.length; i++)
            segment(perimeter[i - 1], perimeter[i]);
          segment([0, 7.6], [0, 8.3]);
          for (const [x, z] of [
            [-9.65, 0],
            [9.65, 0],
            [0, -7.4],
            [0, 8.85],
            [-9, -3],
            [9, -6.6],
            [9, 4],
            [-9, 5],
          ])
            expect(isWalkBlocked(world.collisions, x, z)).toBe(true);

          const wash = scene.getObjectByName('entrance-wash');
          expect(wash).toBeInstanceOf(THREE.PointLight);
          if (wash instanceof THREE.PointLight) {
            expect(wash.castShadow).toBe(false);
            expect(wash.distance).toBeLessThanOrEqual(7.5);
          }
        } finally {
          world.dispose();
          disposeSceneResources(scene);
        }
      });
    });
  }

  for (const late of [false, true]) {
    it(`disposes shared GLB resources once when ${late ? 'loaded after disposal' : 'attached before disposal'}`, async () => {
      const buffer = readFileSync(
        join(import.meta.dir, '../../assets/campus/tims-experiments-dark.glb')
      );
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        new GLTFLoader().parse(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          ),
          '',
          resolve,
          reject
        );
      });
      // Force sharing across nodes and material arrays in the real parsed asset.
      gltf.scene.add(gltf.scene.children[0].clone());
      const glbResources = new Set<THREE.BufferGeometry | THREE.Material>();
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        glbResources.add(object.geometry);
        const mats = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const mat of mats) glbResources.add(mat);
        object.material = [...mats, ...mats];
      });
      const counts = new Map<object, number>();
      const track = (resource: {
        addEventListener(type: 'dispose', listener: () => void): void;
      }) => {
        if (counts.has(resource)) return;
        counts.set(resource, 0);
        resource.addEventListener('dispose', () =>
          counts.set(resource, (counts.get(resource) ?? 0) + 1)
        );
      };
      for (const resource of glbResources) track(resource);
      const requested =
        Promise.withResolvers<Parameters<GLTFLoader['load']>[1]>();
      const load = spyOn(GLTFLoader.prototype, 'load').mockImplementation(
        (_url, onLoad) => {
          requested.resolve(onLoad);
        }
      );
      try {
        await withWorldCanvas(async () => {
          const scene = new THREE.Scene();
          let invalidations = 0;
          const world = buildWorld(scene, true, () => invalidations++);
          scene.traverse((object) => {
            if (
              !(object instanceof THREE.Mesh || object instanceof THREE.Points)
            )
              return;
            track(object.geometry);
            for (const mat of Array.isArray(object.material)
              ? object.material
              : [object.material])
              track(mat);
          });
          const deliver = await requested.promise;
          const beforeLoad = invalidations;
          if (late) {
            world.dispose();
            disposeSceneResources(scene);
          }
          deliver(gltf);
          expect(invalidations).toBe(beforeLoad + (late ? 0 : 1));
          expect(gltf.scene.parent).toBe(late ? null : scene);
          if (!late) {
            world.dispose();
            disposeSceneResources(scene);
          }
          for (const count of counts.values()) expect(count).toBe(1);
        });
      } finally {
        load.mockRestore();
      }
    });
  }

  it('enforces the pixel ceiling above native CSS area and at rounding boundaries', () => {
    const cases = [
      { width: 2560, height: 1440, coarsePointer: false },
      { width: 3840, height: 2160, coarsePointer: false },
      { width: 2048, height: 2732, coarsePointer: true },
      { width: 400, height: 844, coarsePointer: true },
      { width: 768, height: 1024, coarsePointer: true },
      { width: 1280.5, height: 800.25, coarsePointer: false },
      { width: 1500, height: 1600, coarsePointer: false },
    ];
    for (const viewport of cases) {
      for (const devicePixelRatio of [1, 2, 3]) {
        const quality = computeRenderQuality({ ...viewport, devicePixelRatio });
        const budget = quality.compact
          ? MOBILE_PIXEL_BUDGET
          : DESKTOP_PIXEL_BUDGET;
        const pixels =
          Math.floor(viewport.width * quality.pixelRatio) *
          Math.floor(viewport.height * quality.pixelRatio);
        expect(quality.pixelRatio).toBeGreaterThan(0);
        expect(quality.pixelRatio).toBeLessThanOrEqual(devicePixelRatio);
        expect(pixels).toBe(quality.totalPixels);
        expect(pixels).toBeLessThanOrEqual(budget);
        if (viewport.width * viewport.height > budget)
          expect(quality.pixelRatio).toBeLessThan(1);
      }
    }
    const boundary = computeRenderQuality({
      width: 400,
      height: 844,
      devicePixelRatio: 3,
      coarsePointer: true,
    });
    expect(boundary.pixelRatio).toBeLessThan(2);
    expect(boundary.drawingBufferWidth).toBe(799);
    expect(boundary.drawingBufferHeight).toBe(1687);
  });

  it('computes bounded high-DPI pixel ratios and adaptive FOV across mobile and desktop viewports', () => {
    expect(isCompactViewport(390, 844, false)).toBe(true);
    expect(isCompactViewport(844, 390, false)).toBe(true);
    expect(isCompactViewport(1280, 800, false)).toBe(false);
    expect(isCompactViewport(1280, 800, true)).toBe(true);

    // 320x568 (iPhone SE) at 2x DPR gets full 2.0 pixel ratio (640x1136) and antialiasing
    const se = computeRenderQuality({
      width: 320,
      height: 568,
      devicePixelRatio: 2,
      coarsePointer: true,
    });
    expect(se.compact).toBe(true);
    expect(se.antialias).toBe(true);
    expect(se.pixelRatio).toBe(2);
    expect(se.drawingBufferWidth).toBe(640);
    expect(se.drawingBufferHeight).toBe(1136);
    expect(se.fov).toBeGreaterThan(68);

    // 390x844 (iPhone 12/13/14 Pro) at 2x and 3x DPR stays bounded at 2.0 (780x1688 = 1.316M px)
    const phone2x = computeRenderQuality({
      width: 390,
      height: 844,
      devicePixelRatio: 2,
      coarsePointer: true,
    });
    const phone3x = computeRenderQuality({
      width: 390,
      height: 844,
      devicePixelRatio: 3,
      coarsePointer: true,
    });
    expect(phone2x.pixelRatio).toBe(2);
    expect(phone3x.pixelRatio).toBe(2);
    expect(phone2x.drawingBufferWidth).toBe(780);
    expect(phone2x.drawingBufferHeight).toBe(1688);
    expect(phone3x.totalPixels).toBeLessThanOrEqual(1_350_000);

    // Landscape 844x390 adapts FOV back to horizontal framing while keeping 2x pixel ratio
    const landscape = computeRenderQuality({
      width: 844,
      height: 390,
      devicePixelRatio: 2,
      coarsePointer: true,
    });
    expect(landscape.compact).toBe(true);
    expect(landscape.pixelRatio).toBe(2);
    expect(landscape.fov).toBe(66);
    expect(computeAdaptiveFov(390, 844, true)).toBeGreaterThan(
      computeAdaptiveFov(844, 390, true)
    );

    // Large tablet with coarse pointer scales DPR down to stay within the 1.35M mobile pixel budget
    const tablet = computeRenderQuality({
      width: 820,
      height: 1180,
      devicePixelRatio: 2,
      coarsePointer: true,
    });
    expect(tablet.pixelRatio).toBeLessThan(1.3);
    expect(tablet.totalPixels).toBeLessThanOrEqual(MOBILE_PIXEL_BUDGET);

    // Desktop 1280x800 and 2560x1440 stay within the 2.4M desktop pixel budget
    const desktop = computeRenderQuality({
      width: 1280,
      height: 800,
      devicePixelRatio: 2,
      coarsePointer: false,
    });
    expect(desktop.compact).toBe(false);
    expect(desktop.pixelRatio).toBeCloseTo(1.53, 2);
    expect(desktop.totalPixels).toBeLessThanOrEqual(DESKTOP_PIXEL_BUDGET);

    const desktop4k = computeBoundedPixelRatio(2560, 1440, 2, false);
    expect(desktop4k).toBeLessThan(1);
  });

  it('schedules full-rate frames during active interaction, throttles idle frames, and stops when paused or reduced-motion idle', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);

    // Paused / hidden scene does not render or schedule
    const paused = computeFrameSchedule({
      running: false,
      activeInput: true,
      transitioning: true,
      invalidated: true,
      reducedMotion: false,
      compact: true,
      timeSinceActiveMs: 0,
    });
    expect(paused).toEqual({
      shouldRender: false,
      nextMode: 'none',
      idleDelayMs: 0,
    });

    // Reduced motion renders a single invalidated frame and then stops (0 idle RAF calls)
    const reducedInitial = computeFrameSchedule({
      running: true,
      activeInput: false,
      transitioning: false,
      invalidated: true,
      reducedMotion: true,
      compact: true,
      timeSinceActiveMs: 0,
    });
    expect(reducedInitial.shouldRender).toBe(true);
    expect(reducedInitial.nextMode).toBe('none');

    const reducedIdle = computeFrameSchedule({
      running: true,
      activeInput: false,
      transitioning: false,
      invalidated: false,
      reducedMotion: true,
      compact: true,
      timeSinceActiveMs: 1000,
    });
    expect(reducedIdle.shouldRender).toBe(false);
    expect(reducedIdle.nextMode).toBe('none');

    // Reduced motion still runs full RAF while actively walking or dragging look
    const reducedWalking = computeFrameSchedule({
      running: true,
      activeInput: true,
      transitioning: false,
      invalidated: false,
      reducedMotion: true,
      compact: true,
      timeSinceActiveMs: 0,
    });
    expect(reducedWalking.shouldRender).toBe(true);
    expect(reducedWalking.nextMode).toBe('raf');

    // Normal motion uses RAF during transitions/input and throttled timeout when idle
    const activeFlight = computeFrameSchedule({
      running: true,
      activeInput: false,
      transitioning: true,
      invalidated: false,
      reducedMotion: false,
      compact: true,
      timeSinceActiveMs: 100,
    });
    expect(activeFlight.nextMode).toBe('raf');

    const mobileIdle = computeFrameSchedule({
      running: true,
      activeInput: false,
      transitioning: false,
      invalidated: false,
      reducedMotion: false,
      compact: true,
      timeSinceActiveMs: 900,
    });
    expect(mobileIdle.shouldRender).toBe(true);
    expect(mobileIdle.nextMode).toBe('idle-timeout');
    expect(mobileIdle.idleDelayMs).toBe(66);
  });
});
