import { useEffect, useMemo, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import cityTop from '../assets/img/aerial-top.webp';
import day from '../assets/img/day.webp';
import night from '../assets/img/night.webp';
import faceon from '../assets/img/faceon.webp';
import streetBg from '../assets/img/contact-bg.webp';
import logo from '../assets/brand/movemedia-horizontal-colour-on-dark.svg';
import data from '../data/aerial.json';
import { ScreenLogo, ScreenSymbol, ScreenLine } from '../components/Screen.jsx';
import { WHY, SCREEN_LINES } from '../content.js';
import { reduced, range, smooth, clamp01 } from '../lib/motion.js';
import { resample, pointAt } from '../lib/geo.js';
import { FACE } from './How.jsx';

function Panel({ i, children, className = '' }) {
  const w = WHY[i];
  return (
    <>
      <article className={`why__panel ${className}`} data-panel={i} aria-labelledby={`why-${i}`}>
        <div className="why__visual" aria-hidden="true">
          {children}
        </div>
        <div className="why__text">
          <h3 id={`why-${i}`}>{w.title}</h3>
          <p>{w.text}</p>
        </div>
      </article>
      <div className="why__hold" data-hold={i} aria-hidden="true" />
    </>
  );
}

export default function Why() {
  const root = useRef(null);
  const route = useMemo(() => resample(data.top.route, 140), []);

  useEffect(() => {
    if (reduced) return undefined;
    const el = root.current;
    const q = (s) => el.querySelector(s);
    const qa = (s) => Array.from(el.querySelectorAll(s));
    const trail = qa('.why-route i'), marker = q('.why-route__marker'), routeBox = q('.why-route');
    const nightImg = q('.why-sky__night'), skyLabel = qa('.why-sky__label');
    const flip = q('.flip__body'), sides = qa('.flip__caption');
    const msgs = qa('.why-print .scr-msg'), scan = q('.why-print .scan');
    let lastMsg = -1, lastLit = 0;

    const painters = [
      (p) => {
        const lit = Math.floor(range(p, 0.05, 0.85) * trail.length);
        if (lit !== lastLit) {
          const [a, b] = lit > lastLit ? [lastLit, lit] : [lit, lastLit];
          for (let k = a; k < b; k++) trail[k].style.opacity = k < lit ? '1' : '0';
          lastLit = lit;
        }
        const [x, y] = pointAt(route, range(p, 0.05, 0.85));
        marker.style.transform = `translate3d(calc(${((x / 100) * routeBox.offsetWidth).toFixed(1)}px - 50%), calc(${((y / 100) * routeBox.offsetHeight).toFixed(1)}px - 50%), 0)`;
      },
      (p) => {
        const n = smooth(range(p, 0.15, 0.75));
        nightImg.style.opacity = String(n);
        skyLabel[0].style.opacity = String(1 - n);
        skyLabel[1].style.opacity = String(n);
      },
      (p) => {
        const r = smooth(range(p, 0.12, 0.78));
        flip.style.transform = `rotateX(-6deg) rotateY(${(-22 + r * 180).toFixed(2)}deg)`;
        sides[0].style.opacity = String(1 - smooth(range(r, 0.35, 0.5)));
        sides[1].style.opacity = String(smooth(range(r, 0.5, 0.65)));
      },
      (p) => {
        // the face switches instantly, as an LED screen does: one hard cut per quarter
        const m = Math.min(msgs.length - 1, Math.floor(range(p, 0.05, 0.95) * msgs.length));
        if (m !== lastMsg) {
          msgs.forEach((x, k) => x.classList.toggle('on', k === m));
          if (lastMsg !== -1) {
            scan.classList.remove('run');
            void scan.offsetWidth;
            scan.classList.add('run');
          }
          lastMsg = m;
        }
      },
    ];
    const sts = qa('.why__hold').map((hold, i) =>
      ScrollTrigger.create({
        trigger: hold,
        // the hold scrolls under the stuck panel: from when the panel is fully in view until the next one arrives
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: (self) => painters[i](self.progress),
        onRefresh: (self) => painters[i](self.progress),
      }),
    );
    // the panel being covered steps back slightly as the next one slides over it
    const panels = qa('.why__panel');
    const backs = panels.slice(0, -1).map((panel, i) =>
      ScrollTrigger.create({
        trigger: qa('.why__hold')[i],
        start: 'bottom bottom',
        end: () => `+=${window.innerHeight}`,
        onUpdate: (self) => {
          const t = self.progress;
          panel.querySelector('.why__inner-dim').style.opacity = String(t * 0.7);
          panel.querySelector('.why__visual').style.transform = `scale(${(1 - 0.05 * t).toFixed(4)})`;
        },
      }),
    );
    return () => [...sts, ...backs].forEach((s) => s.kill());
  }, [route]);

  const trailDots = useMemo(() => resample(data.top.route, 110), []);

  return (
    <section id="why" ref={root} className="why" aria-labelledby="why-title">
      <div className="why__intro">
        <h2 id="why-title" className="why__title">
          Why taxi tops
        </h2>
      </div>

      <Panel i={0} className="why__panel--route">
        <div className="cover">
          <img src={cityTop} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <div className="why-route">
            {trailDots.map(([x, y], k) => (
              <i key={k} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
            <span className="why-route__marker" />
          </div>
        </div>
        <span className="why__inner-dim" />
      </Panel>

      <Panel i={1} className="why__panel--sky">
        <div className="why-sky">
          <img className="why-sky__day" src={day} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <img className="why-sky__night" src={night} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <span className="why-sky__label">Midday</span>
          <span className="why-sky__label">Midnight</span>
        </div>
        <span className="why__inner-dim" />
      </Panel>

      <Panel i={2} className="why__panel--flip">
        <img className="why-flip__bg" src={streetBg} alt="" width="1600" height="889" loading="lazy" decoding="async" />
        <div className="flip">
          <div className="flip__body">
            <div className="flip__face flip__face--a">
              <div className="flip__led">
                <img src={logo} alt="" />
              </div>
            </div>
            <div className="flip__face flip__face--b">
              <div className="flip__led">
                <ScreenLine text={SCREEN_LINES[0]} />
              </div>
            </div>
          </div>
          <span className="flip__caption">Left side</span>
          <span className="flip__caption">Right side</span>
        </div>
        <span className="why__inner-dim" />
      </Panel>

      <Panel i={3} className="why__panel--print">
        <div className="cover cover--print">
          <img src={faceon} alt="" width="1600" height="1000" loading="lazy" decoding="async" />
          <div className="face why-print" style={{ left: `${FACE.left}%`, top: `${FACE.top}%`, width: `${FACE.width}%`, height: `${FACE.height}%` }}>
            <div className="scr-msg on">
              <ScreenLogo />
            </div>
            <div className="scr-msg">
              <ScreenLine text={SCREEN_LINES[0]} />
            </div>
            <div className="scr-msg">
              <ScreenSymbol />
            </div>
            <div className="scr-msg">
              <ScreenLine text={SCREEN_LINES[1]} />
            </div>
            <span className="scan" />
            <span className="face__pixels" />
          </div>
        </div>
        <span className="why__inner-dim" />
      </Panel>
    </section>
  );
}
