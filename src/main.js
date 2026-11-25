// First-screen code only: loader, header, menu, form, clocks and video. The scroll scenes load after.
import './style.css';
import webm720 from './video/traffic-720.webm';
import mp4720 from './video/traffic-720.mp4';
import webmTall from './video/traffic-tall.webm';
import mp4Tall from './video/traffic-tall.mp4';
const VIDEO = { wide: [webm720, mp4720], tall: [webmTall, mp4Tall] };

const doc = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const lite = !!conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || '');
const portrait = () => matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------- loader: real progress, never longer than about 1.5 s ---------- */
const loader = document.querySelector('.loader');
const pctEl = document.querySelector('[data-pct]');
const heroImg = document.querySelector('.hero img');
const t0 = 0; // measured from the start of navigation, so the cap is real
let target = 0, shown = 0, done = false;
const parts = { fonts: 0.3, hero: 0.5, code: 0.2 };
const tick = (k) => { target += parts[k]; parts[k] = 0; };
document.fonts.ready.then(() => tick('fonts'));
const heroDone = () => tick('hero');
if (heroImg.complete && heroImg.naturalWidth) heroDone(); else { heroImg.addEventListener('load', heroDone, { once: true }); heroImg.addEventListener('error', heroDone, { once: true }); }
let motion = null;
const motionReady = import('./motion.js').then((m) => { motion = m; tick('code'); return m; });

function finish() {
  if (done) return; done = true;
  pctEl.textContent = '100';
  loader.classList.add('out');
  setTimeout(() => loader.classList.add('gone'), 850);
  motionReady.then((m) => m.start({ reduced, lite }));
}
(function frame(now) {
  if (done) return;
  const elapsed = now - t0;
  // the counter eases towards the real progress, and is allowed at most 1.5 s in total
  const goal = elapsed > 1500 ? 1 : Math.min(target, Math.max(0.12, elapsed / 700) * target + 0.0001);
  shown += (goal - shown) * 0.18;
  pctEl.textContent = String(Math.round(shown * 100));
  if ((target >= 0.999 && shown > 0.985 && elapsed > 600) || elapsed > 1500) return finish();
  requestAnimationFrame(frame);
})(t0);

/* ---------- header: hides going down, returns going up, follows the section colour ---------- */
const bar = document.querySelector('[data-bar]');
let menuOpen = false, closeTimer = 0, navigating = false;
let lastY = scrollY;
function onScroll() {
  const y = scrollY;
  bar.classList.toggle('solid', y > 40);
  if (Math.abs(y - lastY) > 6) { bar.classList.toggle('hide', y > lastY && y > 120 && !menuOpen && !navigating); lastY = y; }
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
// the header follows the colour of whatever sits under its own middle line
const themed = [...document.querySelectorAll('[data-theme]')];
let themeIO;
function watchTheme() {
  themeIO?.disconnect();
  const mid = Math.round(bar.offsetHeight / 2);
  themeIO = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) bar.classList.toggle('is-light', e.target.dataset.theme === 'light');
  }, { rootMargin: `-${mid}px 0px -${Math.max(0, innerHeight - mid - 1)}px 0px` });
  themed.forEach((s) => themeIO.observe(s));
}
watchTheme();
let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; watchTheme(); } });

/* ---------- full-screen menu ---------- */
const menu = document.getElementById('menu');
const openBtn = document.querySelector('[data-menu-open]');
const closeBtn = document.querySelector('[data-menu-close]');
function openMenu() {
  clearTimeout(closeTimer); menuOpen = true;
  menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true');
  doc.style.overflow = 'hidden';   // touch devices have no Lenis to stop
  requestAnimationFrame(() => menu.classList.add('open'));
  motion?.lenis?.stop(); closeBtn.focus();
}
function closeMenu(go) {
  if (!menuOpen) return;
  menuOpen = false;
  menu.classList.remove('open'); openBtn.setAttribute('aria-expanded', 'false');
  doc.style.overflow = '';
  motion?.lenis?.start();
  closeTimer = setTimeout(() => { menu.hidden = true; if (!go) openBtn.focus(); }, 450);
}
openBtn.addEventListener('click', openMenu);
closeBtn.addEventListener('click', () => closeMenu());
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
  if (e.key === 'Tab') { // keep focus inside the menu
    const f = [...menu.querySelectorAll('a,button')];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeMenu(true)));

