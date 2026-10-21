/** Deterministic SVG-authoritative geometry. Run from any working directory. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import clipping from 'polygon-clipping';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.join(root, 'assets/campus/logo');
const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
};
const generatorVersion='1.0.0';
const config = { curveSegments: 16, steps: 1, depth: 2.4, bevelEnabled: true,
  bevelThickness: 0.08, bevelSize: 0.08, bevelOffset: -0.08, bevelSegments: 2 };
const scale = 6 / 252;
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
await fs.mkdir(out, { recursive: true });

function flatten(path) {
  const points=[];
  for(const curve of path.curves) {
    const walk=(t0,t1,a,b,depth=0)=>{
      const chord=b.clone().sub(a), len=chord.lengthSq();
      const error=[.25,.5,.75].reduce((m,f)=>{
        const p=curve.getPoint(t0+(t1-t0)*f);
        const u=len?Math.max(0,Math.min(1,p.clone().sub(a).dot(chord)/len)):0;
        return Math.max(m,p.distanceTo(a.clone().addScaledVector(chord,u)));
      },0);
      if(error>.002 && depth<16) {const tm=(t0+t1)/2, mid=curve.getPoint(tm);walk(t0,tm,a,mid,depth+1);walk(tm,t1,mid,b,depth+1);}
      else {if(!points.length||points.at(-1).distanceToSquared(a)>1e-14)points.push(a);points.push(b);}
    };
    walk(0,1,curve.getPoint(0),curve.getPoint(1));
  }
  return points.filter((p,i)=>i===0||p.distanceToSquared(points[i-1])>1e-14);
}
function flattenShape(shape) {
  const result=new THREE.Shape(flatten(shape));
  result.holes=shape.holes.map(h=>new THREE.Path(flatten(h)));
  return result;
}

function strokeShapes(svgPath) {
  // Expand SVG's actual stroke style, including implicit miter joins and round caps.
  // Union the triangle coverage before extrusion so branch intersections have no interior walls.
  const polygons = [];
  for (const sub of svgPath.subPaths) {
    const g = SVGLoader.pointsToStroke(flatten(sub), svgPath.userData.style, 24, 0.0001);
    if (!g) continue;
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) {
      const p = [[a[i], a[i + 1]], [a[i + 3], a[i + 4]], [a[i + 6], a[i + 7]]].map(v=>v.map(n=>Math.round(n*1000000)/1000000));
      // Float32 stroke triangles can leave microscopic seams at shared cap edges.
      // Expand by 0.00001 SVG unit before union, well below the 0.002 curve tolerance.
      const center=p.reduce((a,v)=>[a[0]+v[0]/3,a[1]+v[1]/3],[0,0]);
      for(const v of p){const dx=v[0]-center[0],dy=v[1]-center[1],len=Math.hypot(dx,dy);if(len){v[0]+=dx/len*.00001;v[1]+=dy/len*.00001;}}
      const area = (p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
      if (Math.abs(area) > 1e-10) polygons.push([[...p, p[0]]]);
    }
    g.dispose();
  }
  const ringArea=r=>Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
  const union = clipping.union(...polygons).filter(rings=>ringArea(rings[0])>0.0001).map(rings=>rings.filter((r,i)=>i===0||ringArea(r)>0.0001));
  const cleanRing=ring=>{
    let points=ring.slice(0,-1),changed=true;
    while(changed&&points.length>3){changed=false;for(let i=0;i<points.length;i++){
      const a=new THREE.Vector2(...points[(i+points.length-1)%points.length]),b=new THREE.Vector2(...points[i]),c=new THREE.Vector2(...points[(i+1)%points.length]);
      const line=c.clone().sub(a),len=line.lengthSq(),u=len?b.clone().sub(a).dot(line)/len:0;
      if(u>=0&&u<=1&&b.distanceTo(a.addScaledVector(line,u))<.00005){points.splice(i,1);changed=true;break;}
    }}
    return [...points,points[0]];
  };
  return union.map(rawRings => {
    const rings=rawRings.map(cleanRing);
    const shape = new THREE.Shape(rings[0].slice(0, -1).map(p => new THREE.Vector2(...p)));
    shape.holes = rings.slice(1).map(r => new THREE.Path(r.slice(0, -1).map(p => new THREE.Vector2(...p))));
    return shape;
  });
}

function render(scene, { width = 1512, height = 360, perspective = false, mask = false, background = '#FAFAFA' } = {}) {
  // CPU triangle rasterizer: images are projections of the exported mesh, never SVG mockups.
  const png = new PNG({width, height});
  const bg = new THREE.Color(background);
  const bgHex = bg.getHex();
  for (let p = 0; p < width * height; p++) {
    png.data.set([(bgHex>>16)&255, (bgHex>>8)&255, bgHex&255, mask ? 0 : 255], p*4);
  }
  const zbuf = new Float64Array(width * height).fill(-Infinity);
  const rotation = new THREE.Matrix4().makeRotationY(-0.24).premultiply(new THREE.Matrix4().makeRotationX(0.34));
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(rotation);
  const px = mask ? width / 6 : width / 6.7;
  const light = new THREE.Vector3(-0.35, 0.65, 1).normalize();
  const srgb = v => Math.round(255 * (v <= 0.0031308 ? 12.92*v : 1.055 * Math.pow(v, 1/2.4) - 0.055));
  const tri = [], norms = [];
  scene.updateMatrixWorld(true);
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry, pos = g.attributes.position, normal = g.attributes.normal;
    const count = g.index ? g.index.count : pos.count;
    for (let t = 0; t < count; t += 3) {
      for (let k = 0; k < 3; k++) {
        const i = g.index ? g.index.getX(t+k) : t+k;
        const p = new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
        const n = new THREE.Vector3().fromBufferAttribute(normal,i).transformDirection(mesh.matrixWorld);
        if (perspective) { p.applyMatrix4(rotation); n.applyMatrix3(normalMatrix).normalize(); }
        const distance = perspective ? 12 / (12 - p.z) : 1;
        tri[k] = [width/2 + p.x*px*distance, height/2 - p.y*px*distance, p.z];
        norms[k] = n;
      }
      const [a,b,c] = tri;
      const denom = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if (Math.abs(denom)<1e-10) continue;
      const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))), maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
      const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))), maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      for (let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
        const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/denom;
        const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/denom, w=1-u-v;
        if(u < -1e-8 || v < -1e-8 || w < -1e-8) continue;
        const z=u*a[2]+v*b[2]+w*c[2], index=y*width+x;
        if(z < zbuf[index]) continue;
        zbuf[index]=z;
        const n=norms[0].clone().multiplyScalar(u).addScaledVector(norms[1],v).addScaledVector(norms[2],w).normalize();
        const intensity=mask?1:.48+.52*Math.max(0,n.dot(light));
        const color=mesh.material.color;
        png.data.set(mask?[255,255,255,255]:[srgb(color.r*intensity),srgb(color.g*intensity),srgb(color.b*intensity),255],index*4);
      }
    }
  });
  return png;
}

const report = { generatorVersion, tooling: {'three':'0.165.0','jsdom':'26.1.0','polygon-clipping':'0.15.7','@resvg/resvg-js':'2.6.2','pngjs':'7.0.0'},
  tolerances:{curveChordSvgUnits:0.002,strokeQuantizationSvgUnits:0.000001,strokeTriangleExpansionSvgUnits:0.00001,strokeContourCleanupSvgUnits:0.00005},
  licensing:'Brand geometry derives solely from repository SVGs; original brand ownership and permissions apply. No third-party font or model assets. Tool licenses are listed in tools/campus/logo/README.md.',
  format: 'glTF 2.0 binary', threeVersion: THREE.REVISION, config,
  coordinates: 'Y up, +Z front; SVG viewBox centered at origin; viewBox width 6 units, height 1 unit; body centered in Z; path index * 0.00001 unit front offset preserves SVG paint order',
  previewRenderer: 'Local CPU z-buffer triangle rasterizer; perspective image has perspective projection and diffuse lighting, no shadows or antialiasing', variants: {} };
for (const variant of ['light','dark']) {
  const source = `apps/timsexperiments/src/assets/tim_s_experiments_logo${variant==='dark'?'_dark':''}.svg`;
  const svg = await fs.readFile(path.join(root, source), 'utf8');
  const data = new SVGLoader().parse(svg);
  const scene = new THREE.Scene();
  scene.name = `TimsExperimentsLogo_${variant}`;
  const materials = new Map(), paths = [];
  let triangles=0, vertices=0, holes=0;
  for (let i=0;i<data.paths.length;i++) {
    const p=data.paths[i], style=p.userData.style;
    const stroke=style.fill==='none';
    const hex=stroke?style.stroke:style.fill;
    if (!hex || hex==='none') throw new Error(`Unpainted source path ${i}`);
    if(!materials.has(hex)) materials.set(hex,new THREE.MeshStandardMaterial({name:`brand_${hex.slice(1)}`,color:hex,roughness:.65,metalness:0}));
    const shapes=stroke?strokeShapes(p):SVGLoader.createShapes(p).map(flattenShape);
    holes+=shapes.reduce((n,s)=>n+s.holes.length,0);
    const raw = new THREE.ExtrudeGeometry(shapes,config);
    // Reverse SVG Y into world Y. A half-turn around X also puts source front toward +Z.
    raw.translate(-126,-21,-config.depth/2);
    raw.rotateX(Math.PI);
    raw.scale(scale,scale,scale);
    raw.deleteAttribute('uv'); raw.clearGroups(); raw.normalizeNormals();
    const geometry=mergeVertices(raw,1e-6); raw.dispose();
    const mesh=new THREE.Mesh(geometry,materials.get(hex));
    mesh.name=`svg_path_${i}_${stroke?'stroke':'fill'}`;
    mesh.userData={sourcePathIndex:i,sourcePaint:hex,paintKind:stroke?'stroke':'fill'};
    mesh.position.z=i*0.00001;
    scene.add(mesh);
    const tris=geometry.index.count/3;
    triangles+=tris; vertices+=geometry.attributes.position.count;
    paths.push({index:i,paint:hex,kind:stroke?'stroke':'fill',shapes:shapes.length,holes:shapes.reduce((n,s)=>n+s.holes.length,0),triangles:tris});
  }
  const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
  const filename=`tims-experiments-${variant}.glb`;
  await fs.writeFile(path.join(out,filename),Buffer.from(buffer));
  // Parse the actual output through r165's loader, and render that round-tripped scene.
  const loaded=await new GLTFLoader().parseAsync(buffer,'');
  let loadedMeshes=0,loadedTriangles=0;
  loaded.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;loadedMeshes++;
    const g=mesh.geometry;
    for(const attribute of Object.values(g.attributes))for(const n of attribute.array)if(!Number.isFinite(n))throw new Error('Non-finite geometry');
    for(const index of g.index.array)if(index>=g.attributes.position.count)throw new Error('Invalid geometry index');
    loadedTriangles+=g.index.count/3;
  });
  if(loadedMeshes!==9||loadedTriangles!==triangles)throw new Error('GLB roundtrip resource mismatch');
  const background=variant==='light'?'#FAFAFA':'#0A0B0A';
  await fs.writeFile(path.join(out,`${variant}-front.png`),PNG.sync.write(render(loaded.scene,{background})));
  await fs.writeFile(path.join(out,`${variant}-perspective.png`),PNG.sync.write(render(loaded.scene,{background,perspective:true})));
  const reference=new Resvg(svg,{fitTo:{mode:'width',value:1512}}).render();
  const ref=PNG.sync.read(reference.asPng());
  const mask=render(loaded.scene,{width:1512,height:252,mask:true});
  let intersection=0,union=0,referencePixels=0,meshPixels=0;
  const diff=new PNG({width:1512,height:252});
  for(let p=0;p<1512*252;p++) {
    const a=ref.data[p*4+3]>=128,b=mask.data[p*4+3]>=128;
    referencePixels+=+a;meshPixels+=+b;intersection+=+(a&&b);union+=+(a||b);
    diff.data.set(a&&b?[23,184,151,255]:a?[240,80,80,255]:b?[80,120,255,255]:[0,0,0,0],p*4);
  }
  const silhouetteIoU=intersection/union;
  console.log(variant, 'silhouette IoU',silhouetteIoU);
  if(silhouetteIoU<.99)throw new Error('6x silhouette mismatch');
  await fs.writeFile(path.join(out,`${variant}-silhouette-diff.png`),PNG.sync.write(diff));
  await fs.writeFile(path.join(out,`${variant}-source.png`),reference.asPng());
  const hiRef=PNG.sync.read(new Resvg(svg,{fitTo:{mode:'width',value:6048}}).render().asPng());
  const hiMask=render(loaded.scene,{width:6048,height:1008,mask:true});
  let hiIntersection=0,hiUnion=0;
  for(let p=0;p<6048*1008;p++){const a=hiRef.data[p*4+3]>=128,b=hiMask.data[p*4+3]>=128;hiIntersection+=+(a&&b);hiUnion+=+(a||b);}
  const hiIoU=hiIntersection/hiUnion;
  if(hiIoU<.995)throw new Error(`24x silhouette mismatch: ${hiIoU}`);
  const jsonLen=new DataView(buffer).getUint32(12,true);
  const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLen)));
  const paints=[...materials.keys()];
  const materialChecks=gltf.materials.map((m,i)=>{
    const c=new THREE.Color(paints[i]);
    const expected=[c.r,c.g,c.b,1];
    const actual=m.pbrMetallicRoughness.baseColorFactor;
    if(!actual.every((v,k)=>Math.abs(v-expected[k])<1e-12))throw new Error('Material color mismatch');
    return {name:m.name,sRGB:paints[i],linearBaseColorFactor:actual,pass:true};
  });
  report.variants[variant]={source,sourceSha256:sha(svg),file:filename,sha256:sha(Buffer.from(buffer)),bytes:buffer.byteLength,
    validation:{threeR165RoundTrip:true,finiteAttributes:true,validIndices:true,resourceCountsMatch:true},paths,meshes:scene.children.length,materials:materials.size,vertices,triangles,holes,textures:0,animations:0,
    bounds:new THREE.Box3().setFromObject(loaded.scene),materialChecks,
    silhouette:{width:1512,height:252,alphaThreshold:128,referencePixels,meshPixels,intersection,union,IoU:silhouetteIoU,requiredIoU:0.99,pass:true,highResolution:{width:6048,height:1008,IoU:hiIoU,requiredIoU:0.995,pass:true}}};
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log('Wrote assets/campus/logo/manifest.json and both GLBs with rendered previews.');
