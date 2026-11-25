import sys, cv2, numpy as np
sys.path.insert(0, '/home/claude/mm/tk')
from comp import *

SRC = '/home/claude/mm/src/cj-dayrit-c9yfXTVji_I.jpg'
img = load(SRC)
H, W = img.shape[:2]
ox, oy = 680, 580  # crop origin used when measuring

def r(x0, y0, x1, y1):
    return (x0 + ox, y0 + oy, x1 + ox, y1 + oy)

# 1. retouch: remove the original roof sign, door livery, stickers and lettering
def row_fill(img, x0, y0, x1, y1, pad=3):
    """Fill a box by interpolating each row between the pixels just outside it.
    Right for a panning shot, where everything behind the car is a horizontal streak."""
    a = img[y0:y1, x0 - pad:x0].mean(axis=1)
    b = img[y0:y1, x1:x1 + pad].mean(axis=1)
    t = np.linspace(0, 1, x1 - x0, dtype=np.float32)[None, :, None]
    img[y0:y1, x0:x1] = a[:, None] * (1 - t) + b[:, None] * t
    return img

img = row_fill(img, *r(414, 28, 512, 76))
img = row_fill(img, *r(418, 76, 508, 86), pad=4)
# small stickers: inpaint
mask = np.zeros((H, W), np.uint8)
for (x0, y0, x1, y1) in [r(424, 184, 542, 219), r(340, 141, 380, 167)]:
    cv2.rectangle(mask, (x0, y0), (x1, y1), 255, -1)
u8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
fixed = cv2.inpaint(u8, mask, 7, cv2.INPAINT_TELEA).astype(np.float32) / 255
m = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 1.5)[..., None]
img = img * (1 - m) + fixed * m
# the door stripe and the chequered livery: paint them out with the body colour,
# interpolating each column between the paint just above and just below
top = lambda x: 800 + 0.040 * (x - 1000)
bot = lambda x: 824 + 0.032 * (x - 1000)
PAD = 6
src = img.copy()
for x in range(812, 1640):
    y0 = int(np.floor(top(x) - PAD)); y1 = int(np.ceil(bot(x) + PAD))
    a = src[y0 - 4:y0, x].mean(axis=0); b = src[y1:y1 + 4, x].mean(axis=0)
    t = np.linspace(0, 1, y1 - y0, dtype=np.float32)[:, None]
    img[y0:y1, x] = a * (1 - t) + b * t
# soften the column-to-column steps, only inside the painted band
bm = np.zeros((H, W), np.float32)
pts = np.array([[812, top(812) - PAD], [1640, top(1640) - PAD], [1640, bot(1640) + PAD], [812, bot(812) + PAD]], np.int32)
cv2.fillConvexPoly(bm, pts, 1.0)
bm = cv2.GaussianBlur(bm, (0, 0), 2.5)[..., None]
img = img * (1 - bm) + cv2.GaussianBlur(img, (0, 0), sigmaX=4, sigmaY=1.0) * bm
img = grain(img, amount=0.015, size=1.4, seed=3, mask=bm[..., 0])
# door seams, as in the original
for sx in (1252, 1487):
    img[int(top(sx)) - 4:int(bot(sx)) + 6, sx - 1:sx + 1] *= 0.55

