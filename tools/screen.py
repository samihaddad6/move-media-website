"""Place a Move Media rooftop screen onto a real photograph, in perspective."""
import sys, cv2, numpy as np
sys.path.insert(0, '/home/claude/mm/tk')
from comp import *


def face_texture(W, Hh, content='logo', ss=1, night=True, env=None, msg=None, ambient=None):
    """Front face of the housing as an RGBA texture (W x Hh): the trapezoid body, the panel, the content.
    content: 'logo' (horizontal colour-on-dark logo) | 'text' (Move Media message in white) | 'symbol'."""
    inset = int(W * 0.055)
    tm = trapezoid_mask(W, Hh, inset, radius=max(1, W // 400))
    body = np.zeros((Hh, W, 3), np.float32) + (0.018 if night else 0.035)
    if env is not None:   # reflection of the surroundings in the glossy plastic, strongest at the top edge
        e = cv2.resize(cv2.GaussianBlur(env, (0, 0), 8), (W, Hh))
        fall = np.linspace(0.30, 0.03, Hh, dtype=np.float32)[:, None, None]
        body = body + e * fall * (0.5 if night else 0.35)
    body[: max(2, Hh // 45)] += 0.08 if night else 0.14
    if ambient is not None:
        body = body + np.float32(ambient)
    pw, ph = int(W * 0.84), int(Hh * 0.72)
    px0, py0 = (W - pw) // 2, int(Hh * 0.13)
    c = np.zeros((ph, pw, 4), np.float32)
    if content == 'logo':
        lg = logo('horizontal-colour-on-dark', int(ph * 0.78 / 0.3426))
    elif content == 'symbol':
        lg = logo('symbol-orange', int(ph * 0.86))
    else:
        lg = text_rgba(msg or 'Your brand, across the city.', int(ph * 0.34), pw)
    lg = lg[:, : min(lg.shape[1], pw)]
    y0 = (ph - lg.shape[0]) // 2; x0 = (pw - lg.shape[1]) // 2
    c[y0:y0 + lg.shape[0], x0:x0 + lg.shape[1]] = lg
    panel = led_panel(pw, ph, c, black=0.03 if night else 0.05)
    out = np.zeros((Hh, W, 4), np.float32)
    out[..., :3] = body
    out[py0:py0 + ph, px0:px0 + pw, :3] = panel
    # a thin bezel round the panel and a soft rim of light down the slanted ends
    b = max(1, W // 500)
    cv2.rectangle(out, (px0 - b, py0 - b), (px0 + pw + b, py0 + ph + b), (0.07, 0.07, 0.075, 1), b, cv2.LINE_AA)
    rim = np.zeros((Hh, W), np.float32)
    cv2.line(rim, (inset, 0), (0, Hh - 1), 1.0, max(2, W // 300), cv2.LINE_AA)
    cv2.line(rim, (W - 1 - inset, 0), (W - 1, Hh - 1), 1.0, max(2, W // 300), cv2.LINE_AA)
    rim = cv2.GaussianBlur(rim, (0, 0), max(1, W // 600))
    out[..., :3] += rim[..., None] * (0.10 if night else 0.18)
    out[..., :3] *= np.linspace(1.15, 0.85, Hh, dtype=np.float32)[:, None, None]
    out[..., 3] = tm
    emis = np.zeros((Hh, W, 3), np.float32)
    emis[py0:py0 + ph, px0:px0 + pw] = c[..., :3] * c[..., 3:4]
    return out, emis


def text_rgba(msg, size, maxw):
    """White Inter Display Bold text rendered with Pillow (the site's only typeface)."""
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype('/home/claude/mm/tk/InterDisplay-Bold.ttf', size)
    while True:
        bb = f.getbbox(msg)
        if bb[2] - bb[0] <= maxw * 0.9 or size < 8:
            break
        size = int(size * 0.92); f = ImageFont.truetype('/home/claude/mm/tk/InterDisplay-Bold.ttf', size)
    bb = f.getbbox(msg)
    im = Image.new('RGBA', (bb[2] - bb[0] + 4, bb[3] - bb[1] + 4), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 - bb[0], 2 - bb[1]), msg, font=f, fill=(255, 255, 255, 255))
    return np.asarray(im).astype(np.float32) / 255


def place(img, quad, content='logo', night=True, msg=None, end=None, posts=None, refl=None,
          blur=0.0, hblur_px=0, glow=1.0, grain_amt=None, seed=5, spill=None, ss=3, ambient=None, end_col=None):
    """quad: tl, tr, br, bl of the housing's visible face in image pixels.
    end: optional polygon of the housing's visible end face (drawn dark).
    posts: list of ((x0,y0),(x1,y1)) line segments from housing to roof.
    refl: optional dict(axis_y=..., strength=...) mirror the face in a glossy roof below."""
    H, W = img.shape[:2]
    q = np.float32(quad)
    fw = int(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3])) * ss)
    fh = int(max(np.linalg.norm(q[3] - q[0]), np.linalg.norm(q[2] - q[1])) * ss)
    x0, y0 = q.min(axis=0).astype(int); x1, y1 = q.max(axis=0).astype(int)
    env = img[max(0, y0 - (y1 - y0)):y0, max(0, x0):x1] if y0 > 10 else None
    tex, emis = face_texture(fw, fh, content, night=night, env=env, msg=msg, ambient=ambient)
    full = warp_rgba(tex, q, (W, H))
    em = warp_rgba(np.dstack([emis, np.ones(emis.shape[:2], np.float32)]), q, (W, H))[..., :3]
    out = img.copy()
    if posts:
        for (a, b) in posts:
            th = max(2, int(fh / ss * 0.10))
            cv2.line(out, tuple(map(int, a)), tuple(map(int, b)), (0.03, 0.03, 0.035) if night else (0.06, 0.06, 0.065), th, cv2.LINE_AA)
    if end is not None:
        m = np.zeros((H, W), np.float32)
        cv2.fillConvexPoly(m, np.int32(end), 1.0, lineType=cv2.LINE_AA)
        col = np.array(end_col if end_col is not None else ([0.025, 0.025, 0.028] if night else [0.07, 0.065, 0.06]), np.float32)
        out = out * (1 - m[..., None]) + col * m[..., None]
    if blur > 0:
        full = cv2.GaussianBlur(full, (0, 0), blur); em = cv2.GaussianBlur(em, (0, 0), blur)
    if hblur_px:
        full = hblur(full, hblur_px); em = hblur(em, hblur_px)
    if refl:
        ay = refl['axis_y']; s = refl.get('strength', 0.35)
        fl = full[::-1].copy(); fl = np.roll(fl, int(2 * ay - H), axis=0)
        fl = cv2.GaussianBlur(fl, (0, 0), refl.get('blur', 3))
        a = fl[..., 3:4] * s
        mask = np.zeros((H, W, 1), np.float32); mask[int(ay):] = 1
        out = out * (1 - a * mask) + fl[..., :3] * a * mask
    out = over(out, full)
    L = lin(out)
    E = lin(np.clip(em, 0, 1))
    if night:
        L += E * 0.55 * glow
        L += cv2.GaussianBlur(E, (0, 0), max(2, fh / ss * 0.08)) * 0.28 * glow
        L += cv2.GaussianBlur(E, (0, 0), max(6, fh / ss * 0.40)) * 0.08 * glow
    else:
        L += E * 0.18
    if spill is not None:
        (cx, cy), (rx, ry), k = spill
        sp = np.zeros((H, W), np.float32)
        cv2.ellipse(sp, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 1, -1)
        sp = cv2.GaussianBlur(sp, (0, 0), max(3, ry))
        L += sp[..., None] * lin(ORANGE)[None, None] * k
    out = srgb(L)
    if grain_amt is None:
        grain_amt = estimate_noise(img, (10, 10, min(300, W - 20), min(200, H - 20)))
    gm = np.zeros((H, W), np.float32)
    gm[max(0, y0 - 40):min(H, y1 + 60), max(0, x0 - 40):min(W, x1 + 40)] = 1
    gm = cv2.GaussianBlur(gm, (0, 0), 12)
    return grain(out, amount=grain_amt, size=1.4, seed=seed, mask=gm)
