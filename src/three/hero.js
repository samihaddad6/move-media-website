// The opening scene: a taxi on a wet Beirut street at night; the camera circles it and rises to its screen.
import * as THREE from 'three';
import { makeRenderer, makeComposer, nightEnvironment, screenTexture } from './kit.js';
import { buildTaxi, WHEEL_R } from './taxi.js';
import { buildStreet } from './street.js';

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Camera keyframes relative to the car: [p, position, target, fov]
const PATHS = {
  wide: [
    [0.0, [5.4, 0.36, 5.0], [-3.75, 2.0, -1.75], 34],
    [0.22, [3.6, 0.48, 6.0], [-1.6, 1.2, -0.7], 32],
    [0.42, [0.6, 0.72, 6.5], [-0.6, 1.15, 0], 30],
    [0.6, [-1.5, 1.55, 5.1], [-0.4, 1.5, 0], 30],
    [0.76, [-0.6, 1.98, 2.7], [-0.3, 1.79, 0], 30],
    [0.9, [-0.3, 1.79, 1.3], [-0.3, 1.79, 0], 30],
    [1.0, [-0.3, 1.79, 0.46], [-0.3, 1.79, 0], 30],
  ],
  tall: [
    [0.0, [4.9, 0.55, 5.9], [-0.9, 2.0, -0.3], 50],
    [0.22, [4.6, 0.55, 5.0], [-0.8, 1.3, -0.3], 48],
    [0.42, [1.2, 0.8, 5.6], [-0.4, 1.3, 0], 46],
    [0.6, [-1.2, 1.7, 4.6], [-0.35, 1.6, 0], 44],
    [0.76, [-0.5, 2.0, 2.6], [-0.3, 1.79, 0], 42],
    [0.9, [-0.3, 1.79, 1.7], [-0.3, 1.79, 0], 40],
    [1.0, [-0.3, 1.79, 0.62], [-0.3, 1.79, 0], 40],
  ],
};

function makePath(keys) {
  const ps = keys.map((k) => k[0]);
  const pos = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const tgt = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
  const n = keys.length - 1;
  // map progress p to curve parameter u so each keyframe lands on its own p
  const toU = (p) => {
    for (let i = 0; i < n; i++) if (p <= ps[i + 1]) return (i + ease((p - ps[i]) / (ps[i + 1] - ps[i]))) / n;
    return 1;
  };
  const fov = (p) => {
    for (let i = 0; i < n; i++) if (p <= ps[i + 1]) return THREE.MathUtils.lerp(keys[i][3], keys[i + 1][3], ease((p - ps[i]) / (ps[i + 1] - ps[i])));
    return keys[n][3];
  };
  return { at: (p, o, t) => (pos.getPoint(toU(p), o), tgt.getPoint(toU(p), t)), fov };
}

// Distance travelled: the car drives on and brakes to a stop as the camera reaches the roof.
const STOP = 0.8, DIST = 22;
const travel = (p) => DIST * (1 - Math.pow(1 - clamp01(p / STOP), 2));

