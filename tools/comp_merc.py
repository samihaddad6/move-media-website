"""A Beirut street by day: an old Mercedes, the classic Lebanese taxi, with the screen on its roof
(Unsplash zmIUwHOJjf8, retouched: plate and faces softened)."""
import sys
sys.path.insert(0, '/home/claude/mm/tk')
from screen import *

img = load('/home/claude/mm/src/etienne-boulanger-zmIUwHOJjf8.jpg')   # 1601 x 2400
H, W = img.shape[:2]
def soften(im, x0, y0, x1, y1, s=9):
    m = np.zeros(im.shape[:2], np.float32); cv2.rectangle(m, (x0, y0), (x1, y1), 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), 4)[..., None]
    return im * (1 - m) + cv2.GaussianBlur(im, (0, 0), s) * m
img = soften(img, 846, 2046, 976, 2106, 7)     # number plate
img = soften(img, 196, 1740, 272, 1812, 6)     # face of a passer-by
ox, oy = 150, 1450
P = lambda x, y: (x + ox, y + oy)
quad = [P(302, 282), P(588, 275), P(592, 361), P(298, 366)]
end = [P(588, 275), P(606, 281), P(608, 364), P(592, 361)]
posts = [(P(372, 364), P(372, 372)), (P(522, 362), P(522, 373))]
for content, msg, name in [('logo', None, 'merc-full'), ('text', 'Your brand, across the city.', 'merc-text')]:
  out = place(img, quad, content=content, msg=msg, night=False, end=end, posts=posts, blur=0.8, seed=9, grain_amt=0.007, ambient=(0.05, 0.04, 0.03), end_col=(0.30, 0.24, 0.18))
  # soft contact shadow of the housing on the roof (the sun is behind and to the right)
  sh = np.zeros((H, W), np.float32)
  cv2.ellipse(sh, P(452, 373), (150, 5), 0, 0, 360, 1, -1)
  sh = cv2.GaussianBlur(sh, (0, 0), 5)
  out = out * (1 - 0.35 * sh[..., None])
  save(f'/home/claude/mm/out/{name}.jpg', out, 95)
print('ok')
