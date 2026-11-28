# Move Media website v4: design note (concept round, 28 November 2026)

Version 4 keeps everything approved in version 3 (the story, the order of the sections, the brand, the copy, the Beirut night photograph cut only from the left, How it works and Who it is for in the version 2 system, and every fix of 26 November) and raises the craft to that of a film studio's website. The test for every technique: placed next to real footage, an ordinary person cannot tell it was made by a computer.

## What the reference sites teach (studied in a real browser on 28 November 2026)

| Site | The one or two techniques that make it stunning |
|---|---|
| Preymaker (film and effects studio) | One long pinned section where full-screen films stack, each new film rising over the last like a cut, with only a thin caption. Every film is real footage sized for the screen it plays on (540p on phones, 1080p on desktop). |
| Spyker (car maker) | The logo alone on white, then a dark panel rises from the bottom and opens into the film. Macro close-ups of real materials graded dark and warm. |
| A24 (film studio) | Very large titles sit on the bottom edge of a film still and are cut by the frame, so the type becomes part of the picture. |
| Polestar (car maker) | One studio photograph slides sideways as you scroll down, like a dolly shot. The same interior is filmed by day and by night, a natural match cut. |

Ideas only: no content, assets, fonts or wording are taken.

## Footage found for Lebanon

Free, commercially licensed night footage of Beirut barely exists on Pexels, Pixabay, Mixkit and Coverr. The night chapters therefore stay on the real photographs of version 3, brought to life with depth and the live screen. The day footage is mostly phone footage in hard light and is graded to match. Sources and licences are in CREDITS.md.

## What the new freedom is used for

1. Depth in real photographs. Each main photograph has a depth map (Depth Anything V2 Small, run once on Sami's laptop). A WebGL camera moves through the picture by marching through that depth, so near hills move faster than the city behind them, like a camera on a slider. Near edges are widened slightly so the picture opens behind them, never across them.
2. A real lens. Depth of field is gathered from the depth map, with round highlights like a real aperture, so focus pulls and rack focus are optical, not a blur filter.
3. A live screen. The face of the Move Media screen is drawn every frame from the master SVGs and Inter Display, at the screen's own LED resolution (384 by 68 per face), in the perspective of the photograph. Each LED is a soft dot when the camera is close enough to see it; its light falls on the roof, it is mirrored in the glossy roof, and a little of it spreads in the lens. It changes on the 10-second clock.
4. Film edits. One shared canvas joins two shots: a focus pull, a dissolve through black with a short hold, a cut on movement, a match cut.
5. Grain. A fine grain, a new frame 24 times a second, strongest in the mid-tones, ties photographs and footage into one film.

## The three directions

- A. The slider: a camera on a slider moves forward through the depth of each picture; chapters are joined by a focus pull (the city melts into out-of-focus light, and the taxi roof comes into focus out of it).
- B. The crane: a camera that rises slowly over the hills and travels beside the taxi like a tracking car; chapters are joined by slow dissolves through black, with the next chapter's first line in the black.
- C. The edit: a still camera with a living lens: the focus finds the city on arrival, a cut on movement takes the camera from the city to the taxi, and a match cut turns the orange symbol on the screen into a light in the city at night.

## Rules kept

No bloom halos, glows, flares, beams, particles, scanning or glitch effects; no orbit and no fly-through; orange only where a real screen gives off light and as the single accent. One Lenis instance, native scrolling on touch, one WebGL canvas. Weaker graphics cards and phones get fewer depth steps and a lower pixel ratio automatically; without WebGL the site falls back to version 3.

## Recommendation

Direction C, the edit. Its rack focus on arrival, its cut on movement and its match cut from the screen to a light in the city are the moves a film editor would make, they need no camera movement that a real camera could not make, and the match cut tells the story Sami approved for How it works (the screen becomes one light among the taxis in the city). Inside the chapters, the slow push-ins of direction A can be kept, since they are the same camera on a slider.
