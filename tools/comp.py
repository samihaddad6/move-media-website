"""Small compositing toolkit for the Move Media v3 concept frames.
Everything works on float32 RGB in 0..1 (sRGB encoded); light is added in linear space."""
import cv2, numpy as np
from PIL import Image

TK = '/home/claude/mm/tk/'
ORANGE = np.array([0xFF, 0x5A, 0x1F], np.float32) / 255


def load(p):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 4:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA)
    else:
        im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    return im.astype(np.float32) / 255


def save(p, im, q=92):
    im = np.clip(im, 0, 1)
    out = (im * 255 + 0.5).astype(np.uint8)
    if out.shape[2] == 4:
        cv2.imwrite(p, cv2.cvtColor(out, cv2.COLOR_RGBA2BGRA))
    else:
        cv2.imwrite(p, cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, q])


def lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def logo(name, width):
    """Master SVG rasterised by rsvg-convert, resized: RGBA float."""
    im = load(TK + name + '.png')
    h = int(round(im.shape[0] * width / im.shape[1]))
    return cv2.resize(im, (width, h), interpolation=cv2.INTER_AREA)


def paste(dst, src_rgba, x, y):
    h, w = src_rgba.shape[:2]
    a = src_rgba[..., 3:4]
    dst[y:y + h, x:x + w] = dst[y:y + h, x:x + w] * (1 - a) + src_rgba[..., :3] * a
    return dst


def led_panel(w, h, content, ss=4, pitch=None, glow=0.0, black=0.035):
    """Render an LED panel face of w x h px showing `content` (RGBA float, panel sized).
    pitch: LED pitch in output px (None = too fine to resolve).
    Returns RGB float (emissive, sRGB) image of the panel."""
    panel = np.full((h, w, 3), black, np.float32)
    # faint vertical sheen like a real glass front
    g = np.linspace(1.15, 0.85, h, dtype=np.float32)[:, None, None]
    panel = panel * g
    a = content[..., 3:4]
    emis = content[..., :3]
    # LEDs photograph slightly hotter than the file colour: lift towards white at the core
    hot = emis * 0.9 + 0.1
    out = panel * (1 - a) + hot * a
    if pitch and pitch >= 2.2:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        cx = (xx % pitch) / pitch - 0.5
        cy = (yy % pitch) / pitch - 0.5
        dot = np.exp(-(cx ** 2 + cy ** 2) / (2 * 0.22 ** 2))[..., None]
        out = panel * (1 - a * dot) + hot * a * (0.35 + 0.9 * dot)
    if glow > 0:
        L = lin(out)
        k = max(3, int(h * 0.12) | 1)
        L = L + cv2.GaussianBlur(L * a, (0, 0), k * 0.5) * glow
        out = srgb(L)
    return np.clip(out, 0, 1).astype(np.float32)


def trapezoid_mask(w, h, top_inset, radius=0):
    m = np.zeros((h, w), np.uint8)
    pts = np.array([[top_inset, 0], [w - 1 - top_inset, 0], [w - 1, h - 1], [0, h - 1]], np.int32)
    cv2.fillConvexPoly(m, pts, 255, lineType=cv2.LINE_AA)
    if radius:
        m = cv2.GaussianBlur(m, (0, 0), radius * 0.5)
    return m.astype(np.float32) / 255


def warp_rgba(src, quad, size):
    """Warp an RGBA float image onto dst quad (tl,tr,br,bl) in a canvas of size (w,h)."""
    h, w = src.shape[:2]
    S = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    M = cv2.getPerspectiveTransform(S, np.float32(quad))
    return cv2.warpPerspective(src, M, size, flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def over(dst, src_rgba):
    a = src_rgba[..., 3:4]
    return dst * (1 - a) + src_rgba[..., :3] * a


def grain(im, amount=0.018, size=1.0, seed=7, mask=None):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, im.shape[:2]).astype(np.float32)
    if size > 1:
        n = cv2.GaussianBlur(n, (0, 0), size * 0.5)
        n /= n.std() + 1e-6
    lum = im.mean(axis=2, keepdims=True)
    # film grain is strongest in the mid tones
    w = 4 * lum * (1 - lum) + 0.25
    g = n[..., None] * amount * w
    if mask is not None:
        g = g * mask[..., None]
    return np.clip(im + g, 0, 1)


def estimate_noise(im, box):
    x, y, w, h = box
    patch = cv2.cvtColor((im[y:y + h, x:x + w] * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    hp = patch - cv2.GaussianBlur(patch, (0, 0), 1.5)
    return float(hp.std())


def hblur(im, k):
    k = int(k)
    if k < 2:
        return im
    kern = np.ones((1, k), np.float32) / k
    return cv2.filter2D(im, -1, kern)


def cover(im, W, H, fx=0.5, fy=0.5, zoom=1.0):
    """Crop-to-fill like CSS object-fit: cover, with a focal point and zoom."""
    h, w = im.shape[:2]
    s = max(W / w, H / h) * zoom
    nw, nh = int(round(w * s)), int(round(h * s))
    r = cv2.resize(im, (nw, nh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    x = int(round((nw - W) * fx))
    y = int(round((nh - H) * fy))
    x = min(max(x, 0), nw - W)
    y = min(max(y, 0), nh - H)
    return r[y:y + H, x:x + W]


def grade(im, lift=0.0, gamma=1.0, sat=1.0, warm=0.0, contrast=1.0, black=0.0):
    out = im.copy()
    lum = out.mean(axis=2, keepdims=True)
    out = lum + (out - lum) * sat
    out = np.clip(out, 0, 1) ** gamma
    out = (out - 0.5) * contrast + 0.5
    out = out * (1 - black) + black
    out = out + lift
    if warm:
        out[..., 0] *= 1 + warm
        out[..., 2] *= 1 - warm
    return np.clip(out, 0, 1)


def vignette(im, strength=0.35, power=2.2):
    h, w = im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
    v = 1 - strength * d ** power
    return im * v[..., None]
