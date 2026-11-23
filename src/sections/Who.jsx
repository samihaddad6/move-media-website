import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import a from '../assets/img/about.webp';
import b from '../assets/img/night.webp';
import c from '../assets/img/hero-wide.webp';
import d from '../assets/img/aerial-wide.webp';
import e from '../assets/img/led.webp';
import { WHO } from '../content.js';

const PICS = [
  [a, '50% 40%'],
  [b, '70% 60%'],
  [c, '62% 45%'],
  [d, '58% 60%'],
  [e, '40% 45%'],
];

export default function Who() {
  const root = useRef(null);
  useEffect(() => {
    const rows = Array.from(root.current.querySelectorAll('.who__row'));
    let current = -1;
    const set = (i) => {
      if (i === current) return;
      current = i;
      rows.forEach((r, k) => r.classList.toggle('is-open', k === i));
    };
    const sts = rows.map((row, i) =>
      ScrollTrigger.create({
        trigger: row,
        start: 'top 58%',
        end: 'bottom 42%',
        onToggle: (self) => self.isActive && set(i),
      }),
    );
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enter = (e) => set(rows.indexOf(e.currentTarget));
    if (fine) rows.forEach((r) => r.addEventListener('pointerenter', enter));
    rows.forEach((r) => r.addEventListener('focusin', enter));
    return () => {
      sts.forEach((s) => s.kill());
      rows.forEach((r) => (r.removeEventListener('pointerenter', enter), r.removeEventListener('focusin', enter)));
    };
  }, []);
  return (
    <section id="who" ref={root} className="who" aria-labelledby="who-title">
      <h2 id="who-title" className="who__title">
        Who it is for
      </h2>
      <ul className="who__list">
        {WHO.map((w, i) => (
          <li key={w.name} className="who__row">
            <span className="who__name">{w.name}</span>
            <span className="who__line">{w.text}</span>
            <span className="who__pic" aria-hidden="true">
              <img src={PICS[i][0]} alt="" style={{ objectPosition: PICS[i][1] }} loading="lazy" decoding="async" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
