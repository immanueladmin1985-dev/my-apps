"""새 주인공 시트(1536×1024)에서 앞모습·뒷모습·얼굴과 비치발리볼 공, 로딩 일러스트를 잘라 낸다.
사용법: python3 dicebound/tools/cut_heroes2.py <원본 폴더> dicebound/assets
원본 폴더에 필요한 파일 이름:
  pc2-knight.png pc2-hunter.png pc2-archer.png pc2-mage.png pc2-volley.png   마젠타 바탕
  pc2-fighter.png                                                           바둑판무늬(가짜 투명) 바탕
  ill-volley-wide.png ill-volley-tall-a.png ill-volley-tall-b.png           비치발리볼 로딩 일러스트
상자 좌표는 1536×1024 시트 기준이다. 상자 안에 무게중심이 있는 조각만 모으고, clip 이면 상자 밖을 잘라 낸다."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import *

SRC, OUT = sys.argv[1], sys.argv[2]
SHEETS = {
    'knight': dict(bg='magenta', front=((0, 0, 350, 745), True), back=((350, 0, 668, 745), True), face=(677, 27, 825, 172)),
    'hunter': dict(bg='magenta', front=((0, 0, 424, 760), False), back=((424, 0, 706, 745), False), face=(687, 32, 822, 178)),
    'archer': dict(bg='magenta', front=((0, 0, 343, 760), False), back=((343, 0, 653, 760), False), face=(639, 68, 767, 206)),
    'mage': dict(bg='magenta', front=((0, 0, 330, 740), False), back=((330, 0, 705, 745), False), face=(709, 47, 852, 191)),
    'volley': dict(bg='magenta', front=((0, 0, 270, 800), False), back=((270, 0, 535, 800), False), face=(582, 21, 745, 241), ball=(15, 800, 140, 925)),
    'fighter': dict(bg='checker', front=((0, 0, 355, 815), False), back=((355, 0, 706, 795), False), face=(655, 28, 837, 229), min_area=3000),
}


def pick(lab, cs, box, clip):
    """clip 이 아니면 무게중심이 상자 안에 있는 조각을, clip 이면 상자 안에 걸친 조각을 모아 상자 밖을 잘라 낸다"""
    x0, y0, x1, y1 = box
    m = np.zeros(lab.shape, bool)
    for c in cs:
        cx, cy = (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2
        inside = (lab[y0:y1, x0:x1] == c['id']).sum() > 500 if clip else (x0 <= cx < x1 and y0 <= cy < y1)
        if inside:
            m |= lab == c['id']
    if clip:
        cm = np.zeros_like(m); cm[y0:y1, x0:x1] = True
        m &= cm
    return m


def fix_knight_back(rgb, al, m):
    """기사 뒷모습: 옆 공격 자세의 칼끝이 망토 오른쪽 가장자리를 덮고 있다.
    칼이 지나가는 줄(y 440~510)에서는 위아래 줄의 망토 끝을 이어 가장자리를 새로 긋고, 그 바깥(칼)은 지우고 안쪽 빈 곳은 가까운 망토 색으로 채운다"""
    # 원본에서 잰 망토 끝: 칼 바로 위 x 640, 바로 아래 x 632
    y0, y1, x0, x1, rt, rb = 422, 508, 585, 668, 640, 632
    orig = m.copy()
    for y in range(y0, y1):
        r = int(round(rt + (rb - rt) * (y - y0) / (y1 - y0)))
        m[y, x0:r + 1] = True
        m[y, r + 1:x1] = False
    # 칼날: 띠 안의 무채색 덩어리 중 가장 큰 것. 테두리 선까지 덮도록 조금 넓혀서, 가까운 망토 색으로 칠한다
    h, s, v = hsv(rgb)
    band = np.zeros_like(m); band[y0 - 6:y1 + 6, x0:x1] = True
    gray = band & (s < 0.25) & (v > 0.35)
    lab, n = ndimage.label(gray)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        blade = ndimage.binary_fill_holes(lab == 1 + int(np.argmax(sizes)))
        blade = ndimage.binary_dilation(blade, iterations=3) & band
    else:
        blade = np.zeros_like(m)
    paint = band & m & (blade | ~orig)
    src = m & ~paint
    idx = ndimage.distance_transform_edt(~src, return_distances=False, return_indices=True)
    rgb[paint] = rgb[idx[0][paint], idx[1][paint]]
    al[band & m] = 1.0
    return m


def save_face(a, box, path, size=192):
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 + 4, y0 + 4, x1 - 4, y1 - 4
    w, hgt = x1 - x0, y1 - y0
    side = min(w, hgt)
    cx = (x0 + x1) // 2
    box = (cx - side // 2, y0, cx - side // 2 + side, y0 + side)  # 위쪽(얼굴)에 맞춘 정사각형
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).crop(box).resize((size, size), Image.LANCZOS)
    im.save(path, 'JPEG', quality=86, optimize=True, progressive=True)


os.makedirs(f'{OUT}/heroes', exist_ok=True)
for name, cfg in SHEETS.items():
    a = load(f'{SRC}/pc2-{name}.png')
    rgb, al, fg = key_sheet(a, cfg['bg'])
    lab, cs = components(al, cfg.get('min_area', 300))
    for side in ('front', 'back'):
        box, clip = cfg[side]
        m = pick(lab, cs, box, clip)
        if name == 'knight' and side == 'back':
            m = fix_knight_back(rgb, al, m)
        ys, xs = np.where(m)
        print(name, side, save_rgba(rgb, al, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), f'{OUT}/heroes/{name}-{side}.webp', keep_mask=m, max_side=820))
    save_face(a, cfg['face'], f'{OUT}/heroes/{name}-face.jpg')
    if 'ball' in cfg:
        m = pick(lab, cs, cfg['ball'], False)
        ys, xs = np.where(m)
        print(name, 'ball', save_rgba(rgb, al, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), f'{OUT}/heroes/{name}-ball.webp', keep_mask=m, max_side=128))

# 로딩 일러스트: 긴 변을 1400px 로 줄여 jpg 로 저장
os.makedirs(f'{OUT}/illust', exist_ok=True)
for n in ('volley-wide', 'volley-tall-a', 'volley-tall-b'):
    im = Image.open(f'{SRC}/ill-{n}.png').convert('RGB')
    im.thumbnail((1400, 1400), Image.LANCZOS)
    im.save(f'{OUT}/illust/{n}.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
    print(n, im.size)
