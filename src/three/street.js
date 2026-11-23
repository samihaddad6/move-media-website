// A Beirut street at night (or by day): wet asphalt, kerbs, balconied facades, sodium lamps, light trails.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeNoise, noiseCanvas, radialTexture } from './kit.js';

const KERB_R = 5.4; // near side (+z)
const KERB_L = -7.2; // far side

export function buildStreet({ envMap, day = false, reflectRes = 0.35, size = [1600, 900], x0 = -110, x1 = 90, near = true } = {}) {
  const group = new THREE.Group();
  const N = makeNoise(7);
  const R = makeNoise(3);

  // ---- road ----
  let mirror = null;
  if (!day) {
    mirror = new Reflector(new THREE.PlaneGeometry(260, 60), { textureWidth: Math.round(size[0] * reflectRes), textureHeight: Math.round(size[1] * reflectRes), color: 0x8c8c8c, clipBias: 0.003 });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set((x0 + x1) / 2, 0, 0);
    group.add(mirror);
  }
  const puddle = new THREE.CanvasTexture(
    noiseCanvas(512, (x, y) => {
      const v = N.fbm(x * 6, y * 6, 5);
      return 0.12 + 0.62 * THREE.MathUtils.smoothstep(v, 0.46, 0.6) + N.n(x * 180, y * 180) * 0.12;
    }),
  );
  puddle.wrapS = puddle.wrapT = THREE.RepeatWrapping;
  puddle.repeat.set(13, 3);
  const rough = new THREE.CanvasTexture(noiseCanvas(256, (x, y) => 0.35 + N.n(x * 90, y * 90) * 0.5));
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.set(80, 18);
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 60),
    new THREE.MeshStandardMaterial(
      day
        ? { color: '#55534f', roughness: 0.92, roughnessMap: rough, envMap, envMapIntensity: 0.6 }
        : { color: '#0d0e10', roughness: 0.5, roughnessMap: rough, transparent: true, alphaMap: puddle, envMap, envMapIntensity: 0.4 },
    ),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set((x0 + x1) / 2, 0.003, 0);
  group.add(asphalt);

  // ---- markings, kerbs, pavements (merged) ----
  const dashGeos = [];
  for (let x = x0; x < x1; x += 6) {
    const d = new THREE.PlaneGeometry(3, 0.12).rotateX(-Math.PI / 2).translate(x, 0.006, -1.9);
    dashGeos.push(d);
  }
  group.add(new THREE.Mesh(mergeGeometries(dashGeos), new THREE.MeshStandardMaterial({ color: day ? '#e9e4d8' : '#8f8a80', roughness: 0.6, transparent: true, opacity: day ? 0.85 : 0.55 })));
  const walk = [], kerb = [];
  for (const [z, w] of [[KERB_R, 1.8], [KERB_L, 1.6]]) {
    const sgn = Math.sign(z);
    walk.push(new THREE.BoxGeometry(x1 - x0, 0.16, w).translate((x0 + x1) / 2, 0.08, z + sgn * (w / 2 - 0.8)));
    kerb.push(new THREE.BoxGeometry(x1 - x0, 0.17, 0.18).translate((x0 + x1) / 2, 0.085, z - sgn * 0.8));
  }
  group.add(new THREE.Mesh(mergeGeometries(walk), new THREE.MeshStandardMaterial({ color: day ? '#8b867d' : '#121213', roughness: 0.85 })));
  group.add(new THREE.Mesh(mergeGeometries(kerb), new THREE.MeshStandardMaterial({ color: day ? '#a39d92' : '#1a1a1b', roughness: 0.7 })));

  // ---- lamps ----
  const poleGeos = [], headGeos = [], pools = [];
  const lamps = [];
  for (let x = x0 + 26; x <= x1; x += 16) {
    for (const [lx, z, side] of [[x, 6.2, 1], [x + 8, -7.8, -1]]) {
      if (!near && side > 0) continue;
      poleGeos.push(new THREE.CylinderGeometry(0.07, 0.1, 7.5, 10).translate(lx, 3.75, z));
      poleGeos.push(new THREE.BoxGeometry(0.08, 0.08, 1.9).translate(lx, 7.4, z - side * 0.95));
      headGeos.push(new THREE.BoxGeometry(0.55, 0.06, 0.28).translate(lx, 7.33, z - side * 1.8));
      lamps.push(new THREE.Vector3(lx, 7.25, z - side * 1.8));
      pools.push([lx, z - side * 1.8]);
    }
  }
  group.add(new THREE.Mesh(mergeGeometries(poleGeos), new THREE.MeshStandardMaterial({ color: day ? '#3a3a3c' : '#151517', roughness: 0.6, metalness: 0.4, envMap })));
  group.add(new THREE.Mesh(mergeGeometries(headGeos), new THREE.MeshBasicMaterial({ color: day ? new THREE.Color('#d8d4c8') : new THREE.Color('#ffc27e').multiplyScalar(4), toneMapped: day })));
  if (!day) {
    // pools of lamp light on the wet road: baked cards, so only the nearest lamps need real lights
    const poolTex = radialTexture([[0, 'rgba(255,190,120,0.42)'], [0.45, 'rgba(255,170,100,0.14)'], [1, 'rgba(255,160,90,0)']]);
    const pg = pools.map(([x, z]) => new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2).translate(x, 0.01, z));
    const pm = new THREE.Mesh(mergeGeometries(pg), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pm.renderOrder = 1;
    group.add(pm);
  }

  // ---- facades: balconies, windows ----
  const winTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = day ? '#cdbfa6' : '#000';
    g.fillRect(0, 0, 512, 1024);
    for (let y = 8; y < 1024; y += 32)
      for (let x = 6; x < 512; x += 21) {
        const r = R.rnd();
        if (day) {
          if (r < 0.12) continue;
          g.fillStyle = `rgb(${40 + r * 50},${52 + r * 55},${66 + r * 60})`;
          g.fillRect(x, y, 11, 16);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(x, y, 11, 2);
          continue;
        }
        if (r < 0.16) g.fillStyle = `rgba(255,${150 + R.rnd() * 40},${70 + R.rnd() * 40},${0.35 + R.rnd() * 0.4})`;
        else if (r < 0.19) g.fillStyle = `rgba(150,175,230,${0.18 + R.rnd() * 0.2})`;
        else if (r < 0.3) g.fillStyle = 'rgba(255,170,100,0.05)';
        else continue;
        g.fillRect(x, y, 9, 14);
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(x, y + 6, 9, 1);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const front = [], mass = [], balc = [];
  for (const side of near ? [1, -1] : [-1]) {
    let x = x0;
    while (x < x1) {
      const w = 7 + R.rnd() * 10, h = 8 + R.rnd() * 26, d = 8;
      const zf = side > 0 ? 7.4 : -8.6;
      const zc = zf + side * (d / 2);
      mass.push(new THREE.BoxGeometry(w, h, d).translate(x + w / 2, h / 2, zc));
      const pf = new THREE.PlaneGeometry(w, h);
      const uv = pf.attributes.uv;
      const ou = R.rnd(), ov = R.rnd();
      for (let i = 0; i < uv.count; i++) uv.setXY(i, ou + uv.getX(i) * (w / 18), ov + uv.getY(i) * (h / 30));
      if (side > 0) pf.rotateY(Math.PI);
      pf.translate(x + w / 2, h / 2, zf - side * 0.02);
      front.push(pf);
      // side ends facing along the street, so the street reads in depth
      for (const ex of [x, x + w]) {
        const pe = new THREE.PlaneGeometry(d, h);
        const uv2 = pe.attributes.uv;
        for (let i = 0; i < uv2.count; i++) uv2.setXY(i, ou + uv2.getX(i) * (d / 18), ov + uv2.getY(i) * (h / 30));
        pe.rotateY(ex === x ? -Math.PI / 2 : Math.PI / 2).translate(ex + (ex === x ? -0.02 : 0.02), h / 2, zc);
        front.push(pe);
      }
      for (let y = 3; y < h - 1; y += 3) balc.push(new THREE.BoxGeometry(w * 0.9, 0.12, 0.9).translate(x + w / 2, y, zf - side * 0.4));
      x += w + 0.6 + R.rnd() * 2;
    }
  }
  const facadeMat = new THREE.MeshStandardMaterial({ color: day ? '#bfae92' : '#141416', roughness: 0.85, envMap, envMapIntensity: day ? 0.6 : 0.2 });
  group.add(new THREE.Mesh(mergeGeometries(mass), facadeMat));
  group.add(new THREE.Mesh(mergeGeometries(balc), facadeMat));
  const winMat = day
    ? new THREE.MeshStandardMaterial({ color: '#ffffff', map: winTex, roughness: 0.35, envMap, envMapIntensity: 0.8 })
    : new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.8, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: 0.9 });
  group.add(new THREE.Mesh(mergeGeometries(front), winMat));

  // ---- light trails of passing traffic ----
  if (!day) {
    const trails = [];
    const add = (z, y, a, b, color, k) => trails.push([new THREE.BoxGeometry(b - a, 0.035, 0.035).translate((a + b) / 2, y, z), new THREE.Color(color).multiplyScalar(k)]);
    add(-3.4, 0.66, -70, -6, '#ff2a1a', 2.2);
    add(-3.2, 0.66, -70, -6, '#ff2a1a', 2.2);
    add(-4.6, 0.62, -90, -18, '#ffe9c8', 2.6);
    add(-4.4, 0.62, -90, -18, '#ffe9c8', 2.6);
    add(-5.4, 0.7, -110, -40, '#ff3a1a', 1.6);
    add(-3.6, 1.62, -60, -14, '#ff5a1f', 2.0);
    add(-4.0, 0.6, 22, 80, '#ff2a1a', 1.6);
    add(-4.8, 0.62, 30, 90, '#ffe9c8', 1.8);
    for (const [geo, col] of trails) group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, toneMapped: false })));
  }
  return { group, lamps, mirror };
}
