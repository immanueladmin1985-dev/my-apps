#!/usr/bin/env python3
"""큰 맵 "용의 협곡"(valley_02)을 만든다. 좌우 대칭(블루 왼쪽, 레드 오른쪽).
- 네 귀퉁이 던전, 12시 숲의 수호정령 방, 중앙 미니언 무대
- 6시 "용의 둥지": 가장 어려운 던전. 바깥뜰과 안뜰에 센 몬스터가 가득하고, 최종 보스는 가장 안쪽에 나타난다.
사용: python3 tools/gen_map2.py"""
import os

W, H = 5600, 3400
CX, CY = W // 2, H // 2
obs, camps = [], []
T = 60


def mirror(r):
    x, y, w, h = r
    return (W - x - w, y, w, h)


def add_sym(r):
    obs.append(r)
    m = mirror(r)
    if m != r:
        obs.append(m)


def room(cx, cy, w, h, open_side, gap=260, t=50):
    x0, y0 = cx - w // 2, cy - h // 2
    sides = {"top": (x0, y0, w, t), "bottom": (x0, y0 + h - t, w, t), "left": (x0, y0, t, h), "right": (x0 + w - t, y0, t, h)}
    out = []
    for side, r in sides.items():
        if side == open_side:
            if side in ("top", "bottom"):
                half = (w - gap) // 2
                out += [(r[0], r[1], half, t), (r[0] + w - half, r[1], half, t)]
            else:
                half = (h - gap) // 2
                out += [(r[0], r[1], t, half), (r[0], r[1] + h - half, t, half)]
        else:
            out.append(r)
    return out


def camp(cid, pos, mons, first, resp, final=False, tier=1, aggro=0, extra=None):
    camps.append(dict(id=cid, pos=pos, mons=mons, first=first, resp=resp, final=final, tier=tier, aggro=aggro, extra=extra or {}))


def camp_sym(name_l, name_r, pos, mons, first, resp, **kw):
    camp(name_l, pos, mons, first, resp, **kw)
    camp(name_r, (W - pos[0], pos[1]), mons, first, resp, **kw)


