// Scroll scenes. One Lenis instance on gsap.ticker; every scene is scrubbed by ScrollTrigger.
// Only transform and opacity move (the one exception, allowed by the brief: one line drawing itself).
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export let lenis = null;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const inOut = gsap.parseEase('power2.inOut');

export function start({ reduced }) {
  const doc = document.documentElement;
  if (reduced) { doc.classList.add('no-motion'); fades(true); return; }

  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!touch) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
  }
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });   // the phone's address bar showing or hiding must not move the pins
  const mm = gsap.matchMedia();
  const phone = () => matchMedia('(max-width: 700px)').matches;

  /* opening: a slow push-in, like a camera on a slider; the line and the cue let go */
  gsap.to('.hero-media', { scale: 1.08, yPercent: 3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.fromTo(['.hero-text', '.hero-cue', '.hero-cap'], { opacity: 1, y: 0 }, { opacity: 0, y: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '22% top', scrub: true } });
  const drift = $('.drift');
  new IntersectionObserver(([e]) => { drift.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; }).observe($('.hero'));

  /* taxi chapter: from the street to the roof, a push-in and a soft cross-fade */
  mm.add({ d: '(min-width: 701px)', m: '(max-width: 700px)' }, (c) => {
    const f1 = $('.taxi-frame.f1'), f2 = $('.taxi-frame.f2');
    gsap.set(f1, { transformOrigin: c.conditions.d ? '47% 41%' : '50% 40%' });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.taxi', start: 'top top', end: 'bottom bottom', scrub: true } });
    tl.fromTo(f1, { scale: 1, opacity: 1 }, { scale: c.conditions.d ? 1.15 : 1.08, duration: 0.46 }, 0)
      .fromTo('.taxi-text.t1', { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.08 }, 0.34)
      .to(f1, { opacity: 0, duration: 0.06 }, 0.44)
      .fromTo(f2, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.07 }, 0.5)
      .fromTo('.taxi-text.t2', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.08 }, 0.58)
      .to(f2, { scale: 1.04, duration: 0.42 }, 0.58);
  });

  /* pictures that grow: the frame scales open while the picture inside is counter-scaled */
  $$('[data-grow]').forEach((g) => {
    const frame = $('.grow-frame', g), inner = $('.grow-inner', g), figs = $('.figures', g), cap = $('[data-grow-cap]', g);
    const apply = (p) => {
      const cs = getComputedStyle(g);
      const x0 = parseFloat(cs.getPropertyValue('--x0')) || 1, y0 = parseFloat(cs.getPropertyValue('--y0')) || 1;
      const ty = parseFloat(cs.getPropertyValue('--ty')) || 0;
      const e = inOut(clamp01(p / 0.78));
      const sx = lerp(x0, 1, e), sy = lerp(y0, 1, e), z = lerp(1.18, 1, e);
      frame.style.transform = `scale(${sx}, ${sy})`;
      inner.style.transform = `translateY(${(ty * (1 - e)) / sy}%) scale(${z / sx}, ${z / sy})`;
      figs?.classList.toggle('on', p > 0.82);
      cap?.classList.toggle('on', p > 0.82);
    };
    const st = ScrollTrigger.create({ trigger: g, start: 'top top', end: 'bottom bottom', onUpdate: (s) => apply(s.progress), onRefresh: (s) => apply(s.progress) });
    apply(st.progress);
  });

  setupHow();

  /* close-ups: pictures of different sizes drift at different speeds */
  $$('[data-speed]').forEach((f) => {
    const sp = parseFloat(f.dataset.speed);
    gsap.fromTo(f, { y: () => -sp * innerHeight }, { y: () => sp * innerHeight, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  /* the route draws itself, once, as one thin line */
  gsap.to('.route-line', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.route', start: 'top 85%', end: 'bottom 45%', scrub: true } });

  /* coverage: the pictures move apart around the heading */
  $$('.k').forEach((k) => {
    const [dx, dy] = k.dataset.k.split(',').map(Number);
    gsap.fromTo(k, { x: () => -dx * innerWidth * 0.03, y: () => -dy * innerHeight * 0.04 },
      { x: () => dx * innerWidth * 0.09, y: () => dy * innerHeight * 0.16, ease: 'none', scrollTrigger: { trigger: '.constellation', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  setupWho();

  /* the bookend: the opening picture returns and the camera pulls back to rest */
  gsap.fromTo('.foot-inner', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.foot-mark', { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 55%', end: 'top 10%', scrub: true } });

  fades(false);
  const refresh = () => ScrollTrigger.refresh();
  document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
  $$('img[loading="lazy"]').forEach((i) => i.addEventListener('load', debounce(refresh, 300), { once: true }));
}

/* ---------- how it works ----------
   One pinned stage, four equal quarters, as in version 2: the advertisement arrives on the face of a real
   rooftop screen (its rows light from the top), the loop runs in real time with a 10-second timer, the
   screen shrinks into one light among the taxis in the city, and that light travels a route through it. */
const range = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function setupHow() {
  const el = $('.how');
  if (!el) return;
  const stage = $('.how-stage', el), shot = $('.shot-box', el), shotWrap = $('.how-shot', el);
  const cityBox = $('.city-box', el), cityWrap = $('.how-city', el), wipe = $('.wipe', el);
  const shots = $$('.shots picture', el), nums = $$('.how-num', el), steps = $$('.how-step', el), fills = $$('.how-bar i', el);
  const timer = $('.how-timer', el), ring = $('.how-timer .t', el), sec = $('.how-sec', el);
  let geo = null;

  const measure = () => {
    const f = $(matchMedia('(max-width: 700px) and (orientation: portrait)').matches ? '.fleet-m' : '.fleet-d', el);
    const cs = getComputedStyle(shot);
    const v = (k) => parseFloat(cs.getPropertyValue(k));
    const [pl, pt, pw, ph] = ['--pl', '--pt', '--pw', '--ph'].map(v);
    const ty = parseFloat(cs.transform === 'none' ? '-64' : '0');
    const vw = innerWidth, vh = stage.offsetHeight, sw = shot.offsetWidth, sh = shot.offsetHeight;
    const yShift = matchMedia('(max-width: 700px) and (orientation: portrait)').matches ? 0.56 : 0.64;
    const pcx = vw / 2 - sw / 2 + (sw * (pl + pw / 2)) / 100;
    const pcy = vh / 2 - yShift * sh + (sh * (pt + ph / 2)) / 100;
    const [tx, ty2] = f.dataset.target.split(',').map(Number);
    const cw = cityBox.offsetWidth, ch = cityBox.offsetHeight;
    const path = $('.trail', f);
    geo = { dx: vw / 2 + (tx / 100 - 0.5) * cw - pcx, dy: vh / 2 + (ty2 / 100 - 0.5) * ch - pcy, yShift,
      dots: $$('i', f), path, len: path.getTotalLength(), light: $('.taxi-light', f) };
    shot.style.transformOrigin = `${pl + pw / 2}% ${pt + ph / 2}%`;
    cityBox.style.transformOrigin = `${tx}% ${ty2}%`;
  };

  let loopOn = false, lastPop = '', raf = 0;
  const render = (p) => {
    if (!geo) measure();
    const seg = p * 4;
    // the copy: each step holds the middle of its quarter and hands over at the joins
    for (let i = 0; i < 4; i++) {
      const d = seg - (i + 0.5);
      const o = (i === 0 && seg < 0.5) || (i === 3 && seg > 3.5) ? 1 : clamp01(1 - (Math.abs(d) - 0.36) / 0.12);
      const y = o < 1 ? d * -26 : 0;
      nums[i].style.opacity = steps[i].style.opacity = String(o);
      nums[i].style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      steps[i].style.transform = `translate3d(0, ${(y * 0.6).toFixed(1)}px, 0)`;
      steps[i].style.visibility = o < 0.01 ? 'hidden' : '';
      fills[i].style.transform = `scaleX(${clamp01(seg - i).toFixed(4)})`;
    }
    // 1. the advertisement arrives: the face lights row by row, from the top
    wipe.style.transform = `translate3d(0, ${(easeOut(range(p, 0.03, 0.18)) * 101).toFixed(2)}%, 0)`;
    // 2. the loop: a 10-second timer, the messages change on the clock
    const tOn = smooth(range(p, 0.25, 0.29)) * (1 - smooth(range(p, 0.48, 0.52)));
    timer.style.opacity = tOn.toFixed(3);
    const on = seg >= 0.95 && seg < 2.1;
    if (on !== loopOn) { loopOn = on; if (on) tick(); else { cancelAnimationFrame(raf); show(0); } }
    // 3. one screen becomes one light among the fleet
    const s3 = smooth(range(p, 0.5, 0.64));
    shot.style.transform = `translate(calc(-50% + ${(geo.dx * s3).toFixed(1)}px), calc(-${geo.yShift * 100}% + ${(geo.dy * s3).toFixed(1)}px)) scale(${(1 - s3 * 0.985).toFixed(4)})`;
    shotWrap.style.opacity = String(1 - range(p, 0.6, 0.66));
    const cityIn = smooth(range(p, 0.5, 0.6));
    const z = smooth(range(p, 0.75, 1));
    cityWrap.style.opacity = cityIn.toFixed(3);
    cityBox.style.transform = `translate(-50%, -50%) scale(${(1.12 - 0.12 * cityIn + 0.1 * z).toFixed(4)})`;
    const pop = range(p, 0.56, 0.74);
    const key = pop.toFixed(3);
    if (key !== lastPop) {
      lastPop = key;
      geo.dots.forEach((d, i) => { d.style.opacity = pop * 1.5 - (i / geo.dots.length) * 0.5 > 0 ? '0.95' : '0'; });
    }
    // 4. that light travels the city, drawing its route as it goes
    const r = range(p, 0.77, 0.97);
    geo.path.style.strokeDashoffset = String(1 - r);
    const pt = geo.path.getPointAtLength(r * geo.len);
    geo.light.style.opacity = String(range(p, 0.75, 0.77));
    geo.light.style.transform = `translate3d(${(pt.x / 100) * cityBox.offsetWidth}px, ${(pt.y / 100) * cityBox.offsetHeight}px, 0)`;
  };
  // the loop runs in real time, in step with every other screen on the page
  const show = (k) => shots.forEach((s, i) => s.classList.toggle('on', i === k));
  const tick = () => {
    const now = Date.now(), f = (now % 10000) / 10000;
    ring.style.strokeDashoffset = String(1 - f);
    sec.textContent = String(10 - Math.floor(f * 10));
    show(Math.floor(now / 10000) % shots.length);
    raf = requestAnimationFrame(tick);
  };
  ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom',
    onUpdate: (s) => render(s.progress), onRefresh: (s) => { measure(); render(s.progress); } });
  render(0);
}

/* ---------- who it is for: the list; the line in the middle of the screen opens ---------- */
function setupWho() {
  const rows = $$('.who-row');
  let current = -1;
  const set = (i) => {
    if (i === current) return;
    current = i;
    rows.forEach((r, k) => {
      r.classList.toggle('is-open', k === i);
      const v = $('video', r);
      if (v && v.querySelector('source')) { if (k === i) v.play().catch(() => {}); else v.pause(); }
    });
  };
  rows.forEach((row, i) => ScrollTrigger.create({ trigger: row, start: 'top 58%', end: 'bottom 42%', onToggle: (s) => s.isActive && set(i) }));
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  rows.forEach((r, i) => {
    if (fine) r.addEventListener('pointerenter', () => set(i));
    r.addEventListener('focusin', () => set(i));
  });
}

/* headings and statements rise into place once, on an expo ease */
function fades(still) {
  const els = $$('.display, .statement, .idea, .lead, .close-grid figcaption, .why-list .idea-fig');
  if (still) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.style.opacity = 1; io.unobserve(e.target); } }));
    els.forEach((el) => { el.style.opacity = 0; el.style.transition = 'opacity .3s'; io.observe(el); });
    return;
  }
  els.forEach((el) => gsap.from(el, { opacity: 0, y: 28, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
}

function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
