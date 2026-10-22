import * as THREE from 'three';
import logoGlbUrl from '../../assets/campus/tims-experiments-dark.glb?url';
import logoUrl from '../../assets/tim_s_experiments_logo_dark.svg?url';
import labLogoUrl from '../../assets/the_lab_logo_dark.svg?url';
import { createTextureRegistry } from './textures';
import type {
  CollisionBounds,
  StationId,
  StationView,
  WorldHandle,
} from './types';

export type { StationView } from './types';

export const views: Record<StationId, StationView> = {
  arrival: {
    position: new THREE.Vector3(0, 1.75, 7.6),
    target: new THREE.Vector3(0, 1.7, -3.5),
  },
  recipes: {
    position: new THREE.Vector3(-5.1, 1.7, -0.3),
    target: new THREE.Vector3(-6, 1.65, -4.7),
  },
  workbench: {
    position: new THREE.Vector3(-0.3, 1.7, -0.4),
    target: new THREE.Vector3(0, 1.85, -4.6),
  },
  robot: {
    position: new THREE.Vector3(3.4, 1.65, 2.4),
    target: new THREE.Vector3(3.4, 1.35, -0.5),
  },
  contact: {
    position: new THREE.Vector3(6.5, 1.7, -0.2),
    target: new THREE.Vector3(7.3, 1.65, -4.2),
  },
};

type ShadowFlags = {
  cast?: boolean;
  receive?: boolean;
};

