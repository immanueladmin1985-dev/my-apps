#!/usr/bin/env python3
"""받은 그림 파일을 게임 폴더에 맞게 정리한다.

사용: python3 tools/import_art.py <그림 폴더> [--dry-run]

- 파일 이름(확장자 뺀 것)이 영웅·몬스터·아이템 id 나 맵 에셋 이름과 같으면 그 자리로 보낸다
  (예: blade_master.png → assets/heroes/blade_master.png). 대소문자, 공백, 하이픈은 무시한다.
- 배경이 단색 마젠타(#FF00FF)면 투명하게 바꾼다. 이미 투명한 PNG 는 그대로 쓴다.
- 캐릭터·아이템·맵 물건은 투명한 가장자리를 잘라낸 뒤 크기를 줄인다.
- 바닥 무늬(ground_*, wall_*)는 자르지 않고 512x512 로 줄인다.
- 어디에도 맞지 않는 파일은 목록으로 알려 준다.
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

MAP_TILES = ["ground_grass", "ground_dirt", "ground_stone", "ground_dungeon", "ground_lava", "ground_forest", "wall_rock"]
MAP_OBJECTS = ["base_fountain", "shop", "center_stage", "camp_ring", "boss_altar",
               "tree_1", "tree_2", "bush", "rock_1", "rock_2", "crystal", "torch"]

# 종류별 저장 폴더와 크기 (긴 변 픽셀)
KINDS = {
    "heroes": ("assets/heroes", 384),
    "monsters": ("assets/monsters", 384),
    "items": ("assets/items", 128),
    "map_tile": ("assets/backgrounds", 512),
    "map_object": ("assets/backgrounds", 512),
}


def data_ids(folder: str) -> list:
    out = []
    for f in sorted((ROOT / "data" / folder).glob("*.tres")):
        text = f.read_text(encoding="utf-8")
        # 하위 리소스(패시브 등)의 id 가 아니라 [resource] 부분의 id 를 읽는다.
        text = text[text.find("[resource]"):] if "[resource]" in text else text
        m = re.search(r'^id = "([^"]+)"', text, re.M)
        if m:
            out.append(m.group(1))
    return out


def catalog() -> dict:
    cat = {}
    for i in data_ids("heroes"):
        cat[i] = "heroes"
        cat[i + "_dragon"] = "heroes"
    for i in data_ids("monsters"):
        cat[i] = "monsters"
    for i in data_ids("items"):
        cat[i] = "items"
    for i in MAP_TILES:
        cat[i] = "map_tile"
    for i in MAP_OBJECTS:
        cat[i] = "map_object"
    return cat


def norm(name: str) -> str:
    return re.sub(r"[\s\-]+", "_", name.strip().lower())


def key_magenta(img: Image.Image) -> Image.Image:
    """모서리 색이 마젠타에 가까우면 그 색과 비슷한 픽셀을 투명하게 한다 (가장자리는 부드럽게)."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if not all(c[0] > 180 and c[1] < 90 and c[2] > 180 for c in corners):
        return img
    out = bytearray()
    raw = img.tobytes()
    for i in range(0, len(raw), 4):
        r, g, b, a = raw[i], raw[i + 1], raw[i + 2], raw[i + 3]
        # 마젠타 정도: 빨강·파랑이 높고 초록이 낮을수록 크다
        m = min(r, b) - g
        if m > 150:
            out += bytes((r, g, b, 0))
        elif m > 90:
            k = (m - 90) / 60.0
            # 가장자리에 남은 분홍빛을 줄인다
            nr = int(r - (r - g) * k * 0.8)
            nb = int(b - (b - g) * k * 0.8)
            out += bytes((nr, g, nb, int(a * (1.0 - k))))
        else:
            out += bytes((r, g, b, a))
    return Image.frombytes("RGBA", img.size, bytes(out))


def trim(img: Image.Image) -> Image.Image:
    alpha = img.split()[-1].point(lambda v: 255 if v > 8 else 0)
    box = alpha.getbbox()
    return img.crop(box) if box else img


def fit(img: Image.Image, longest: int) -> Image.Image:
    w, h = img.size
    s = longest / max(w, h)
    if s < 1.0:
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return img


def square(img: Image.Image, side: int, margin: float = 0.06) -> Image.Image:
    inner = int(side * (1.0 - margin * 2))
    img = fit(img, inner)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def process(path: Path, kind: str) -> Image.Image:
    img = Image.open(path)
    folder, size = KINDS[kind]
    if kind == "map_tile":
        return img.convert("RGB").resize((size, size), Image.LANCZOS)
    img = trim(key_magenta(img))
    if kind in ("heroes", "monsters"):
        # 캐릭터는 발 위치를 맞추기 위해 위·옆만 여백 없이, 긴 변 기준으로 줄인다.
        return fit(img, size)
    return square(img, size)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args:
        print(__doc__)
        return 1
    src = Path(args[0])
    cat = catalog()
    done, unknown = [], []
    files = sorted(p for p in src.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    for p in files:
        key = norm(p.stem)
        kind = cat.get(key)
        if kind is None:
            unknown.append(p.name)
            continue
        out = ROOT / KINDS[kind][0] / (key + ".png")
        if not dry:
            img = process(p, kind)
            out.parent.mkdir(parents=True, exist_ok=True)
            img.save(out, optimize=True)
        done.append(f"{p.name} -> {out.relative_to(ROOT)}")
    for d in done:
        print("넣음:", d)
    if unknown:
        print("어디에 쓸지 모르는 파일 (이름을 확인해 주세요):", ", ".join(unknown))
    missing = sorted(k for k in cat if not k.endswith("_dragon") and not (ROOT / KINDS[cat[k]][0] / (k + ".png")).exists())
    print(f"넣은 파일 {len(done)}개, 아직 없는 그림 {len(missing)}개")
    if missing and "--missing" in sys.argv:
        print("없는 그림:", ", ".join(missing))
    return 0


if __name__ == "__main__":
    sys.exit(main())
