# Version 4 concept round

Three prototypes of the three signature moments (the opening and the bookend, the taxi chapter, one transition), each in a different direction. Open `/concepts/` on the v4 site.

- A. The slider: a camera on a slider moving through the depth of each photograph; chapters joined by a focus pull.
- B. The crane: a camera that rises and travels sideways; chapters joined by slow dissolves through black.
- C. The edit: a still camera with a living lens; a rack focus, a cut on movement and a match cut from the screen to the city.

`engine/gl.js` is the shared WebGL2 canvas (depth parallax, depth of field, the live screen, the edit and the grain). `engine/screen.js` draws what the screen shows from the master SVGs. `engine/directions.js` holds the camera and the edit of each direction. Add `?capture=1` for frame-exact recording.
