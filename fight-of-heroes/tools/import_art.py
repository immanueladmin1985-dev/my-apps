#!/usr/bin/env python3
"""받은 그림 파일을 게임 폴더에 맞게 정리한다.

사용:
  python3 tools/import_art.py <그림 폴더> [--dry-run] [--missing]
  python3 tools/import_art.py sheet <그림 파일> <열>x<행> <id> <id> ...   (여러 개를 한 장에 그린 그림, 왼쪽 위부터 줄 순서, 건너뛸 칸은 -)
  python3 tools/import_art.py tile <그림 파일> <id> [--quarter]          (바닥 무늬. --quarter 는 2x2 로 반복된 그림의 왼쪽 위 1/4 만 쓴다)

- 파일 이름(확장자 뺀 것)이 id 나 한국어 이름과 같으면 그 자리로 보낸다
  (예: blade_master.png 또는 검성.png → assets/heroes/blade_master.png). 공백·하이픈·대소문자는 무시한다.
- 배경 지우기: 그림 가장자리에 닿아 있는 배경색(마젠타, 흰색, 그려진 회색 체크무늬 등)을 가장자리부터 지운다.
  캐릭터의 진한 외곽선에서 멈추므로 캐릭터 안쪽 색은 지우지 않는다.
- 배경 위에 떨어져 있는 작은 조각(워터마크 반짝이, 파일 이름 글자 등)은 지운다.
- 투명한 여백을 자르고 크기를 줄인다 (캐릭터 384px, 아이템 128px, 맵 물건 512px, 바닥 무늬 512px).
"""
import re
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent

MAP_TILES = ["ground_grass", "ground_dirt", "ground_stone", "ground_dungeon", "ground_lava", "ground_forest", "wall_rock"]
MAP_OBJECTS = ["base_fountain", "shop", "center_stage", "camp_ring", "boss_altar",
               "tree_1", "tree_2", "bush", "rock_1", "rock_2", "crystal", "torch"]

KINDS = {
    "heroes": ("assets/heroes", 384),
    "monsters": ("assets/monsters", 384),
    "items": ("assets/items", 128),
    "map_tile": ("assets/backgrounds", 512),
    "map_object": ("assets/backgrounds", 512),
}


def norm(name: str) -> str:
    return re.sub(r"[\s\-_]+", "", name.strip().lower())


def data_entries(folder: str) -> list:
    out = []
    for f in sorted((ROOT / "data" / folder).glob("*.tres")):
        text = f.read_text(encoding="utf-8")
        # 하위 리소스(패시브 등)가 아니라 [resource] 부분의 id·이름을 읽는다.
        text = text[text.find("[resource]"):] if "[resource]" in text else text
        m = re.search(r'^id = "([^"]+)"', text, re.M)
        n = re.search(r'^display_name = "([^"]+)"', text, re.M)
        if m:
            out.append((m.group(1), n.group(1) if n else ""))
    return out


def catalog() -> dict:
    """정규화한 이름 → (종류, id)"""
    cat = {}
    for kind, folder in (("heroes", "heroes"), ("monsters", "monsters"), ("items", "items")):
        for i, name in data_entries(folder):
            cat[norm(i)] = (kind, i)
            if name:
                cat[norm(name)] = (kind, i)
            if kind == "heroes":
                cat[norm(i + "_dragon")] = (kind, i + "_dragon")
                if name:
                    cat[norm(name + "(변신)")] = (kind, i + "_dragon")
                    cat[norm(name + "변신")] = (kind, i + "_dragon")
    for i in MAP_TILES:
        cat[norm(i)] = ("map_tile", i)
    for i in MAP_OBJECTS:
        cat[norm(i)] = ("map_object", i)
    return cat


# ---- 배경 지우기 ----

