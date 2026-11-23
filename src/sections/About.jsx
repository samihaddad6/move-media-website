import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollReveal from '../components/rb/ScrollReveal.jsx';
import aboutImg from '../assets/img/about.webp';
import { ABOUT } from '../content.js';
import { reduced } from '../lib/motion.js';

export default function About() {
  const root = useRef(null);
  useEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      // the screen drifts up through its frame, as if the camera keeps rising past it
      gsap.fromTo('.about__img', { yPercent: 9, scale: 1.14 }, { yPercent: -9, scale: 1.02, ease: 'none', scrollTrigger: { trigger: '.about__media', start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
      gsap.from('.about__title', { y: 32, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.about__title', start: 'top 88%', once: true } });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section id="about" ref={root} className="about" aria-labelledby="about-title">
      <div className="about__text">
        <h2 id="about-title" className="about__title">
          {ABOUT.title}
        </h2>
        <ScrollReveal as="p" enableBlur={false} baseRotation={0} baseOpacity={0.38} stagger={0.045} smoothing={0.3} containerClassName="about__statement" textClassName="about__statement-text" wordAnimationEnd="center 45%">
          {ABOUT.statement}
        </ScrollReveal>
      </div>
      <figure className="about__media">
        <div className="about__frame">
          <img className="about__img" src={aboutImg} alt="Close-up of a taxi's rooftop screen at night, showing the Move Media symbol." width="960" height="1200" decoding="async" />
        </div>
      </figure>
    </section>
  );
}
