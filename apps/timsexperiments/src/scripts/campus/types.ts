import type * as THREE from 'three';

export type StationId =
  | 'arrival'
  | 'recipes'
  | 'workbench'
  | 'robot'
  | 'contact';

export type StationView = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

export type CollisionBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type CampusCallbacks = {
  onStation: (station: StationId) => void;
  onReady: () => void;
  onError: (message: string) => void;
};

export type CampusOptions = {
  controlsRoot?: ParentNode;
  walkPad?: HTMLElement | null;
  walkPadToggle?: HTMLButtonElement | null;
};

export type CampusController = {
  navigate: (station: StationId) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export type RenderQualityInput = {
  width: number;
  height: number;
  devicePixelRatio: number;
  coarsePointer?: boolean;
};

export type RenderQualityProfile = {
  compact: boolean;
  pixelRatio: number;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  totalPixels: number;
  fov: number;
  antialias: boolean;
  shadowMapSize: number;
  maxAnisotropy: number;
};

export type WorldHandle = {
  targets: THREE.Object3D[];
  collisions: CollisionBounds[];
  update: (time: number, reduced: boolean) => void;
  dispose: () => void;
};
