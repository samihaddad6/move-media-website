// Move Media v4 concept engine: one shared WebGL2 canvas.
// Real photographs are moved by a camera through their own depth map (a slider, a crane, a push-in),
// focus is a real depth of field, the rooftop screen is lit live from the master logo files,
// and chapters are joined by film edits (focus pull, dissolve through black, match cut).

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
vec3 lin(vec3 c){ return pow(max(c, 0.0), vec3(2.2)); }
vec3 srgb(vec3 c){ return pow(max(c, 0.0), vec3(1.0/2.2)); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

// 2. The camera: a real camera moving a little through the picture's depth (parallax, never a cut-out).
const FS_PHOTO = COMMON + `
uniform sampler2D uColor, uDepth;
uniform vec2 uView, uImg;    // viewport and image aspect inputs (px)
uniform vec2 uFocal;         // point of the picture that stays in view when cropping (0..1)
uniform float uZoom;         // base zoom, >= 1
uniform vec2 uZoomAt;        // image uv the zoom is centred on
uniform vec2 uZoomTo;        // where that point lands (image uv of the unzoomed frame)
uniform vec3 uCam;           // x, y shift per unit depth, dolly per unit depth
uniform float uPivot;        // depth that does not move
uniform float uSteps;
// the live screen (when uScreen = 1)
uniform float uScreen;
uniform sampler2D uLed;
uniform mat3 uHinv;          // image uv -> face uv (0..1 across the housing face)
uniform vec4 uPanel;         // panel rect inside the face
uniform vec2 uLedRes, uLedPad;
uniform float uPower, uReflAxis, uReflK, uReflEnd, uHblur, uDots;
uniform vec3 uAvg;
uniform vec4 uSpill;
vec2 faceUv(vec2 uv){ vec3 q = uHinv * vec3(uv, 1.0); return q.xy / q.z; }
vec2 panelUv(vec2 f){ return (f - uPanel.xy) / uPanel.zw; }
vec2 texUv(vec2 pu){ return (pu + uLedPad) / (1.0 + 2.0 * uLedPad); }
vec3 ledAt(vec2 pu, float lod){ return lin(textureLod(uLed, texUv(pu), lod).rgb); }
float inPanel(vec2 pu){
  vec2 e = 0.6 / uLedRes;
  vec2 a = smoothstep(vec2(0.0), e, pu) * (1.0 - smoothstep(1.0 - e, vec2(1.0), pu));
  return a.x * a.y;
}
vec3 emission(vec2 uv){
  vec2 pu0 = panelUv(faceUv(uv));
  // how many LEDs fall in one pixel of the screen: dots show only when each LED is large enough to see
  float per = length(fwidth(pu0 * uLedRes));
  float dots = uDots * (1.0 - smoothstep(0.2, 0.36, per));
  vec3 E = vec3(0.0);
  float taps = uHblur > 0.0 ? 7.0 : 1.0;
  for (float i = 0.0; i < 7.0; i++) {
    if (i >= taps) break;
    vec2 uvi = uv + vec2((i - (taps - 1.0) * 0.5) / max(taps - 1.0, 1.0) * uHblur, 0.0);
    vec2 pu = panelUv(faceUv(uvi));
    vec2 cellId = floor(pu * uLedRes);
    vec2 cell = pu * uLedRes - cellId - 0.5;
    // each LED is one colour (its own pixel of the advertisement); far away, the colours blend
    vec3 cSharp = ledAt((cellId + 0.5) / uLedRes, 0.0);
    vec3 cSoft = ledAt(pu, 0.0);
    vec3 c = mix(cSoft, cSharp, dots);
    float d = exp(-dot(cell, cell) / (2.0 * 0.24 * 0.24));
    // normalised so the dots keep the same brightness on average; hotter at the core of each LED
    float shape = mix(1.0, d * 2.2, dots);
    vec3 hot = c * 0.92 + 0.08 * step(0.03, max(c.r, max(c.g, c.b)));
    E += hot * shape * inPanel(pu);
  }
  E /= taps;
  vec2 pu = pu0;
  vec3 H1 = ledAt(pu, 3.4), H2 = ledAt(pu, 5.6);
  vec3 L = (E * 1.05 + H1 * 0.16 + H2 * 0.05) * uPower;
  if (uv.y > uReflAxis && uv.y < uReflEnd) {
    vec2 m = vec2(uv.x, 2.0 * uReflAxis - uv.y);
    vec2 pm = panelUv(faceUv(m));
    vec3 R = ledAt(pm, 2.2) * inPanel(pm) + ledAt(pm, 4.2) * 0.3;
    L += R * uReflK * exp(-(uv.y - uReflAxis) * 26.0) * uPower * 0.75;
  }
  vec2 dd = (uv - uSpill.xy) / uSpill.zw;
  L += exp(-0.5 * dot(dd, dd)) * uAvg * 0.18 * uPower;
  return L;
}
vec2 cover(vec2 s){
  float va = uView.x / uView.y, ia = uImg.x / uImg.y;
  vec2 sc = va > ia ? vec2(1.0, ia / va) : vec2(va / ia, 1.0);
  vec2 off = (1.0 - sc) * uFocal;
  return off + s * sc;
}
vec2 project(vec2 out_, float l){
  float S = 1.0 + uCam.z * (l - uPivot);
  vec2 O = uCam.xy * (l - uPivot) * vec2(1.0, uImg.x / uImg.y);
  return uZoomAt + (out_ - uZoomAt - O) / S;
}
void main(){
  vec2 base = cover(vec2(vUv.x, 1.0 - vUv.y));
  vec2 out_ = uZoomAt + (base - uZoomTo) / uZoom;
  // march from the nearest layer to the farthest, stop where the picture's surface is met
  float n = uSteps, prevL = 1.0;
  vec2 uv = project(out_, 0.0);
  float hitL = 0.0;
  for (float i = 0.0; i <= 48.0; i++) {
    if (i > n) break;
    float l = 1.0 - i / n;
    vec2 c = project(out_, l);
    float d = texture(uDepth, c).r;
    if (d >= l) {
      // refine between the previous layer and this one
      float a = l, b = prevL;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a + b);
        vec2 cm = project(out_, m);
        if (texture(uDepth, cm).r >= m) a = m; else b = m;
      }
      hitL = a; uv = project(out_, a); break;
    }
    prevL = l;
  }
  uv = clamp(uv, vec2(0.0005), vec2(0.9995));
  vec3 col = texture(uColor, uv).rgb;
  if (uScreen > 0.5 && uPower > 0.001) col = srgb(lin(col) + emission(uv));
  o = vec4(col, texture(uDepth, uv).r);
}`;

// 3. The lens: depth of field gathered from the scene, with round highlights like a real aperture.
const FS_DOF = COMMON + `
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uFocus, uAperture, uMaxR, uFlat;   // uFlat: same blur everywhere (for film)
void main(){
  vec4 c0 = texture(uSrc, vUv);
  float coc0 = uFlat > 0.0 ? uFlat : min(abs(c0.a - uFocus) * uAperture, uMaxR);
  float R = uFlat > 0.0 ? uFlat : uMaxR;
  if (R < 0.6) { o = vec4(c0.rgb, c0.a); return; }
  vec3 acc = lin(c0.rgb) * 0.5; float wsum = 0.5;
  const float GA = 2.39996323;
  float rot = hash(gl_FragCoord.xy) * 6.2831853;
  float N = R > 12.0 ? 60.0 : 36.0;
  for (float i = 1.0; i <= 72.0; i++) {
    if (i > N) break;
    float r = sqrt((i - 0.5 * hash(gl_FragCoord.yx + i)) / N) * R;
    float a = i * GA + rot;
    vec2 off = vec2(cos(a), sin(a)) * r / uRes;
    vec4 s = texture(uSrc, vUv + off);
    float coc = uFlat > 0.0 ? uFlat : min(abs(s.a - uFocus) * uAperture, uMaxR);
    float w = clamp(coc - r + 1.0, 0.0, 1.0);
    // a tap behind the focus plane cannot bleed over a sharp tap in front of it
    w *= uFlat > 0.0 ? 1.0 : mix(1.0, clamp(coc0 - r + 1.0, 0.0, 1.0), step(s.a, c0.a));
    vec3 l = lin(s.rgb);
    float hl = 1.0 + 5.0 * smoothstep(0.55, 0.95, max(l.r, max(l.g, l.b)));
    acc += l * w * hl; wsum += w * hl;
  }
  o = vec4(srgb(acc / wsum), c0.a);
}`;

// 4. Film: a video frame, cover-fitted, with a slow push-in.
const FS_VIDEO = COMMON + `
uniform sampler2D uTex; uniform vec2 uView, uImg, uFocal; uniform float uZoom; uniform float uDepthConst;
void main(){
  float va = uView.x / uView.y, ia = uImg.x / uImg.y;
  vec2 sc = va > ia ? vec2(1.0, ia / va) : vec2(va / ia, 1.0);
  vec2 uv = (1.0 - sc) * uFocal + vUv * sc;
  uv = uFocal + (uv - uFocal) / uZoom;
  o = vec4(texture(uTex, vec2(uv.x, 1.0 - uv.y)).rgb, uDepthConst);
}`;

// 5. The edit: two shots, how they are joined, and the grain of the film over everything.
const FS_COMP = COMMON + `
uniform sampler2D uA, uB;
uniform float uMix, uMode, uFade, uTime, uGrain;
uniform vec2 uRes;
void main(){
  vec3 a = texture(uA, vUv).rgb, b = texture(uB, vUv).rgb, c;
  if (uMode < 0.5) c = mix(a, b, uMix);                                    // cross-dissolve
  else if (uMode < 1.5) {                                                   // through black
    float ka = clamp(1.0 - uMix * 2.0, 0.0, 1.0), kb = clamp(uMix * 2.0 - 1.0, 0.0, 1.0);
    c = srgb(lin(a) * ka * ka + lin(b) * kb * kb);
  } else c = uMix < 0.5 ? a : b;                                            // a cut
  c *= uFade;
  // fine grain, strongest in the mid-tones, a new frame 24 times a second
  float f = floor(uTime * 24.0);
  float g = hash(vUv * uRes + f * 17.13) + hash(vUv * uRes * 1.37 - f * 9.7) - 1.0;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c += g * uGrain * (4.0 * lum * (1.0 - lum) + 0.18);
  o = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ' ' + l).join('\n'));
  return s;
}
function program(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// homography from the unit square to a quad (tl, tr, br, bl), then its inverse
function squareToQuad(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return [a, b, c, d, e, f, g, h, 1];
}
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
// row-major 3x3 to the column-major layout GLSL expects
const colMajor = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

export class Stage {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.capture });
    if (!gl) throw new Error('no-webgl2');
    this.gl = gl;
    this.weak = opts.weak || false;
    this.dprMax = opts.dprMax || (this.weak ? 1.25 : 1.5);
    this.quality = this.weak ? 0.6 : 1;
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.P = { photo: program(gl, FS_PHOTO), dof: program(gl, FS_DOF), video: program(gl, FS_VIDEO), comp: program(gl, FS_COMP) };
    this.fbos = {};
    this.resize();
  }
  texture(src, { mip = false, clamp = true } = {}) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const w = clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    return { t, w: src.videoWidth || src.width, h: src.videoHeight || src.height, mip };
  }
  update(tex, src) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if (tex.mip) gl.generateMipmap(gl.TEXTURE_2D);
  }
  fbo(name, w, h, mip = false) {
    const gl = this.gl; let f = this.fbos[name];
    if (f && f.w === w && f.h === h) return f;
    if (f) { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); }
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    f = this.fbos[name] = { fb, tex, w, h, mip }; return f;
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, this.dprMax) * this.quality;
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.W = w; this.H = h; this.viewAspect = innerWidth / innerHeight;
  }
  draw(prog, target, setup) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.W, this.H); }
    let unit = 0;
    const T = (name, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex.t || tex); gl.uniform1i(prog.u[name], unit++); };
    setup(prog.u, T);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// A photograph with its depth map, optionally carrying a live Move Media screen.
export class PhotoShot {
  constructor(stage, { color, depth, focal = [0.5, 0.5], screen = null, name }) {
    this.s = stage; this.name = name; this.focal = focal; this.screen = screen;
    this.color = stage.texture(color, { mip: true }); this.depth = stage.texture(depth);
    this.img = [color.width, color.height];
    this.cam = { x: 0, y: 0, dolly: 0, pivot: 0, zoom: 1, at: [0.5, 0.5], focus: 0.5, aperture: 0, maxR: 0 };
    if (screen) {
      const g = screen.geo;
      this.Hinv = colMajor(inv3(squareToQuad(g.face)));
    }
  }
  render(target, time) {
    const s = this.s, c = this.cam;
    const mid = s.fbo('mid', target.w, target.h);
    s.draw(s.P.photo, mid, (u, T) => {
      T('uColor', this.color); T('uDepth', this.depth);
      const sc = this.screen;
      s.gl.uniform1f(u.uScreen, sc ? 1 : 0);
      if (sc) {
        const g = sc.geo, ct = sc.content;
        T('uLed', ct.tex);
        s.gl.uniformMatrix3fv(u.uHinv, false, this.Hinv);
        s.gl.uniform4fv(u.uPanel, g.panelInFace || [0.08, 0.13, 0.84, 0.72]);
        s.gl.uniform2fv(u.uLedRes, ct.res); s.gl.uniform2fv(u.uLedPad, ct.pad);
        s.gl.uniform1f(u.uPower, sc.power); s.gl.uniform3fv(u.uAvg, ct.avg);
        s.gl.uniform1f(u.uReflAxis, g.reflAxis || 2.0); s.gl.uniform1f(u.uReflK, g.reflStrength || 0); s.gl.uniform1f(u.uReflEnd, g.reflEnd || 1.0);
        s.gl.uniform4f(u.uSpill, g.spill.c[0], g.spill.c[1], g.spill.r[0], g.spill.r[1] * 3.0);
        s.gl.uniform1f(u.uHblur, g.hblur || 0); s.gl.uniform1f(u.uDots, sc.dots ?? 0.6);
      }
      s.gl.uniform2f(u.uView, target.w, target.h); s.gl.uniform2f(u.uImg, this.img[0], this.img[1]);
      s.gl.uniform2fv(u.uFocal, this.focal); s.gl.uniform1f(u.uZoom, c.zoom); s.gl.uniform2fv(u.uZoomAt, c.at);
      // the zoom centre lands where it naturally sits, or, as it is blended in, at a chosen point of the screen
      const va = target.w / target.h, ia = this.img[0] / this.img[1];
      const fit = va > ia ? [1, ia / va] : [va / ia, 1], off = [(1 - fit[0]) * this.focal[0], (1 - fit[1]) * this.focal[1]];
      const toK = c.toK || 0, to = c.to || [0.5, 0.5];
      const tgt = [off[0] + to[0] * fit[0], off[1] + to[1] * fit[1]];
      s.gl.uniform2f(u.uZoomTo, c.at[0] + (tgt[0] - c.at[0]) * toK, c.at[1] + (tgt[1] - c.at[1]) * toK);
      s.gl.uniform3f(u.uCam, c.x, c.y, c.dolly); s.gl.uniform1f(u.uPivot, c.pivot);
      s.gl.uniform1f(u.uSteps, Math.round((s.weak ? 12 : 22) * (c.steps || 1)));
    });
    const k = target.w / 1440;
    s.draw(s.P.dof, target, (u, T) => {
      T('uSrc', mid.tex); s.gl.uniform2f(u.uRes, target.w, target.h);
      s.gl.uniform1f(u.uFocus, c.focus); s.gl.uniform1f(u.uAperture, c.aperture * k); s.gl.uniform1f(u.uMaxR, c.maxR * k); s.gl.uniform1f(u.uFlat, (c.flat || 0) * k);
    });
  }
}

// A filmed shot (a graded clip), with the same lens.
export class FilmShot {
  constructor(stage, { video, focal = [0.5, 0.5], name }) {
    this.s = stage; this.video = video; this.focal = focal; this.name = name; this.tex = null;
    this.cam = { zoom: 1, flat: 0 };
  }
  render(target) {
    const s = this.s, v = this.video;
    if (v.readyState >= 2) { if (!this.tex) this.tex = s.texture(v); else s.update(this.tex, v); }
    if (!this.tex) return;
    const mid = s.fbo('mid', target.w, target.h);
    s.draw(s.P.video, mid, (u, T) => {
      T('uTex', this.tex); s.gl.uniform2f(u.uView, target.w, target.h); s.gl.uniform2f(u.uImg, v.videoWidth, v.videoHeight);
      s.gl.uniform2fv(u.uFocal, this.focal); s.gl.uniform1f(u.uZoom, this.cam.zoom); s.gl.uniform1f(u.uDepthConst, 0.5);
    });
    const k = target.w / 1440;
    s.draw(s.P.dof, target, (u, T) => {
      T('uSrc', mid.tex); s.gl.uniform2f(u.uRes, target.w, target.h);
      s.gl.uniform1f(u.uFocus, 0.5); s.gl.uniform1f(u.uAperture, 0); s.gl.uniform1f(u.uMaxR, 0); s.gl.uniform1f(u.uFlat, (this.cam.flat || 0) * k);
    });
  }
}

export function composite(stage, a, b, { mix = 0, mode = 0, fade = 1, time = 0, grain = 0.028 }) {
  const s = stage;
  s.draw(s.P.comp, null, (u, T) => {
    T('uA', a.tex); T('uB', (b || a).tex);
    s.gl.uniform1f(u.uMix, mix); s.gl.uniform1f(u.uMode, mode); s.gl.uniform1f(u.uFade, fade);
    s.gl.uniform1f(u.uTime, time); s.gl.uniform1f(u.uGrain, grain); s.gl.uniform2f(u.uRes, s.W, s.H);
  });
}
