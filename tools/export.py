"""Grade, crop and encode every picture of the v3 site as AVIF and WebP in two or three widths."""
import sys, os, subprocess, json
sys.path.insert(0, '/home/claude/mm/tk')
from comp import *
from PIL import Image

SRC = '/home/claude/mm/src/'
OUT = '/home/claude/move-media-website/src/img/'
os.makedirs(OUT, exist_ok=True)
report = {}


ONLY = set(sys.argv[1:])
def enc(name, im, widths, q_avif=52, q_webp=74):
    if ONLY and not any(name.startswith(o) for o in ONLY):
        for w in widths:
            a = f'{OUT}{name}-{w}.avif'
            if os.path.exists(a): report[f'{name}-{w}'] = [Image.open(a).height, os.path.getsize(a) // 1024, os.path.getsize(a.replace('.avif', '.webp')) // 1024]
        return
    """im: float RGB. Writes name-<w>.avif and .webp for each width."""
    pil = Image.fromarray((np.clip(im, 0, 1) * 255 + .5).astype(np.uint8))
    for w in widths:
        h = round(pil.height * w / pil.width)
        r = pil.resize((w, h), Image.LANCZOS) if w != pil.width else pil
        a = f'{OUT}{name}-{w}.avif'; b = f'{OUT}{name}-{w}.webp'
        r.save(a, quality=q_avif, speed=4)
        r.save(b, quality=q_webp, method=6)
        report[f'{name}-{w}'] = [h, os.path.getsize(a) // 1024, os.path.getsize(b) // 1024]


def crop_right(im, aspect):
    """Crop to aspect (w/h) keeping the right edge: cut from the left only (Sami's instruction)."""
    h, w = im.shape[:2]
    nw = min(w, int(round(h * aspect)))
    return im[:, w - nw:]


def night(im, sat=0.92, gamma=1.0):
    return grade(im, sat=sat, gamma=gamma, contrast=1.03)


# 1. Beirut at night, from the hills (Unsplash sACdgzcdzEU): the opening and the bookend share one file
b = load('/home/claude/mm/raw-sara.jpg')                    # full 6000 x 3376
b = grade(b, sat=0.9, contrast=1.02)
b = vignette(b, 0.22)
bd = crop_right(b, 1.6)                                      # 16:10, left edge trimmed
enc('beirut-night', grain(cv2.resize(bd, (2560, 1600), interpolation=cv2.INTER_AREA), 0.010, 1.2), [1280, 1920, 2560], q_avif=55)
bm = crop_right(b, 0.5)                                      # phone: the right half, port and horizon
enc('beirut-night-tall', grain(cv2.resize(bm, (1200, 2400), interpolation=cv2.INTER_AREA), 0.012, 1.2), [600, 900, 1200], q_avif=64)

def tall_roof(c, W=1000, H=2170, top=800):
    """Phone version of a roof shot: the whole screen kept in frame, the defocused city above it
    extended from the photograph's own blur (it is already out of focus, so the join does not show)."""
    bg = cover(c[:700], W, H, 0.5, 0.35)
    bg = cv2.GaussianBlur(bg, (0, 0), 18)
    c = c[:, 550:1850]
    fg = cv2.resize(c, (W, int(c.shape[0] * W / c.shape[1])), interpolation=cv2.INTER_AREA)
    out = bg.copy(); fh = fg.shape[0]
    a = np.ones((fh, 1, 1), np.float32); f = 160
    a[:f, 0, 0] = np.linspace(0, 1, f)
    out[top:top + fh] = out[top:top + fh] * (1 - a) + fg * a
    # below the roof: the glossy roof falls away into the dark
    rest = H - (top + fh)
    if rest > 0:
        tail = cv2.resize(fg[-60:], (W, rest)); tail = cv2.GaussianBlur(tail, (0, 0), 10)
        g = np.linspace(1, 0.0, rest, dtype=np.float32)[:, None, None] ** 1.6
        out[top + fh:] = tail * g
    return grain(out, 0.012, 1.3, seed=31)

def tall_taxi(t, W=1000, H=2170):
    """Phone version of the panning shot that keeps the whole car: the streaked street above and
    below is extended from the photograph's own rows (a panning blur is horizontal, so stretching it
    vertically reads as more of the same street)."""
    fg = t[:, 640:1770]                                          # the car with a little room either side
    fg = cv2.resize(fg, (W, int(fg.shape[0] * W / fg.shape[1])), interpolation=cv2.INTER_AREA)
    fh = fg.shape[0]; top = (H - fh) // 2 - 60; bot = H - top - fh
    up = cv2.GaussianBlur(cv2.resize(fg[:90], (W, top + 120)), (0, 0), sigmaX=3, sigmaY=14)
    dn = cv2.GaussianBlur(cv2.resize(fg[-90:], (W, bot + 120)), (0, 0), sigmaX=3, sigmaY=14)
    out = np.zeros((H, W, 3), np.float32)
    out[:top + 120] = up; out[top + fh - 120:] = dn
    a = np.ones((fh, 1, 1), np.float32); f = 120
    a[:f, 0, 0] = np.linspace(0, 1, f); a[-f:, 0, 0] = np.linspace(1, 0, f)
    out[top:top + fh] = out[top:top + fh] * (1 - a) + fg * a
    return grain(out, 0.012, 1.3, seed=41)

# 2. taxi chapter and composites
tw = load('/home/claude/mm/out/taxi-side-full.jpg')         # 2400 x 1600
enc('taxi-wide', vignette(cover(tw, 2400, 1500, 0.5, 0.45), 0.25), [960, 1600, 2400])
tc = load('/home/claude/mm/out/taxi-side-full.jpg')
enc('taxi-tall', vignette(tall_taxi(tc), 0.25), [600, 1000])
enc('taxi-wide-tight', vignette(cover(tc, 1400, 1600, 0.52, 0.42, zoom=1.0)[:, :], 0.25), [700, 1050, 1400])
for k in ('logo', 'text', 'tag'):
    c = load(f'/home/claude/mm/out/close-{k}.jpg')           # 2400 x 1090
    enc(f'roof-{k}', vignette(c, 0.25), [960, 1600, 2400])
    enc(f'roof-{k}-tall', vignette(tall_roof(c), 0.25), [600, 1000])

# 3. close-ups
lp = load('/home/claude/mm/out/led-symbol.jpg')
enc('led-pixels', lp, [800, 1400])
lr = load('/home/claude/mm/out/led-rake.jpg')                # 1600 x 2400 portrait
enc('led-rake', lr, [600, 1000])
cl = load('/home/claude/mm/out/close-logo.jpg')
enc('screen-face', cl[436:1090, 715:1696], [981])          # the whole lit face with its roof, 3:2           # the end of the housing and its post
enc('roof-light', cl[720:1090, 1010:1503], [493])          # the wordmark and its reflection on the roof, 4:3              # the screen's light on the roof

# 4. Lebanon by day
enc('beirut-aerial', grade(load(SRC + 'piotr-chrobot-KqEYj1VHA_o.jpg'), sat=0.9), [960, 1600, 2400])
enc('jounieh', grade(load(SRC + 'anna-danielyan-EYGHnAI0zDE.jpg'), sat=0.9), [800, 1400])
enc('downtown', grade(load(SRC + 'joe-boshra-HCG9r3-juGA.jpg'), sat=0.92), [700, 1100])
enc('skyline-dusk', grade(load(SRC + 'christelle-hayek-vL5q8X78YBA.jpg'), sat=0.9), [960, 1600])
nn = crop_right(b, 0.8)
enc('beirut-night-crop', cv2.resize(nn[600:, :], (1100, int(1100 * (nn.shape[0] - 600) / nn.shape[1]))), [700, 1100])

json.dump(report, open('/home/claude/mm/tk/export-report.json', 'w'), indent=1)
tot = sum(v[1] for v in report.values())
print(json.dumps(report)); print('avif total KB', tot)

r = json.load(open('/home/claude/mm/tk/export-report.json'))
r['traffic-poster-1280'] = [720, 16, 20]; r['traffic-poster-tall-540'] = [960, 11, 14]
json.dump(r, open('/home/claude/mm/tk/export-report.json', 'w'), indent=1)
