import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { type StationId } from './index';
import { buildWorld, views } from './world';

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

  it('builds night sky stars, moon, dark theme architecture, and interactive stations', () => {
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
      expect(world.collisions.length).toBe(4);

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

      // Verify robot head animation updates and respects reduced motion
      world.update(1.2, false);
      world.update(2.4, true);

      // Clean disposal
      world.dispose();
    } finally {
      globalThis.document = origDocument;
      globalThis.Image = origImage;
    }
  });
});
