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

  /* how it works: four steps, each held for a full screen of scroll */
  const steps = $$('.step'), num = $('[data-step-n]'), bar = $('[data-step-bar]');
  let shown = -1;
  const stl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    trigger: '.steps', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (st) => {
      const n = Math.min(3, Math.floor(st.progress * 4 + 0.0001));
      if (n !== shown) { shown = n; num.textContent = '0' + (n + 1); }
      bar.style.transform = `scaleX(${(n + 1) / 4})`;
    },
  } });
  stl.set({}, {}, 4);   // four equal shares of the pin
  steps.forEach((s, i) => {
    const img = $('.step-media picture, .step-media .loop', s);
    stl.fromTo(img, { scale: 1.05 }, { scale: 1, duration: 1 }, i);
    if (i > 0) stl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.06, immediateRender: false }, i);
    if (i < steps.length - 1) stl.fromTo(s, { opacity: 1 }, { opacity: 0, duration: 0.06, immediateRender: false }, i + 0.94);
  });

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

  /* who it is for: each scene settles as it arrives over the last */
  const scenes = $$('.scene');
  scenes.forEach((s, i) => {
    const txt = $('.scene-text', s), next = scenes[i + 1];
    gsap.fromTo($('.scene-media', s), { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top top', scrub: true } });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: s, start: 'top 55%', end: next ? 'bottom top' : 'bottom bottom', scrub: true } });
    tl.fromTo(txt, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25 });
    if (next) tl.to(txt, { opacity: 1, duration: 0.3 }).to(txt, { opacity: 0, y: -10, duration: 0.2 }).to({}, { duration: 0.15 });
  });

  /* the bookend: the opening picture returns and the camera pulls back to rest */
  gsap.fromTo('.foot-inner', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.foot-mark', { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 55%', end: 'top 10%', scrub: true } });

  fades(false);
  const refresh = () => ScrollTrigger.refresh();
  document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
  $$('img[loading="lazy"]').forEach((i) => i.addEventListener('load', debounce(refresh, 300), { once: true }));
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