export async function createHero(canvas, { logo, width, height, dpr = 1.5, onReady } = {}) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07080b');
  scene.fog = new THREE.FogExp2('#0b0a0c', 0.05);
  const env = nightEnvironment(renderer);
  scene.environment = env;

  let W = width, H = height, DPR = dpr;
  const { group: street, lamps, mirror } = buildStreet({ envMap: env, size: [W * DPR, H * DPR] });
  scene.add(street);

  const map = await screenTexture(logo);
  const taxi = buildTaxi({ screenMap: map, envMap: env });
  scene.add(taxi.car);
  const other = buildTaxi({ screenMap: map, envMap: env, glow: false });
  other.car.position.set(-21, 0, -3.3);
  scene.add(other.car);

  // a handful of real lights; everything else is baked into textures
  scene.add(new THREE.HemisphereLight('#1c2230', '#000000', 0.35));
  const head = new THREE.SpotLight('#fff1d6', 14, 30, 0.38, 0.7, 1.3);
  const lampA = new THREE.SpotLight('#ffbf80', 55, 22, 0.95, 0.75, 1.6);
  const lampB = lampA.clone();
  const rim = new THREE.SpotLight('#ffd2a0', 38, 30, 0.5, 0.8, 1.4);
  const glow = new THREE.PointLight('#ff5a1f', 1.6, 5, 1.8);
  const kick = new THREE.PointLight('#9fb4ff', 2.5, 14, 1.5);
  for (const l of [head, lampA, lampB, rim]) scene.add(l, l.target);
  scene.add(glow, kick);

  const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 220);
  const post = makeComposer(renderer, scene, camera, { strength: 0.85, radius: 0.55, threshold: 0.92, grain: 0.065, vignette: 0.6 });

  let path = makePath(W / H < 0.9 ? PATHS.tall : PATHS.wide);
  const o = new THREE.Vector3(), t = new THREE.Vector3();
  let progress = 0, dirty = true, fade = 0;

  function place(p) {
    const d = travel(p);
    const v = p < STOP ? 1 - p / STOP : 0; // relative speed
    const cx = d;
    taxi.car.position.x = cx;
    for (const w of taxi.wheels) w.rotation.z = -d / WHEEL_R;
    // suspension: road texture while moving, nose dip under braking, a soft rebound after the stop
    const bounce = (0.006 * Math.sin(d * 1.7) + 0.003 * Math.sin(d * 3.9)) * v;
    const after = p > STOP ? (p - STOP) / 0.12 : 0;
    const settle = p > STOP ? 0.009 * Math.exp(-after * 3.2) * Math.cos(after * 9) : 0;
    const dip = p < STOP ? -0.006 * clamp01((p - 0.45) / 0.3) : 0;
    taxi.body.position.y = bounce;
    taxi.body.rotation.z = dip + settle;
    // the other taxi keeps driving in its lane
    other.car.position.x = -21 + d * 1.25;
    for (const w of other.wheels) w.rotation.z = -(d * 1.25) / WHEEL_R;

    // the two lamps nearest the car get real light
    const near = lamps.slice().sort((a, b) => Math.abs(a.x - cx - 1) - Math.abs(b.x - cx - 1));
    lampA.position.copy(near[0]);
    lampA.target.position.set(near[0].x, 0, near[0].z);
    lampB.position.copy(near[1]);
    lampB.target.position.set(near[1].x, 0, near[1].z);
    head.position.set(cx + 2.4, 0.7, 0);
    head.target.position.set(cx + 16, 0, 0);
    rim.position.set(cx - 9, 6.5, -4);
    rim.target.position.set(cx, 1.2, 0);
    glow.position.set(cx - 0.3, 1.9 + bounce, 1.2);
    kick.position.set(cx - 6, 3, -3);

    path.at(p, o, t);
    camera.position.set(cx + o.x, o.y, o.z);
    camera.lookAt(cx + t.x, t.y + (o.y > 1.5 ? bounce : 0), t.z);
    camera.fov = path.fov(p);
    camera.updateProjectionMatrix();
    post.grain.uniforms.uFade.value = fade;
  }

  function resize(w, h, dprIn = DPR) {
    W = w;
    H = h;
    DPR = dprIn;
    renderer.setPixelRatio(DPR);
    renderer.setSize(W, H, false);
    post.setSize(W, H, DPR);
    if (mirror) mirror.getRenderTarget().setSize(Math.round(W * DPR * 0.35), Math.round(H * DPR * 0.35));
    camera.aspect = W / H;
    path = makePath(W / H < 0.9 ? PATHS.tall : PATHS.wide);
    dirty = true;
  }
  resize(W, H, DPR);

  function render(force = false) {
    if (!dirty && !force) return false;
    place(progress);
    post.composer.render();
    dirty = false;
    return true;
  }

  render(true);
  onReady && onReady();
  return {
    setProgress(p, f = 0) {
      if (p !== progress || f !== fade) {
        progress = p;
        fade = f;
        dirty = true;
      }
    },
    render,
    resize: (w, h, d) => resize(w, h, d),
    dispose() {
      renderer.dispose();
    },
    renderer,
  };
}
