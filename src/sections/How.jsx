import { useEffect, useMemo, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import faceon from '../assets/img/faceon.webp';
import city from '../assets/img/aerial-wide.webp';
import data from '../data/aerial.json';
import { ScreenLogo, ScreenSymbol, ScreenLine } from '../components/Screen.jsx';
import { STEPS, SCREEN_LINES } from '../content.js';
import { onFrame, reduced, range, smooth, easeOut, clamp01 } from '../lib/motion.js';
import { resample, pointAt } from '../lib/geo.js';

const TICKS = 60;
// where the screen face sits inside the baked frame, in % of the frame
export const FACE = { left: 19.45, top: 31.54, width: 61.1, height: 29.06 };

export default function How() {
  const root = useRef(null);
  const route = useMemo(() => resample(data.wide.route, 160), []);
  const fleet = data.wide.fleet;

  useEffect(() => {
    const el = root.current;
    const q = (s) => el.querySelector(s);
    const qa = (s) => Array.from(el.querySelectorAll(s));
    const media = q('.how__media'), cityBox = q('.how__city'), wipe = q('.scr-a__wipe');
    const scrA = q('.scr-a'), scrB = q('.scr-b');
    const nums = qa('.how__num'), titles = qa('.how__step');
    const fills = qa('.how__bar i');
    const dots = qa('.how__fleet i'), trail = qa('.how__trail i'), marker = q('.how__marker');
    const ticks = qa('.ring__tick'), count = q('.ring__count'), slides = qa('.scr-b__slide');
    let geo = null;

    const measure = () => {
      // untransformed sizes of the two frames, to send the screen into the city at the right spot
      const m = { w: media.offsetWidth, h: media.offsetHeight };
      const c = { w: cityBox.offsetWidth, h: cityBox.offsetHeight };
      const P = fleet[7];
      const vw = window.innerWidth, vh = el.querySelector('.how__stage').offsetHeight;
      const target = [vw / 2 + (P[0] / 100 - 0.5) * c.w, vh / 2 + (P[1] / 100 - 0.5) * c.h];
      const screenC = [vw / 2 + (0.5 - 0.5) * m.w, vh / 2 + ((FACE.top + FACE.height / 2) / 100 - 0.5) * m.h];
      geo = { dx: target[0] - screenC[0], dy: target[1] - screenC[1], cw: c.w, ch: c.h };
    };

    let active = -1, ringOn = false, lastPop = '', lastLitTrail = 0;
    const render = (p) => {
      if (!geo) measure();
      const seg = p * 4;
      const step = Math.min(3, Math.floor(seg));
      if (step !== active) {
        active = step;
        el.dataset.step = String(step + 1);
      }
      // copy: each step holds the centre of its quarter and crossfades at the joins
      for (let i = 0; i < 4; i++) {
        const d = seg - (i + 0.5);
        const o = i === 0 && seg < 0.5 ? 1 : i === 3 && seg > 3.5 ? 1 : clamp01(1 - (Math.abs(d) - 0.36) / 0.14);
        const y = d * -28;
        nums[i].style.opacity = titles[i].style.opacity = String(o);
        nums[i].style.transform = `translate3d(0, ${(o < 1 ? y : 0).toFixed(1)}px, 0)`;
        titles[i].style.transform = `translate3d(0, ${(o < 1 ? y * 0.6 : 0).toFixed(1)}px, 0)`;
        titles[i].style.visibility = o < 0.01 ? 'hidden' : '';
        fills[i].style.transform = `scaleX(${clamp01(seg - i).toFixed(4)})`;
      }
      // 1. the advertisement arrives: rows of the face light from top to bottom
      wipe.style.transform = `translate3d(0, ${(easeOut(range(p, 0.02, 0.17)) * 101).toFixed(2)}%, 0)`;
      // 2. the loop
      const ab = smooth(range(p, 0.24, 0.3));
      scrA.style.opacity = String(1 - ab);
      scrB.style.opacity = String(ab);
      ringOn = seg >= 1 && seg < 2.15;
      // 3. one screen becomes the fleet: the face shrinks into one light in the city
      const s3 = smooth(range(p, 0.5, 0.64));
      const sc = 1 - s3 * 0.985;
      media.style.transform = `translate3d(calc(-50% + ${(geo.dx * s3).toFixed(1)}px), calc(-50% + ${(geo.dy * s3).toFixed(1)}px), 0) scale(${sc.toFixed(4)})`;
      media.style.opacity = String(1 - range(p, 0.6, 0.66));
      const cityIn = smooth(range(p, 0.5, 0.6));
      // 4. the city leans in along the route
      const z = smooth(range(p, 0.75, 1));
      cityBox.style.opacity = String(cityIn);
      cityBox.style.transform = `translate3d(-50%, -50%, 0) scale(${(1.18 - 0.18 * cityIn + 0.12 * z).toFixed(4)})`;
      const pop = range(p, 0.56, 0.72);
      const dim = 1 - 0.55 * z;
      const key = `${pop.toFixed(3)}|${dim.toFixed(3)}`;
      if (key !== lastPop) {
        lastPop = key;
        dots.forEach((d, i) => {
          const t = clamp01(pop * 1.6 - (i / dots.length) * 0.6);
          d.style.opacity = ((t > 0 ? 1 : 0) * dim).toFixed(3);
          d.style.transform = `translate(-50%, -50%) scale(${(0.6 + 0.4 * easeOut(t)).toFixed(3)})`;
        });
      }
      const r = range(p, 0.77, 0.97);
      const lit = Math.floor(r * trail.length);
      if (lit !== lastLitTrail) {
        const [a, b] = lit > lastLitTrail ? [Math.max(0, lastLitTrail), lit] : [lit, lastLitTrail];
        for (let i = a; i < b; i++) trail[i].style.opacity = i < lit ? '1' : '0';
        lastLitTrail = lit;
      }
      const [mx, my] = pointAt(route, r);
      marker.style.opacity = String(range(p, 0.76, 0.78));
      marker.style.transform = `translate3d(calc(${((mx / 100) * geo.cw).toFixed(1)}px - 50%), calc(${((my / 100) * geo.ch).toFixed(1)}px - 50%), 0)`;
    };

    // the 10-second loop runs in real time while step 2 is on screen
    let t = 0, lastLit = -1, slide = 0;
    const offFrame = onFrame((dt) => {
      if (!ringOn && !reduced) return;
      t += dt;
      const lit = Math.floor(((t % 10) / 10) * TICKS);
      if (lit !== lastLit) {
        if (lit < lastLit) {
          ticks.forEach((k) => k.classList.remove('on'));
          slides[slide].classList.remove('on');
          slide = (slide + 1) % slides.length;
          slides[slide].classList.add('on');
        }
        for (let i = Math.max(0, lastLit); i <= lit; i++) ticks[i] && ticks[i].classList.add('on');
        lastLit = lit;
        count.textContent = String(10 - Math.floor(t % 10));
      }
    });

    let st;
    if (reduced) {
      el.classList.add('is-static');
    } else {
      st = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => {
          measure();
          render(self.progress);
        },
      });
      render(0);
    }
    return () => {
      offFrame();
      st && st.kill();
    };
  }, [fleet, route]);

  const trailDots = useMemo(() => resample(data.wide.route, 120), []);

  return (
    <section id="how" ref={root} className="how" aria-labelledby="how-title" data-step="1">
      <div className="how__stage">
        <div className="how__city" aria-hidden="true">
          <img src={city} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <div className="how__fleet">
            {fleet.map(([x, y], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </div>
          <div className="how__trail">
            {trailDots.map(([x, y], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </div>
          <span className="how__marker" />
        </div>
        <div className="how__media" aria-hidden="true">
          <img src={faceon} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <div className="face" style={{ left: `${FACE.left}%`, top: `${FACE.top}%`, width: `${FACE.width}%`, height: `${FACE.height}%` }}>
            <div className="scr-a">
              <ScreenLine text={SCREEN_LINES[0]} />
              <span className="scr-a__wipe" />
            </div>
            <div className="scr-b">
              <div className="ring">
                <svg viewBox="0 0 120 120">
                  {Array.from({ length: TICKS }, (_, i) => (
                    <rect key={i} className="ring__tick" x="58.5" y="6" width="3" height="13" rx="1" transform={`rotate(${(i / TICKS) * 360} 60 60)`} />
                  ))}
                </svg>
                <span className="ring__count">10</span>
                <span className="ring__unit">seconds</span>
              </div>
              <div className="scr-b__slides">
                <div className="scr-b__slide on">
                  <ScreenLogo />
                </div>
                <div className="scr-b__slide">
                  <ScreenSymbol />
                </div>
                <div className="scr-b__slide">
                  <ScreenLine text={SCREEN_LINES[0]} />
                </div>
              </div>
            </div>
            <span className="face__pixels" />
          </div>
        </div>

        <div className="how__head">
          <h2 id="how-title" className="how__title">
            How it works
          </h2>
        </div>
        <ol className="how__copy">
          {STEPS.map((s, i) => (
            <li key={i} className="how__item">
              <span className="how__num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="how__step">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="how__bar" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i}>
              <i />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