/* ---------- anchor links go through the smooth scroll when it runs ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  const top = el.getBoundingClientRect().top + scrollY;
  const dist = Math.abs(top - scrollY);
  // the header stays in view during and after a jump the visitor asked for
  navigating = true; bar.classList.remove('hide');
  const arrived = () => { navigating = false; lastY = scrollY; };
  if (motion?.lenis) motion.lenis.scrollTo(top, { duration: Math.min(2.2, 0.9 + dist / 9000), force: true, onComplete: arrived });
  else if (reduced) { scrollTo(0, top); arrived(); }
  else glide(el, Math.min(1600, 700 + dist / 12), arrived);
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
});

/* Touch devices scroll natively (no Lenis). A jump is driven frame by frame, re-reading the target
   each frame, so pictures loading on the way or a scroll-trigger refresh cannot stop it short. */
function glide(el, ms, done) {
  const from = scrollY, t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  (function step(now) {
    const t = Math.min(1, (now - t0) / ms);
    const to = el.getBoundingClientRect().top + scrollY;
    scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step); else { scrollTo(0, el.getBoundingClientRect().top + scrollY); done(); }
  })(t0);
}

/* ---------- screens change on a steady 10-second clock, all in step ---------- */
const clocks = [...document.querySelectorAll('[data-clock]')];
setInterval(() => {
  const slot = Math.floor(Date.now() / 10000);
  for (const c of clocks) {
    const ps = c.querySelectorAll('picture');
    ps.forEach((p, i) => p.classList.toggle('on', i === slot % ps.length));
  }
}, 500);

/* ---------- the one filmed loop: loaded near the screen, played only on screen ---------- */
document.querySelectorAll('[data-video]').forEach((box) => {
  const v = box.querySelector('video');
  if (lite) return; // Save-Data or a slow connection: the still poster stays
  let loaded = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !loaded) {
      loaded = true;
      const [webm, mp4] = VIDEO[portrait() ? 'tall' : 'wide'];
      for (const [type, src] of [['video/webm', webm], ['video/mp4', mp4]]) {
        const s = document.createElement('source'); s.type = type; s.src = src; v.appendChild(s);
      }
      v.load();
      v.addEventListener('playing', () => v.classList.add('ready'), { once: true });
    }
  }, { rootMargin: '60% 0px' }).observe(box);
  new IntersectionObserver(([e]) => {
    if (!loaded || reduced) return;
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }, { threshold: 0.15 }).observe(box);
});

/* ---------- contact form: validation, then the visitor's email app or a copy ---------- */
const form = document.querySelector('[data-form]');
const EMAIL = 'contact@example.com'; // placeholder, to be replaced
const status = form.querySelector('.status');
function check() {
  let ok = true, first = null;
  const rules = [
    ['f-name', 'e-name', (v) => v.trim().length > 1, 'Please enter your name.'],
    ['f-email', 'e-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'Please enter a valid email address.'],
    ['f-msg', 'e-msg', (v) => v.trim().length > 9, 'Please tell us a little about your campaign.'],
  ];
  for (const [id, eid, test, msg] of rules) {
    const el = document.getElementById(id), err = document.getElementById(eid);
    const good = test(el.value);
    el.setAttribute('aria-invalid', String(!good));
    el.setAttribute('aria-describedby', eid);
    err.textContent = good ? '' : msg;
    if (!good) { ok = false; first ??= el; }
  }
  first?.focus();
  return ok;
}
function body() {
  const f = new FormData(form);
  return `Name: ${f.get('name')}\nCompany: ${f.get('company') || '-'}\nEmail: ${f.get('email')}\n\n${f.get('message')}`;
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!check()) { status.textContent = ''; return; }
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Campaign enquiry')}&body=${encodeURIComponent(body())}`;
  status.textContent = 'Your email app should open with the message ready. If it does not, use "Copy message".';
});
form.querySelector('[data-copy]').addEventListener('click', async () => {
  if (!check()) return;
  try { await navigator.clipboard.writeText(body()); status.textContent = 'Message copied. Paste it into an email to us.'; }
  catch { status.textContent = 'Copying is not available here. Please select the text and copy it.'; }
});
form.querySelectorAll('input,textarea').forEach((el) => el.addEventListener('input', () => {
  if (el.getAttribute('aria-invalid') === 'true') { el.removeAttribute('aria-invalid'); const err = document.getElementById(el.getAttribute('aria-describedby')); if (err) err.textContent = ''; }
}));