def _border_colors(img: Image.Image) -> list:
    """가장자리 픽셀에서 자주 나오는 색 (배경 후보)"""
    w, h = img.size
    px = img.load()
    counts = {}
    pts = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for p in pts[::2]:
        r, g, b, a = px[p]
        if a < 16:
            continue
        key = (r // 12, g // 12, b // 12)
        counts[key] = counts.get(key, 0) + 1
    total = max(1, sum(counts.values()))
    return [(k[0] * 12 + 6, k[1] * 12 + 6, k[2] * 12 + 6) for k, c in counts.items() if c / total > 0.01]


def remove_background(img: Image.Image, tol: int = 42, cell: bool = False) -> Image.Image:
    """가장자리에 닿은 배경을 지우고, 떨어진 작은 조각을 지운다. 작업은 작게 줄인 그림으로 하고 결과를 원래 크기에 적용한다."""
    img = img.convert("RGBA")
    W, H = img.size
    scale = 512 / max(W, H)
    small = img.resize((max(1, round(W * scale)), max(1, round(H * scale))), Image.NEAREST) if scale < 1 else img.copy()
    w, h = small.size
    px = small.load()
    bgs = _border_colors(small)
    # 배경 종류: 이미 투명 / 무채색(흰색·회색 체크무늬) / 유채색(마젠타 등)
    border = [px[x, y] for x in range(0, w, 2) for y in (0, h - 1)] + [px[x, y] for y in range(0, h, 2) for x in (0, w - 1)]
    transparent = sum(1 for c in border if c[3] < 16) > len(border) * 0.5
    neutral = not transparent and all(max(b) - min(b) < 30 for b in bgs)
    vivid = not transparent and not neutral and all(max(b) - min(b) > 100 for b in bgs)

    def is_bg(c) -> bool:
        if c[3] < 16:
            return True
        if transparent:
            return False
        if neutral:
            # 흰 배경, 그려진 체크무늬, 그 위에 비친 빛: 채도가 낮고 너무 어둡지 않은 색 (진한 외곽선에서 멈춘다)
            return max(c[:3]) - min(c[:3]) < 45 and max(c[:3]) > 58
        for b in bgs:
            if abs(c[0] - b[0]) + abs(c[1] - b[1]) + abs(c[2] - b[2]) < tol:
                return True
        return False

    def is_strong_bg(c) -> bool:
        """둘러싸인 구멍(팔과 몸 사이 등)도 지울 만큼 배경색과 확실히 같은 색 (유채색 배경만)"""
        if not vivid:
            return False
        for b in bgs:
            if abs(c[0] - b[0]) + abs(c[1] - b[1]) + abs(c[2] - b[2]) < tol * 0.8:
                return True
        return False

    bg = bytearray(w * h)  # 1 = 배경
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if bg[i] or not is_bg(px[x, y]):
            continue
        bg[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    for i in range(w * h):
        if not bg[i] and is_strong_bg(px[i % w, i // w]):
            bg[i] = 1
    if neutral and len(bgs) >= 2:
        _fill_checker_holes(px, w, h, bg, is_bg, bgs)
    # 남은 부분의 덩어리를 찾아 큰 것만 남긴다.
    # 가늘게 이어진 곳(글자와 그림이 닿은 곳 등)을 끊으려고 2픽셀 깎은 모양으로 덩어리를 나누고, 나중에 원래 모양으로 되돌린다.
    fg_img = Image.frombytes("L", (w, h), bytes(0 if v else 255 for v in bg))
    core = fg_img.filter(ImageFilter.MinFilter(5)).tobytes()
    bg = bytearray(0 if core[i] else 1 for i in range(w * h))
    label = [0] * (w * h)
    sizes = [0]
    for start in range(w * h):
        if bg[start] or label[start]:
            continue
        n = len(sizes)
        sizes.append(0)
        label[start] = n
        st = [start]
        while st:
            i = st.pop()
            sizes[n] += 1
            x, y = i % w, i // w
            for j in ((i - 1) if x > 0 else -1, (i + 1) if x < w - 1 else -1, (i - w) if y > 0 else -1, (i + w) if y < h - 1 else -1):
                if j >= 0 and not bg[j] and not label[j]:
                    label[j] = n
                    st.append(j)
    biggest = max(sizes) if len(sizes) > 1 else 0
    big_n = sizes.index(biggest) if biggest else 0
    boxes = {}
    for i in range(w * h):
        n = label[i]
        if n:
            x, y = i % w, i // w
            b = boxes.get(n)
            boxes[n] = [x, y, x, y] if b is None else [min(b[0], x), min(b[1], y), max(b[2], x), max(b[3], y)]
    keep = set()
    for n in range(1, len(sizes)):
        if sizes[n] < biggest * 0.12:
            continue
        if n != big_n:
            bx = boxes[n]
            bw, bh = bx[2] - bx[0] + 1, bx[3] - bx[1] + 1
            # 글자 줄(파일 이름 등): 가로로 길고 낮은 조각
            if bw > bh * 4 and bh < h * 0.1:
                continue
            # 여러 개를 한 장에 그린 그림에서 잘라 낸 칸: 칸 가장자리에 걸친 조각은 이웃 칸의 것
            if cell and (bx[0] == 0 or bx[1] == 0 or bx[2] == w - 1 or bx[3] == h - 1):
                continue
            # 칸 위·아래 띠에 있는 낮은 조각 (파일 이름 글자의 일부)
            if cell and bh < h * 0.06 and (bx[3] < h * 0.15 or bx[1] > h * 0.85):
                continue
        keep.add(n)
    kept = Image.frombytes("L", (w, h), bytes(255 if label[i] in keep else 0 for i in range(w * h)))
    mask_small = ImageChops.darker(kept.filter(ImageFilter.MaxFilter(7)), fg_img)
    mask = mask_small.resize((W, H), Image.BILINEAR) if (w, h) != (W, H) else mask_small
    # 경계를 1픽셀 깎고 부드럽게
    mask = mask.point(lambda v: 255 if v > 140 else 0).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.copy()
    out.putalpha(ImageChops.darker(img.split()[3], mask))
    return _defringe(out, bgs)


def _fill_checker_holes(px, w, h, bg, is_bg, bgs) -> None:
    """그려진 체크무늬가 둘러싸인 곳(후광 고리 안쪽 등)에 남았으면 지운다.
    흰 옷처럼 밝은 부분과 구별하려고, 체크무늬의 어두운 칸 색이 충분히 섞인 곳만 지운다."""
    dark = min(bgs, key=lambda b: sum(b))
    light = max(bgs, key=lambda b: sum(b))
    if sum(light) - sum(dark) < 45:
        return
    seen = bytearray(w * h)
    for start in range(w * h):
        if bg[start] or seen[start] or not is_bg(px[start % w, start // w]):
            continue
        region = []
        st = [start]
        seen[start] = 1
        while st:
            i = st.pop()
            region.append(i)
            x, y = i % w, i // w
            for j in ((i - 1) if x > 0 else -1, (i + 1) if x < w - 1 else -1, (i - w) if y > 0 else -1, (i + w) if y < h - 1 else -1):
                if j >= 0 and not bg[j] and not seen[j] and is_bg(px[j % w, j // w]):
                    seen[j] = 1
                    st.append(j)
        near_dark = sum(1 for i in region if sum(abs(a - b) for a, b in zip(px[i % w, i // w][:3], dark)) < 40)
        if len(region) >= 20 and near_dark > len(region) * 0.2:
            for i in region:
                bg[i] = 1


def _defringe(img: Image.Image, bgs: list) -> Image.Image:
    """반투명 경계에 남은 배경색(분홍빛 등)을 줄인다: 경계 픽셀을 안쪽 이웃 색에 가깝게."""
    raw = bytearray(img.tobytes())
    w, h = img.size
    magenta = any(b[0] > 150 and b[2] > 150 and b[1] < 110 for b in bgs)
    for i in range(0, len(raw), 4):
        a = raw[i + 3]
        if a == 0 or a == 255:
            continue
        r, g, b = raw[i], raw[i + 1], raw[i + 2]
        if magenta and min(r, b) - g > 25:
            raw[i] = min(r, g + 25)
            raw[i + 2] = min(b, g + 25)
    return Image.frombytes("RGBA", (w, h), bytes(raw))


def trim(img: Image.Image) -> Image.Image:
    box = img.split()[-1].point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop(box) if box else img


def fit(img: Image.Image, longest: int) -> Image.Image:
    w, h = img.size
    s = longest / max(w, h)
    if s < 1.0:
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return img


def square(img: Image.Image, side: int, margin: float = 0.06) -> Image.Image:
    img = fit(img, int(side * (1.0 - margin * 2)))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def process(img: Image.Image, kind: str, cell: bool = False) -> Image.Image:
    size = KINDS[kind][1]
    if kind == "map_tile":
        return img.convert("RGB").resize((size, size), Image.LANCZOS)
    img = trim(remove_background(img, cell=cell))
    if kind in ("heroes", "monsters"):
        return fit(img, size)
    return square(img, size)


def make_face(img: Image.Image, side: int = 128) -> Image.Image:
    """전신 그림에서 머리 부분을 찾아 정사각형 얼굴 그림을 만든다 (팀 현황·영웅 선택 칸용).
    위쪽 25% 줄에서 불투명한 픽셀의 가운데를 머리 가운데로 본다."""
    w, h = img.size
    a = img.split()[3].load()
    xs = [x for y in range(int(h * 0.04), int(h * 0.25), 2) for x in range(0, w, 2) if a[x, y] > 128]
    xs.sort()
    cx = xs[len(xs) // 2] if xs else w // 2
    size = int(h * 0.42)
    cy = int(h * 0.2)
    box = (cx - size // 2, max(0, cy - size // 2), cx + size // 2, max(0, cy - size // 2) + size)
    face = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    face.paste(img.crop(box), (0, 0))
    return face.resize((side, side), Image.LANCZOS)


def save(img: Image.Image, kind: str, id_: str) -> Path:
    out = ROOT / KINDS[kind][0] / (id_ + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    if kind == "heroes" and not id_.endswith("_dragon"):
        make_face(img).save(out.with_name(id_ + "_face.png"), optimize=True)
    return out


def cmd_sheet(args: list) -> int:
    path, grid, ids = Path(args[0]), args[1], args[2:]
    cols, rows = (int(v) for v in grid.lower().split("x"))
    sheet = Image.open(path).convert("RGBA")
    cw, ch = sheet.width / cols, sheet.height / rows
    cat = catalog()
    for n, id_ in enumerate(ids):
        if id_ == "-":
            continue
        kind, real = cat.get(norm(id_), ("items", id_))
        c, r = n % cols, n // cols
        cell = sheet.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        out = save(process(cell, kind, True), kind, real)
        print("넣음:", f"{path.name} [{r + 1}줄 {c + 1}칸] -> {out.relative_to(ROOT)}")
    return 0


def cmd_tile(args: list) -> int:
    path, id_ = Path(args[0]), args[1]
    img = Image.open(path).convert("RGB")
    if "--quarter" in args:
        img = img.crop((0, 0, img.width // 2, img.height // 2))
    out = save(process(img, "map_tile"), "map_tile", id_)
    print("넣음:", f"{path.name} -> {out.relative_to(ROOT)}")
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if argv and argv[0] == "sheet":
        return cmd_sheet(argv[1:])
    if argv and argv[0] == "tile":
        return cmd_tile(argv[1:])
    args = [a for a in argv if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 1
    dry = "--dry-run" in argv
    src = Path(args[0])
    cat = catalog()
    done, unknown = [], []
    for p in sorted(p for p in src.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")):
        hit = cat.get(norm(p.stem))
        if hit is None:
            unknown.append(p.name)
            continue
        kind, id_ = hit
        if dry:
            done.append(f"{p.name} -> {KINDS[kind][0]}/{id_}.png")
            continue
        out = save(process(Image.open(p), kind), kind, id_)
        done.append(f"{p.name} -> {out.relative_to(ROOT)}")
    for d in done:
        print("넣음:", d)
    if unknown:
        print("어디에 쓸지 모르는 파일 (이름을 확인해 주세요):", ", ".join(unknown))
    ids = sorted({v for v in cat.values() if not v[1].endswith("_dragon")})
    missing = [i for k, i in ids if not (ROOT / KINDS[k][0] / (i + ".png")).exists()]
    print(f"넣은 파일 {len(done)}개, 아직 없는 그림 {len(missing)}개")
    if missing and "--missing" in argv:
        print("없는 그림:", ", ".join(missing))
    return 0


if __name__ == "__main__":
    sys.exit(main())
