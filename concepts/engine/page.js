// The page around the shared canvas: loader with real progress, smooth scrolling, the type,
// the frame loop, quality that adapts to the device, and a capture mode for frame-exact recordings.
import Lenis from 'lenis';
import { Stage, PhotoShot, FilmShot, composite, loadImage } from './gl.js';
import { makeContent, loopAt } from './screen.js';
import { DIRECTIONS, seg } from './directions.js';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !CAPTURE;
const dir = DIRECTIONS[document.body.dataset.dir];
const M = (f) => new URL(`./media/${f}`, document.baseURI).href;
const portrait = innerWidth / innerHeight < 0.8;
const touch = matchMedia('(pointer: coarse)').matches;

// a weaker graphics card or a phone gets fewer depth steps and a lower pixel ratio, without the visitor seeing it
function weakGpu() {
  if (Q.has('weak')) return true;
  if (CAPTURE) return false;
  const c = document.createElement('canvas').getContext('webgl2');
  if (!c) return true;
  const ext = c.getExtension('WEBGL_debug_renderer_info');
  const r = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  return touch || /intel(?!.*(iris xe|arc))|mali|adreno [1-5]|swiftshader|llvmpipe/i.test(r);
}

const spacer = document.querySelector('.track');
spacer.style.height = `${dir.zones.total * 100}svh`;

/* ---------- loader: real progress, up to about 3 seconds ---------- */
const pct = document.querySelector('[data-pct]');
let progress = 0, shown = 0;
const steps = [];
const track = (p, w = 1) => { steps.push(w); p.then(() => { progress += w; }); return p; };
(function counter() {
  const total = steps.reduce((a, b) => a + b, 0) || 1;
  shown += (progress / total - shown) * 0.14;
  pct.textContent = String(Math.min(100, Math.round(shown * 100)));
  if (!document.documentElement.classList.contains('ready')) requestAnimationFrame(counter);
})();

/* ---------- type: overlays that the director fades and reveals line by line ---------- */
const ui = {};
document.querySelectorAll('[data-ui]').forEach((el) => {
  ui[el.dataset.ui] = { el, v: -1, lines: [...el.querySelectorAll('.ln > i')] };
});
const ease = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const touched = new Set();
function setUi(name, v) {
  touched.add(name);
  const u = ui[name]; if (!u) return;
  v = Math.round(v * 1000) / 1000;
  if (u.v === v) return; u.v = v;
  u.el.style.visibility = v <= 0 ? 'hidden' : 'visible';
  u.el.style.pointerEvents = v > 0.9 ? 'auto' : 'none';
  // a real mask: each line rises from behind its own edge, a little after the one before
  const n = u.lines.length || 1;
  u.lines.forEach((ln, i) => {
    const k = ease(Math.min(1, Math.max(0, v * (1 + 0.18 * (n - 1)) - 0.18 * i)));
    ln.style.transform = `translate3d(0, ${(1 - k) * 105}%, 0)`;
  });
  u.el.style.opacity = u.lines.length ? (v < 1 ? Math.min(1, v * 3) : 1) : v;
}

