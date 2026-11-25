"""Close shot: a taxi roof at night with the Move Media screen (Unsplash Dzw3Jv5uFfU, retouched)."""
import sys
sys.path.insert(0, '/home/claude/mm/tk')
from screen import *

img = load('/home/claude/mm/src/masahiro-miyagi-Dzw3Jv5uFfU.jpg')   # 2400 x 1600
H, W = img.shape[:2]
# 1. remove the original sign, its base and its mirror image on the roof
m = np.zeros((H, W), np.uint8)
cv2.rectangle(m, (985, 705), (1422, 940), 255, -1)
cv2.rectangle(m, (985, 932), (1422, 1060), 255, -1)
u8 = (img * 255).astype(np.uint8)
fill = cv2.inpaint(u8, m, 15, cv2.INPAINT_TELEA).astype(np.float32) / 255
fill = cv2.GaussianBlur(fill, (0, 0), 6)
mm = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 4)[..., None]
img = img * (1 - mm) + fill * mm
img = grain(img, amount=0.012, size=1.3, seed=11, mask=mm[..., 0])

# 2. the housing: about 2.2 times the old sign's width, standing on two short posts
cx, base = 1205, 902
w, h = 930, int(930 * 0.205)
quad = [(cx - w / 2 + 2, base - h), (cx + w / 2 - 2, base - h + 3), (cx + w / 2, base + 3), (cx - w / 2, base)]
posts = [((cx - w * 0.23, base - 2), (cx - w * 0.23, 934)), ((cx + w * 0.23, base), (cx + w * 0.23, 937))]
def make(content, msg=None, seed=5):
    out = place(img, quad, content=content, msg=msg, night=True, posts=posts,
                refl=dict(axis_y=936, strength=0.42, blur=5), blur=0.6,
                spill=((cx, 945), (w * 0.45, 16), 0.06), seed=seed)
    return out[:1090]          # crop above the side windows (stickers and lettering below)
save('/home/claude/mm/out/close-logo.jpg', make('logo'), 95)
save('/home/claude/mm/out/close-text.jpg', make('text', 'Your brand, across the city.', 6), 95)
save('/home/claude/mm/out/close-tag.jpg', make('text', 'Digital advertising on the move.', 7), 95)
print('ok')
