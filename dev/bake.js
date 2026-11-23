// Offline renders for the page's still images. Opened in headless Chrome with ?shot=<name>&w=&h=
import * as THREE from 'three';
import { makeRenderer, makeComposer, nightEnvironment, screenTexture, loadImage } from '/src/three/kit.js';
import { buildTaxi, WHEEL_R } from '/src/three/taxi.js';
import { buildStreet } from '/src/three/street.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

window.__bake = true;
const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 1600, H = +Q.get('h') || 900;
const shot = Q.get('shot');
const canvas = document.getElementById('c');
const B = '/src/assets/brand/';

async function nightStreet({ day = false, screen = 'movemedia-horizontal-colour-on-dark.svg', alpha = false, maxH } = {}) {
  const renderer = makeRenderer(canvas, { alpha });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  const env = nightEnvironment(renderer, { day });
  scene.environment = env;
  if (day) {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#3f78bd'); gr.addColorStop(0.55, '#8fb6dc'); gr.addColorStop(1, '#dfe9f1');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    scene.fog = new THREE.Fog('#d3dde6', 30, 160);
  } else {
    scene.background = new THREE.Color('#07080b');
    scene.fog = new THREE.FogExp2('#0b0a0c', 0.05);
  }
  return { renderer, scene, env, map: await screenTexture(B + screen, maxH ? { maxH } : {}) };
}

function nightLights(scene, cx = 0, lamps) {
  scene.add(new THREE.HemisphereLight('#1c2230', '#000000', 0.35));
  const near = lamps.slice().sort((a, b) => Math.abs(a.x - cx - 1) - Math.abs(b.x - cx - 1));
  for (const l of near.slice(0, 2)) {
    const s = new THREE.SpotLight('#ffbf80', 55, 22, 0.95, 0.75, 1.6);
    s.position.copy(l);
    s.target.position.set(l.x, 0, l.z);
    scene.add(s, s.target);
  }
  const head = new THREE.SpotLight('#fff1d6', 14, 30, 0.38, 0.7, 1.3);
  head.position.set(cx + 2.4, 0.7, 0);
  head.target.position.set(cx + 16, 0, 0);
  const rim = new THREE.SpotLight('#ffd2a0', 38, 30, 0.5, 0.8, 1.4);
  rim.position.set(cx - 9, 6.5, -4);
  rim.target.position.set(cx, 1.2, 0);
  const glow = new THREE.PointLight('#ff5a1f', 1.6, 5, 1.8);
  glow.position.set(cx - 0.3, 1.9, 1.2);
  const kick = new THREE.PointLight('#9fb4ff', 2.5, 14, 1.5);
  kick.position.set(cx - 6, 3, -3);
  scene.add(head, head.target, rim, rim.target, glow, kick);
}

function done(info) {
  const pre = document.createElement('pre');
  pre.id = 'info';
  pre.textContent = JSON.stringify(info || {});
  pre.style.display = 'none';
  document.body.appendChild(pre);
  document.title = 'ready';
}

function project(camera, v) {
  const p = v.clone().project(camera);
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
}

