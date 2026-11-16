#!/usr/bin/env python3
"""PHASE 14 영웅 6명(닌자·총잡이·기공사·마법소녀·사신·기계공)과 소환수·상태 효과 데이터를 만든다.
사용: python3 tools/gen_heroes2.py   (만든 뒤에는 data/*.tres 를 직접 고쳐도 된다. 다시 돌리면 덮어쓴다.)"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hero_gen import *  # noqa: F401,F403
from hero_gen import C, D, P, area, barrage, dash, dmg, heal, hero, mana, monster, proj, shield, slow, status, status_file, stun, summon, tele


def linez(length, width, effects, delay=0.6, color=C(1, 0.5, 0.2, 0.35)):
    return dict(cls="LineZoneEffect", length=float(length), width=float(width), delay=float(delay), affects=0, effects=list(effects), color=color)


def multi_area(center, radius, effects, count, scatter, delay=0.0, color=C(1, 0.8, 0.4, 0.35)):
    a = area(center, radius, effects, delay=delay, color=color)
    a["count"] = count
    a["scatter"] = float(scatter)
    return a


# ── 상태 효과 ── kind: STUN0 SLOW1 DOT2 STAT_BUFF3 HASTE4 HOT5 MOT6 STEALTH7
status_file("ki_charge", "기 모으기", 3, (1, 0.85, 0.3, 1), [("attack", 25, 0), ("ability_power", 40, 0), ("attack_speed", 0, 0.2)], tint=(1, 0.9, 0.3, 0.3))
status_file("cheer", "응원", 3, (1, 0.6, 0.8, 1), [("attack", 15, 0), ("ability_power", 25, 0)])
status_file("reaper_mark", "사신의 낫", 3, (0.5, 0.2, 0.6, 1), [("life_steal", 0.15, 0)])
status_file("overdrive", "과부하", 3, (0.4, 0.9, 1, 1), [("attack_speed", 0, 0.35)])
status_file("bleed", "출혈", 2, (0.8, 0.15, 0.15, 1), dtype=0)

# ── 소환수 ──
monster("shadow_clone", display_name="그림자 분신", tier="normal", color=C(0.3, 0.3, 0.4, 1), glyph="분", radius=15.0, weapon="dagger",
        base_stats=D(max_hp=260, attack=30, armor=10, magic_resist=10, attack_speed=1.1, move_speed=270), attack_range=45.0, xp=6.0, gold=4)
monster("turret", display_name="자동 포탑", tier="normal", color=C(0.5, 0.75, 0.85, 1), glyph="포", radius=16.0, weapon="staff",
        base_stats=D(max_hp=420, attack=34, armor=25, magic_resist=25, attack_speed=1.0, move_speed=1), attack_range=420.0, is_ranged=True,
        projectile_speed=1300.0, xp=10.0, gold=8)

MELEE_G = dict(max_hp=85, max_mp=25, attack=4, armor=3.5, magic_resist=1.5, attack_speed=0.02, hp_regen=0.3, mp_regen=0.15)
RANGED_G = dict(max_hp=75, max_mp=25, attack=3.5, armor=3.0, magic_resist=1.5, attack_speed=0.025, hp_regen=0.25, mp_regen=0.15)
MAGE_G = dict(max_hp=72, max_mp=32, attack=2.5, ability_power=5, armor=2.8, magic_resist=1.5, attack_speed=0.015, hp_regen=0.25, mp_regen=0.2)
HYBRID_G = dict(max_hp=82, max_mp=28, attack=3.5, ability_power=3.5, armor=3.3, magic_resist=1.5, attack_speed=0.02, hp_regen=0.3, mp_regen=0.18)

AD_MELEE = ["swift_boots", "hero_sword", "conqueror_axe", "blood_blade", "guardian_plate", "dragon_shield"]
AD_RANGED = ["berserker_boots", "storm_bow", "hero_sword", "blood_blade", "dragon_shield", "immortal_amulet"]
AP = ["mage_boots", "chrono_scepter", "archmage_crown", "immortal_amulet", "spirit_king_robe", "dragon_shield"]

# target mode: 0 SELF 1 UNIT 2 DIRECTION 3 POINT / team: 0 ENEMY 1 ALLY / ai: 0 OFFENSE 1 ENGAGE 2 DEFENSE 3 ESCAPE 4 SUPPORT 5 SUMMON
# area center: 0 CASTER 1 POINT 2 TARGET / damage type: 0 물리 1 마법

# ── 닌자: 분신과 바꿔치기로 정신없이 몰아치는 암습형 ──
hero("ninja", "그림자 닌자", "분신 교란 암습", 3, "그림자 마을의 닌자. 분신으로 적을 속이고, 수리검과 바꿔치기로 빈틈을 파고든다.",
     (0.35, 0.4, 0.55), "닌", "dagger",
     dict(max_hp=590, max_mp=300, attack=56, armor=24, magic_resist=26, attack_speed=0.95, move_speed=250, crit_chance=0.15, hp_regen=2.8, mp_regen=2.6),
     MELEE_G, 55, False, "hunter", AD_MELEE,
     dict(id="afterimage", display_name="잔상", description="네 번째 기본 공격마다 분신 하나가 4초 동안 나타나 함께 싸웁니다.", trigger="attack_hit", every=4,
          effects=[summon("shadow_clone", (1,), (4,))]),
     [dict(name="수리검 난사", glyph="수", desc="적을 꿰뚫는 수리검을 던져 물리 피해를 주고 1.5초 동안 둔화시킵니다.", mode=2, mana_cost=(40,), cd=(6, 5.5, 5, 4.5), rng=650, width=50,
           effects=[proj([dmg((65, 100, 135, 170), 0, ad=0.7), slow((1.5,), (0.25,))], speed=1500, width=50, pierce=True)], vfx="shadow", sound="arrow", color=C(0.7, 0.75, 0.9, 1)),
      dict(name="분신술", glyph="분", desc="12초 동안 함께 싸우는 그림자 분신 2~3명을 만듭니다.", mode=0, mana_cost=(60,), cd=(16, 15, 14, 13),
           effects=[summon("shadow_clone", (2, 2, 3, 3), (12,))], ai=5, vfx="shadow", sound="summon", color=C(0.4, 0.4, 0.55, 1)),
      dict(name="바꿔치기", glyph="바", desc="조준한 방향으로 순간이동하고 1.5초 동안 은신합니다. 빠르게 누르면 가장 가까운 적의 반대쪽으로 갑니다.", mode=2, mana_cost=(45,), cd=(13, 12, 11, 10), rng=360,
           effects=[tele(360), status("stealth", (1.5,), to_caster=True)], ai=3, away=True, vfx="shadow", sound="teleport", color=C(0.5, 0.5, 0.6, 1)),
      dict(name="그림자 난무", glyph="난", desc="대상 뒤로 순간이동해 주변 적 모두에게 큰 물리 피해를 주고, 분신 3명을 남깁니다.", mode=1, mana_cost=(100,), cd=(60, 50, 40), rng=420, max_rank=3,
           effects=[tele(0, [area(0, 170, [dmg((170, 260, 350), 0, ad=1.1)]), summon("shadow_clone", (3,), (8,))], behind=30)], ai=1, vfx="shadow", sound="slash", color=C(0.45, 0.35, 0.7, 1))],
     aggr=0.7)

# ── 총잡이: 먼 거리에서 꾸준히 쏘고, 구르기로 거리를 벌린다 ──
hero("gunslinger", "총잡이", "원거리 연사 딜러", 2, "황야를 떠도는 명사수. 쌍권총으로 쉴 새 없이 쏘아대고, 위험하면 굴러서 빠져나간다.",
     (0.85, 0.6, 0.35), "총", "bow",
     dict(max_hp=510, max_mp=300, attack=47, armor=20, magic_resist=25, attack_speed=0.85, move_speed=230, crit_chance=0.1, hp_regen=2.5, mp_regen=2.6),
     RANGED_G, 440, True, "hunter", AD_RANGED,
     dict(id="headshot", display_name="헤드샷", description="네 번째 기본 공격마다 추가 물리 피해를 줍니다.", trigger="attack_hit", every=4,
          effects=[dmg((35, 60, 85, 110), 0, ad=0.5)]),
     [dict(name="관통탄", glyph="관", desc="일직선의 적을 모두 꿰뚫는 탄환을 쏴 물리 피해를 줍니다.", mode=2, mana_cost=(45,), cd=(7, 6.5, 6, 5.5), rng=800, width=40,
           effects=[proj([dmg((70, 110, 150, 190), 0, ad=0.8)], speed=1900, width=40, pierce=True)], vfx="bullet", sound="arrow", color=C(1, 0.85, 0.5, 1)),
      dict(name="섬광탄", glyph="섬", desc="지정한 곳에 0.5초 뒤 섬광탄을 터뜨려 물리 피해를 주고 1초 동안 기절시킵니다.", mode=3, mana_cost=(65,), cd=(13, 12, 11, 10), rng=600, radius=130,
           effects=[area(1, 130, [dmg((60, 95, 130, 165), 0, ad=0.5), stun((1.0,))], delay=0.5)], vfx="bullet", sound="explosion", color=C(1, 1, 0.8, 1)),
      dict(name="구르기", glyph="구", desc="조준한 방향으로 굴러 이동하고 3초 동안 공격 속도가 35% 빨라집니다. 빠르게 누르면 가장 가까운 적의 반대쪽으로 구릅니다.", mode=2, mana_cost=(40,), cd=(11, 10, 9, 8), rng=300,
           effects=[dash(300, speed=1100), status("overdrive", (3,), to_caster=True)], ai=3, away=True, vfx="bullet", sound="dash", color=C(0.9, 0.7, 0.4, 1)),
      dict(name="총알 세례", glyph="세", desc="2.4초 동안 조준한 방향으로 쌍권총을 난사합니다. 총알 16발이 부채꼴로 흩어지며 한 발마다 물리 피해를 주고 맞은 적을 잠깐 둔화시킵니다. 쏘는 동안에는 느리게 움직입니다.", mode=2, mana_cost=(100,), cd=(60, 50, 40), rng=820, width=120, max_rank=3,
           effects=[barrage([proj([dmg((22, 32, 42), 0, ad=0.15), slow((0.6,), (0.2,))], speed=1900, width=30, rng=820)], 16, 0.15, spread=11, slow=0.35, sound="arrow")],
           vfx="bullet", sound="arrow", color=C(1, 0.8, 0.4, 1))],
     aggr=0.5, pspeed=1500.0, avfx="bullet")

# ── 기공사: 기를 모아 한 방에 쏟아내는 근접·마법 혼합형 ──
hero("ki_master", "기공사", "기공 원거리 격투가", 2, "산에서 수련한 무도가. 주먹으로 기탄을 날려 떨어진 적을 치고, 모은 기를 거대한 기공파로 터뜨린다.",
     (1.0, 0.75, 0.25), "기", "fist",
     dict(max_hp=590, max_mp=320, attack=48, ability_power=18, armor=25, magic_resist=26, attack_speed=0.85, move_speed=235, hp_regen=2.8, mp_regen=2.8),
     HYBRID_G, 320, True, "fighter", ["swift_boots", "hero_sword", "chrono_scepter", "guardian_plate", "archmage_crown", "dragon_shield"],
     dict(id="fighting_spirit", display_name="투지", description="체력이 40% 아래일 때 기본 공격이 맞으면 보호막을 얻습니다 (20초마다).", trigger="attack_hit", every=1,
          self_below_hp=0.4, cooldown=20.0, effects=[shield((90, 150, 210, 270), (4,), ap=0.5)]),
     [dict(name="장풍", glyph="장", desc="기 덩어리를 쏴 처음 맞은 적과 주변에 마법 피해를 줍니다.", mode=2, mana_cost=(45,), cd=(6, 5.5, 5, 4.5), rng=600, width=50,
           effects=[proj([dmg((70, 110, 150, 190), 1, ad=0.4, ap=0.6), area(2, 100, [dmg((25, 40, 55, 70), 1, ap=0.3)])], speed=1200, width=50)], vfx="ki", sound="fire", color=C(1, 0.9, 0.4, 1)),
      dict(name="순보", glyph="순", desc="대상 뒤로 순식간에 이동해 물리 피해를 주고 0.75초 동안 기절시킵니다.", mode=1, mana_cost=(55,), cd=(12, 11, 10, 9), rng=420,
           effects=[tele(0, [dmg((55, 85, 115, 145), 0, ad=0.8), stun((0.75,))], behind=30)], ai=1, vfx="ki", sound="punch", color=C(1, 0.8, 0.5, 1)),
      dict(name="기 모으기", glyph="모", desc="기를 모아 마나를 회복하고, 5초 동안 공격력 +25, 주문력 +40, 공격 속도 +20% 를 얻습니다.", mode=0, mana_cost=(0,), cd=(18, 17, 16, 15),
           effects=[mana((60, 80, 100, 120)), status("ki_charge", (5,), to_caster=True)], ai=2, vfx="ki", sound="holy", color=C(1, 0.95, 0.5, 1)),
      dict(name="천지 기공파", glyph="파", desc="0.9초 동안 기를 모은 뒤 앞으로 거대한 기공파를 쏴 큰 마법 피해를 줍니다.", mode=2, mana_cost=(120,), cd=(70, 60, 50), rng=1000, width=170, max_rank=3,
           effects=[linez(1000, 170, [dmg((260, 400, 540), 1, ad=0.5, ap=1.0)], delay=0.9)], vfx="ki", sound="meteor", color=C(1, 0.9, 0.4, 1))],
     aggr=0.6, pspeed=1100.0, avfx="ki")

# ── 마법소녀: 별빛으로 아군을 북돋우고 적을 묶는 지원 마법사 ──
hero("star_girl", "별빛 마법소녀", "지원형 마법사", 2, "별의 힘을 빌린 마법소녀. 리본으로 적을 묶고, 응원으로 아군을 북돋우며, 별빛을 쏟아붓는다.",
     (1.0, 0.6, 0.8), "별", "staff",
     dict(max_hp=650, max_mp=420, attack=48, ability_power=46, armor=24, magic_resist=30, attack_speed=0.75, move_speed=228, hp_regen=2.4, mp_regen=3.8),
     MAGE_G, 400, True, "support", AP,
     dict(id="star_guard", display_name="별의 가호", description="스킬을 쓰면 3초 동안 피해를 막는 보호막을 얻습니다 (6초마다).", trigger="skill_cast", cooldown=6.0,
          effects=[shield((40, 65, 90, 115), (3,), ap=0.3)]),
     [dict(name="별똥별", glyph="똥", desc="적을 꿰뚫는 별을 쏴 마법 피해를 줍니다.", mode=2, mana_cost=(50,), cd=(6,), rng=720, width=46,
           effects=[proj([dmg((85, 125, 165, 205), 1, ap=0.65)], speed=1300, width=46, pierce=True)], vfx="star", sound="holy", color=C(1, 0.7, 0.9, 1)),
      dict(name="리본 속박", glyph="리", desc="대상을 리본으로 묶어 마법 피해를 주고 1.2~1.5초 동안 기절시킵니다.", mode=1, mana_cost=(70,), cd=(13, 12, 11, 10), rng=520,
           effects=[dmg((60, 95, 130, 165), 1, ap=0.5), stun((1.2, 1.3, 1.4, 1.5))], vfx="star", sound="ice", color=C(1, 0.5, 0.75, 1)),
      dict(name="응원", glyph="응", desc="주변 아군(자신 포함)에게 4초 동안 공격력 +15, 주문력 +25, 이동 속도 +20% 를 줍니다.", mode=0, mana_cost=(60,), cd=(15, 14, 13, 12),
           effects=[area(0, 420, [status("cheer", (4,)), status("haste", (4,), (0.2,))], affects=1, color=C(1, 0.7, 0.9, 0.25))], team=1, ai=4, vfx="star", sound="heal", color=C(1, 0.7, 0.85, 1)),
      dict(name="별빛 폭격", glyph="폭", desc="지정한 지역에 0.8초 뒤 별 5개를 떨어뜨려 각각 마법 피해를 줍니다.", mode=3, mana_cost=(120,), cd=(70, 60, 50), rng=750, radius=260, max_rank=3,
           effects=[multi_area(1, 120, [dmg((120, 180, 240), 1, ap=0.45)], 5, 190, delay=0.8)], vfx="star", sound="meteor", color=C(1, 0.8, 0.95, 1))],
     aggr=0.4, avfx="star")

# ── 사신: 싸울수록 살아나는 흡혈 근접 전사 ──
hero("reaper", "사신", "흡혈 근접 전사", 2, "영혼을 거두는 낫잡이. 적을 벨수록 체력을 되찾고, 죽어 가는 적을 놓치지 않는다.",
     (0.5, 0.3, 0.6), "사", "spear",
     dict(max_hp=700, max_mp=290, attack=62, armor=30, magic_resist=26, attack_speed=0.82, move_speed=232, life_steal=0.06, hp_regen=3.0, mp_regen=2.5),
     MELEE_G, 75, False, "fighter", ["swift_boots", "blood_blade", "hero_sword", "guardian_plate", "conqueror_axe", "spirit_king_robe"],
     dict(id="soul_reap", display_name="영혼 거두기", description="적을 처치하면 체력을 회복합니다.", trigger="kill",
          effects=[heal((40, 70, 100, 130), ad=0.3, to_caster=True)]),
     [dict(name="낫 휩쓸기", glyph="낫", desc="낫을 크게 휘둘러 주변 적에게 물리 피해를 주고 3초 동안 출혈시킵니다.", mode=0, mana_cost=(45,), cd=(7, 6.5, 6, 5.5), radius=190,
           effects=[area(0, 190, [dmg((60, 95, 130, 165), 0, ad=0.75), status("bleed", (3,), (10, 16, 22, 28), ad=0.1)])], ai_range=170, vfx="soul", sound="spin", color=C(0.6, 0.3, 0.7, 1)),
      dict(name="영혼 사슬", glyph="슬", desc="대상을 사슬로 옭아매 마법 피해를 주고 2초 동안 크게 둔화시킵니다.", mode=1, mana_cost=(55,), cd=(11, 10.5, 10, 9.5), rng=480,
           effects=[dmg((50, 80, 110, 140), 1, ad=0.4), slow((2.0,), (0.45,))], vfx="soul", sound="dark", color=C(0.5, 0.25, 0.65, 1)),
      dict(name="망령 걸음", glyph="망", desc="4초 동안 이동 속도가 30% 빨라지고 흡혈이 15% 늘어납니다.", mode=0, mana_cost=(45,), cd=(15, 14, 13, 12),
           effects=[status("haste", (4,), (0.3,), to_caster=True), status("reaper_mark", (4,), to_caster=True)], ai=1, ai_range=650, vfx="soul", sound="stealth", color=C(0.45, 0.3, 0.6, 1)),
      dict(name="사형 선고", glyph="형", desc="대상에게 순간이동해 큰 물리 피해를 주고, 준 만큼의 일부를 주변 적에게도 퍼뜨립니다.", mode=1, mana_cost=(100,), cd=(60, 50, 40), rng=400, max_rank=3,
           effects=[tele(0, [dmg((190, 290, 390), 0, ad=1.0), area(0, 160, [dmg((70, 105, 140), 0, ad=0.4)])], behind=30)], ai=1, vfx="soul", sound="slash", color=C(0.65, 0.2, 0.5, 1))],
     aggr=0.75)

# ── 기계공: 포탑과 방어막으로 진지를 만드는 원거리 지원형 ──
hero("mechanic", "기계공", "포탑 설치 지원", 2, "무엇이든 만들어 내는 발명가. 포탑을 깔아 자리를 잡고, 방어막과 폭격으로 싸움을 뒤집는다.",
     (0.45, 0.75, 0.85), "공", "staff",
     dict(max_hp=570, max_mp=380, attack=50, ability_power=30, armor=22, magic_resist=28, attack_speed=0.8, move_speed=225, hp_regen=2.5, mp_regen=3.4),
     MAGE_G, 410, True, "support", AP,
     dict(id="auto_repair", display_name="자가 수리", description="6초마다 자신의 체력을 회복합니다.", trigger="periodic", interval=6.0,
          effects=[heal((20, 32, 44, 56), ap=0.1, to_caster=True)]),
     [dict(name="포탑 설치", glyph="포", desc="20초 동안 근처의 적을 쏘는 자동 포탑을 설치합니다. 포탑은 움직이지 않습니다.", mode=3, mana_cost=(60,), cd=(13, 12, 11, 10), rng=350,
           effects=[summon("turret", (1,), (20,))], ai=5, vfx="tech", sound="summon", color=C(0.5, 0.8, 0.9, 1)),
      dict(name="로켓", glyph="로", desc="로켓을 쏴 처음 맞은 적과 주변에 마법 피해를 주고 1.5초 동안 둔화시킵니다.", mode=2, mana_cost=(55,), cd=(8, 7.5, 7, 6.5), rng=720, width=44,
           effects=[proj([dmg((75, 115, 155, 195), 1, ap=0.6), area(2, 120, [dmg((30, 45, 60, 75), 1, ap=0.25), slow((1.5,), (0.3,))])], speed=1100, width=44)], vfx="tech", sound="explosion", color=C(1, 0.6, 0.3, 1)),
      dict(name="방어막 발생기", glyph="방", desc="주변 아군(자신 포함)에게 3초 동안 피해를 막는 보호막을 씌웁니다.", mode=0, mana_cost=(70,), cd=(16, 15, 14, 13),
           effects=[area(0, 400, [shield((70, 110, 150, 190), (3,), ap=0.45, to_caster=False)], affects=1, color=C(0.5, 0.9, 1, 0.25)),
                    shield((70, 110, 150, 190), (3,), ap=0.45)], team=1, ai=4, vfx="tech", sound="shield", color=C(0.5, 0.85, 1, 1)),
      dict(name="궤도 폭격", glyph="궤", desc="지정한 지역에 1초 뒤 포탄 3발을 떨어뜨려 큰 마법 피해를 주고 1초 동안 기절시킵니다.", mode=3, mana_cost=(120,), cd=(75, 65, 55), rng=800, radius=250, max_rank=3,
           effects=[multi_area(1, 150, [dmg((150, 225, 300), 1, ap=0.55), stun((1.0,))], 3, 150, delay=1.0)], vfx="tech", sound="meteor", color=C(1, 0.5, 0.3, 1))],
     aggr=0.4, avfx="tech")

print("만든 영웅:", ", ".join(["ninja", "gunslinger", "ki_master", "star_girl", "reaper", "mechanic"]))
