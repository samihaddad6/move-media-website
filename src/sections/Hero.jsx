import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '../components/rb/SplitText.jsx';
import posterWide from '../assets/img/hero-wide.webp';
import posterTall from '../assets/img/hero-tall.webp';
import logo from '../assets/brand/movemedia-horizontal-colour-on-dark.svg';
import { HERO } from '../content.js';
import { onFrame, reduced, range, easeOut } from '../lib/motion.js';

const DPR_CAP = () => Math.min(window.devicePixelRatio || 1, 2);

export default function Hero({ onSceneReady }) {
  const sec = useRef(null);
  const canvas = useRef(null);
  const copy = useRef(null);
  const veil = useRef(null);

  useEffect(() => {
    if (reduced) return undefined;
    let hero = null, dead = false, progress = 0, visible = true;
    const size = () => [window.innerWidth, window.innerHeight];

    const st = ScrollTrigger.create({
      trigger: sec.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress = self.progress;
        const p = progress;
        // the headline steps back as the camera starts to move
        const t = easeOut(range(p, 0.02, 0.14));
        copy.current.style.opacity = String(1 - t);
        copy.current.style.transform = `translate3d(0, ${(-56 * t).toFixed(1)}px, 0)`;
        copy.current.style.visibility = t >= 1 ? 'hidden' : '';
        // the screen's light fills the view, then hands over to About
        const f = range(p, 0.9, 1);
        veil.current.style.opacity = String(f);
        hero && hero.setProgress(p, 0);
      },
      onToggle: (self) => (visible = self.isActive),
    });

    // Build the 3D scene once the page has painted, so the first frame is never blocked.
    const boot = async () => {
      const { createHero } = await import('../three/hero.js');
      if (dead) return;
      const [w, h] = size();
      hero = await createHero(canvas.current, { logo, width: w, height: h, dpr });
      if (dead) return hero.dispose();
      hero.setProgress(progress, 0);
      hero.render(true);
      sec.current.classList.add('is-live');
      onSceneReady && onSceneReady();
    };
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
    const id = idle(boot, { timeout: 900 });

    // adaptive sharpness: if the scene cannot hold 60 fps while it moves, step the pixel ratio down
    const MAXD = Math.min(DPR_CAP(), 1.5);
    let dpr = MAXD, acc = 0, n = 0, calm = 0;
    const off = onFrame((dt) => {
      if (!hero || !visible) return;
      const drew = hero.render();
      if (!drew) return;
      if (dt > 0.1) return; // the first frame after a pause says nothing
      acc += dt;
      n++;
      if (n >= 45) {
        const avg = acc / n;
        acc = n = 0;
        if (avg > 0.0176 && dpr > 0.75) {
          calm = 0;
          hero.resize(...size(), (dpr = Math.max(0.75, +(dpr - 0.25).toFixed(2))));
        } else if (avg < 0.0168 && dpr < MAXD && ++calm > 6) {
          calm = 0;
          hero.resize(...size(), (dpr = Math.min(MAXD, +(dpr + 0.25).toFixed(2))));
        }
      }
    });
    let rt;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => hero && hero.resize(...size(), dpr), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      dead = true;
      (window.cancelIdleCallback || clearTimeout)(id);
      off();
      st.kill();
      window.removeEventListener('resize', onResize);
      hero && hero.dispose();
    };
  }, [onSceneReady]);

  return (
    <section id="top" ref={sec} className={`hero${reduced ? ' hero--still' : ''}`}>
      <div className="hero__stage">
        <picture>
          <source media="(max-aspect-ratio: 9/10)" srcSet={posterTall} />
          <img className="hero__poster" src={posterWide} alt="A Beirut taxi at night on a wet street, its rooftop screen showing the Move Media logo." width="1600" height="1000" fetchPriority="high" />
        </picture>
        <canvas ref={canvas} className="hero__canvas" aria-hidden="true" />
        <div ref={veil} className="hero__veil" aria-hidden="true" />
        <div ref={copy} className="hero__copy">
          <SplitText tag="h1" text={HERO.title} className="hero__title" splitType="words" effect="rise" mask trigger="load" textAlign="left" delay={90} duration={1.15} />
          <p className="hero__sub">
            {HERO.sub}
          </p>
        </div>
      </div>
    </section>
  );
}
