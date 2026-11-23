# Move Media website, version 2

A single-page site for Move Media: double-sided digital screens on taxi roofs in Lebanon.
Built with React, Vite, GSAP (ScrollTrigger), Lenis and Three.js, and shipped as one
self-contained HTML file (fonts, logo files, images and 3D code all inside).

## Commands

```
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # writes dist/index.html, the single page that is published
```

## Where things live

- `src/content.js` holds every word on the page, including the placeholders to confirm.
- `src/sections/` holds one file per section (Header, Hero, About, How, Why, Coverage, Who, Contact, Footer).
- `src/three/` holds the 3D scenes: `hero.js` (the opening taxi scene), `taxi.js`, `street.js`,
  `aerial.js` (the city from the air, used live in Coverage) and `kit.js` (shared rendering helpers).
- `src/lib/motion.js` is the single scroll and frame loop: one Lenis instance driven by `gsap.ticker`.
- `src/assets/brand/` holds the master SVG logo files from the logo kit, used as they are.
- `src/assets/img/` holds still images rendered from the same 3D scenes.
- `dev/bake.html` and `dev/bake.js` re-render those still images (open them in Chrome through a local
  server at the project root, for example `python3 -m http.server`, with `?shot=street`, `faceon`,
  `aerial`, `carside` or `led`).

## Placeholders to fill in (in `src/content.js`)

- Launch fleet: "Up to 300 taxis" (placeholder, to be confirmed).
- Launch date: "January 2027" (placeholder, to be confirmed).
- Contact email (also the address the form opens in the visitor's email app).
- Phone or WhatsApp number.
- Instagram account.
