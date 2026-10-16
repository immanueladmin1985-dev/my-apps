"""보스·정예 전신 시트(1536×1024, 마젠타 바탕, 2줄 × 5명)를 잘라 assets/mobs 에 저장한다.
사용법: python3 dicebound/tools/cut_bosses.py <boss-sheet.png> dicebound/assets/mobs
떠 있는 해골·불꽃·검처럼 몸과 떨어진 조각은 무게중심이 들어 있는 칸의 인물에 붙인다."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import *

SRC, OUT = sys.argv[1], sys.argv[2]
# 위 줄, 아래 줄 (왼쪽부터)
NAMES = [
    ['boss-abyss', 'boss-hell-lord', 'ice-queen', 'thorn-witch', 'crimson-warden'],
    ['boss-necromancer', 'flame-dancer', 'wolf-mistress', 'boss-fallen-knight', 'blood-duchess'],
]
a = load(SRC)
H, W = a.shape[:2]
rgb, al, fg = key_sheet(a, 'magenta')
lab, cs = components(al, 120)
cols = 5
masks = {n: np.zeros(al.shape, bool) for row in NAMES for n in row}
for c in cs:
    cy = (c['y0'] + c['y1']) / 2
    m = lab == c['id']
    ys, xs = np.where(m)
    cx = xs.mean()
    row = 0 if cy < H / 2 else 1
    col = min(cols - 1, int(cx / (W / cols)))
    masks[NAMES[row][col]] |= m
for n, m in masks.items():
    ys, xs = np.where(m)
    print(n, save_rgba(rgb, al, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), f'{OUT}/{n}.webp', keep_mask=m, max_side=640))
