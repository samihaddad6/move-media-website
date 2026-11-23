import { useCallback, useEffect, useState } from 'react';
import Header from './sections/Header.jsx';
import Hero from './sections/Hero.jsx';
import About from './sections/About.jsx';
import How from './sections/How.jsx';
import Why from './sections/Why.jsx';
import Coverage from './sections/Coverage.jsx';
import Who from './sections/Who.jsx';
import Contact from './sections/Contact.jsx';
import Footer from './sections/Footer.jsx';
import { startMotion, reduced } from './lib/motion.js';

export default function App() {
  const [sceneReady, setSceneReady] = useState(reduced);
  useEffect(() => {
    // the story starts at the opening scene, not where an earlier visit left off
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) window.scrollTo(0, 0);
    startMotion();
  }, []);
  // the city in Coverage is built after the opening scene, so the two never compete for the first frames
  const ready = useCallback(() => setTimeout(() => setSceneReady(true), 400), []);
  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <a href="#about" className="skip">
        Skip to content
      </a>
      <Header />
      <div className="page">
        <main>
          <Hero onSceneReady={ready} />
          <About />
          <How />
          <Why />
          <Coverage sceneReady={sceneReady} />
          <Who />
          <Contact />
        </main>
      </div>
      <Footer />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
