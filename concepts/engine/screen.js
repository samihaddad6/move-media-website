// What the rooftop screen shows: Move Media only, drawn from the master SVG files and Inter Display,
// at the screen's own LED resolution, changing on the 10-second clock.
import { loadImage } from './gl.js';

const RES = [384, 68];          // LEDs across and down one face
const PAD = 128;                // black margin round the panel, so the lens halation has room to spread

export async function makeContent(stage, { logoUrl, symbolUrl }) {
  const [logo, symbol] = await Promise.all([loadImage(logoUrl), loadImage(symbolUrl)]);
  await document.fonts.load('700 40px "Inter Display"');
  const W = RES[0] + PAD * 2, H = RES[1] + PAD * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  // each message drawn once into its own canvas
  const msgs = [
    (g) => { const h = RES[1] * 0.62, w = h * logo.width / logo.height; g.drawImage(logo, (RES[0] - w) / 2, (RES[1] - h) / 2, w, h); },
    (g) => text(g, 'Your brand, across the city.'),
    (g) => { const h = RES[1] * 0.78, w = h * symbol.width / symbol.height; g.drawImage(symbol, (RES[0] - w) / 2, (RES[1] - h) / 2, w, h); },
    (g) => text(g, 'Digital advertising on the move.'),
  ];
  function text(g, s) {
    let size = RES[1] * 0.4;
    g.font = `700 ${size}px "Inter Display"`;
    while (g.measureText(s).width > RES[0] * 0.88) { size *= 0.95; g.font = `700 ${size}px "Inter Display"`; }
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(s, RES[0] / 2, RES[1] / 2 + size * 0.04);
  }
  const frames = msgs.map((m) => {
    const c = document.createElement('canvas'); c.width = RES[0]; c.height = RES[1];
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, RES[0], RES[1]); m(g);
    const d = g.getImageData(0, 0, RES[0], RES[1]).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += (d[i] / 255) ** 2.2; gg += (d[i + 1] / 255) ** 2.2; b += (d[i + 2] / 255) ** 2.2; }
    const n = d.length / 4;
    return { c, avg: [r / n, gg / n, b / n] };
  });
  const tex = stage.texture(cv, { mip: true });
  const content = { tex, res: RES, pad: [PAD / RES[0], PAD / RES[1]], avg: [0, 0, 0], index: -1, k: -1 };
  // index: which message; k: 0..1 blend towards the next one (a quick change, as a real controller does)
  content.set = (index, k = 0) => {
    index = ((index % frames.length) + frames.length) % frames.length;
    k = Math.round(k * 8) / 8;
    if (index === content.index && k === content.k) return false;
    content.index = index; content.k = k;
    const a = frames[index], b = frames[(index + 1) % frames.length];
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.globalAlpha = 1 - k; x.drawImage(a.c, PAD, PAD);
    x.globalAlpha = k; x.drawImage(b.c, PAD, PAD); x.globalAlpha = 1;
    stage.update(tex, cv);
    content.avg = a.avg.map((v, i) => v * (1 - k) + b.avg[i] * k);
    return true;
  };
  content.count = frames.length;
  return content;
}

// The 10-second loop: each message holds for 10 s and changes in 0.3 s.
export function loopAt(t, period = 10, change = 0.3) {
  const n = Math.floor(t / period), f = t - n * period;
  return { index: n, k: f > period - change ? (f - (period - change)) / change : 0 };
}
