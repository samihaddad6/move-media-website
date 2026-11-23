// A classic Beirut-style saloon taxi with a double-sided rooftop screen. Units: metres. +x is forward.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { collapse, radialTexture } from './kit.js';

export const SCREEN_CENTER = new THREE.Vector3(-0.3, 1.79, 0); // in body space
export const WHEEL_R = 0.325;

function fine(geo, edge = 0.06) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = new TessellateModifier(edge, 8).modify(g);
  return mergeVertices(g, 1e-4);
}
function cleanNormals(geo) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
    if (!(l > 0.5)) n.setXYZ(i, 0, 1, 0);
  }
}
function shrunk(geo, k = 0.994) {
  const g = geo.clone();
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox.getCenter(c);
  g.translate(-c.x, -c.y, -c.z).scale(k, k, k).translate(c.x, c.y, c.z);
  return g;
}
export const cabinZ = (x, y, z) => z * (1 - 0.15 * Math.max(0, (y - 0.95) / 0.47)) * (1 - 0.03 * Math.pow((x + 0.3) / 1.0, 2));
export const bodyZ = (x, y, z) => z * (1 - 0.06 * Math.pow((y - 0.66) / 0.36, 2)) * (1 - 0.07 * Math.pow(Math.max(0, (Math.abs(x) - 1.55) / 0.8), 2));

