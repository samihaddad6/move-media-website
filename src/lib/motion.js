// One scroll source and one frame loop for the whole page.
// Lenis smooths wheel input on desktop; touch keeps native scrolling. gsap.ticker drives Lenis,
// ScrollTrigger and every canvas, so nothing runs in a second requestAnimationFrame loop.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const frameFns = new Set();
const scrollFns = new Set();
export let lenis = null;

export function onFrame(fn) {
  frameFns.add(fn);
  return () => frameFns.delete(fn);
}
export function onScroll(fn) {
  scrollFns.add(fn);
  return () => scrollFns.delete(fn);
}

let started = false;
export function startMotion() {
  if (started) return;
  started = true;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, anchors: false });
    lenis.on('scroll', ScrollTrigger.update);
    window.__lenis = lenis;
  }
  let lastY = window.scrollY;
  const emitScroll = () => {
    const y = lenis ? lenis.scroll : window.scrollY;
    if (y === lastY) return;
    const dir = y > lastY ? 1 : -1;
    lastY = y;
    scrollFns.forEach((f) => f(y, dir));
  };
  if (!lenis) window.addEventListener('scroll', emitScroll, { passive: true });
  let last = performance.now();
  gsap.ticker.add((time) => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (lenis) {
      lenis.raf(time * 1000);
      emitScroll();
    }
    frameFns.forEach((f) => f(dt, now));
  });
  gsap.ticker.lagSmoothing(0);
  // measurements change once fonts and images settle
  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh, { once: true });
}

export function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  if (lenis) lenis.scrollTo(y, { duration: Math.min(2.2, 0.9 + Math.abs(y - window.scrollY) / 6000), easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: 'auto' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const range = (p, a, b) => clamp01((p - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
