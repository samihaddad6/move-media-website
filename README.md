# Move Media website, version 3

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
