import { useEffect, useRef, useState } from 'react';
import logo from '../assets/brand/movemedia-horizontal-colour-on-dark.svg';
import Magnet from '../components/rb/Magnet.jsx';
import { NAV } from '../content.js';
import { lenis, onScroll, scrollToTarget, touch } from '../lib/motion.js';

export default function Header() {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  // transparent over the opening scene, then a solid bar; hides going down, returns going up
  useEffect(() => {
    const el = ref.current;
    let solid = false, hidden = false, travel = 0;
    return onScroll((y, dir) => {
      const s = y > 40;
      if (s !== solid) el.classList.toggle('is-solid', (solid = s));
      travel = dir > 0 ? Math.max(0, travel) + 1 : Math.min(0, travel) - 1;
      const h = y > 240 && dir > 0 && travel > 3;
      const show = dir < 0 && travel < -2;
      if (h && !hidden) el.classList.add('is-hidden'), (hidden = true);
      else if ((show || y < 240) && hidden) el.classList.remove('is-hidden'), (hidden = false);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (e, href) => {
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => scrollToTarget(href));
  };

  return (
    <header ref={ref} className={`hdr${open ? ' is-open' : ''}`}>
      <div className="hdr__bar">
        <a href="#top" className="hdr__logo" onClick={(e) => go(e, '#top')}>
          <img src={logo} alt="Move Media" width="146" height="50" />
        </a>
        <nav className="hdr__nav" aria-label="Main">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="hdr__link" onClick={(e) => go(e, href)}>
              {label}
            </a>
          ))}
        </nav>
        <Magnet padding={40} magnetStrength={6} maxOffset={8} disabled={touch} wrapperClassName="hdr__cta">
          <a href="#contact" className="btn" onClick={(e) => go(e, '#contact')}>
            Contact us
          </a>
        </Magnet>
        <button className="hdr__menu" aria-expanded={open} aria-controls="menu" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      <div id="menu" className="menu" inert={!open} aria-hidden={!open}>
        <nav aria-label="Menu">
          {NAV.map(([label, href], i) => (
            <a key={href} href={href} className="menu__link" style={{ '--i': i }} onClick={(e) => go(e, href)}>
              {label}
            </a>
          ))}
        </nav>
        <a href="#contact" className="btn btn--large" onClick={(e) => go(e, '#contact')}>
          Contact us
        </a>
      </div>
    </header>
  );
}