async function main() {
  let stage;
  try { stage = new Stage(document.querySelector('canvas.gl'), { weak: weakGpu(), capture: CAPTURE }); }
  catch (e) { document.documentElement.classList.add('nogl'); return; }
  const big = !portrait && !stage.weak && (innerWidth * devicePixelRatio > 2200 || Q.has('big'));
  const cityImg = portrait ? 'city-tall-1200.jpg' : big ? 'city-3840.jpg' : 'city-2560.jpg';
  const roofImg = portrait ? 'roof-tall-1000.jpg' : big ? 'roof-plate-3840.jpg' : 'roof-plate-2400.jpg';
  const [cc, cd, rc, rd, sc, sd, rgeo, sgeo, content] = await Promise.all([
    track(loadImage(M(cityImg)), 3), track(loadImage(M(portrait ? 'city-tall-depth.png' : 'city-depth.png'))),
    track(loadImage(M(roofImg)), 2), track(loadImage(M(portrait ? 'roof-tall-depth.png' : 'roof-depth8.png'))),
    track(loadImage(M('side-plate-2400.jpg')), 2), track(loadImage(M('side-depth.png'))),
    track(fetch(M(portrait ? 'roof-tall-geo.json' : 'roof-geo.json')).then((r) => r.json())),
    track(fetch(M('side-geo.json')).then((r) => r.json())),
    track(makeContent(stage, { logoUrl: M('logo-h-dark.svg'), symbolUrl: M('symbol-orange.svg') })),
  ]);
  // the side view's housing is a rectangle in the picture: describe it as a face, like the roof view
  const [hx, hy, hw, hh] = sgeo.housing, [px, py, pw, ph] = sgeo.panel;
  sgeo.face = [[hx, hy], [hx + hw, hy], [hx + hw, hy + hh], [hx, hy + hh]];
  sgeo.panelInFace = [(px - hx) / hw, (py - hy) / hh, pw / hw, ph / hh];
  sgeo.reflAxis = 2; sgeo.reflStrength = 0;
  rgeo.reflEnd = rgeo.reflEnd || 1;
  const city = new PhotoShot(stage, { color: cc, depth: cd, name: 'city', focal: portrait ? [0.5, 0.5] : [1, 0.5] });
  const roof = new PhotoShot(stage, { color: rc, depth: rd, name: 'roof', focal: [0.5, portrait ? 0.62 : 0.6], screen: { geo: rgeo, power: 0, dots: 0.8, content } });
  const side = new PhotoShot(stage, { color: sc, depth: sd, name: 'side', focal: [0.47, 0.42], screen: { geo: sgeo, power: 0, dots: 0.4, content } });
  const video = document.querySelector('video.coast');
  video.src = M(portrait ? 'port-lighthouse-tall-1080.mp4' : 'coast-highway-1080.mp4');
  const coast = new FilmShot(stage, { video, name: 'coast', focal: [0.5, 0.5] });
  track(new Promise((r) => { if (video.readyState >= 2) r(); else video.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 2500); }), 2);

  // where things are in each picture, for the camera
  const faceCentre = (g, u, v) => {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = g.face;
    const top = [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], bot = [x3 + (x2 - x3) * u, y3 + (y2 - y3) * u];
    return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
  };
  const S = {
    portrait, ui: setUi, shots: { city, roof, side, coast }, forceSymbol: false,
    faceAt: faceCentre(rgeo, 0.5, 0.5), symbolAt: faceCentre(rgeo, 0.5, 0.49),
    sideAt: [hx + hw / 2, hy + hh * 1.6],
    portAt: portrait ? [0.2953, 0.5118] : [0.7798, 0.5118],
  };

  /* ---------- scrolling: one Lenis instance on desktop, native on touch ---------- */
  let lenis = null;
  if (!CAPTURE && !touch && !reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  }

  /* ---------- the frame ---------- */
  let t0 = null, clock = 0, last = 0, dirty = true, lastY = -1, slow = 0;
  const fa = stage.fbo('A', 2, 2);
  function render(Y, t) {
    stage.resize();
    const A_ = stage.fbo('A', stage.W, stage.H), B_ = stage.fbo('B', stage.W, stage.H);
    touched.clear();
    const r = dir.frame(Y, t, S);
    for (const n in ui) if (!touched.has(n)) setUi(n, 0);
    // the screen: its message from the 10-second clock, its power from the scroll
    const m = loopAt(t);
    const changed = S.forceSymbol ? content.set(2, 0) : content.set(m.index, m.k);
    r.a.render(A_, t);
    if (r.b && r.mix > 0) r.b.render(B_, t);
    composite(stage, A_, r.b && r.mix > 0 ? B_ : null, { mix: r.b ? r.mix : 0, mode: r.mode, fade: 1, time: t, grain: 0.03 });
    // only the film that is on screen plays
    const filmOn = r.a === coast || (r.b === coast && r.mix > 0);
    if (!CAPTURE) { if (filmOn && video.paused) video.play().catch(() => {}); if (!filmOn && !video.paused) video.pause(); }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    lenis?.raf(now);
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    const Y = scrollY / innerHeight;
    // adaptive quality: if frames run long for a while, draw fewer pixels (the change is not visible)
    const dt = now - last; last = now;
    if (dt > 24 && dt < 200) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 40 && stage.quality > 0.55) { stage.quality -= 0.1; slow = 0; }
    render(Y, reduced ? 0 : t);
    lastY = Y;
  }

  document.documentElement.classList.add('ready');
  pct.textContent = '100';
  if (CAPTURE) {
    // frame-exact capture: the recorder sets the scroll position and the clock, then reads the frame
    window.__frame = async (y, t) => {
      window.scrollTo(0, y);
      const Y = y / innerHeight;
      if (video.duration) {
        const vt = (t % (video.duration - 0.1));
        if (Math.abs(video.currentTime - vt) > 0.01) {
          await new Promise((res) => { video.addEventListener('seeked', res, { once: true }); video.currentTime = vt; setTimeout(res, 1500); });
        }
      }
      render(Y, t);
      stage.gl.finish();
      return true;
    };
    window.__total = dir.zones.total; window.__zones = dir.zones;
    window.__ready = true;
    return;
  }
  requestAnimationFrame(loop);
}
main();