export function buildTaxi({ paint = '#e9e6df', screenMap, screenBoost = 0.86, envMap, glow = true, shadow = true } = {}) {
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);

  const paintMat = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.55, metalness: 0.1, envMap, envMapIntensity: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.12, metalness: 1, envMap, envMapIntensity: 1.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#07080b', roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMap, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const seamMat = new THREE.MeshBasicMaterial({ color: '#060606' });

  const s = new THREE.Shape();
  s.moveTo(-2.28, 0.34);
  s.lineTo(-1.82, 0.3);
  s.absarc(-1.4, 0.3, 0.42, Math.PI, 0, true);
  s.lineTo(0.98, 0.3);
  s.absarc(1.4, 0.3, 0.42, Math.PI, 0, true);
  s.lineTo(2.26, 0.34);
  s.lineTo(2.33, 0.5);
  s.lineTo(2.34, 0.78);
  s.lineTo(2.27, 0.87);
  s.lineTo(1.0, 0.945);
  s.lineTo(-1.3, 0.965);
  s.lineTo(-2.2, 0.935);
  s.lineTo(-2.3, 0.86);
  s.lineTo(-2.32, 0.5);
  s.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6, curveSegments: 28 });
  bodyGeo.translate(0, 0, -0.81);
  const bf = fine(bodyGeo);
  {
    const p = bf.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setZ(i, bodyZ(x, y, z));
      p.setY(i, y - THREE.MathUtils.smoothstep(y, 0.62, 0.9) * 0.025 * Math.pow(Math.max(0, (Math.abs(x) - 1.1) / 1.2), 2));
    }
    cleanNormals(bf);
  }
  body.add(new THREE.Mesh(bf, paintMat), new THREE.Mesh(shrunk(bf), paintMat));

  const cb = new THREE.Shape();
  cb.moveTo(0.98, 0.93);
  cb.lineTo(0.3, 1.38);
  cb.quadraticCurveTo(0.2, 1.42, 0.05, 1.42);
  cb.lineTo(-0.7, 1.42);
  cb.quadraticCurveTo(-0.84, 1.42, -0.9, 1.36);
  cb.lineTo(-1.36, 0.95);
  cb.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(cb, { depth: 1.26, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 6, curveSegments: 16 });
  cabGeo.translate(0, 0, -0.63);
  const cf = fine(cabGeo);
  {
    const p = cf.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, cabinZ(p.getX(i), p.getY(i), p.getZ(i)));
    cleanNormals(cf);
  }
  body.add(new THREE.Mesh(cf, paintMat), new THREE.Mesh(shrunk(cf), paintMat));

  const slopeGlass = (ax, ay, bx, by, width) => {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    const nx = dy / len, ny = -dx / len;
    const sign = ax > bx ? 1 : -1;
    const g = new THREE.Mesh(new RoundedBoxGeometry(len - 0.14, 0.012, width, 2, 0.005), glassMat);
    g.position.set((ax + bx) / 2 + sign * nx * 0.058, (ay + by) / 2 + sign * ny * 0.058, 0);
    g.rotation.z = Math.atan2(dy, dx);
    body.add(g);
  };
  slopeGlass(0.98, 0.93, 0.3, 1.38, 1.24);
  slopeGlass(-1.36, 0.95, -0.9, 1.36, 1.2);
  const sideWin = (pts, z) => {
    const geo = fine(new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))), 0.04);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, cabinZ(p.getX(i), p.getY(i), z) + Math.sign(z) * 0.006);
    cleanNormals(geo);
    body.add(new THREE.Mesh(geo, glassMat));
  };
  for (const z of [0.702, -0.702]) {
    sideWin([[0.86, 1.0], [0.32, 1.35], [-0.2, 1.355], [-0.2, 1.0]], z);
    sideWin([[-0.29, 1.0], [-0.29, 1.355], [-0.76, 1.355], [-1.2, 1.0]], z);
    const sur = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.03, 0.01), trimMat);
    sur.position.set(-0.17, 0.985, cabinZ(-0.17, 0.985, z));
    body.add(sur);
  }
  const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffa630').multiplyScalar(1.6), toneMapped: false });
  for (const side of [1, -1]) {
    const zAt = (x, y) => bodyZ(x, y, side * 0.872) + side * 0.002;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.022, 0.012), chromeMat);
    strip.position.set(0, 0.6, zAt(0, 0.6));
    body.add(strip);
    for (const x of [0.94, -0.24, -1.28]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.6, 0.008), seamMat);
      seam.position.set(x, 0.64, zAt(x, 0.64));
      body.add(seam);
    }
    for (const x of [0.62, -0.56]) {
      const h = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.03, 0.03, 2, 0.01), chromeMat);
      h.position.set(x, 0.84, zAt(x, 0.84));
      body.add(h);
    }
    const mir = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.09, 0.16, 2, 0.02), trimMat);
    mir.position.set(0.84, 1.03, side * 0.84);
    body.add(mir);
    const rep = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.01), amber);
    rep.position.set(1.9, 0.68, zAt(1.9, 0.68));
    body.add(rep);
  }
  const fb = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.15, 1.84, 4, 0.05), chromeMat);
  fb.position.set(2.33, 0.42, 0);
  const rb = fb.clone();
  rb.position.set(-2.33, 0.45, 0);
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.17, 0.76, 2, 0.01), trimMat);
  grille.position.set(2.345, 0.68, 0);
  body.add(fb, rb, grille);
  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.72), chromeMat);
    bar.position.set(2.367, 0.62 + i * 0.03, 0);
    body.add(bar);
  }
  const plateMat = new THREE.MeshStandardMaterial({ color: '#a3161a', roughness: 0.5, envMap, envMapIntensity: 0.5 });
  const fp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.42), plateMat);
  fp.position.set(2.425, 0.42, 0);
  const rp = fp.clone();
  rp.position.set(-2.425, 0.62, 0);
  body.add(fp, rp);

  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2dc').multiplyScalar(3.2), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1d12').multiplyScalar(2.2), toneMapped: false });
  for (const z of [0.6, -0.6]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.14, 0.36, 2, 0.012), headMat);
    hl.position.set(2.352, 0.69, z);
    const ring = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.17, 0.4, 2, 0.015), chromeMat);
    ring.position.set(2.343, 0.69, z);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.13, 0.42, 2, 0.012), tailMat);
    tl.position.set(-2.335, 0.73, z);
    body.add(hl, ring, tl);
  }
  for (const x of [1.4, -1.4]) {
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.366, 0.366, 1.62, 32, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#030303', side: THREE.BackSide }));
    well.position.set(x, 0.3, 0);
    body.add(well);
  }

  // rooftop screen
  const topper = new THREE.Group();
  topper.position.set(-0.3, 1.5, 0);
  body.add(topper);
  const tp = new THREE.Shape();
  tp.moveTo(-0.64, 0);
  tp.lineTo(0.64, 0);
  tp.lineTo(0.58, 0.4);
  tp.quadraticCurveTo(0.57, 0.44, 0.52, 0.44);
  tp.lineTo(-0.52, 0.44);
  tp.quadraticCurveTo(-0.57, 0.44, -0.58, 0.4);
  tp.closePath();
  const tGeo = new THREE.ExtrudeGeometry(tp, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 4, curveSegments: 10 });
  tGeo.translate(0, 0.07, -0.11);
  const housingMat = new THREE.MeshPhysicalMaterial({ color: '#09090a', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, envMap, envMapIntensity: 0.8 });
  topper.add(new THREE.Mesh(tGeo, housingMat));
  for (const x of [-0.36, 0.36]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.12), trimMat);
    post.position.set(x, 0.02, 0);
    topper.add(post);
  }
  const faces = [];
  if (screenMap) {
    for (const side of [1, -1]) {
      const fm = new THREE.MeshBasicMaterial({ map: screenMap, toneMapped: false, color: new THREE.Color(screenBoost, screenBoost, screenBoost) });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.32), fm);
      face.position.set(0, 0.29, side * 0.143);
      if (side < 0) face.rotation.y = Math.PI;
      face.userData.keep = true;
      topper.add(face);
      faces.push(face);
    }
  }
  if (glow) {
    // orange spill from the faces onto the roof and the road; baked as soft cards, no light cost
    const spill = radialTexture([[0, 'rgba(255,110,50,0.55)'], [0.4, 'rgba(255,90,31,0.18)'], [1, 'rgba(255,90,31,0)']]);
    const sm = new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    sm.opacity = 0.7;
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), sm);
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(-0.3, 1.478, 0);
    roof.userData.keep = true;
    body.add(roof);
  }

  // wheels
  const wheels = [];
  const tireGeo = new THREE.LatheGeometry(
    [[0.2, -0.1], [0.285, -0.106], [0.31, -0.094], [0.322, -0.06], [0.325, 0], [0.322, 0.06], [0.31, 0.094], [0.285, 0.106], [0.2, 0.1]].map(([r, h]) => new THREE.Vector2(r, h)),
    48,
  ).rotateX(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: '#111112', roughness: 0.82, envMap, envMapIntensity: 0.35 });
  const rimGeo = new THREE.CylinderGeometry(0.205, 0.205, 0.12, 40).rotateX(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.17, 0.19, 0.03, 40).rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.3, 0.035, 0.02);
  const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 20).rotateX(Math.PI / 2);
  for (const [x, z] of [[1.4, 0.76], [1.4, -0.76], [-1.4, 0.76], [-1.4, -0.76]]) {
    const w = new THREE.Group();
    w.position.set(x, WHEEL_R, z);
    const spin = new THREE.Group();
    w.add(spin);
    spin.add(new THREE.Mesh(tireGeo, tireMat), new THREE.Mesh(rimGeo, trimMat));
    const cap = new THREE.Mesh(capGeo, chromeMat);
    cap.position.z = Math.sign(z) * 0.06;
    spin.add(cap);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(spokeGeo, trimMat);
      sp.rotation.z = (i / 5) * Math.PI;
      sp.position.z = Math.sign(z) * 0.078;
      spin.add(sp);
    }
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.position.z = Math.sign(z) * 0.09;
    spin.add(hub);
    collapse(spin);
    car.add(w);
    wheels.push(spin);
  }
  if (shadow) {
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.6),
      new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(0,0,0,0.9)'], [0.55, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.008;
    sh.renderOrder = 2;
    car.add(sh);
  }
  collapse(body, (o) => o.userData.keep);
  return { car, body, wheels, faces, topper };
}
