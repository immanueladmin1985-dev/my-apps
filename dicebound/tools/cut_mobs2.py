"""새 몬스터 시트(마젠타 바탕, 3줄 13종)에서 큰 그림만 잘라 낸다.
사용법: python3 dicebound/tools/cut_mobs2.py <monsters-new.png> dicebound/assets/mobs
시트마다 큰 그림 오른쪽에 작은 뒷모습·축소 그림이 있고, 발밑에 이름표가 있다.
이름표는 남색 상자를 찾아 지우고, 각 칸의 가로 범위 안에 무게중심이 있는 조각만 모아 저장한다."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import *

SRC, OUT = sys.argv[1], sys.argv[2]
# (이름, 가로 범위, 줄) — 1672×941 시트 기준. 줄 높이는 이름표 위치로 정한다
ROWS = [(0, 330), (345, 640), (655, 910)]
MOBS = [
    ('goblin-archer', (0, 258), 0), ('goblin-warrior', (380, 662), 0), ('goblin-shaman', (828, 1100), 0), ('goblin-brute', (1232, 1513), 0),
    ('bandit', (0, 222), 1), ('bandit-archer', (372, 566), 1), ('bandit-mage', (705, 900), 1), ('skeleton-soldier', (1010, 1198), 1), ('skeleton-archer', (1330, 1518), 1),
    ('skeleton-mage', (0, 222), 2), ('wolf', (370, 627), 2), ('spider', (815, 1140), 2), ('slime', (1300, 1528), 2),
]

a = load(SRC)
sx = a.shape[1] / 1672
# 배경은 채도가 아주 높은 마젠타(색상 약 310°)만 본다. 보라 슬라임(260~300°)과 분홍 눈동자를 지우지 않기 위해서다
h, s, v = hsv(a)
cand = (h > 298) & (h < 322) & (s > 0.75) & (v > 0.55)
lab, n = ndimage.label(cand)
sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
keep_bg = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) | {i + 1 for i, z in enumerate(sizes) if z >= 6 * sx * sx}
bg = np.isin(lab, list(keep_bg - {0}))
fg = ndimage.binary_opening(~bg, iterations=1)
# 가장자리에 섞인 마젠타 번짐만 깎는다
fringe = (h > 295) & (h < 330) & (s > 0.45) & (v > 0.35)
for _ in range(2):
    fg &= ~(fringe & (ndimage.distance_transform_edt(fg) < 3))
al = np.array(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
rgb = a.copy()
edge = (al > 0) & (al < 0.98)
cap = rgb[..., 1] + 40
rgb[..., 0] = np.where(edge, np.minimum(rgb[..., 0], np.maximum(cap, rgb[..., 0] * 0.8)), rgb[..., 0])
rgb[..., 2] = np.where(edge, np.minimum(rgb[..., 2], np.maximum(cap, rgb[..., 2] * 0.85)), rgb[..., 2])

# 이름표: 남색으로 채운 가로로 긴 상자
fill = (a[..., 2] > a[..., 0] + 8) & (a[..., 2] > a[..., 1] + 12) & (a.max(axis=2) < 110) & (a.max(axis=2) > 25)
lab, n = ndimage.label(fill)
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if (lab[sl] == i).sum() > 800 * sx * sx and w > 80 * sx and h < 45 * sx:
        al[sl[0].start:sl[0].stop + 3, max(0, sl[1].start - 12):sl[1].stop + 12] = 0

lab, cs = components(al, int(150 * sx * sx))
for name, (x0, x1), row in MOBS:
    y0, y1 = ROWS[row]
    keep = np.zeros(al.shape, bool)
    for c in cs:
        cx, cy = (c['x0'] + c['x1']) / 2 / sx, (c['y0'] + c['y1']) / 2 / sx
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            keep |= lab == c['id']
    ys, xs = np.where(keep)
    print(name, save_rgba(rgb, al, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), f'{OUT}/{name}.webp', keep_mask=keep, max_side=560))
