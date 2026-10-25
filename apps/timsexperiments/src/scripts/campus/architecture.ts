import * as THREE from 'three';
import type { CollisionBounds } from './types';

type ArchitectureOptions = {
  scene: THREE.Scene;
  collisions: CollisionBounds[];
  getBoxGeometry: (w: number, h: number, d: number) => THREE.BoxGeometry;
  getCylinderGeometry: (
    r: number,
    bottom: number,
    h: number
  ) => THREE.CylinderGeometry;
  material: (
    color: THREE.ColorRepresentation,
    roughness?: number,
    metalness?: number
  ) => THREE.MeshStandardMaterial;
  ink: THREE.Material;
  aluminum: THREE.Material;
  glass: THREE.Material;
  warmGlow: THREE.Material;
  coolTrim: THREE.Material;
};

type BoxPlacement = {
  size: [number, number, number];
  position: [number, number, number];
};

/** The south entrance is closed. North glazing and the central skylight retain the night view. */
export function buildArchitecture({
  scene,
  collisions,
  getBoxGeometry,
  getCylinderGeometry,
  material,
  ink,
  aluminum,
  glass,
  warmGlow,
  coolTrim,
}: ArchitectureOptions): void {
  const building = new THREE.Group();
  building.name = 'facility-architecture';
  scene.add(building);

  // Unit-box instances share the world's geometry/material ownership and disposal path.
  const batches = new Map<
    THREE.Material,
    { boxes: BoxPlacement[]; name: string; cast: boolean }
  >();
  function part(
    mat: THREE.Material,
    size: BoxPlacement['size'],
    position: BoxPlacement['position']
  ) {
    batches.get(mat)?.boxes.push({ size, position });
  }
  function batch(mat: THREE.Material, name: string, cast = false) {
    batches.set(mat, { boxes: [], name, cast });
  }

  const wall = material(0x39433f, 0.86, 0.04);
  const panel = material(0x303d38, 0.75, 0.08);
  const alternatePanel = material(0x394740, 0.78, 0.06);
  const ceiling = material(0x414b46, 0.85, 0.04);
  const bronze = material(0x635b49, 0.43, 0.56);
  const entryStone = material(0x37413c, 0.67, 0.1);
  const matting = material(0x131d19, 0.96);
  const porcelain = material(0xb5c4b9, 0.42, 0.12);
  for (const [mat, name] of [
    [panel, 'wall-panels'],
    [alternatePanel, 'alternate-wall-panels'],
    [ceiling, 'ceiling-cassettes'],
    [bronze, 'bronze-trim'],
    [entryStone, 'entry-stone'],
    [matting, 'entry-matting'],
    [porcelain, 'switches'],
    [ink, 'structure-and-reveals'],
    [aluminum, 'frames-and-hardware'],
    [glass, 'glazing'],
    [warmGlow, 'light-diffusers'],
    [coolTrim, 'exit-detail'],
  ] satisfies [THREE.Material, string][])
    batch(mat, name);
  batch(wall, 'solid-envelope', true);

  // Complete wall thicknesses meet at all four corners. The north wall remains glazed.
  part(wall, [0.3, 5.5, 16.8], [-10, 2.73, 0.75]);
  part(wall, [0.3, 5.5, 16.8], [10, 2.73, 0.75]);
  for (const side of [-1, 1]) {
    part(wall, [8.45, 5.5, 0.3], [side * 5.925, 2.73, 9]);
  }
  part(wall, [3.4, 1.4, 0.3], [0, 4.78, 9]);
  part(wall, [20, 0.18, 0.3], [0, 0.05, -7.5]);
  part(wall, [20, 0.4, 0.3], [0, 5.3, -7.5]);
  part(glass, [19.7, 4.98, 0.035], [0, 2.62, -7.5]);
  // Overlapping corner jambs seal the glass-to-wall junction, including oblique views.
  for (const x of [-9.85, 9.85]) {
    part(ink, [0.3, 5.5, 0.3], [x, 2.73, -7.5]);
  }

  // Panels sit in recessed dark joints; a continuous skirting and cornice close each edge.
  for (const side of [-1, 1]) {
    for (const [i, z] of [-5.45, -1.45, 2.55, 6.55].entries()) {
      part(
        i % 2 ? alternatePanel : panel,
        [0.035, 3.92, 3.86],
        [side * 9.832, 2.15, z]
      );
    }
    part(ink, [0.06, 0.18, 16.3], [side * 9.8, 0.1, 0.75]);
    part(aluminum, [0.025, 0.025, 16.3], [side * 9.76, 0.205, 0.75]);
    part(ink, [0.09, 0.09, 16.3], [side * 9.78, 4.17, 0.75]);
    part(warmGlow, [0.025, 0.025, 16.2], [side * 9.72, 4.24, 0.75]);
    for (const [i, x] of [3.1, 5.87, 8.64].entries()) {
      part(
        i % 2 ? alternatePanel : panel,
        [2.64, 3.92, 0.035],
        [side * x, 2.15, 8.832]
      );
    }
    part(ink, [8.12, 0.18, 0.07], [side * 5.82, 0.1, 8.79]);
    part(aluminum, [8.12, 0.025, 0.025], [side * 5.82, 0.205, 8.74]);
    part(ink, [8.12, 0.09, 0.09], [side * 5.82, 4.17, 8.78]);
    part(warmGlow, [8.12, 0.025, 0.025], [side * 5.82, 4.24, 8.72]);
  }

  // Opaque roof over the side bays, sealed glass above the central aisle.
  // The roof does not enter the static moonlight bake, preserving the established station lighting.
  for (const side of [-1, 1]) {
    part(ceiling, [5.1, 0.18, 16.8], [side * 7.6, 5.56, 0.75]);
    for (const z of [-5.65, -2.35, 0.95, 4.25, 7.55]) {
      part(panel, [4.62, 0.045, 3.16], [side * 7.5, 5.445, z]);
    }
    part(ink, [0.18, 0.3, 16.8], [side * 10, 5.4, 0.75]);
  }
  part(glass, [10.1, 0.045, 16.8], [0, 5.57, 0.75]);
  for (const x of [-5, 5]) {
    // Raised curbs overlap the skylight and opaque roof rather than leaving a sky slit.
    part(ink, [0.18, 0.32, 16.8], [x, 5.45, 0.75]);
  }
  for (const x of [-9.7, -5, 0, 5, 9.7]) {
    part(aluminum, [0.12, 5.2, 0.14], [x, 2.65, -7.42]);
    part(ink, [0.18, 0.3, 16.6], [x, 5.12, 0.75]);
    part(warmGlow, [0.035, 0.025, 16.1], [x, 4.955, 0.75]);
    for (const z of [-7.35, 8.82]) {
      part(aluminum, [0.3, 0.36, 0.065], [x, 4.97, z]);
      for (const dx of [-0.09, 0.09]) {
        part(ink, [0.035, 0.035, 0.018], [x + dx, 4.94, z - 0.045]);
      }
    }
  }
  for (const z of [-7.4, -3.5, 0.5, 4.5, 8.85]) {
    part(aluminum, [19.7, 0.22, 0.16], [0, 5.16, z]);
    for (const side of [-1, 1]) {
      part(ink, [0.18, 5.1, 0.18], [side * 9.72, 2.56, z]);
      part(aluminum, [0.28, 0.1, 0.38], [side * 9.68, 4.99, z]);
      part(aluminum, [0.25, 0.06, 0.28], [side * 9.72, 0.055, z]);
    }
  }
  for (const z of [-7.5, 9]) {
    part(ink, [20.3, 0.24, 0.23], [0, 5.55, z]);
  }
  for (const x of [-6, 0, 6]) {
    part(aluminum, [0.16, 0.05, 0.16], [x, 5.36, -3]);
    part(ink, [0.035, 0.36, 0.035], [x, 5.16, -3]);
  }

  // Recessed entrance: one closed glazed leaf, fixed sidelights, and a single transom.
  // A shallow, lit outer recess gives the glass depth without implying exterior navigation.
  part(wall, [3.4, 4.1, 0.14], [0, 2.03, 9.7]);
  for (const x of [-1.66, 1.66]) {
    part(ceiling, [0.12, 4.1, 0.7], [x, 2.03, 9.32]);
  }
  part(ceiling, [3.4, 0.12, 0.7], [0, 4.07, 9.32]);
  part(entryStone, [3.4, 0.08, 1], [0, -0.015, 9.25]);
  part(warmGlow, [2.8, 0.035, 0.06], [0, 3.98, 9.3]);
  part(panel, [2.9, 2.7, 0.035], [0, 1.6, 9.61]);
  part(bronze, [2.9, 0.05, 0.04], [0, 2.96, 9.58]);

  for (const x of [-1.7, 1.7]) {
    part(ink, [0.16, 4.16, 0.32], [x, 2.08, 8.94]);
    part(
      aluminum,
      [0.035, 4.03, 0.035],
      [x - Math.sign(x) * 0.065, 2.08, 8.76]
    );
  }
  for (const y of [0.06, 3.15, 4.1]) {
    part(ink, [3.4, 0.11, 0.24], [0, y, 8.94]);
  }
  for (const x of [-0.85, 0.85]) {
    part(ink, [0.1, 3.12, 0.22], [x, 1.59, 8.94]);
    part(glass, [0.76, 3.04, 0.035], [x * 1.47, 1.6, 8.97]);
    part(bronze, [0.7, 0.05, 0.04], [x * 1.47, 1.06, 8.9]);
  }
  part(glass, [3.27, 0.9, 0.035], [0, 3.62, 8.97]);
  part(glass, [1.5, 2.88, 0.035], [0, 1.59, 8.92]);
  for (const x of [-0.77, 0.77]) {
    part(aluminum, [0.065, 3.02, 0.09], [x, 1.59, 8.88]);
    part(ink, [0.018, 3.05, 0.035], [x * 1.06, 1.59, 8.83]);
  }
  for (const y of [0.15, 3.07]) {
    part(aluminum, [1.6, 0.09, 0.09], [0, y, 8.88]);
  }
  part(bronze, [1.48, 0.23, 0.035], [0, 0.32, 8.82]);
  part(aluminum, [1.48, 0.055, 0.075], [0, 1.06, 8.86]);
  // Pull handle, two standoffs, lock escutcheon, and a top closer.
  part(aluminum, [0.04, 0.36, 0.04], [0.59, 1.29, 8.68]);
  for (const y of [1.15, 1.43])
    part(aluminum, [0.055, 0.04, 0.17], [0.59, y, 8.77]);
  part(ink, [0.055, 0.085, 0.025], [0.59, 0.98, 8.82]);
  part(aluminum, [0.28, 0.065, 0.1], [-0.5, 2.95, 8.79]);
  part(ink, [0.4, 0.025, 0.035], [-0.36, 3.02, 8.74]);
  const hingeGeometry = getCylinderGeometry(0.025, 0.025, 0.14);
  const hinges = new THREE.InstancedMesh(hingeGeometry, aluminum, 3);
  hinges.name = 'entrance-hinges';
  const matrix = new THREE.Matrix4();
  for (const [i, y] of [0.46, 1.55, 2.72].entries()) {
    hinges.setMatrixAt(i, matrix.makeTranslation(-0.8, y, 8.8));
    part(aluminum, [0.14, 0.085, 0.025], [-0.8, y, 8.84]);
  }
  building.add(hinges);
  part(aluminum, [3.4, 0.04, 0.3], [0, 0.035, 8.9]);
  part(entryStone, [4.55, 0.045, 1.15], [0, -0.005, 8.3]);
  part(matting, [2.6, 0.025, 0.78], [0, 0.025, 8.28]);
  for (let i = 0; i < 14; i++) {
    part(panel, [2.47, 0.005, 0.012], [0, 0.04, 7.96 + i * 0.048]);
  }
  // A small green exit luminaire is a fixture, without a false interaction label.
  part(ink, [0.54, 0.23, 0.1], [0, 3.35, 8.77]);
  part(coolTrim, [0.44, 0.14, 0.015], [0, 3.35, 8.71]);
  part(porcelain, [0.06, 0.1, 0.02], [0.06, 3.35, 8.695]);
  part(porcelain, [0.1, 0.025, 0.02], [-0.08, 3.35, 8.695]);

  // Warm sconces establish scale across the long south wall. One shared, unshadowed wash.
  for (const x of [-5.85, 5.85]) {
    part(ink, [0.2, 0.72, 0.12], [x, 2.37, 8.72]);
    part(bronze, [0.12, 0.64, 0.14], [x, 2.37, 8.65]);
    part(warmGlow, [0.06, 0.54, 0.025], [x, 2.37, 8.566]);
  }
  const entranceWash = new THREE.PointLight(0xffe4bf, 24, 7.5, 1.8);
  entranceWash.name = 'entrance-wash';
  entranceWash.position.set(0, 5.05, 7.15);
  building.add(entranceWash);
  part(ink, [0.35, 0.06, 0.35], [0, 5.33, 7.15]);
  part(warmGlow, [0.24, 0.02, 0.24], [0, 5.29, 7.15]);

  // A few useful construction details, kept clear of stations and walking routes.
  for (const side of [-1, 1]) {
    const z = side === 1 ? 2.5 : -1.5;
    part(aluminum, [0.045, 0.48, 1.26], [side * 9.78, 3.35, z]);
    part(ink, [0.05, 0.36, 1.12], [side * 9.75, 3.35, z]);
    for (let i = 0; i < 7; i++) {
      part(panel, [0.06, 0.023, 1.08], [side * 9.71, 3.2 + i * 0.05, z]);
    }
  }
  part(aluminum, [1.52, 0.4, 0.045], [5.85, 3.57, 8.75]);
  part(ink, [1.38, 0.28, 0.055], [5.85, 3.57, 8.72]);
  for (let i = 0; i < 5; i++) {
    part(panel, [1.34, 0.018, 0.06], [5.85, 3.47 + i * 0.05, 8.68]);
  }
  part(aluminum, [0.035, 0.035, 9.5], [9.72, 4.37, 0.5]);
  part(aluminum, [0.035, 1.8, 0.035], [9.72, 3.48, 5.23]);
  part(ink, [0.09, 0.24, 0.2], [9.7, 2.49, 5.23]);
  part(aluminum, [0.025, 0.19, 0.15], [9.64, 2.49, 5.23]);
  part(bronze, [0.17, 0.28, 0.04], [2.14, 1.25, 8.76]);
  part(porcelain, [0.06, 0.13, 0.025], [2.14, 1.25, 8.725]);

  for (const [mat, { boxes, name, cast }] of batches) {
    const instances = new THREE.InstancedMesh(
      getBoxGeometry(1, 1, 1),
      mat,
      boxes.length
    );
    instances.name = name;
    instances.castShadow = cast;
    instances.receiveShadow =
      mat !== glass && mat !== warmGlow && mat !== coolTrim;
    for (const [i, { size, position }] of boxes.entries()) {
      matrix.makeScale(...size);
      matrix.setPosition(...position);
      instances.setMatrixAt(i, matrix);
    }
    instances.instanceMatrix.needsUpdate = true;
    building.add(instances);
  }

  // Continuous colliders include the closed entrance and north glass. Existing camera clamps
  // retain a generous margin inside these faces, including the protruding handle and threshold.
  collisions.push(
    { minX: -10.15, maxX: -9.62, minZ: -7.65, maxZ: 9.15 },
    { minX: 9.62, maxX: 10.15, minZ: -7.65, maxZ: 9.15 },
    { minX: -10.15, maxX: 10.15, minZ: -7.65, maxZ: -7.35 },
    { minX: -10.15, maxX: 10.15, minZ: 8.63, maxZ: 9.78 }
  );
}
