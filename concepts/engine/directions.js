// The three directions of the concept round. Each one is a camera language and a way of editing:
//  A  The slider     a camera on a slider moving through the depth of each picture; chapters joined by a focus pull.
//  B  The crane      a camera that rises and travels sideways, like a crane or a tracking car; dissolves through black.
//  C  The edit       a fixed camera with a living lens (rack focus); cuts on movement and a match cut.
// Units: Y is the scroll position in screen heights; t is seconds since the opening appeared.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (x, a, b) => clamp((x - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const inout = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const expo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const lerp = (a, b, k) => a + (b - a) * k;
// a value that holds and then moves: keyframes [[x, v], ...] with smooth easing between them
export function keys(x, ks) {
  if (x <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (x <= ks[i][0]) { const [x0, v0] = ks[i - 1], [x1, v1] = ks[i]; return lerp(v0, v1, inout((x - x0) / (x1 - x0))); }
  return ks[ks.length - 1][1];
}

// the screen in the taxi pictures: off, then the face lights up as the visitor arrives
const power = (p) => smooth(seg(p, 0.04, 0.16));

// Zones are listed in order with their length in screen heights.
function zones(list) { let y = 0; const z = {}; let last; for (const [n, h] of list) { z[n] = [y, y + h]; y += h; last = n; } z[last][1] = y - 1; z.total = y; z.order = list.map((x) => x[0]); return z; }
const at = (Y, z) => seg(Y, z[0], z[1]);

/* ---------------------------------------------------------------- A: the slider */
const A = {
  name: 'A. The slider',
  zones: zones([['open', 2.0], ['t1', 1.1], ['taxi', 3.2], ['t2', 1.1], ['day', 1.7], ['t3', 1.0], ['end', 2.7]]),
  frame(Y, t, S) {
    const z = this.zones, o = at(Y, z.open), q1 = at(Y, z.t1), k = at(Y, z.taxi), q2 = at(Y, z.t2), d = at(Y, z.day), q3 = at(Y, z.t3), e = at(Y, z.end);
    const { city, roof, coast } = S.shots;
    // opening: the camera slides forward on its own, and on with the scroll; near hills grow faster than the city
    const auto = inout(clamp(t / 16));
    Object.assign(city.cam, { pivot: 0, x: 0, y: 0, at: S.portrait ? [0.45, 0.55] : [0.7, 0.52], steps: 1,
      dolly: 0.03 * auto + 0.10 * o, zoom: 1.035 + 0.012 * auto + 0.05 * o, focus: 0.05, aperture: 0, maxR: 0 });
    // focus pull (t1): the lens racks to the near hills until the city is pure out-of-focus light, then racks out of the roof
    if (Y < z.t1[1] + 0.01) {
      city.cam.focus = keys(q1, [[0, 0.05], [0.5, 0.95]]); city.cam.aperture = keys(q1, [[0, 0], [0.15, 46]]); city.cam.maxR = 34;
      Object.assign(roof.cam, { zoom: 1.0, dolly: 0, at: S.faceAt, pivot: 0, x: 0, y: 0, focus: keys(q1, [[0.5, 0.0], [1, 0.44]]), aperture: keys(q1, [[0.5, 46], [1, 7]]), maxR: 30 });
      roof.screen.power = 0;
      S.ui('tag', 1 - seg(o, 0.55, 0.85)); S.ui('cue', 1 - seg(o, 0.05, 0.25));
      S.ui('taxi1', 0); S.ui('taxi2', 0);
      return { a: city, b: roof, mode: 0, mix: smooth(seg(q1, 0.42, 0.62)) };
    }
    // taxi chapter: a slow push-in to the screen; the face lights up; the light falls on the roof
    if (Y < z.t2[0]) {
      roof.screen.power = power(k);
      Object.assign(roof.cam, { at: S.faceAt, to: [0.5, 0.42], toK: inout(k), pivot: 0, x: 0, y: 0, dolly: 0.16 * inout(k), zoom: 1.0 + (S.portrait ? 0.3 : 1.2) * inout(k), focus: 0.44, aperture: 7, maxR: 30 });
      S.ui('tag', 0); S.ui('cue', 0);
      S.ui('taxi1', seg(k, 0.16, 0.26) * (1 - seg(k, 0.5, 0.58))); S.ui('taxi2', seg(k, 0.62, 0.72) * (1 - seg(k, 0.92, 1)));
      return { a: roof, mode: 0, mix: 0 };
    }
    // focus pull (t2) from the roof to the coast road by day
    if (Y < z.day[0]) {
      roof.screen.power = 1;
      roof.cam.aperture = keys(q2, [[0, 7], [0.4, 46]]); roof.cam.focus = keys(q2, [[0, 0.44], [0.5, 1.0]]);
      coast.cam.flat = keys(q2, [[0.45, 26], [1, 0]]); coast.cam.zoom = 1.06;
      S.ui('taxi2', 0); S.ui('about', seg(q2, 0.75, 1));
      return { a: roof, b: coast, mode: 0, mix: smooth(seg(q2, 0.4, 0.6)) };
    }
    if (Y < z.t3[0]) {
      coast.cam.flat = 0; coast.cam.zoom = 1.06 - 0.04 * d;
      S.ui('about', 1 - seg(d, 0.8, 1)); S.ui('foot', 0);
      return { a: coast, mode: 0, mix: 0 };
    }
    // focus pull (t3) back to the city at night, and the bookend: the camera slides back to rest
    const back = { pivot: 0, x: 0, y: 0, at: S.portrait ? [0.45, 0.55] : [0.7, 0.52], focus: 0.05, steps: 1 };
    if (Y < z.end[0]) {
      coast.cam.flat = keys(q3, [[0, 0], [0.5, 26]]);
      Object.assign(city.cam, back, { dolly: 0.12, zoom: 1.1, focus: keys(q3, [[0.5, 0.95], [1, 0.05]]), aperture: keys(q3, [[0.5, 46], [1, 0]]), maxR: 34 });
      S.ui('about', 0); S.ui('foot', 0);
      return { a: coast, b: city, mode: 0, mix: smooth(seg(q3, 0.4, 0.6)) };
    }
    Object.assign(city.cam, back, { dolly: 0.12 * (1 - inout(e)), zoom: 1.0 + 0.1 * (1 - inout(e)), aperture: 0, maxR: 0 });
    S.ui('foot', seg(e, 0.45, 0.8));
    return { a: city, mode: 0, mix: 0 };
  },
};

/* ---------------------------------------------------------------- B: the crane */
const B = {
  name: 'B. The crane',
  zones: zones([['open', 2.0], ['t1', 1.1], ['taxi', 3.4], ['t2', 1.3], ['day', 1.7], ['t3', 1.1], ['end', 2.7]]),
  frame(Y, t, S) {
    const z = this.zones, o = at(Y, z.open), q1 = at(Y, z.t1), k = at(Y, z.taxi), q2 = at(Y, z.t2), d = at(Y, z.day), q3 = at(Y, z.t3), e = at(Y, z.end);
    const { city, roof, side, coast } = S.shots;
    // opening: a crane rising slowly over the hills: the near trees sink out of frame faster than the city
    const auto = inout(clamp(t / 18));
    Object.assign(city.cam, { pivot: 0, dolly: 0.02, at: S.portrait ? [0.45, 0.6] : [0.66, 0.55], steps: 1,
      x: -0.012 * auto - 0.02 * o, y: 0.025 * auto + 0.07 * o, zoom: 1.07, focus: 0.05, aperture: 0, maxR: 0 });
    // the black between two shots (a slow dissolve through black, with a short hold)
    const thru = (q) => (q < 0.42 ? 0.5 * q / 0.42 : q < 0.58 ? 0.5 : 0.5 + 0.5 * (q - 0.58) / 0.42);
    if (Y < z.t1[1]) {
      Object.assign(side.cam, { pivot: 0.34, at: S.sideAt, zoom: 1.12, dolly: 0, y: 0, x: 0.05, focus: 0.34, aperture: 0, maxR: 0 });
      side.screen.power = 0;
      S.ui('tag', 1 - seg(o, 0.55, 0.85)); S.ui('cue', 1 - seg(o, 0.05, 0.25)); S.ui('taxi1', 0); S.ui('taxi2', 0);
      return { a: city, b: side, mode: 1, mix: thru(q1) };
    }
    // taxi chapter: a tracking shot beside the taxi (the street slides past behind it), then close on the roof
    if (Y < z.t2[0]) {
      const p1 = seg(k, 0, 0.56), p2 = seg(k, 0.44, 1);
      side.screen.power = power(seg(k, 0, 0.4) * 0.4 + 0.0);
      side.screen.power = smooth(seg(k, 0.03, 0.14));
      Object.assign(side.cam, { pivot: 0.34, at: S.sideAt, zoom: 1.12 + 0.12 * inout(p1), dolly: 0.05 * p1, y: -0.01 * p1, x: 0.05 - 0.10 * inout(p1), focus: 0.34, aperture: 0, maxR: 0 });
      roof.screen.power = 1;
      Object.assign(roof.cam, { at: S.faceAt, pivot: 0, dolly: 0.04, x: 0.03 - 0.05 * inout(p2), y: 0.012 - 0.02 * inout(p2), zoom: 1.18 + 0.25 * inout(p2), focus: 0.44, aperture: 6, maxR: 30 });
      S.ui('tag', 0); S.ui('cue', 0);
      S.ui('taxi1', seg(k, 0.12, 0.2) * (1 - seg(k, 0.36, 0.42))); S.ui('taxi2', seg(k, 0.66, 0.74) * (1 - seg(k, 0.92, 1)));
      return { a: side, b: roof, mode: 1, mix: thru(seg(k, 0.4, 0.6)) };
    }
    // the dissolve through black into the coast road by day, with the chapter's first line in the black
    if (Y < z.day[0]) {
      roof.screen.power = 1;
      coast.cam.zoom = 1.08; coast.cam.flat = 0;
      S.ui('taxi2', 0); S.ui('card', seg(q2, 0.36, 0.47) * (1 - seg(q2, 0.56, 0.68)));
      S.ui('about', seg(q2, 0.8, 1));
      return { a: roof, b: coast, mode: 1, mix: thru(q2) };
    }
    if (Y < z.t3[0]) {
      coast.cam.zoom = 1.08 - 0.05 * d;
      S.ui('card', 0); S.ui('about', 1 - seg(d, 0.8, 1)); S.ui('foot', 0);
      return { a: coast, mode: 0, mix: 0 };
    }
    // the bookend: the crane comes down again to where it started
    const cam = (k2) => ({ pivot: 0, dolly: 0.02, at: S.portrait ? [0.45, 0.6] : [0.66, 0.55], steps: 1, zoom: 1.07,
      x: -0.032 * (1 - k2), y: 0.095 * (1 - k2), focus: 0.05, aperture: 0, maxR: 0 });
    if (Y < z.end[0]) {
      Object.assign(city.cam, cam(0));
      S.ui('about', 0);
      return { a: coast, b: city, mode: 1, mix: thru(q3) };
    }
    Object.assign(city.cam, cam(inout(e)));
    S.ui('foot', seg(e, 0.45, 0.8));
    return { a: city, mode: 0, mix: 0 };
  },
};

/* ---------------------------------------------------------------- C: the edit */
const C = {
  name: 'C. The edit',
  zones: zones([['open', 2.0], ['taxi', 3.4], ['t2', 1.4], ['city', 1.6], ['end', 2.8]]),
  frame(Y, t, S) {
    const z = this.zones, o = at(Y, z.open), k = at(Y, z.taxi), q2 = at(Y, z.t2), c = at(Y, z.city), e = at(Y, z.end);
    const { city, roof, side } = S.shots;
    // opening: the lens finds the city. Focus starts on the trees in front of the camera and racks to the lights.
    const rack = inout(seg(t, 0.4, 3.6));
    Object.assign(city.cam, { toK: 0, pivot: 0, x: 0, y: 0, dolly: 0.05 * o, at: S.portrait ? [0.45, 0.55] : [0.7, 0.52], steps: 1,
      zoom: 1.03 + 0.04 * o, focus: lerp(0.62, 0.05, rack), aperture: 34, maxR: 22 });
    // the cut on movement: the push-in into the city carries on as a push-in on the taxi
    const cut1 = 0.12;
    if (Y < z.taxi[0] + cut1 * (z.taxi[1] - z.taxi[0])) {
      if (Y > z.open[1] - 0.6) city.cam.zoom += 0.10 * seg(Y, z.open[1] - 0.6, z.taxi[0] + 0.4);
      S.ui('tag', 1 - seg(o, 0.55, 0.85)); S.ui('cue', 1 - seg(o, 0.05, 0.25)); S.ui('taxi1', 0); S.ui('taxi2', 0);
      return { a: city, mode: 0, mix: 0 };
    }
    // taxi chapter: wide, beside the moving taxi; then a cut on movement to the roof, still pushing in
    const p1 = seg(k, cut1, 0.52), p2 = seg(k, 0.52, 1);
    if (k < 0.52) {
      side.screen.power = smooth(seg(k, cut1 + 0.02, 0.24));
      Object.assign(side.cam, { pivot: 0.34, at: S.sideAt, x: 0, y: 0, zoom: 1.05 + 0.55 * p1, dolly: 0.08 * p1, focus: 0.34, aperture: 0, maxR: 0 });
      S.ui('tag', 0); S.ui('cue', 0);
      S.ui('taxi1', seg(k, 0.2, 0.27) * (1 - seg(k, 0.44, 0.5))); S.ui('taxi2', 0);
      return { a: side, mode: 0, mix: 0 };
    }
    roof.screen.power = 1;
    Object.assign(roof.cam, { toK: 0, at: S.faceAt, pivot: 0, x: 0, y: 0, zoom: 1.3 + (S.portrait ? 0.35 : 0.6) * p2, dolly: 0.04 + 0.08 * p2, focus: 0.44, aperture: 7, maxR: 30 });
    if (Y < z.t2[0]) {
      S.ui('taxi1', 0); S.ui('taxi2', seg(k, 0.62, 0.7) * (1 - seg(k, 0.9, 0.97)));
      return { a: roof, mode: 0, mix: 0 };
    }
    // the match cut: the camera closes on the orange symbol on the screen, it softens into a disc of light,
    // and the same disc is a light in the city at night; the camera pulls back and the lens finds the city
    if (Y < z.city[0] + 0.0001) {
      S.forceSymbol = true;
      const zin = inout(seg(q2, 0, 0.5));
      Object.assign(roof.cam, { at: S.symbolAt, toK: zin, zoom: roof.cam.zoom + (S.portrait ? 2.4 : 3.2) * zin, aperture: lerp(7, 60, seg(q2, 0.2, 0.5)), maxR: lerp(30, 44, seg(q2, 0.2, 0.5)), focus: lerp(0.44, 0.0, seg(q2, 0.2, 0.5)) });
      const zout = inout(seg(q2, 0.5, 1));
      Object.assign(city.cam, { at: S.portAt, toK: 1 - zout, pivot: 0, x: 0, y: 0, dolly: 0, steps: 1, zoom: lerp(9, 1.6, zout), focus: lerp(0.9, 0.05, seg(q2, 0.55, 1)), aperture: lerp(60, 0, seg(q2, 0.7, 1)), maxR: 44 });
      S.ui('taxi2', 0); S.ui('city1', seg(q2, 0.85, 1));
      return { a: roof, b: city, mode: 2, mix: q2 < 0.5 ? 0 : 1 };
    }
    S.forceSymbol = false;
    if (Y < z.end[0]) {
      Object.assign(city.cam, { at: S.portAt, pivot: 0, x: 0, y: 0, dolly: 0.04 * c, steps: 1, zoom: lerp(1.6, 1.12, inout(c)), focus: 0.05, aperture: 0, maxR: 0 });
      S.ui('city1', 1 - seg(c, 0.75, 0.95)); S.ui('foot', 0);
      return { a: city, mode: 0, mix: 0 };
    }
    // the bookend: the camera comes to rest on the opening picture; the lens lets the city go soft behind the footer
    Object.assign(city.cam, { at: S.portAt, pivot: 0, x: 0, y: 0, dolly: 0.04 * (1 - e), steps: 1, zoom: lerp(1.12, 1.0, inout(seg(e, 0, 0.6))),
      focus: lerp(0.05, 0.62, inout(seg(e, 0.35, 0.95))), aperture: 30, maxR: 22 });
    S.ui('city1', 0); S.ui('foot', seg(e, 0.5, 0.82));
    return { a: city, mode: 0, mix: 0 };
  },
};

export const DIRECTIONS = { a: A, b: B, c: C };
