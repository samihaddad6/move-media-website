# Move Media v2: design note

Direction: "The dark room" (tasteskill, seed 821175228), adapted to Beirut at night.
Dealt alternatives (name-as-monument, editorial-report, loud-flat-poster) were set aside because the
brief fixes a lit night scene, which none of them carries; "The dark room" was dealt by id for that reason.

## Idea
On this page, the rooftop screen, the only light that travels through a dark city, becomes the light
source of every section. Each screen of the site is a dark street in which one Move Media screen
(or a fleet of them) is the brightest thing, and every section hands its light to the next.

Inventory used: Beirut, Matn and Keserwan (coast, then hills climbing inland); the coast road; the
double-sided screen (left face, right face); the 10-second loop; up to 300 taxis; January 2027; the
three blades of the M; wet asphalt after winter rain; warm sodium street lamps.

Live thing: the 10-second loop. In How it works the ring fills in real time, ten seconds per turn,
and the screen face changes at each turn, so the visitor watches the actual rhythm of a spot.

## Mood
Cinematic night. Ink is the night sky and the asphalt. Sunset Orange is light: it only appears where
something emits it (screen faces, the taxi lights on the map, the one primary button, focus rings).
Warm white sodium light from street lamps as the secondary light. Wet road reflections, light trails,
fog that eats the distance, fine film grain over everything. Depth from layering: foreground, the
taxi, the street, the city.

## Colour use
- Ground: Ink #0B0B0C, about 85% of every screen.
- Text: White #FFFFFF; secondary text White at 68% (about 9:1 on Ink).
- Orange #FF5A1F: emitted light only, plus one solid action per screen. Never a decorative fill.
- One full orange field: the closing footer, with the all-black logo (brand rule).
- Glows live inside rendered scenes (WebGL bloom, baked images). No CSS glows, filters or shadows.

## Type (Inter Display, five steps)
1. Display: Bold, clamp(56px, 10vw, 184px), tracking -0.045em, leading 0.88. Opening line, section titles.
2. Numerals: Bold, clamp(96px, 20vw, 360px), tabular, tracking -0.05em. Step numbers, fleet counters.
3. Statement: Regular, clamp(26px, 2.6vw, 40px), leading 1.18, tracking -0.015em.
4. Text: Regular 17px, leading 1.6.
5. Small: Regular 14px, leading 1.4 (labels in sentence case, never tracked capitals).

## Motion principles
- Scroll is a camera moving through one night: parallax by real depth, not sliding cards.
- Physically believable: wheels turn with distance, suspension settles, reflections move with the camera.
- Scrubbed scenes follow the scroll directly (ease "none", light smoothing), never jump in reverse.
- Entrances: 700 to 900 ms, cubic-bezier(0.22, 1, 0.36, 1), rising 24px, staggered 70 ms. Once.
- Controls: 160 ms press scale 0.97; hover colour changes 200 ms.
- Transform and opacity only in the DOM. One WebGL canvas, pixel ratio capped at 2, paused off screen.
- Lenis with lerp 0.1, driven by gsap.ticker; native touch scrolling.
- Transitions: each section ends on a lit screen or light that becomes the opening image of the next.
- Reduced motion: still frames of each scene, simple 300 ms fades, the loop ring shown full.