# 2. the screen housing, side view, proportions from the logo kit presentation (slide 6)
roof_y = 652              # top of the roof line under the housing
cx = 1112                 # centre of the flat part of the roof
hw = 445                  # housing bottom width (px)
hh = int(hw * 0.205)      # housing height
inset = int(hw * 0.055)   # taper of the sides
post_h = 12
hx0 = cx - hw // 2
hy0 = roof_y - post_h - hh
ss = 3
Hs = np.zeros((hh * ss, hw * ss, 4), np.float32)
tm = trapezoid_mask(hw * ss, hh * ss, inset * ss, radius=2 * ss)
# glossy black plastic: very dark with a soft reflection of the city across the top
body = np.zeros((hh * ss, hw * ss, 3), np.float32) + 0.018
refl = cv2.resize(cv2.GaussianBlur(img[hy0 - 60:hy0 - 20, hx0:hx0 + hw], (0, 0), 6), (hw * ss, hh * ss))
fall = np.linspace(0.32, 0.02, hh * ss, dtype=np.float32)[:, None, None]
body = body + refl * fall * 0.55
# glossy plastic also mirrors the streaking street behind, faintly
streak = cv2.resize(hblur(img[hy0 + 10:hy0 + hh + 10, hx0 - 200:hx0 + hw + 200], 120)[:, 200:200 + hw], (hw * ss, hh * ss))
body = body + streak * 0.07
body[:2 * ss] += 0.10
body[:, :inset * ss] *= 0.8
Hs[..., :3] = body
Hs[..., 3] = tm
# panel inset
pw, ph = int(hw * 0.84), int(hh * 0.72)
px0, py0 = (hw - pw) // 2, int(hh * 0.13)
content = np.zeros((ph * ss, pw * ss, 4), np.float32)
lg = logo('horizontal-colour-on-dark', int(ph * ss * 0.78 / 0.3426))
cy0 = (ph * ss - lg.shape[0]) // 2
cx0 = (pw * ss - lg.shape[1]) // 2
content[cy0:cy0 + lg.shape[0], cx0:cx0 + lg.shape[1]] = lg
panel = led_panel(pw * ss, ph * ss, content, glow=0.0, black=0.03)
Hs[py0 * ss:(py0 + ph) * ss, px0 * ss:(px0 + pw) * ss, :3] = panel
Hs = cv2.resize(Hs, (hw, hh), interpolation=cv2.INTER_AREA)
# match the small residual motion blur of the panned car
Hs = hblur(Hs, 3)
Hs = cv2.GaussianBlur(Hs, (0, 0), 0.7)

# posts, each running down to the roof where it stands (the roof curves away at the front)
roof_at = lambda x: 651 if x < 1180 else 651 + (x - 1180) * 0.19
for px in (int(hw * 0.27), int(hw * 0.73)):
    X = hx0 + px
    cv2.rectangle(img, (X - 5, hy0 + hh - 2), (X + 5, int(roof_at(X)) + 2), (0.025, 0.025, 0.03), -1)
    img[int(roof_at(X)) - 1:int(roof_at(X)) + 3, X - 9:X + 9] *= 0.6   # contact shadow
img[hy0:hy0 + hh, hx0:hx0 + hw] = over(img[hy0:hy0 + hh, hx0:hx0 + hw], Hs)

# 3. light: the screen's light falls on the roof and a faint halation in the lens
L = lin(img)
emis = np.zeros_like(img)
emis[hy0:hy0 + hh, hx0:hx0 + hw] = Hs[..., :3] * Hs[..., 3:4]
E = lin(emis)
E = E * (E.max(axis=2, keepdims=True) > 0.05)
halo = cv2.GaussianBlur(E, (0, 0), 6) * 0.30 + cv2.GaussianBlur(E, (0, 0), 30) * 0.10
L[hy0:hy0 + hh, hx0:hx0 + hw] += E[hy0:hy0 + hh, hx0:hx0 + hw] * 0.6
L = L + halo
# warm spill on the roof just under the housing
spill = np.zeros((H, W), np.float32)
cv2.ellipse(spill, (cx, roof_y + 6), (int(hw * 0.42), 10), 0, 0, 360, 1, -1)
spill = cv2.GaussianBlur(spill, (0, 0), 8)
L = L + spill[..., None] * lin(ORANGE)[None, None] * 0.05
img = srgb(L)

# 4. grain matched to the photograph's own noise
n = estimate_noise(img, (200, 200, 300, 200))
gm = np.zeros((H, W), np.float32); gm[hy0 - 20:roof_y + 30, hx0 - 30:hx0 + hw + 30] = 1
gm = cv2.GaussianBlur(gm, (0, 0), 10)
img = grain(img, amount=n * 1.1, size=1.4, mask=gm)
save('/home/claude/mm/out/taxi-side-full.jpg', img, 95)
print('noise', n, 'housing', hx0, hy0, hw, hh)
