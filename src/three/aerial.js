// The city from the air at night: a stylised coast, hills and street lights, with the fleet's screens moving
// along the roads. Built in small slices during idle time so it never blocks scrolling.
import * as THREE from 'three';
import { makeRenderer, makeComposer, makeNoise } from './kit.js';

const X0 = -16, X1 = 26, Y0 = -16, Y1 = 26;
const coast = [[-10.2, -16], [-10.4, -8], [-10.6, -3], [-10.2, 0.8], [-8.6, 2.1], [-6.2, 2.6], [-3.8, 2.5], [-1.8, 2.3], [0.2, 2.9], [1.9, 3.9], [3.2, 5.6], [4.1, 7.6], [4.4, 9.6], [5.3, 10.9], [6.4, 11.4], [6.6, 13.2], [6.2, 15.2], [6.9, 17.6], [7.4, 20], [8.2, 26]];
const land = [...coast, [30, 26], [30, -18], [-10.2, -18]];

function inLand(x, y) {
  let c = false;
  for (let i = 0, j = land.length - 1; i < land.length; j = i++) {
    const [xi, yi] = land[i], [xj, yj] = land[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function coastDist(x, y) {
  let d = 1e9;
  for (let i = 0; i < coast.length - 1; i++) {
    const [ax, ay] = coast[i], [bx, by] = coast[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

// Generates everything as a sequence of small steps; `yield` hands time back to the browser.
function* generate(S, N) {
  const rnd = N.rnd;
  const height = (x, y) => {
    if (!inLand(x, y)) return -0.25;
    const d = coastDist(x, y);
    const rise = Math.min(1, d / 9);
    const kes = THREE.MathUtils.smoothstep(y, 4, 12) * 1.25;
    const base = Math.pow(rise, 1.6) * (2.4 + kes);
    const hills = (N.fbm(x * 0.22 + 3, y * 0.22, 5) - 0.45) * 1.6 * rise;
    return Math.max(0.02, base + hills + THREE.MathUtils.smoothstep(d, 0, 0.6) * 0.04);
  };
  const C = document.createElement('canvas');
  C.width = C.height = S;
  const g = C.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, S, S);
  const k = S / 4096;
  const P = (x, y) => [((x - X0) / (X1 - X0)) * S, ((Y1 - y) / (Y1 - Y0)) * S];
  const routes = [];
  const stroke = (pts, w, col, a) => {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const [px, py] = P(x, y);
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.lineWidth = w * k;
    g.strokeStyle = col;
    g.globalAlpha = a;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
    g.globalAlpha = 1;
  };
  const road = (pts, kind) => {
    const spec = { minor: [1.6, '#ffb36b', 0.32], street: [2.0, '#ffb877', 0.42], art: [3.2, '#ffcf9c', 0.78], hwy: [4.2, '#ffe2c0', 0.75] }[kind];
    stroke(pts, spec[0] * 5, spec[1], spec[2] * 0.07);
    stroke(pts, spec[0] * 2.2, spec[1], spec[2] * 0.16);
    stroke(pts, spec[0], spec[1], spec[2]);
    if (kind !== 'minor') routes.push(pts);
  };
  const clipToLand = (pts) => {
    const out = [];
    let cur = [];
    for (const p of pts) {
      if (inLand(p[0], p[1]) && coastDist(p[0], p[1]) > 0.12) cur.push(p);
      else if (cur.length) (out.push(cur), (cur = []));
    }
    if (cur.length) out.push(cur);
    return out.filter((c) => c.length > 2);
  };
  const rot = (x, y, a, cx, cy) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
  for (let kk = 0; kk < 2; kk++)
    for (let i = -38; i <= 38; i++) {
      const pts = [];
      const kind = i % 5 === 0 ? 'art' : 'street';
      const off = i * 0.26 + (N.n(i * 3.1, kk) - 0.5) * 0.1;
      for (let t = -10; t <= 10; t += 0.12) {
        const jitter = (N.n(t * 0.7 + i, kk * 9) - 0.5) * 0.18;
        let p = kk ? [off + jitter, t] : [t, off + jitter];
        p = rot(p[0], p[1], -0.2 + kk * 0.05, -5, -2);
        p = [p[0] - 5, p[1] - 2.2];
        p = [p[0] + (N.fbm(p[0] * 0.18, p[1] * 0.18 + 7, 3) - 0.5) * 1.6, p[1] + (N.fbm(p[0] * 0.18 + 5, p[1] * 0.18, 3) - 0.5) * 1.6];
        const cityR = Math.hypot((p[0] + 4.5) / 6.4, (p[1] + 2) / 5.2);
        if (N.n(p[0] * 1.7 + i, p[1] * 1.7 + kk * 5) < 0.3 || cityR > 1 + (N.n(p[0], p[1]) - 0.5) * 0.4) {
          if (pts.length) clipToLand(pts.splice(0)).forEach((c) => road(c, kind));
          continue;
        }
        pts.push(p);
      }
      clipToLand(pts).forEach((c) => road(c, kind));
      if (i % 6 === 0) yield;
    }
  for (let n = 0; n < 900; n++) {
    const cx = -10 + rnd() * 11, cy = -8 + rnd() * 10.5;
    if (Math.hypot((cx + 4.5) / 6.4, (cy + 2) / 5.2) > 1.05) continue;
    const a = rnd() * Math.PI, L = 0.15 + rnd() * 0.35;
    clipToLand([[cx, cy], [cx + Math.cos(a) * L * 0.5, cy + Math.sin(a) * L * 0.5], [cx + Math.cos(a) * L, cy + Math.sin(a) * L]]).forEach((c) => road(c, 'minor'));
  }
  yield;
  const hwy = coast.map(([x, y], i) => {
    const [nx, ny] = coast[Math.min(i + 1, coast.length - 1)];
    const dx = nx - x, dy = ny - y, l = Math.hypot(dx, dy) || 1;
    return [x + (dy / l) * 0.35, y - (dx / l) * 0.35];
  });
  const hf = [];
  for (let i = 0; i < hwy.length - 1; i++) for (let t = 0; t < 1; t += 0.1) hf.push([hwy[i][0] + (hwy[i + 1][0] - hwy[i][0]) * t, hwy[i][1] + (hwy[i + 1][1] - hwy[i][1]) * t]);
  road(hf.filter(([x, y]) => inLand(x, y)), 'hwy');
  const wander = (x, y, ang, steps, kind, seed) => {
    const pts = [[x, y]];
    for (let s = 0; s < steps; s++) {
      ang += (N.n(s * 0.09 + seed, seed * 3.7) - 0.5) * 0.5;
      x += Math.cos(ang) * 0.09;
      y += Math.sin(ang) * 0.09;
      if (!inLand(x, y) || x > 24 || y > 24) break;
      pts.push([x, y]);
      if (kind !== 'minor' && s > 30 && rnd() < 0.035) wander(x, y, ang + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.7), 25 + rnd() * 90, 'minor', seed + s);
    }
    clipToLand(pts).forEach((c) => road(c, kind));
  };
  const starts = [[-1, 1.5, 0.15], [-1.5, -1, 0.05], [-2, -4, -0.2], [-3, -6.5, -0.35], [0.5, 2.5, 0.5], [2.2, 4.2, 0.4], [3.6, 6.4, 0.25], [4.6, 9.4, 0.3], [6.2, 12, 0.2], [6.6, 15, 0.1], [7.1, 18, 0.15], [-4, -8, -0.5], [1, -2, -0.05]];
  for (let i = 0; i < starts.length; i++) {
    const [x, y, a] = starts[i];
    wander(x, y, a, 90 + rnd() * 120, i % 3 === 0 ? 'art' : 'street', i * 13 + 1);
    if (i % 3 === 0) yield;
  }
  for (let v = 0; v < 70; v++) {
    const x = 1 + rnd() * 20, y = -12 + rnd() * 32;
    if (!inLand(x, y) || coastDist(x, y) < 1.2) continue;
    for (let b = 0; b < 4 + rnd() * 6; b++) wander(x, y, rnd() * 6.28, 6 + rnd() * 18, 'minor', v * 31 + b);
    if (v % 10 === 0) yield;
  }
  for (let n = 0; n < 140000; n++) {
    const x = X0 + rnd() * (X1 - X0), y = Y0 + rnd() * (Y1 - Y0);
    if (n % 7000 === 0) yield;
    if (!inLand(x, y)) continue;
    const cityR = Math.hypot((x + 4.5) / 6.6, (y + 2) / 5.4);
    const d = coastDist(x, y);
    const density = Math.max(0, 1.3 - cityR) * 1.3 + Math.max(0, 1 - d / 2.6) * 0.9 * THREE.MathUtils.smoothstep(y, -9, 0) + (N.fbm(x * 0.6, y * 0.6, 3) > 0.6 ? 0.5 : 0);
    if (rnd() > density) continue;
    const [px, py] = P(x, y);
    g.fillStyle = rnd() < 0.85 ? `rgba(255,${180 + rnd() * 50},${110 + rnd() * 60},${0.25 + rnd() * 0.6})` : `rgba(190,210,255,${0.2 + rnd() * 0.4})`;
    const r = (1.6 + rnd() * 2.2) * k;
    g.fillRect(px, py, r, r);
  }
  yield;
  const SEG = 300;
  const geo = new THREE.PlaneGeometry(X1 - X0, Y1 - Y0, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (X0 + X1) / 2;
    const y = -pos.getZ(i) + (Y0 + Y1) / 2;
    pos.setXYZ(i, x, height(x, y), -y);
    if (i % 12000 === 0) yield;
  }
  geo.computeVertexNormals();
  return { canvas: C, geo, routes, height };
}

export function runSliced(gen, budget = 6) {
  return new Promise((resolve) => {
    const step = (deadline) => {
      const t0 = performance.now();
      const left = () => (deadline && deadline.timeRemaining ? deadline.timeRemaining() > 1 : performance.now() - t0 < budget);
      let r;
      do r = gen.next();
      while (!r.done && left());
      if (r.done) resolve(r.value);
      else schedule(step);
    };
    const schedule = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 200 }) : setTimeout(() => f(), 16));
    schedule(step);
  });
}

export async function createAerial(canvas, { width, height, dpr = 1, texSize = 3072, sync = false, cam, glow = 1.5, showFleet = true } = {}) {
  const N = makeNoise(11);
  const gen = generate(texSize, N);
  let data;
  if (sync) {
    let r;
    do r = gen.next();
    while (!r.done);
    data = r.value;
  } else data = await runSliced(gen);
  const { canvas: roadCanvas, geo, routes, height: hAt } = data;

  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06070a');
  scene.fog = new THREE.FogExp2('#1c1511', 0.034);
  {
    const sg = new THREE.SphereGeometry(150, 48, 24);
    const cols = [], p = sg.attributes.position;
    const hz = new THREE.Color('#2b1e15'), top = new THREE.Color('#040508');
    for (let i = 0; i < p.count; i++) {
      const y = Math.max(0, p.getY(i) / 150);
      const c = hz.clone().lerp(top, Math.pow(Math.min(1, y * 3.2), 0.6));
      cols.push(c.r, c.g, c.b);
    }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  }
  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // the street light network switches on outward from the city centre as `uReveal` goes 0 -> 1
  const reveal = { value: 1 };
  const terrainMat = new THREE.MeshStandardMaterial({ color: '#3b3e48', roughness: 0.92, emissive: '#ffffff', emissiveMap: roadTex, emissiveIntensity: glow });
  terrainMat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = reveal;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uReveal; varying vec3 vW;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat dC = length(vW.xz - vec2(-4.5, 2.0));\ntotalEmissiveRadiance *= smoothstep(uReveal * 30.0, uReveal * 30.0 - 3.0, dC);');
  };
  scene.add(new THREE.Mesh(geo, terrainMat));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: '#06080c', roughness: 0.35, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.03;
  scene.add(sea);
  const moon = new THREE.DirectionalLight('#8ea2d8', 1.5);
  moon.position.set(-6, 5, 14);
  scene.add(moon, new THREE.HemisphereLight('#1a2030', '#000000', 0.5));

  // the fleet: each screen light runs along its own road
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.18)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const rnd = N.rnd;
  const lens = routes.map((r) => {
    const acc = [0];
    for (let i = 1; i < r.length; i++) acc.push(acc[i - 1] + Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]));
    return acc;
  });
  const totalPts = routes.reduce((s, r) => s + r.length, 0);
  const FLEET = 240, TRAIL = 7;
  const fleet = [];
  for (let n = 0; n < FLEET; n++) {
    let kk = rnd() * totalPts, r = 0;
    while (kk > routes[r].length) kk -= routes[r++].length;
    fleet.push({ r, s: rnd() * lens[r][lens[r].length - 1], v: (0.18 + rnd() * 0.25) * (rnd() < 0.5 ? 1 : -1) });
  }
  const fPos = new Float32Array(FLEET * 3), tPos = new Float32Array(FLEET * TRAIL * 3), tCol = new Float32Array(FLEET * TRAIL * 3);
  const o = new THREE.Color('#ff5a1f');
  for (let n = 0; n < FLEET; n++)
    for (let s = 0; s < TRAIL; s++) {
      const kk = (1 - s / TRAIL) * 1.3, j = (n * TRAIL + s) * 3;
      tCol[j] = o.r * kk;
      tCol[j + 1] = o.g * kk;
      tCol[j + 2] = o.b * kk;
    }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const fleetMat = new THREE.PointsMaterial({ map: dot, color: new THREE.Color('#ff5a1f').multiplyScalar(4.5), size: 0.42, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const trailMat = new THREE.PointsMaterial({ map: dot, vertexColors: true, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const fleetPts = new THREE.Points(fGeo, fleetMat), trailPts = new THREE.Points(tGeo, trailMat);
  fleetPts.frustumCulled = trailPts.frustumCulled = false;
  if (showFleet) scene.add(fleetPts, trailPts);
  const at = (r, s) => {
    const pts = routes[r], acc = lens[r], L = acc[acc.length - 1];
    s = ((s % L) + L) % L;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < s) i++;
    const t = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    return [x, hAt(x, y) + 0.05, -y];
  };
  function moveFleet(dt) {
    for (let n = 0; n < FLEET; n++) {
      const f = fleet[n];
      f.s += f.v * dt;
      const p = at(f.r, f.s);
      fPos.set(p, n * 3);
      for (let s = 0; s < TRAIL; s++) tPos.set(at(f.r, f.s - Math.sign(f.v) * s * 0.035), (n * TRAIL + s) * 3);
    }
    fGeo.attributes.position.needsUpdate = true;
    tGeo.attributes.position.needsUpdate = true;
  }
  moveFleet(0);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 300);
  const post = makeComposer(renderer, scene, camera, { strength: 1.0, radius: 0.5, threshold: 0.55, grain: 0.07, vignette: 0.6 });
  const camA = cam || [-18, 8.5, -2.5, 2, 0, -1.2];
  let W = width, H = height, D = dpr, progress = 0;
  function frame() {
    // a slow push in across the coast as the visitor scrolls
    const p = progress;
    const wide = W / H >= 0.9;
    const back = wide ? 1 : 1.35;
    camera.position.set(camA[0] * back + p * 3.0, camA[1] * back - p * 1.6, camA[2] - p * 1.2);
    camera.lookAt(camA[3] + p * 0.6, camA[4], camA[5]);
    camera.fov = wide ? 40 : 52;
    camera.updateProjectionMatrix();
  }
  function resize(w, h, d = D) {
    W = w;
    H = h;
    D = d;
    renderer.setPixelRatio(D);
    renderer.setSize(W, H, false);
    post.setSize(W, H, D);
    camera.aspect = W / H;
  }
  resize(W, H, D);
  return {
    setProgress(p, r = 1) {
      progress = p;
      reveal.value = r;
    },
    tick(dt) {
      moveFleet(dt);
    },
    render() {
      frame();
      post.composer.render();
    },
    resize,
    renderer,
    // pixel positions of the fleet and of a long route, for drawing DOM overlays on baked frames
    info(box = [0.05, 0.08, 0.95, 0.92]) {
      frame();
      camera.updateMatrixWorld();
      const pr = ([x, y, z]) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        return [+(((v.x + 1) / 2) * W).toFixed(1), +(((1 - v.y) / 2) * H).toFixed(1), v.z < 1 ? 1 : 0];
      };
      const fleetPx = [];
      for (let n = 0; n < FLEET; n++) fleetPx.push(pr([fPos[n * 3], fPos[n * 3 + 1], fPos[n * 3 + 2]]));
      // the longest drivable route that stays mostly inside the frame
      let best = null, bestScore = -1;
      routes.forEach((r, i) => {
        const px = r.map(([x, y]) => pr([x, hAt(x, y) + 0.05, -y]));
        const inside = px.filter(([a, b]) => a > W * box[0] && a < W * box[2] && b > H * box[1] && b < H * box[3]).length;
        if (inside > bestScore) (bestScore = inside), (best = px.filter(([a, b]) => a > 0 && a < W && b > 0 && b < H));
      });
      return { fleet: fleetPx.filter(([a, b, ok]) => ok && a > 0 && a < W && b > 0 && b < H), route: best };
    },
  };
}
