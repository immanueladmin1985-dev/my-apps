#!/usr/bin/env python3
"""PHASE 18: 영구 비약 (비싼 값으로 능력치를 영구히 올리는 물약). 사면 바로 마시고 칸을 차지하지 않는다.
사용: python3 tools/gen_elixirs.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hero_gen import ROOT, C, build  # noqa: E402


def mod(stat, flat=0.0, pct=0.0):
    return dict(cls="StatModifier", stat=stat, flat=float(flat), percent=float(pct))


ELIXIRS = [
    ("strength_elixir", "힘의 비약", "힘", (0.9, 0.35, 0.25, 1), [mod("attack", 10)], "공격력 +10"),
    ("arcane_elixir", "마력의 비약", "마", (0.55, 0.4, 0.95, 1), [mod("ability_power", 15)], "주문력 +15"),
    ("vitality_elixir", "생명의 비약", "생", (0.35, 0.8, 0.4, 1), [mod("max_hp", 150), mod("hp_regen", 1.5)], "최대 체력 +150, 체력 회복 +1.5"),
    ("guard_elixir", "강철의 비약", "강", (0.6, 0.65, 0.75, 1), [mod("armor", 8), mod("magic_resist", 8)], "방어력 +8, 마법 저항력 +8"),
    ("swift_elixir", "신속의 비약", "속", (0.95, 0.85, 0.3, 1), [mod("attack_speed", 0, 0.06), mod("move_speed", 8)], "공격 속도 +6%, 이동 속도 +8"),
]

for iid, name, glyph, color, mods, text in ELIXIRS:
    build(os.path.join(ROOT, "items", iid + ".tres"), "ItemData", dict(
        id=iid, display_name=name, category="potion", tier=3, glyph=glyph, color=C(*color), cost=1500,
        description="사면 그 자리에서 마셔 능력치가 영구히 오릅니다 (%s). 아이템 칸을 차지하지 않고 몇 번이든 마실 수 있지만, 마실 때마다 값이 250 골드씩 오릅니다." % text,
        modifiers=mods, permanent=True, cost_step=250))
print("영구 비약", len(ELIXIRS), "종")
