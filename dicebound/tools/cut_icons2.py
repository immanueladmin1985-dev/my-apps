"""UI·이펙트 아이콘 시트(1264×843, 마젠타 바탕)에서 아직 쓰지 않던 아이콘을 잘라 assets/icons2 에 저장한다.
새 주사위 배지와 새 유물·소모품 아이콘으로 쓴다.
사용법: python3 dicebound/tools/cut_icons2.py <icons-sheet.png> dicebound/assets/icons2
상자 안에 든 그림을 모두 남기고, 가운데에 놓아 정사각형으로 저장한다."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import *

SRC, OUT = sys.argv[1], sys.argv[2]
ICONS = {
    # 왼쪽 위 마법 구슬 3줄 × 4개
    'orb-slash': (20, 30, 78, 98), 'orb-void': (80, 34, 140, 92), 'orb-fire': (150, 28, 210, 100), 'orb-ice': (214, 20, 270, 100),
    'orb-cross': (18, 108, 77, 170), 'orb-vortex': (86, 110, 144, 170), 'orb-bolt': (150, 110, 210, 168), 'orb-frost': (212, 110, 272, 170),
    'orb-star': (20, 178, 94, 246), 'orb-burst': (96, 180, 160, 244), 'orb-spark': (162, 184, 216, 246), 'orb-rune': (218, 184, 274, 240),
    # 오른쪽 위 피·회복·불꽃 이펙트
    'blood-splat': (884, 168, 930, 214), 'leaf': (930, 286, 1006, 356), 'holy-water': (1170, 284, 1250, 358),
    'flame': (850, 388, 926, 458), 'fire-cross': (1100, 378, 1168, 460), 'gold-cross': (1176, 378, 1248, 462),
    'fire-arrow': (1096, 62, 1242, 100),
    # 가운데 바위·검기
    'rock': (540, 150, 620, 238), 'gold-slash': (600, 386, 740, 456),
    # 오른쪽 아래 상태 이펙트
    'ice-burst': (862, 742, 942, 822), 'poison': (956, 740, 1038, 822), 'lightning': (1056, 734, 1138, 822), 'dark-eye': (1146, 734, 1236, 822),
}
a = load(SRC)
rgb, al, fg = key_sheet(a, 'magenta')
os.makedirs(OUT, exist_ok=True)
for name, (x0, y0, x1, y1) in ICONS.items():
    sub = al[y0:y1, x0:x1]
    ys, xs = np.where(sub > 0.05)
    bx0, by0, bx1, by1 = x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1
    img = np.dstack([rgb[by0:by1, bx0:bx1].clip(0, 255), al[by0:by1, bx0:bx1] * 255]).astype(np.uint8)
    im = Image.fromarray(img, 'RGBA')
    side = max(im.size) + 4
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    sq.save(f'{OUT}/{name}.webp', 'WEBP', quality=90, method=6)
    print(name, sq.size)