import { createAerial } from '/src/three/aerial.js';
const shots = {
  async led({ cam = [-20, -30, 70, -58, 0, 0, 36], ap = 0.0022 } = {}) {
    const renderer = makeRenderer(canvas);
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060607');
    const env = nightEnvironment(renderer);
    scene.environment = env;
    const GW = 216, GH = 64;
    const img = await loadImage(B + 'movemedia-horizontal-colour-on-dark.svg');
    const c = document.createElement('canvas');
    c.width = GW; c.height = GH;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH);
    const lh = GH * 0.78, lw = lh * (633.75 / 217.14);
    g.drawImage(img, (GW - lw) / 2, (GH - lh) / 2, lw, lh);
    const px = g.getImageData(0, 0, GW, GH).data;
    const pkgs = new THREE.InstancedMesh(new RoundedBoxGeometry(0.66, 0.66, 0.22, 2, 0.06), new THREE.MeshPhysicalMaterial({ color: '#101012', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.7 }), GW * GH);
    const dies = new THREE.InstancedMesh(new RoundedBoxGeometry(0.4, 0.34, 0.05, 2, 0.04), new THREE.MeshBasicMaterial({ toneMapped: false }), GW * GH);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let i = 0;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const X = x - GW / 2, Y = GH / 2 - y;
      pkgs.setMatrixAt(i, m.makeTranslation(X, Y, 0));
      dies.setMatrixAt(i, m.makeTranslation(X, Y + 0.04, 0.13));
      const k = (y * GW + x) * 4, r = px[k] / 255, gg = px[k + 1] / 255, b = px[k + 2] / 255;
      if (Math.max(r, gg, b) > 0.08) col.setRGB(r, gg, b).convertSRGBToLinear().multiplyScalar(2.1);
      else col.setRGB(0.012, 0.012, 0.014);
      dies.setColorAt(i++, col);
    }
    scene.add(pkgs, dies);
    for (let y = 0; y <= GH; y++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(GW + 2, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.5, metalness: 0.2 }));
      l.position.set(-0.5, GH / 2 - y + 0.5, 0.3);
      l.rotation.x = -0.18;
      scene.add(l);
    }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GW + 40, GH + 40), new THREE.MeshStandardMaterial({ color: '#070708', roughness: 0.8 }));
    back.position.z = -0.12;
    scene.add(back);
    const spill = new THREE.PointLight('#ff5a1f', 25, 60, 1.6);
    spill.position.set(-48, 0, 10);
    scene.add(spill);
    const camera = new THREE.PerspectiveCamera(cam[6], W / H, 0.1, 500);
    camera.position.set(cam[0], cam[1], cam[2]);
    camera.lookAt(cam[3], cam[4], cam[5]);
    const post = makeComposer(renderer, scene, camera, { strength: 0.75, radius: 0.5, threshold: 0.9, grain: 0.07, vignette: 0.65 });
    post.setSize(W, H, 1);
    const focus = camera.position.distanceTo(new THREE.Vector3(cam[3], cam[4], cam[5]));
    post.composer.insertPass(new BokehPass(scene, camera, { focus, aperture: ap, maxblur: 0.012 }), 1);
    post.composer.render();
    done({});
  },
  async aerial({ cam, reveal = 1, progress = 0, dt = 0, glow = 1.5, fleet = true, box } = {}) {
    const a = await createAerial(canvas, { width: W, height: H, dpr: 1, texSize: 4096, sync: true, cam, glow, showFleet: fleet });
    a.setProgress(progress, reveal);
    a.tick(dt);
    a.render();
    done(a.info(box));
  },
  // Hero stills: the opening frame (poster and reduced motion) for wide and tall screens
  async street({ cam = [5.4, 0.36, 5.0, -2.4, 1.35, -1.0, 34], screen, day = false, bokeh = 0, maxH, focusAt, noTaxi = false, near = true } = {}) {
    const { renderer, scene, env, map } = await nightStreet({ day, screen, maxH });
    const { group, lamps } = buildStreet({ envMap: env, day, size: [W, H], near });
    scene.add(group);
    const taxi = buildTaxi({ screenMap: map, envMap: env, glow: !day });
    if (!noTaxi) scene.add(taxi.car);
    taxi.wheels.forEach((w, i) => (w.rotation.z = -0.7 - i * 0.3));
    if (!day) {
      const other = buildTaxi({ screenMap: map, envMap: env, glow: false });
      other.car.position.set(-21, 0, -3.3);
      scene.add(other.car);
      nightLights(scene, 0, lamps);
    } else {
      scene.add(new THREE.HemisphereLight('#dfe8f2', '#6b6257', 1.2));
      const sun = new THREE.DirectionalLight('#fff1dc', 3.0);
      sun.position.set(18, 26, 16);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 });
      sun.shadow.bias = -0.0004;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(sun);
    }
    const camera = new THREE.PerspectiveCamera(cam[6], W / H, 0.05, 260);
    camera.position.set(cam[0], cam[1], cam[2]);
    camera.lookAt(cam[3], cam[4], cam[5]);
    const post = makeComposer(renderer, scene, camera, day ? { strength: 0.25, radius: 0.4, threshold: 0.98, grain: 0.04, vignette: 0.25 } : { strength: 0.85, radius: 0.55, threshold: 0.92, grain: 0.065, vignette: 0.6 });
    post.setSize(W, H, 1);
    if (bokeh) {
      const focus = camera.position.distanceTo(new THREE.Vector3(...(focusAt || [cam[3], cam[4], cam[5]])));
      post.composer.insertPass(new BokehPass(scene, camera, { focus, aperture: bokeh, maxblur: 0.014 }), 1);
    }
    post.composer.render();
    // where the screen face (near side) lands in the image
    const c = new THREE.Vector3(-0.3, 1.79, 0.143);
    const corners = [[-0.54, -0.16], [0.54, -0.16], [0.54, 0.16], [-0.54, 0.16]].map(([x, y]) => project(camera, c.clone().add(new THREE.Vector3(x, y, 0))));
    done({ corners });
  },
  // The page's Move Media screens, face-on, with the face left dark for live content
  async faceon() {
    const { renderer, scene, env } = await nightStreet({});
    const blank = await screenTexture(B + 'movemedia-symbol-orange.svg', { scale: 0.0001, led: true, bg: '#0a0b0d' });
    const { group, lamps } = buildStreet({ envMap: env, size: [W, H] });
    scene.add(group);
    const taxi = buildTaxi({ screenMap: blank, envMap: env });
    scene.add(taxi.car);
    nightLights(scene, 0, lamps);
    const camera = new THREE.PerspectiveCamera(28, W / H, 0.05, 260);
    camera.position.set(-0.3, 1.86, 2.35);
    camera.lookAt(-0.3, 1.74, 0);
    const post = makeComposer(renderer, scene, camera, { strength: 0.8, radius: 0.6, threshold: 0.9, grain: 0.06, vignette: 0.5 });
    post.setSize(W, H, 1);
    const focus = camera.position.distanceTo(new THREE.Vector3(-0.3, 1.79, 0.143));
    post.composer.insertPass(new BokehPass(scene, camera, { focus, aperture: 0.006, maxblur: 0.01 }), 1);
    post.composer.render();
    const c = new THREE.Vector3(-0.3, 1.79, 0.143);
    const corners = [[-0.54, -0.16], [0.54, -0.16], [0.54, 0.16], [-0.54, 0.16]].map(([x, y]) => project(camera, c.clone().add(new THREE.Vector3(x, y, 0))));
    done({ corners });
  },
  // A side view of the taxi with a transparent background, in two layers: body, and one wheel
  async carside({ part = 'body' } = {}) {
    const renderer = makeRenderer(canvas, { alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const env = nightEnvironment(renderer);
    scene.environment = env;
    const map = await screenTexture(B + 'movemedia-horizontal-colour-on-dark.svg');
    const taxi = buildTaxi({ screenMap: map, envMap: env, glow: false, shadow: false });
    scene.add(taxi.car);
    if (part === 'body') taxi.wheels.forEach((w) => (w.visible = false));
    else {
      taxi.body.visible = false;
      taxi.wheels.forEach((w, i) => (w.visible = i === 0));
    }
    scene.add(new THREE.HemisphereLight('#2a3040', '#000000', 0.6));
    for (const [x, col, k] of [[-5, '#ffbf80', 60], [5, '#ffbf80', 40]]) {
      const s = new THREE.SpotLight(col, k, 26, 0.9, 0.8, 1.5);
      s.position.set(x, 7, 5);
      s.target.position.set(x * 0.3, 0.5, 0);
      scene.add(s, s.target);
    }
    const kick = new THREE.PointLight('#9fb4ff', 3, 14, 1.5);
    kick.position.set(-4, 3, -4);
    scene.add(kick);
    // long lens, almost orthographic side view
    const camera = new THREE.PerspectiveCamera(+(Q.get('fov') || 6.4), W / H, 1, 400);
    camera.position.set(0, 1.0, 40);
    camera.lookAt(0, 1.0, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.render(scene, camera);
    const wc = project(camera, new THREE.Vector3(1.4, WHEEL_R, 0.76));
    const wc2 = project(camera, new THREE.Vector3(-1.4, WHEEL_R, 0.76));
    const top = project(camera, new THREE.Vector3(0, WHEEL_R * 2, 0.76));
    const bot = project(camera, new THREE.Vector3(0, 0, 0.76));
    done({ wheelFront: wc, wheelRear: wc2, wheelPx: bot[1] - top[1], ground: bot[1] });
  },
};

const fn = shots[shot];
const params = JSON.parse(Q.get('o') || '{}');
await fn(params);
