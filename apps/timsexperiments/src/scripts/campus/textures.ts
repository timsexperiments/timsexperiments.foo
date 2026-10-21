import * as THREE from 'three';

export type LabelTextureOptions = {
  text: string;
  width: number;
  height: number;
  background?: string;
  color?: string;
  size?: number;
  resolution?: number;
};

export function configureCrispTexture(
  texture: THREE.Texture,
  anisotropy = 8
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
  return texture;
}

export function createTextureRegistry(maxAnisotropy = 8) {
  const textures = new Set<THREE.Texture>();
  const labelMaterials = new Map<string, THREE.MeshBasicMaterial>();

  function track<T extends THREE.Texture>(texture: T, anisotropy = maxAnisotropy): T {
    configureCrispTexture(texture, anisotropy);
    textures.add(texture);
    return texture;
  }

  function getLabelMaterial(options: LabelTextureOptions): THREE.MeshBasicMaterial | null {
    const bg = options.background ?? '#111b18';
    const fg = options.color ?? '#FAFAFA';
    const canvasWidth = options.resolution ?? 1024;
    const canvasHeight = Math.max(
      64,
      Math.round((canvasWidth * options.height) / options.width)
    );
    const fontSize = options.size ?? Math.round(canvasHeight * 0.42);
    const key = `${canvasWidth}x${canvasHeight}|${bg}|${fg}|${fontSize}|${options.text}`;
    const existing = labelMaterials.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      options.text,
      canvas.width / 2,
      canvas.height / 2,
      Math.round(canvas.width * 0.92)
    );

    const texture = track(new THREE.CanvasTexture(canvas));
    const material = new THREE.MeshBasicMaterial({ map: texture });
    labelMaterials.set(key, material);
    return material;
  }

  function createWorkbenchScreenTexture(): THREE.CanvasTexture {
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1024;
    screenCanvas.height = 640;
    const ctx = screenCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#071411';
      ctx.fillRect(0, 0, 1024, 640);
      ctx.fillStyle = '#17b897';
      ctx.fillRect(0, 0, 1024, 9);
      ctx.font = '24px monospace';
      ctx.fillText('TIM\u2019S EXPERIMENTS   /   WORKBENCH', 42, 65);
      ctx.fillStyle = '#fafafa';
      ctx.font = 'bold 58px sans-serif';
      ctx.fillText('Ideas into systems.', 42, 164);
      ctx.font = '23px monospace';
      ctx.fillStyle = '#92f1de';
      ctx.fillText('SOFTWARE ENGINEERING / OPEN FOR COLLABORATION', 42, 213);
      const code = [
        'const experiment = {',
        '  curiosity: Infinity,',
        '  craft: "carefully considered",',
        '  status: "building"',
        '};',
      ];
      ctx.font = '27px monospace';
      code.forEach((line, i) => {
        ctx.fillStyle = i % 2 ? '#17b897' : '#d5e6df';
        ctx.fillText(line, 45, 305 + i * 49);
      });
      ctx.fillStyle = '#17b897';
      ctx.fillRect(750, 285, 210, 210);
      ctx.fillStyle = '#061c16';
      ctx.font = 'bold 100px monospace';
      ctx.fillText('{ }', 766, 419);
    }
    return track(new THREE.CanvasTexture(screenCanvas));
  }

  function createStarDotTexture(): THREE.CanvasTexture {
    const starDotCanvas = document.createElement('canvas');
    starDotCanvas.width = 64;
    starDotCanvas.height = 64;
    const starCtx = starDotCanvas.getContext('2d');
    if (starCtx) {
      const grad = starCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.32, 'rgba(232,252,248,0.85)');
      grad.addColorStop(0.7, 'rgba(165,225,255,0.22)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      starCtx.fillStyle = grad;
      starCtx.fillRect(0, 0, 64, 64);
    }
    return track(new THREE.CanvasTexture(starDotCanvas), 1);
  }

  function createMoonTexture(): THREE.CanvasTexture {
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 512;
    moonCanvas.height = 512;
    const mCtx = moonCanvas.getContext('2d');
    if (mCtx) {
      const baseGrad = mCtx.createRadialGradient(220, 210, 24, 256, 256, 256);
      baseGrad.addColorStop(0, '#ffffff');
      baseGrad.addColorStop(0.55, '#e8f7f3');
      baseGrad.addColorStop(0.88, '#bfd9d6');
      baseGrad.addColorStop(1, '#8fb2b0');
      mCtx.fillStyle = baseGrad;
      mCtx.fillRect(0, 0, 512, 512);
      const maria: [number, number, number, number][] = [
        [185, 175, 68, 0.16],
        [310, 215, 54, 0.14],
        [245, 300, 76, 0.12],
        [150, 290, 42, 0.11],
        [330, 320, 38, 0.1],
      ];
      for (const [cx, cy, r, alpha] of maria) {
        const g = mCtx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
        g.addColorStop(0, `rgba(78, 112, 116, ${alpha})`);
        g.addColorStop(1, 'rgba(78, 112, 116, 0)');
        mCtx.fillStyle = g;
        mCtx.beginPath();
        mCtx.arc(cx, cy, r, 0, Math.PI * 2);
        mCtx.fill();
      }
    }
    return track(new THREE.CanvasTexture(moonCanvas), 4);
  }

  function createHaloTexture(): THREE.CanvasTexture {
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 256;
    haloCanvas.height = 256;
    const hCtx = haloCanvas.getContext('2d');
    if (hCtx) {
      const hGrad = hCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
      hGrad.addColorStop(0, 'rgba(215, 246, 255, 0.72)');
      hGrad.addColorStop(0.26, 'rgba(155, 226, 242, 0.34)');
      hGrad.addColorStop(0.58, 'rgba(23, 184, 151, 0.11)');
      hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      hCtx.fillStyle = hGrad;
      hCtx.fillRect(0, 0, 256, 256);
    }
    return track(new THREE.CanvasTexture(haloCanvas), 1);
  }

  function dispose() {
    textures.forEach((texture) => texture.dispose());
    // Attached label materials belong to the controller's scene cleanup.
    textures.clear();
    labelMaterials.clear();
  }

  return {
    textures,
    track,
    getLabelMaterial,
    createWorkbenchScreenTexture,
    createStarDotTexture,
    createMoonTexture,
    createHaloTexture,
    dispose,
  };
}
