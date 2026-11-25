"""LED close-ups: a real LED panel re-lit to show the Move Media symbol (Unsplash pdTWuF8TG0c)."""
import sys
sys.path.insert(0, '/home/claude/mm/tk')
from comp import *

img = load('/home/claude/mm/src/bernard-hermant-pdTWuF8TG0c.jpg')   # 2400 x 1600
H, W = img.shape[:2]
L = lin(img)
lum = L.max(axis=2)
b = cv2.GaussianBlur(lum, (0, 0), 6)
th = (b > np.percentile(b, 55)).astype(np.uint8)
n, lab, stats, cent = cv2.connectedComponentsWithStats(th, 8)
# the symbol, drawn across the grid of diodes (about 14 rows tall), left of centre
sym = logo('symbol-orange', 980)[..., 3]
mask = np.zeros((H, W), np.float32)
sx, sy = 560, 300
mask[sy:sy + sym.shape[0], sx:sx + sym.shape[1]] = sym[: H - sy, : W - sx]
lit = np.zeros(n, bool)
for i in range(1, n):
    cx, cy = cent[i]
    if 0 <= int(cy) < H and 0 <= int(cx) < W:
        lit[i] = mask[int(cy), int(cx)] > 0.5
litpix = lit[lab].astype(np.float32)
litpix = cv2.GaussianBlur(cv2.dilate(litpix, np.ones((9, 9), np.uint8)), (0, 0), 3)[..., None]
orange = np.stack([lum, lum * 0.13, lum * 0.025], -1) * 1.35
off = np.stack([lum, lum, lum * 1.04], -1) * 0.055
out = srgb(np.stack([lum, lum * 0.13, lum * 0.025], -1) * 1.2)   # every diode lit at the brand orange
out = grain(out, amount=0.012, size=1.3, seed=21)
save('/home/claude/mm/out/led-symbol.jpg', out, 94)

# the raking LED module, re-lit orange (as in concept B)
led = load('/home/claude/mm/src/engin-akyurt-Q660Btkw6Vk.jpg')
Lr = lin(led); r, g, bb = Lr[..., 0], Lr[..., 1], Lr[..., 2]
tot = r + g + bb + 1e-5; lm = Lr.max(axis=2)
o = (np.stack([lm, lm * 0.13, lm * 0.025], -1) * 1.25 * (r / tot)[..., None]
     + np.stack([lm * .9, lm * .9, lm * .85], -1) * 0.05 * ((g + bb) / tot)[..., None]
     + Lr.mean(axis=2, keepdims=True) * 0.04)
save('/home/claude/mm/out/led-rake.jpg', grain(srgb(o * 1.1), 0.012, 1.3, seed=22), 94)
print('ok', n)
