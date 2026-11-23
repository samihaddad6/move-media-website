import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CountUp from '../components/rb/CountUp.jsx';
import poster from '../assets/img/aerial-wide.webp';
import { COVERAGE } from '../content.js';
import { onFrame, reduced, range, smooth } from '../lib/motion.js';

export default function Coverage({ sceneReady }) {
  const root = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    if (reduced || !sceneReady) return undefined;
    let aerial = null, visible = false, progress = 0, dead = false;
    const el = root.current;
    const copy = el.querySelector('.cov__copy');
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (visible = self.isActive),
      onUpdate: (self) => {
        // progress across the pinned part only
        const vh = window.innerHeight;
        const total = el.offsetHeight - vh;
        progress = Math.min(1, Math.max(0, (self.scroll() - el.offsetTop) / total));
        const lift = smooth(range(self.progress, 0.0, 0.25));
        copy.style.transform = `translate3d(0, ${((1 - lift) * 60).toFixed(1)}px, 0)`;
      },
    });
    // build the city only after the opening scene is up, in small slices during idle time
    (async () => {
      const { createAerial } = await import('../three/aerial.js');
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const a = await createAerial(canvas.current, { width: window.innerWidth, height: window.innerHeight, dpr, texSize: 3072 });
      if (dead) return;
      aerial = a;
      aerial.setProgress(progress, 0.12);
      aerial.render();
      el.classList.add('is-live');
    })();
    const off = onFrame((dt) => {
      if (!aerial || !visible) return;
      aerial.setProgress(progress, 0.12 + 0.88 * smooth(range(progress, 0.0, 0.55)));
      aerial.tick(dt);
      aerial.render();
    });
    let rt;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => aerial && aerial.resize(window.innerWidth, window.innerHeight), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      dead = true;
      off();
      st.kill();
      window.removeEventListener('resize', onResize);
      aerial && aerial.renderer.dispose();
    };
  }, [sceneReady]);

  const { fleet, launch } = COVERAGE;
  return (
    <section id="coverage" ref={root} className="cov" aria-labelledby="cov-title">
      <div className="cov__stage">
        <img className="cov__poster" src={poster} alt="The city at night from the air, its streets lit, with orange screen lights moving along the roads." width="1600" height="1000" loading="lazy" decoding="async" />
        <canvas ref={canvas} className="cov__canvas" aria-hidden="true" />
        <div className="cov__copy">
          <h2 id="cov-title" className="cov__title">
            {COVERAGE.title}
          </h2>
          <p className="cov__text">{COVERAGE.text}</p>
          <dl className="cov__figures">
            <div className="cov__fig">
              <dt>{fleet.label}</dt>
              <dd>
                <span className="cov__num">
                  {fleet.prefix}
                  {reduced ? fleet.value : <CountUp to={fleet.value} duration={2.2} />}
                </span>
                <span className="ph">Placeholder, to be confirmed</span>
              </dd>
            </div>
            <div className="cov__fig">
              <dt>{launch.label}</dt>
              <dd>
                <span className="cov__num">{launch.value}</span>
                <span className="ph">Placeholder, to be confirmed</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