# 귀퉁이 던전 (11시·7시 = 블루 쪽, 1시·5시 = 레드 쪽)
for (nl, nr), (x, y), side in [(("dungeon_11", "dungeon_1"), (1350, 620), "bottom"), (("dungeon_7", "dungeon_5"), (1350, H - 620), "top")]:
    for r in room(x, y, 640, 480, side):
        add_sym(r)
    inner = -70 if side == "bottom" else 70
    camp_sym(nl + "_golem", nr + "_golem", (x, y + inner), ["stone_golem"], 60, 90)
    camp_sym(nl + "_wolves", nr + "_wolves", (x - 160, y - inner // 2), ["wolf_alpha", "wolf", "wolf"], 20, 45)

# 길목의 작은 캠프
camp_sym("skeletons_nw", "skeletons_ne", (1950, 1150), ["skeleton", "skeleton", "goblin"], 30, 50)
camp_sym("skeletons_sw", "skeletons_se", (1750, 2250), ["skeleton", "skeleton", "goblin"], 30, 50)

# 12시: 숲의 수호정령
for r in room(CX, 330, 760, 560, "bottom", gap=320):
    add_sym(r)
camp("forest_guardian", (CX, 300), ["forest_guardian"], 180, 240)

# 중앙 무대
camp("center_wave", (CX, CY), ["goblin", "goblin", "goblin"], 15, 0, extra=dict(
    wave_interval=30.0, wave_max=12, wave_growth_interval=100.0, wave_max_tier=6, wave_stat_growth=0.3, wave_reward_growth=0.35,
    wave_extra_monsters=["skeleton", "goblin", "skeleton", "bone_golem", "skeleton"], wave_max_growth=2))

# 6시: 용의 둥지 (가장 어려운 던전)
LX0, LX1, LY0 = CX - 950, CX + 950, 2150
GATE, INNER_Y, INNER_GATE = 380, 2720, 320
half = (LX1 - LX0 - GATE) // 2
obs += [(LX0, LY0, half, T), (LX1 - half, LY0, half, T)]                 # 바깥 벽 (가운데 입구)
obs += [(LX0, LY0, T, H - LY0), (LX1 - T, LY0, T, H - LY0)]               # 옆 벽
half2 = (LX1 - LX0 - INNER_GATE) // 2
obs += [(LX0, INNER_Y, half2, T), (LX1 - half2, INNER_Y, half2, T)]      # 안쪽 벽 (가운데 입구)
lava = [(LX0, LY0, LX1 - LX0, H - LY0)]
# 바깥뜰
camp_sym("lair_gate_l", "lair_gate_r", (CX - 580, 2440), ["stone_golem", "skeleton", "skeleton", "skeleton"], 60, 150, tier=2, aggro=330)
camp("lava_giant", (CX, 2470), ["lava_giant"], 240, 300)
# 안뜰
camp_sym("lair_wolves_l", "lair_wolves_r", (CX - 330, 2900), ["wolf_alpha", "wolf_alpha", "wolf", "wolf"], 60, 150, tier=3, aggro=300)
camp_sym("lair_inner_l", "lair_inner_r", (CX - 640, 3120), ["bone_golem", "stone_golem", "skeleton", "skeleton"], 60, 150, tier=3, aggro=330)
camp("ancient_dragon", (CX, 3150), ["ancient_dragon"], 600, 0, final=True)

# 둥근 바위 기둥 (좌우 대칭): 예전 네모 바위와 같은 자리, 비슷한 크기
pillars = []
for r in [(1050, 1200, 150, 170), (1100, 2050, 170, 140), (2050, 1560, 130, 130), (1550, 1650, 100, 100),
          (700, 300, 150, 120), (700, 2950, 150, 120), (2250, 900, 140, 110), (1250, 1500, 90, 90), (2300, 1900, 110, 100)]:
    x, y, w, h = r
    cx, cy, rad = x + w / 2, y + h / 2, (w + h) / 4
    pillars.append((cx, cy, rad))
    pillars.append((W - cx, cy, rad))


def fmt_camp(c):
    x, y = c["pos"]
    lines = ['[sub_resource type="Resource" id="%s"]' % c["id"], 'script = ExtResource("2")', 'id = "%s"' % c["id"],
             'position = Vector2(%d, %d)' % (x, y), 'monsters = PackedStringArray(%s)' % ", ".join('"%s"' % m for m in c["mons"]),
             'first_spawn = %.1f' % c["first"], 'respawn = %.1f' % c["resp"], 'is_final_boss = %s' % ("true" if c["final"] else "false")]
    if c["tier"] > 1:
        lines.append('power_tier = %d' % c["tier"])
    if c["aggro"]:
        lines.append('aggro_radius = %.1f' % c["aggro"])
    for k, v in c["extra"].items():
        if isinstance(v, list):
            lines.append('%s = PackedStringArray(%s)' % (k, ", ".join('"%s"' % m for m in v)))
        else:
            lines.append('%s = %s' % (k, v))
    return lines + ['']


rects = lambda rs: ", ".join("Rect2(%d, %d, %d, %d)" % r for r in rs)
out = ['[gd_resource type="Resource" script_class="MapData" format=3]', '',
       '[ext_resource type="Script" path="res://scripts/map/map_data.gd" id="1"]',
       '[ext_resource type="Script" path="res://scripts/map/camp_data.gd" id="2"]', '']
for c in camps:
    out += fmt_camp(c)
out += ['[resource]', 'script = ExtResource("1")', 'id = "valley_02"', 'display_name = "용의 협곡"',
        'size = Vector2(%d, %d)' % (W, H), 'blue_spawn = Vector2(320, %d)' % CY, 'red_spawn = Vector2(%d, %d)' % (W - 320, CY),
        'obstacles = Array[Rect2]([%s])' % rects(obs), 'lava_areas = Array[Rect2]([%s])' % rects(lava),
        'pillars = PackedVector3Array(%s)' % ", ".join("%g, %g, %g" % p for p in pillars),
        'camps = Array[Resource]([%s])' % ", ".join('SubResource("%s")' % c["id"] for c in camps),
        'ground_color = Color(0.2, 0.29, 0.21, 1)', 'obstacle_color = Color(0.36, 0.34, 0.31, 1)']
path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/maps/valley_02.tres")
open(path, "w").write("\n".join(out) + "\n")
print(len(obs), "벽", len(pillars), "기둥", len(camps), "캠프")
