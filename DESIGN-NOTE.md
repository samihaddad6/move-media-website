# Move Media website v3: design note

Version 3 should feel like a film and a photography book about the city, not a video game. It keeps the brand, the content, the smooth scrolling, the pacing and the story of version 2, and rebuilds the pictures and the interface around them.

## What the two references teach

**Preymaker**
- The first screen is one filmed, black-and-white image (feathers), edge to edge, with one short line, a small "Scroll down" cue and a bar holding the logo, "Menu" and "Search".
- The footer plays the same wing footage (the same 540p clip family), so the visit starts and ends on the same picture.
- The work is a stack of full-screen films, each with only a small centred title and one line beneath it.
- It uses one typeface. The type is small against huge pictures, and every UI transition uses the same long expo ease-out, cubic-bezier(0.19, 1, 0.22, 1).
- The video is modest: 540p loops for the hero and footer, and a dedicated portrait clip on phones. That is why it feels heavy without being slow.

**Spyker**
- Pictures grow out of a small frame into the full width as you scroll, exactly in step with the scroll.
- It shows extreme close-ups of real materials (rear lights, grille, carbon) with small captions, placed off-centre at different sizes and drifting at different speeds.
- Headings are very large and tight, captions are small, and dark sections alternate with white ones.
- In the heritage section a centred heading sits in a scattered constellation of pictures that move apart.
- Lenis smooth scrolling; native scrolling on touch.

**Why both feel real.** Every picture is a photograph or footage: real lenses, shallow depth of field, motion blur and grain, with restrained grading. The interface steps back and lets the pictures speak.

## Why version 2 looks like a game, and how version 3 fixes each point

| Version 2 | Version 3 |
|---|---|
| Almost every picture is drawn by the computer: the 3D taxi, the street, the city from the air, the parked car in Contact, the LED close-up. | Every picture is a real photograph or real footage (Unsplash and Pexels). The Move Media screen is composited onto real taxi roofs from the master SVGs, with matched perspective, focus, motion blur, light spill and grain. The 3D taxi is retired: it does not pass the side-by-side test. |
| The camera circles and flies around the car like a game's opening scene. | Camera moves are only those of a real film camera: slow push-ins, slow pans, a gentle stabiliser drift and a slow crane rise, all done on real photographs. |
| Strong bloom and glow halos, and saturated neon orange everywhere, including a full orange footer. | No bloom, flares, beams or glowing outlines. Orange appears only where a real screen emits light, plus the one primary button. The footer is a photograph, not an orange field. |
| Surfaces are too clean: a flat car body, perfect asphalt, buildings drawn as glowing squares. | Real wear, reflections, uneven light, grain and lens vignetting. |
| Game interface graphics: glowing fleet dots, a ring of ticks counting down the 10-second loop, glowing route lines, big animated counters, scanning effects. | All removed. The ideas are explained with real pictures and one-line captions. The two diagrams that remain (a taxi's route, the two faces of the screen) are thin, flat and still, like a magazine diagram, and move only by fading in or by one line drawing itself. Figures are set as plain type, without counting animations. |
| A giant 184 px headline, like a title screen. | The tagline is set at a modest 44 px (32 px on phones). Scale comes from the pictures. |

## Mood and colour grading

Night is warm and dark: deep blacks that keep detail, warm street light, colour graded with restraint (saturation pulled back by about 10 to 40% depending on the source). Day sections are white with Ink text, daylight photographs and the colour logo. Fine grain and a soft natural vignette are applied in the image files, not as a live overlay. Orange #FF5A1F is the light of the screen and the single accent.

## Picture sources (in this order)

1. Sami's own photos and videos: none for now. They can replace any stock picture later.
2. Free stock: 18 Unsplash photos and 5 Pexels videos (list and licences in CREDITS.md). Readable signs, plates and lettering are removed or blurred.
3. Composites: the Move Media screen placed on real taxi roofs (housing proportions from the logo kit presentation, slide 6; screen content from the master SVGs).
4. 3D: none planned. Anything that fails the side-by-side test is replaced by photography or removed.

## Type (Inter Display Regular and Bold only)

1. Editorial heading: Bold, clamp(44px, 7vw, 112px), line-height 0.94, tracking -0.035em (Spyker-style, tightly set).
2. Tagline and chapter titles: Bold, 44 px desktop and 32 px phone, line-height 1.04, tracking -0.025em.
3. Statement: Regular, clamp(24px, 2.4vw, 36px), line-height 1.2.
4. Text: Regular 17 px, line-height 1.6.
5. Caption and interface: Regular 13 to 15 px, sentence case, never tracked capitals.

## Motion principles

- Lenis driven by gsap.ticker, with ScrollTrigger.update on scroll and lagSmoothing(0). Native scrolling on touch devices.
- Only transform and opacity are animated. Growing pictures scale their frame while the picture inside is counter-scaled.
- Scrubbed scenes follow the scroll with no easing of their own and never jump in reverse.
- Interface transitions use expo-out, cubic-bezier(0.19, 1, 0.22, 1), over 600 to 900 ms. Hover changes take 200 ms.
- Camera rules: a push-in is at most 8% of scale over a full screen of scroll; a pan is at most 4% of the width; no orbits and no fly-throughs.
- Screen messages change on a steady 10-second clock, not with each small scroll.
- Reduced motion: still frames with simple 300 ms fades.

## Load budget (Chrome "Slow 4G")

| First screen | Size (compressed) |
|---|---|
| HTML with critical CSS | about 12 KB |
| Inter Display Regular and Bold, subset | about 30 KB |
| Logo (inline SVG) | about 8 KB |
| Opening poster, AVIF | 150 to 200 KB desktop, about 100 KB phone |
| Loader, header and scroll code | about 40 KB |
| **Total** | **about 250 to 300 KB (limit 400 KB)** |

Everything else loads as the visitor approaches it. There are at most four videos (the opening and the bookend share one clip), each a 6 to 10 second silent loop under 2 MB, 720p on desktop and smaller on phones, WebM with an MP4 fallback. Save-Data and slow connections get the still posters only.

## Decisions after the concept round (25 November 2026)

- Sami chose concept C, rebuilt around Sara Calado's photograph of Beirut at night from the hills (Unsplash sACdgzcdzEU). It is cropped only from the left, so the port on the right always stays in frame. The opening and the footer use the same file: the footer pulls back from a close framing to rest, which makes the bookend.
- No picture that is clearly from outside Lebanon is used as it is. The Korean and Japanese taxi shots are retouched (roof signs, lettering and window stickers removed or cropped), and the other foreign scenes were dropped. Day scenes are Beirut, the bay and an old Mercedes taxi in a Lebanese street.
- Only one video is used (Events), an 8-second loop under 0.7 MB. Everything else moves with code on still photographs.
- Measured under Slow 4G (Chrome DevTools profile, gzip): the first screen is ready at 1.8 s from 126 KB on desktop, and at 1.7 s from 96 KB on a phone.
