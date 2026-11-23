import logoBlack from '../assets/brand/movemedia-horizontal-black.svg';
import { NAV, TAGLINE, CONTACT } from '../content.js';
import { scrollToTarget } from '../lib/motion.js';

export default function Footer() {
  const go = (e, href) => {
    e.preventDefault();
    scrollToTarget(href);
  };
  return (
    <footer className="foot" aria-labelledby="foot-title">
      <div className="foot__top">
        <p id="foot-title" className="foot__tag">
          {TAGLINE}
        </p>
        <nav className="foot__col" aria-label="Footer">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} onClick={(e) => go(e, href)}>
              {label}
            </a>
          ))}
        </nav>
        <ul className="foot__col">
          <li className="ph-text">{CONTACT.email.shown}</li>
          <li className="ph-text">{CONTACT.phone.shown}</li>
          <li className="ph-text">{CONTACT.instagram.shown}</li>
        </ul>
      </div>
      <img className="foot__logo" src={logoBlack} alt="Move Media" width="634" height="217" loading="lazy" />
      <p className="foot__legal">© 2026 Move Media. All rights reserved.</p>
    </footer>
  );
}