export function buildWorld(
  scene: THREE.Scene,
  mobile: boolean,
  onInvalidate?: () => void,
  maxAnisotropy = 8
): WorldHandle {
  const targets: THREE.Object3D[] = [];
  const textureRegistry = createTextureRegistry(maxAnisotropy);
  const collisions: CollisionBounds[] = [];

  // Shared geometry and material caches eliminate redundant GPU buffer uploads.
  const boxGeometries = new Map<string, THREE.BoxGeometry>();
  const cylinderGeometries = new Map<string, THREE.CylinderGeometry>();
  const roundedGeometries = new Map<string, THREE.ExtrudeGeometry>();
  const planeGeometries = new Map<string, THREE.PlaneGeometry>();
  const standardMaterials = new Map<string, THREE.MeshStandardMaterial>();

  const mint = 0x17b897;
  const material = (
    color: THREE.ColorRepresentation,
    roughness = 0.6,
    metalness = 0
  ) => {
    const hex = new THREE.Color(color).getHexString();
    const key = `${hex}|${roughness}|${metalness}`;
    const cached = standardMaterials.get(key);
    if (cached) return cached;
    const created = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    standardMaterials.set(key, created);
    return created;
  };

  const ceramic = material(0xeef5f2, 0.36, 0.08);
  const plaster = material(0x141918, 0.76, 0.08);
  const deskCharcoal = material(0x1f2624, 0.34, 0.24);
  const fasciaCharcoal = material(0x101615, 0.38, 0.35);
  const ink = material(0x0b100f, 0.32, 0.52);
  const aluminum = material(0x7a8a84, 0.26, 0.78);
  const green = material(mint, 0.28, 0.28);
  const wood = material(0x28231e, 0.54, 0.08);
  const glow = new THREE.MeshStandardMaterial({
    color: mint,
    emissive: mint,
    emissiveIntensity: 1.45,
    roughness: 0.32,
  });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xfff3d6,
    emissive: 0xffe4b5,
    emissiveIntensity: 2.3,
  });
  const coolTrim = new THREE.MeshStandardMaterial({
    color: 0x92f1de,
    emissive: 0x17b897,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const emissiveMaterials = new Set<THREE.Material>([glow, warmGlow, coolTrim]);

  const q = (v: number) => Math.round(v * 1000) / 1000;

  function getBoxGeometry(w: number, h: number, d: number) {
    const key = `${q(w)}|${q(h)}|${q(d)}`;
    const existing = boxGeometries.get(key);
    if (existing) return existing;
    const created = new THREE.BoxGeometry(w, h, d);
    boxGeometries.set(key, created);
    return created;
  }

  function getPlaneGeometry(w: number, h: number) {
    const key = `${q(w)}|${q(h)}`;
    const existing = planeGeometries.get(key);
    if (existing) return existing;
    const created = new THREE.PlaneGeometry(w, h);
    planeGeometries.set(key, created);
    return created;
  }

  function getCylinderGeometry(r: number, bottom: number, h: number) {
    const segments = mobile ? 18 : 32;
    const key = `${q(r)}|${q(bottom)}|${q(h)}|${segments}`;
    const existing = cylinderGeometries.get(key);
    if (existing) return existing;
    const created = new THREE.CylinderGeometry(r, bottom, h, segments);
    cylinderGeometries.set(key, created);
    return created;
  }

  function getRoundedGeometry(w: number, h: number, d: number, radius: number) {
    const curveSegments = mobile ? 6 : 8;
    const key = `${q(w)}|${q(h)}|${q(d)}|${q(radius)}|${curveSegments}`;
    const existing = roundedGeometries.get(key);
    if (existing) return existing;
    const s = new THREE.Shape();
    const r = Math.min(radius, w / 2, h / 2);
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: d,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 2,
      steps: 1,
      curveSegments,
    });
    g.translate(0, 0, -d / 2);
    roundedGeometries.set(key, g);
    return g;
  }

  function mesh(
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
    shadows: ShadowFlags = {}
  ) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    const isEmissive = emissiveMaterials.has(mat);
    object.castShadow = isEmissive ? false : (shadows.cast ?? true);
    object.receiveShadow = isEmissive ? false : (shadows.receive ?? true);
    parent.add(object);
    return object;
  }

  function box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
    shadows?: ShadowFlags
  ) {
    return mesh(getBoxGeometry(w, h, d), mat, x, y, z, parent, shadows);
  }

  function rounded(
    w: number,
    h: number,
    d: number,
    radius: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
    shadows?: ShadowFlags
  ) {
    return mesh(
      getRoundedGeometry(w, h, d, radius),
      mat,
      x,
      y,
      z,
      parent,
      shadows
    );
  }

  function cylinder(
    r: number,
    bottom: number,
    h: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = scene,
    shadows?: ShadowFlags
  ) {
    return mesh(
      getCylinderGeometry(r, bottom, h),
      mat,
      x,
      y,
      z,
      parent,
      shadows
    );
  }

  function label(
    text: string,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    options: {
      background?: string;
      color?: string;
      size?: number;
      resolution?: number;
      parent?: THREE.Object3D;
    } = {}
  ) {
    const labelMat = textureRegistry.getLabelMaterial({
      text,
      width,
      height,
      background: options.background,
      color: options.color,
      size: options.size,
      resolution: options.resolution,
    });
    if (!labelMat) return null;
    return mesh(
      getPlaneGeometry(width, height),
      labelMat,
      x,
      y,
      z + 0.035,
      options.parent,
      { cast: false, receive: false }
    );
  }

  function interactive(object: THREE.Object3D, station: StationId) {
    object.userData.station = station;
    targets.push(object);
  }

  function stationSign(
    station: StationId,
    title: string,
    number: string,
    x: number,
    z: number
  ) {
    const g = new THREE.Group();
    scene.add(g);
    g.position.set(x, 0, z);
    rounded(2.65, 0.5, 0.06, 0.07, ink, 0, 2.95, 0, g, {
      cast: false,
      receive: true,
    });
    label(`${number}  /  ${title}`, 2.45, 0.32, 0, 2.95, 0.045, { parent: g });
    box(0.12, 0.12, 0.075, glow, -1.2, 2.95, 0.05, g, {
      cast: false,
      receive: false,
    });
    interactive(g, station);
  }

  const sharedFoliageGeo = new THREE.SphereGeometry(1, 10, 8);
  const soilMat = material(0x1f261c);
  const exteriorLeafMat = material(0x1f3d32, 0.78);
  const interiorLeafMat = material(0x265e48, 0.78);

  function plant(x: number, z: number, scale = 1, exterior = false) {
    const group = new THREE.Group();
    scene.add(group);
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    cylinder(
      0.38,
      0.27,
      0.58,
      exterior ? plaster : deskCharcoal,
      0,
      0.29,
      0,
      group,
      { cast: !exterior, receive: true }
    );
    cylinder(0.34, 0.34, 0.04, soilMat, 0, 0.59, 0, group, {
      cast: false,
      receive: false,
    });
    const leaf = exterior ? exteriorLeafMat : interiorLeafMat;
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.4;
      const stem = cylinder(
        0.018,
        0.022,
        0.8 + (i % 3) * 0.18,
        green,
        Math.cos(angle) * 0.12,
        0.95,
        Math.sin(angle) * 0.12,
        group,
        { cast: false, receive: false }
      );
      stem.rotation.z = Math.sin(angle) * 0.35;
      const foliage = mesh(
        sharedFoliageGeo,
        leaf,
        Math.cos(angle) * 0.32,
        1.3 + (i % 3) * 0.17,
        Math.sin(angle) * 0.32,
        group,
        { cast: false, receive: !exterior }
      );
      foliage.scale.set(0.12, 0.42, 0.22);
      foliage.rotation.set(0.35, angle, Math.sin(angle) * 0.7);
    }
  }

  // Night sky: layered starfield and luminous moon visible through glass and roof ribs.
  function buildNightSky() {
    const starTexture = textureRegistry.createStarDotTexture();

    const fineCount = mobile ? 420 : 760;
    const finePositions = new Float32Array(fineCount * 3);
    const fineColors = new Float32Array(fineCount * 3);
    const palette = [
      new THREE.Color(0xf4f9ff),
      new THREE.Color(0xc9f8ef),
      new THREE.Color(0xdbeaff),
      new THREE.Color(0xfff1d6),
      new THREE.Color(0x88ebd6),
    ];
    let seed = 4219;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < fineCount; i++) {
      const band = i % 5;
      let x = 0;
      let y = 0;
      let z = 0;
      if (band < 3) {
        x = (rand() - 0.5) * 92;
        y = 1.6 + rand() * 26;
        z = -29 - rand() * 44;
      } else if (band === 3) {
        x = (rand() - 0.5) * 64;
        y = 9 + rand() * 24;
        z = -28 + rand() * 42;
      } else {
        x = (rand() < 0.5 ? -1 : 1) * (24 + rand() * 32);
        y = 2 + rand() * 22;
        z = -30 + rand() * 40;
      }
      finePositions[i * 3] = x;
      finePositions[i * 3 + 1] = y;
      finePositions[i * 3 + 2] = z;
      const baseColor = palette[i % palette.length] ?? palette[0]!;
      const brightness = 0.68 + rand() * 0.32;
      fineColors[i * 3] = baseColor.r * brightness;
      fineColors[i * 3 + 1] = baseColor.g * brightness;
      fineColors[i * 3 + 2] = baseColor.b * brightness;
    }
    const fineGeometry = new THREE.BufferGeometry();
    fineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(finePositions, 3)
    );
    fineGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(fineColors, 3)
    );
    const fineMaterial = new THREE.PointsMaterial({
      size: mobile ? 0.42 : 0.36,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    scene.add(new THREE.Points(fineGeometry, fineMaterial));

    const heroCoords: [number, number, number][] = [
      [-18.5, 9.2, -36],
      [-14.2, 6.4, -33],
      [-11.4, 10.8, -38],
      [-8.6, 5.8, -34],
      [-6.2, 8.9, -35],
      [-4.1, 6.9, -33],
      [-1.8, 9.6, -36],
      [0.9, 7.8, -34],
      [3.1, 9.9, -37],
      [5.4, 5.7, -33],
      [6.8, 8.7, -35],
      [12.4, 9.4, -35],
      [14.8, 6.2, -33],
      [17.6, 8.5, -36],
      [-9.5, 13.5, -40],
      [-2.4, 12.8, -39],
      [4.7, 12.4, -38],
      [11.2, 12.9, -40],
      [-15.8, 4.3, -32],
      [-4.8, 4.5, -31],
      [2.4, 4.6, -31],
      [15.2, 4.4, -32],
    ];
    const heroPositions = new Float32Array(heroCoords.length * 3);
    const heroColors = new Float32Array(heroCoords.length * 3);
    heroCoords.forEach(([x, y, z], i) => {
      heroPositions[i * 3] = x;
      heroPositions[i * 3 + 1] = y;
      heroPositions[i * 3 + 2] = z;
      const c =
        i % 3 === 0 ? new THREE.Color(0xc9f8ef) : new THREE.Color(0xffffff);
      heroColors[i * 3] = c.r;
      heroColors[i * 3 + 1] = c.g;
      heroColors[i * 3 + 2] = c.b;
    });
    const heroGeometry = new THREE.BufferGeometry();
    heroGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(heroPositions, 3)
    );
    heroGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(heroColors, 3)
    );
    const heroMaterial = new THREE.PointsMaterial({
      size: mobile ? 0.88 : 0.78,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    scene.add(new THREE.Points(heroGeometry, heroMaterial));

    const moonX = 9.3;
    const moonY = 6.65;
    const moonZ = -32;
    const moonTexture = textureRegistry.createMoonTexture();
    const moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(1.52, 32, 24),
      new THREE.MeshBasicMaterial({
        map: moonTexture,
        fog: false,
      })
    );
    moonDisc.position.set(moonX, moonY, moonZ);
    moonDisc.rotation.y = -0.4;
    scene.add(moonDisc);

    const haloTexture = textureRegistry.createHaloTexture();
    const innerHalo = new THREE.Mesh(
      getPlaneGeometry(9.5, 9.5),
      new THREE.MeshBasicMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    innerHalo.position.set(moonX, moonY, moonZ - 0.35);
    innerHalo.lookAt(0, 1.75, 7.6);
    scene.add(innerHalo);

    const outerHalo = new THREE.Mesh(
      getPlaneGeometry(21, 16),
      new THREE.MeshBasicMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    outerHalo.position.set(moonX - 1.5, moonY - 0.4, moonZ - 1.2);
    outerHalo.lookAt(0, 1.75, 7.6);
    scene.add(outerHalo);
  }
  buildNightSky();

  // Keep the wall logo above the station signs in the first-person arrival view.
  const ceilingRise = 0.75;
  const logoHeight = 3.55 + ceilingRise;

  // Continuous architectural shell, instanced dark terrazzo tiles, and exposed roof ribs.
  box(21, 0.24, 19, material(0x090d0c, 0.85), 0, -0.16, 0, scene, {
    cast: false,
    receive: true,
  });

  const tileMat = material(0x181f1d, 0.34, 0.16);
  const tileGeo = getBoxGeometry(2.97, 0.025, 2.97);
  const tileGridX = [-9, -6, -3, 0, 3, 6, 9];
  const tileGridZ = [-6, -3, 0, 3, 6, 9];
  const tileInstances = new THREE.InstancedMesh(
    tileGeo,
    tileMat,
    tileGridX.length * tileGridZ.length
  );
  tileInstances.castShadow = false;
  tileInstances.receiveShadow = true;
  const tileMatrix = new THREE.Matrix4();
  let tileIdx = 0;
  for (const x of tileGridX) {
    for (const z of tileGridZ) {
      tileMatrix.makeTranslation(x, -0.025, z);
      tileInstances.setMatrixAt(tileIdx++, tileMatrix);
    }
  }
  tileInstances.instanceMatrix.needsUpdate = true;
  scene.add(tileInstances);

  box(20, 0.12, 0.12, ink, 0, 0.02, -7.4, scene, {
    cast: false,
    receive: true,
  });
  box(0.12, 0.035, 16, aluminum, -8.8, 0, 0.4, scene, {
    cast: false,
    receive: true,
  });
  box(0.12, 0.035, 16, aluminum, 8.8, 0, 0.4, scene, {
    cast: false,
    receive: true,
  });
  box(20, 0.9, 0.25, ink, 0, 4.65 + ceilingRise, -7.5, scene, {
    cast: true,
    receive: true,
  });
  box(
    0.3,
    4.7 + ceilingRise,
    17,
    plaster,
    -10,
    2.3 + ceilingRise / 2,
    0.5,
    scene,
    {
      cast: true,
      receive: true,
    }
  );
  box(
    0.3,
    4.7 + ceilingRise,
    17,
    plaster,
    10,
    2.3 + ceilingRise / 2,
    0.5,
    scene,
    {
      cast: true,
      receive: true,
    }
  );
  for (const x of [-9.4, -5, 0, 5, 9.4]) {
    box(
      0.14,
      4.5 + ceilingRise,
      0.18,
      aluminum,
      x,
      2.25 + ceilingRise / 2,
      -7.45,
      scene,
      {
        cast: true,
        receive: false,
      }
    );
    box(0.18, 0.24, 16.5, ink, x, 4.35 + ceilingRise, 0.3, scene, {
      cast: false,
      receive: false,
    });
    box(0.06, 0.025, 14, warmGlow, x, 4.2 + ceilingRise, 0.1);
  }
  for (const z of [-6.8, 0, 6.8]) {
    box(19.8, 0.22, 0.18, aluminum, 0, 4.4 + ceilingRise, z, scene, {
      cast: false,
      receive: false,
    });
  }

  // Non-shadow-casting architectural glass keeps moonlight and courtyard views crisp.
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8adcd0,
    transparent: true,
    opacity: 0.06,
    roughness: 0.08,
    metalness: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mesh(
    getPlaneGeometry(19.2, 4.1 + ceilingRise),
    glass,
    0,
    2.25 + ceilingRise / 2,
    -7.48,
    scene,
    {
      cast: false,
      receive: false,
    }
  );
  for (const x of [-9.8, 9.8]) {
    const pane = mesh(
      getPlaneGeometry(15, 4 + ceilingRise),
      glass,
      x,
      2.3 + ceilingRise / 2,
      0,
      scene,
      {
        cast: false,
        receive: false,
      }
    );
    pane.rotation.y = Math.PI / 2;
    for (const z of [-6, -2, 2, 6]) {
      box(
        0.15,
        4.5 + ceilingRise,
        0.13,
        aluminum,
        x,
        2.25 + ceilingRise / 2,
        z,
        scene,
        {
          cast: false,
          receive: false,
        }
      );
    }
  }

  // Moonlit campus courtyard visible through the north glass.
  box(100, 0.2, 100, material(0x0b1210, 0.92), 0, -0.35, -25, scene, {
    cast: false,
    receive: true,
  });
  box(26, 0.08, 3.3, material(0x151d1b, 0.7), 0, -0.18, -11, scene, {
    cast: false,
    receive: true,
  });
  box(19.4, 0.015, 0.08, coolTrim, 0, -0.12, -9.4);
  const treeCrownGeo = new THREE.IcosahedronGeometry(2.4, 1);
  const treeCrownMat = material(0x1a332a, 0.82);
  for (const x of [-12, -6.8, 1.6, 11.8, 18]) {
    plant(x, -13 - Math.abs(x % 3), 2, true);
    cylinder(0.14, 0.22, 4.5, wood, x, 2, -19, scene, {
      cast: false,
      receive: false,
    });
    const crown = mesh(treeCrownGeo, treeCrownMat, x, 5, -19, scene, {
      cast: false,
      receive: false,
    });
    crown.scale.y = 1.3;
  }
  const nightWindow = new THREE.MeshStandardMaterial({
    color: 0x1a4a3f,
    emissive: 0x17b897,
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.45,
  });
  for (const x of [-16, 16]) {
    box(7, 5, 12, material(0x111817, 0.75), x, 2, -25, scene, {
      cast: false,
      receive: false,
    });
    box(7.1, 0.2, 12.1, ink, x, 4.6, -25, scene, {
      cast: false,
      receive: false,
    });
    for (let i = 0; i < 5; i++) {
      box(0.9, 2.5, 0.07, nightWindow, x - 2.5 + i * 1.25, 2.6, -18.94, scene, {
        cast: false,
        receive: false,
      });
    }
  }

  // Back-wall fascia with canonical dark logo fallback and lazy-loaded extruded 3D GLB.
  rounded(5.26, 1.06, 0.1, 0.11, green, 0, logoHeight, -7.17, scene, {
    cast: false,
    receive: true,
  });
  rounded(5.2, 1, 0.12, 0.1, fasciaCharcoal, 0, logoHeight, -7.15, scene, {
    cast: true,
    receive: true,
  });
  let alive = true;
  let fallbackLogoMesh: THREE.Mesh | null = null;
  let extrudedLogoLoaded = false;
  const logoImage = new Image();
  logoImage.onload = () => {
    if (!alive || extrudedLogoLoaded) return;
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 1512;
    logoCanvas.height = 252;
    const context = logoCanvas.getContext('2d');
    if (!context) return;
    context.drawImage(logoImage, 0, 0, 1512, 252);
    const texture = textureRegistry.track(new THREE.CanvasTexture(logoCanvas));
    fallbackLogoMesh = mesh(
      // The replaceable fallback owns this geometry; never dispose a cache entry.
      new THREE.PlaneGeometry(4.5, 0.75),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
      0,
      logoHeight,
      -7.03,
      scene,
      { cast: false, receive: false }
    );
    onInvalidate?.();
  };
  logoImage.src = logoUrl;

  void import('three/examples/jsm/loaders/GLTFLoader.js')
    .then(({ GLTFLoader }) => {
      if (!alive) return;
      const loader = new GLTFLoader();
      loader.load(
        logoGlbUrl,
        (gltf) => {
          const root = gltf.scene;
          if (!alive) {
            // Never attached: the callback owns cleanup, deduplicating shared GLB resources.
            const geometries = new Set<THREE.BufferGeometry>();
            const materials = new Set<THREE.Material>();
            root.traverse((node) => {
              if (node instanceof THREE.Mesh) {
                geometries.add(node.geometry);
                if (Array.isArray(node.material))
                  node.material.forEach((mat) => materials.add(mat));
                else materials.add(node.material);
              }
            });
            geometries.forEach((geometry) => geometry.dispose());
            materials.forEach((mat) => mat.dispose());
            return;
          }
          extrudedLogoLoaded = true;
          root.position.set(0, logoHeight, -7.03);
          root.scale.setScalar(0.75);
          root.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              const configureMat = (mat: THREE.Material) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.emissive.copy(mat.color);
                  mat.emissiveIntensity = 0.34;
                  mat.roughness = 0.42;
                }
              };
              if (Array.isArray(node.material))
                node.material.forEach(configureMat);
              else if (node.material) configureMat(node.material);
            }
          });
          if (fallbackLogoMesh) {
            scene.remove(fallbackLogoMesh);
            fallbackLogoMesh.geometry.dispose();
            if (Array.isArray(fallbackLogoMesh.material))
              fallbackLogoMesh.material.forEach((m) => m.dispose());
            else fallbackLogoMesh.material.dispose();
            fallbackLogoMesh = null;
          }
          scene.add(root);
          onInvalidate?.();
        },
        undefined,
        () => {
          /* SVG fallback remains visible if the GLB asset cannot be fetched. */
        }
      );
    })
    .catch(() => {
      /* SVG fallback remains visible if GLTFLoader import fails. */
    });

  // Recipe library: illuminated dark walnut shelves, actual covers and paper blocks.
  const library = new THREE.Group();
  library.position.set(-6, 0, -5.4);
  scene.add(library);
  interactive(library, 'recipes');
  rounded(4.3, 2.8, 0.28, 0.15, ink, 0, 1.4, 0, library, {
    cast: true,
    receive: true,
  });
  box(3.95, 2.45, 0.06, wood, 0, 1.43, 0.18, library, {
    cast: false,
    receive: true,
  });
  for (const y of [0.24, 1.15, 2.1, 2.68]) {
    box(4.2, 0.1, 0.85, wood, 0, y, 0.45, library, {
      cast: true,
      receive: true,
    });
    box(3.95, 0.035, 0.04, warmGlow, 0, y - 0.07, 0.78, library);
  }
  const covers = [
    0x17b897, 0xdd9e79, 0xc8d0e7, 0xf1c866, 0x719b93, 0xe7dfcc, 0x6c81a0,
  ];
  const titles = [
    'TYPESCRIPT',
    'WORKERS',
    'SYSTEMS',
    'BUILD / SHIP',
    'PATTERNS',
    'WEB APIs',
    'FIELD NOTES',
  ];
  const pageBlock = material(0xdce5df, 0.75);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const bookIndex = (i + row * 3) % covers.length;
      const color = covers[bookIndex] ?? mint;
      const height = 0.62 + (i % 3) * 0.06;
      const b = new THREE.Group();
      b.position.set(-1.78 + i * 0.32, 0.31 + row * 0.94 + height / 2, 0.53);
      library.add(b);
      if (i === 3 || i === 9) b.rotation.z = -0.08;
      const coverMat = material(color);
      box(0.265, height, 0.46, coverMat, 0, 0, 0, b, {
        cast: false,
        receive: true,
      });
      box(0.22, height - 0.05, 0.435, pageBlock, 0, 0, -0.01, b, {
        cast: false,
        receive: false,
      });
      box(0.265, height, 0.055, coverMat, 0, 0, 0.24, b, {
        cast: false,
        receive: true,
      });
      const spine = label(
        titles[bookIndex] ?? 'RECIPES',
        0.5,
        0.12,
        0,
        0,
        0.271,
        {
          background: `#${new THREE.Color(color).getHexString()}`,
          color: '#10261f',
          resolution: 512,
          parent: b,
        }
      );
      if (spine) spine.rotation.z = Math.PI / 2;
      box(0.16, 0.018, 0.015, ink, 0, -height / 2 + 0.1, 0.28, b, {
        cast: false,
        receive: false,
      });
    }
  }
  stationSign('recipes', 'RECIPE LIBRARY', '01', -6, -4.9);
  collisions.push({ minX: -8.4, maxX: -3.6, minZ: -6.1, maxZ: -4.15 });

  // Main bench with suspended monitors and a small physical compute rack.
  const bench = new THREE.Group();
  scene.add(bench);
  bench.position.set(-0.6, 0, -4.3);
  interactive(bench, 'workbench');
  rounded(4.6, 0.22, 1.75, 0.1, deskCharcoal, 0, 1.04, 0, bench, {
    cast: true,
    receive: true,
  });
  rounded(4.35, 0.12, 1.55, 0.05, green, 0, 0.87, 0, bench, {
    cast: false,
    receive: true,
  });
  for (const x of [-1.75, 1.75]) {
    box(0.16, 0.85, 1.2, ink, x, 0.43, 0, bench, {
      cast: true,
      receive: true,
    });
    box(0.6, 0.07, 1.4, aluminum, x, 0.05, 0, bench, {
      cast: false,
      receive: true,
    });
  }
  const screenTexture = textureRegistry.createWorkbenchScreenTexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
  for (const x of [-1.05, 1.05]) {
    cylinder(0.06, 0.06, 0.65, aluminum, x, 1.4, -0.38, bench, {
      cast: false,
      receive: true,
    });
    rounded(1.96, 1.25, 0.12, 0.07, ink, x, 1.95, -0.36, bench, {
      cast: true,
      receive: true,
    });
    mesh(getPlaneGeometry(1.81, 1.1), screenMat, x, 1.95, -0.25, bench, {
      cast: false,
      receive: false,
    });
  }
  const keyboard = rounded(
    1.4,
    0.045,
    0.5,
    0.02,
    ink,
    -0.35,
    1.19,
    0.43,
    bench,
    { cast: false, receive: true }
  );
  keyboard.rotation.x = 0.04;

  const keyGeo = getBoxGeometry(0.075, 0.015, 0.065);
  const keyInstances = new THREE.InstancedMesh(keyGeo, aluminum, 4 * 13);
  keyInstances.castShadow = false;
  keyInstances.receiveShadow = false;
  const keyMatrix = new THREE.Matrix4();
  let keyIdx = 0;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 13; i++) {
      keyMatrix.makeTranslation(-0.92 + i * 0.095, 1.225, 0.27 + row * 0.09);
      keyInstances.setMatrixAt(keyIdx++, keyMatrix);
    }
  }
  keyInstances.instanceMatrix.needsUpdate = true;
  bench.add(keyInstances);

  cylinder(0.14, 0.12, 0.22, green, 1.7, 1.27, 0.5, bench, {
    cast: false,
    receive: true,
  });
  stationSign('workbench', 'THE WORKBENCH', '02', -0.6, -5.2);
  collisions.push({ minX: -3.2, maxX: 2, minZ: -5.5, maxZ: -3 });

  // Friendly small host: floating head, mint enamel shell, expressive optical face.
  const robot = new THREE.Group();
  scene.add(robot);
  robot.position.set(3.4, 0, -0.8);
  interactive(robot, 'robot');
  cylinder(0.9, 1, 0.13, ink, 0, 0.07, 0, robot, {
    cast: true,
    receive: true,
  });
  cylinder(0.87, 0.87, 0.025, glow, 0, 0.15, 0, robot);
  cylinder(0.3, 0.45, 0.35, aluminum, 0, 0.42, 0, robot, {
    cast: true,
    receive: true,
  });
  rounded(0.85, 0.76, 0.6, 0.2, green, 0, 0.88, 0, robot, {
    cast: true,
    receive: true,
  });
  rounded(0.56, 0.3, 0.035, 0.08, ceramic, 0, 0.9, 0.33, robot, {
    cast: false,
    receive: true,
  });
  label('HELLO, HUMAN', 0.46, 0.12, 0, 0.92, 0.356, {
    background: '#eef5f2',
    color: '#0e6d5a',
    parent: robot,
  });
  const head = new THREE.Group();
  head.position.y = 1.58;
  robot.add(head);
  rounded(1.18, 0.76, 0.73, 0.21, ceramic, 0, 0, 0, head, {
    // The head animates; only the stationary body/base belong in the frozen bake.
    cast: false,
    receive: true,
  });
  rounded(0.99, 0.48, 0.06, 0.17, ink, 0, 0.01, 0.4, head, {
    cast: false,
    receive: true,
  });
  for (const x of [-0.23, 0.23]) {
    rounded(0.13, 0.2, 0.035, 0.06, glow, x, 0.045, 0.445, head);
  }
  const smile = mesh(
    new THREE.TorusGeometry(0.11, 0.015, 6, 20, Math.PI),
    glow,
    0,
    -0.055,
    0.45,
    head
  );
  smile.rotation.z = Math.PI;
  cylinder(0.025, 0.025, 0.24, aluminum, 0.34, 0.49, 0, head, {
    cast: false,
    receive: false,
  });
  mesh(new THREE.SphereGeometry(0.065, 12, 8), glow, 0.34, 0.63, 0, head);
  const handGeo = new THREE.SphereGeometry(0.12, 12, 8);
  for (const side of [-1, 1]) {
    const arm = rounded(
      0.18,
      0.55,
      0.2,
      0.08,
      ceramic,
      side * 0.59,
      1.0,
      0,
      robot,
      { cast: true, receive: true }
    );
    arm.rotation.z = side * 0.24;
    mesh(handGeo, ink, side * 0.66, 0.72, 0, robot, {
      cast: false,
      receive: true,
    });
  }
  label('03 / MEET YOUR HOST', 2, 0.26, 3.4, 0.3, 0.22, {
    background: '#111b18',
  });
  collisions.push({ minX: 2.25, maxX: 4.55, minZ: -1.9, maxZ: 0.35 });

  // Correspondence desk, angled letter and a real mail-slot silhouette.
  const post = new THREE.Group();
  scene.add(post);
  post.position.set(6.5, 0, -4.2);
  interactive(post, 'contact');
  rounded(3.2, 0.18, 1.5, 0.09, deskCharcoal, 0, 1.03, 0, post, {
    cast: true,
    receive: true,
  });
  rounded(3.02, 0.08, 1.34, 0.05, wood, 0, 0.91, 0, post, {
    cast: false,
    receive: true,
  });
  for (const x of [-1.2, 1.2]) {
    box(0.1, 1, 1.15, ink, x, 0.5, 0, post, {
      cast: true,
      receive: true,
    });
  }
  rounded(1, 1.13, 0.65, 0.15, green, 0.8, 1.65, -0.23, post, {
    cast: true,
    receive: true,
  });
  rounded(0.78, 0.11, 0.05, 0.035, ink, 0.8, 1.69, 0.12, post, {
    cast: false,
    receive: true,
  });
  label('POST / TIM', 0.75, 0.18, 0.8, 1.98, 0.115, {
    background: '#17b897',
    color: '#061c16',
    parent: post,
  });
  rounded(0.85, 0.43, 0.025, 0.03, ceramic, 0.8, 1.38, 0.12, post, {
    cast: false,
    receive: true,
  });
  label('LET\u2019S MAKE SOMETHING.', 0.74, 0.1, 0.8, 1.4, 0.14, {
    background: '#eef5f2',
    color: '#10221d',
    parent: post,
  });
  const paper = box(0.86, 0.018, 1.05, ceramic, -0.65, 1.14, 0.1, post, {
    cast: false,
    receive: true,
  });
  paper.rotation.y = -0.15;
  for (let i = 0; i < 7; i++) {
    box(
      i === 0 ? 0.28 : 0.6,
      0.003,
      0.012,
      i === 0 ? green : aluminum,
      -0.66,
      1.154,
      -0.22 + i * 0.09,
      post,
      { cast: false, receive: false }
    );
  }
  const pen = cylinder(0.018, 0.018, 0.6, ink, -0.05, 1.17, 0.25, post, {
    cast: false,
    receive: false,
  });
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.3;
  stationSign('contact', 'CORRESPONDENCE', '04', 6.5, -5.2);
  collisions.push({ minX: 4.6, maxX: 8.4, minZ: -5.3, maxZ: -3.1 });

  plant(-9, -3, 1.25);
  plant(9, -6, 1.4);
  plant(9, 4, 1.2);
  plant(-9, 5, 1.1);

  // Ceiling pendants are structural fixtures rather than floating light strips.
  const pendantRingGeo = new THREE.TorusGeometry(
    1.1,
    0.055,
    8,
    mobile ? 36 : 64
  );
  const pendantDiffuserGeo = new THREE.TorusGeometry(
    1.09,
    0.028,
    6,
    mobile ? 36 : 64
  );
  for (const x of [-6, 0, 6]) {
    cylinder(0.018, 0.018, 0.7, ink, x, 3.9 + ceilingRise, -3, scene, {
      cast: false,
      receive: false,
    });
    const ring = mesh(
      pendantRingGeo,
      aluminum,
      x,
      3.55 + ceilingRise,
      -3,
      scene,
      {
        cast: false,
        receive: false,
      }
    );
    ring.rotation.x = Math.PI / 2;
    const diffuser = mesh(
      pendantDiffuserGeo,
      warmGlow,
      x,
      3.51 + ceilingRise,
      -3
    );
    diffuser.rotation.x = Math.PI / 2;
  }

  // A restrained mint guide line leads into the room.
  box(0.04, 0.007, 5.8, glow, 0, 0.007, 4.8);
  for (const x of [-2.3, 2.3]) {
    box(0.025, 0.008, 2.4, aluminum, x, 0.008, 6.2, scene, {
      cast: false,
      receive: true,
    });
  }
  // Use Tim's original artwork rather than a typeset substitute on the shelf sign.
  const labLogoImage = new Image();
  labLogoImage.onload = () => {
    if (!alive) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1476;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#111b18';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(labLogoImage, 67, 50, 1342, 284);
    const texture = textureRegistry.track(new THREE.CanvasTexture(canvas));
    mesh(
      getPlaneGeometry(3.3, 0.86),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
      }),
      -6.2,
      4.05,
      -7.245,
      scene,
      { cast: false, receive: false }
    );
    onInvalidate?.();
  };
  labLogoImage.src = labLogoUrl;

  return {
    targets,
    collisions,
    update(time: number, reduced: boolean) {
      if (!reduced) {
        head.position.y = 1.58 + Math.sin(time * 1.4) * 0.035;
        head.rotation.y = Math.sin(time * 0.5) * 0.08;
      }
    },
    dispose() {
      alive = false;
      logoImage.onload = null;
      labLogoImage.onload = null;
      textureRegistry.dispose();
      // Attached geometries/materials and instance buffers belong to the controller.
    },
  };
}
