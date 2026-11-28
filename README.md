# Move Media website, version 4 (work in progress)

This branch, `v4`, holds version 4. It starts as an exact copy of version 3 and is being rebuilt step by step. Version 3 is frozen and is never changed.

## How to go back to version 3

Version 3 is saved for good on the branch `v3-final` of this repository. It is the exact last state of version 3 (commit fc7442d) and nothing is ever added to it. The site https://move-media-v3.onrender.com still shows version 3 and is never touched.

To go back, you only need to write to Claude: "go back to version 3". Claude will then point every website that shows version 4 (for example move-media-v4 on Render) to the branch `v3-final`, wait for the new deploy to finish and confirm the result to you.

If you ever want to do it yourself, it takes one minute:

1. Open https://dashboard.render.com and click the site that shows version 4 (for example move-media-v4).
2. Open Settings, find Branch, and change it from `v4` to `v3-final`. Save.
3. Render rebuilds the site by itself. After about two minutes it shows version 3 again.

Nothing is lost: version 4 stays on its own branch `v4` and can be shown again the same way.

On your laptop, version 3 stays in "Claude outputs/Move-Media-website-v3" and version 4 lives in "Claude outputs/Move-Media-website-v4".

---

# Version 3 notes (kept for reference)

A film and a photography book about the city: real photographs and footage of Beirut and Lebanon, with the Move Media rooftop screen composited onto real taxis. Built with Vite, GSAP (ScrollTrigger) and Lenis, as normal files with hashed names.

## Commands

```
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # writes dist/, the folder that is published
```

## Publishing on Render (static site)

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Headers: `/assets/*` with `Cache-Control: public, max-age=31536000, immutable` (every file in it has a hashed name).

## Where things live

- `index.html` holds every word and picture of the page (it is written by `tools/gen_html.py`).
- `src/style.css` holds the whole design; `src/main.js` the loader, header, menu, form and video; `src/motion.js` the scroll scenes, loaded after the first screen.
- `src/img/` holds every picture in AVIF and WebP at two or three widths; `src/video/` the one 8-second loop.
- `tools/` holds the picture pipeline (compositing the screen onto real photographs, grading, encoding) and the test scripts (screenshots, Slow 4G measurement, frame rate).
- `CREDITS.md` lists the source and licence of every picture and video.

## Placeholders to fill in

- Launch fleet "Up to 300" and launch date "January 2027" (Coverage), both marked as placeholders.
- Email address (menu, contact, footer, and `EMAIL` in `src/main.js` for the form).
- Phone or WhatsApp number, Instagram account.

## Where it is published

- GitHub: `main` holds version 2, `v3` and `v3-final` hold version 3 (frozen), `v4` holds version 4. `v4` is not merged into `main` until Sami says so in writing.
- Render: `move-media` (main, version 2), `move-media-v3` (v3, version 3) and `move-media-v4` (v4, version 4), each built with `npm ci && npm run build`, publishing `dist`.
