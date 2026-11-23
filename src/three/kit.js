// Shared rendering kit: renderer, post-processing, night environment, textures, helpers.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function makeRenderer(canvas, { alpha = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__bake });
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uSeed: { value: 0.37 }, uAmount: { value: 0.06 }, uVignette: { value: 0.55 }, uRes: { value: new THREE.Vector2(1, 1) }, uFade: { value: 0 }, uFadeColor: { value: new THREE.Color('#0B0B0C') } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSeed, uAmount, uVignette, uFade; uniform vec2 uRes; uniform vec3 uFadeColor; varying vec2 vUv;
    float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5; q.x *= uRes.x/uRes.y;
      float v = smoothstep(1.1, 0.25, length(q));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      float n = hash(floor(vUv*uRes) + uSeed*61.0) - 0.5;
      float lum = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb += n * uAmount * (0.35 + 0.65*(1.0-lum));
      c.rgb = mix(c.rgb, uFadeColor, uFade);
      gl_FragColor = vec4(c.rgb, 1.0);
    }`,
};

export function makeComposer(renderer, scene, camera, { strength = 0.85, radius = 0.55, threshold = 0.8, grain = 0.06, vignette = 0.55 } = {}) {
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  composer.addPass(render);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const g = new ShaderPass(GrainShader);
  g.uniforms.uAmount.value = grain;
  g.uniforms.uVignette.value = vignette;
  composer.addPass(g);
  return {
    composer,
    bloom,
    grain: g,
    setSize(w, h, dpr) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      g.uniforms.uRes.value.set(w * dpr, h * dpr);
    },
  };
}

export function nightEnvironment(renderer, { warm = '#ffd3a0', screen = '#FF5A1F', day = false } = {}) {
  const env = new THREE.Scene();
  const skyGeo = new THREE.SphereGeometry(50, 48, 24);
  const cols = [];
  const pos = skyGeo.attributes.position;
  const top = new THREE.Color(day ? '#6f9fd8' : '#030407');
  const hor = new THREE.Color(day ? '#e8e6e0' : '#15151a');
  const gnd = new THREE.Color(day ? '#5a5650' : '#050505');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.45)) : hor.clone().lerp(gnd, Math.pow(-y, 0.3));
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  if (day) {
    panel(14, 14, '#fff6e6', 8, 20, 30, 10);
    panel(60, 8, '#d9d4ca', 1.2, 0, 4, 40);
    panel(60, 8, '#c9c4ba', 1.1, 0, 4, -40);
  } else {
    for (let i = -4; i <= 4; i++) {
      panel(3, 0.8, warm, 6, i * 9, 14, 14);
      panel(3, 0.8, warm, 6, i * 9, 14, -14);
    }
    panel(18, 0.8, screen, 0.9, -10, 3, 30);
    panel(18, 0.8, screen, 0.6, 10, 3, -30);
    panel(60, 6, '#3a4660', 0.5, 0, 6, 40);
    panel(60, 6, '#3a4660', 0.5, 40, 6, 0);
    panel(30, 30, '#20242c', 1, 0, 40, 0);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  env.traverse((o) => o.geometry && o.geometry.dispose());
  return rt.texture;
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// The Move Media screen face, drawn from the master SVG files (never retyped).
export async function screenTexture(src, { w = 2048, h = 608, scale = 0.68, led = true, bg = '#0d0e10', maxH = 0.62 } = {}) {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const ar = img.naturalWidth / img.naturalHeight || 2.92;
  let lw = w * scale, lh = lw / ar;
  if (lh > h * maxH) {
    lh = h * maxH;
    lw = lh * ar;
  }
  g.drawImage(img, (w - lw) / 2, (h - lh) / 2, lw, lh);
  if (led) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(0,0,0,0.2)';
    const p = 6;
    for (let x = 0; x < w; x += p) g.fillRect(x, 0, 1.6, h);
    for (let y = 0; y < h; y += p) g.fillRect(0, y, w, 1.6);
    g.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function noiseCanvas(size, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const id = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = fn(x / size, y / size);
      const i = (y * size + x) * 4;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = Math.max(0, Math.min(255, v * 255));
      id.data[i + 3] = 255;
    }
  g.putImageData(id, 0, 0);
  return c;
}

export function makeNoise(seed = 1) {
  const p = new Uint8Array(512);
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * (3 - 2 * t);
  const h = (x, y) => p[p[x & 255] + (y & 255)] / 255;
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o = 5) => {
    let t = 0, amp = 0.5, f = 1;
    for (let i = 0; i < o; i++) {
      t += amp * n(x * f, y * f);
      f *= 2;
      amp *= 0.5;
    }
    return t;
  };
  return { n, fbm, rnd };
}

// Merge every static mesh under `root` that shares a material into one draw call.
export function collapse(root, skip = () => false) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map();
  const remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o === root || skip(o)) return;
    let p = o.parent, blocked = false;
    while (p && p !== root) {
      if (skip(p)) blocked = true;
      p = p.parent;
    }
    if (blocked) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, { mat: o.material, geos: [], order: o.renderOrder });
    groups.get(key).geos.push(g);
    remove.push(o);
  });
  remove.forEach((o) => o.parent.remove(o));
  for (const { mat, geos, order } of groups.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.renderOrder = order;
    root.add(m);
    geos.forEach((g) => g.dispose());
  }
}
