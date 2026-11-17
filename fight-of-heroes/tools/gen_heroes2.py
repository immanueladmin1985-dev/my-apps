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


def stack(key, amount, max_value=3.0, duration=0.0, to_caster=False):
    return dict(cls="StackEffect", key=key, amount=float(amount), max_value=float(max_value), duration=float(duration), to_caster=to_caster)


def fan(effects, shots, spread):
    """한꺼번에 부채꼴로 여러 발 (BarrageEffect 를 간격 0 으로)"""
    return dict(cls="BarrageEffect", shots=int(shots), interval=0.0, spread=float(spread), slow_caster=0.0, effects=list(effects))


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
     dict(id="shadow_blade", display_name="그림자 칼날", description="세 번째 기본 공격마다 추가 물리 피해를 줍니다. 분신이 살아 있으면 피해가 2배입니다.", trigger="attack_hit", every=3,
          effects=[dmg((30, 50, 70, 90), 0, ad=0.4) | dict(summon_bonus_id="shadow_clone", summon_bonus=1.0)]),
     [dict(name="수리검 부채", glyph="수", desc="수리검 3개를 부채꼴로 던져 각각 물리 피해를 주고 1초 동안 둔화시킵니다. 분신도 같은 곳을 향해 함께 던집니다.", mode=2, mana_cost=(40,), cd=(6, 5.5, 5, 4.5), rng=650, width=60,
           effects=[fan([proj([dmg((45, 70, 95, 120), 0, ad=0.5), slow((1.0,), (0.25,))], speed=1500, width=34)], 3, 14)], vfx="shadow", sound="arrow", color=C(0.7, 0.75, 0.9, 1)),
      dict(name="분신술", glyph="분", desc="25초 동안 본체를 닮은 분신 하나를 만듭니다. 분신은 본체 능력치의 40/50/60/70%를 가지고, 본체가 수리검 부채·그림자 난무를 쓰면 따라 씁니다. 6초 안에 다시 누르면 분신과 자리를 바꿉니다.",
           mode=0, mana_cost=(60,), cd=(18, 17, 16, 15),
           effects=[summon("shadow_clone", (1,), (25,)) | dict(owner_stat_ratio=P(0.4, 0.5, 0.6, 0.7), max_alive=1, mirror_slots=PI(0, 3))], ai=5, vfx="shadow", sound="summon", color=C(0.4, 0.4, 0.55, 1),
           recast_effects=[dict(cls="TeleportEffect", distance=0.0, behind=0.0, destination="summon:shadow_clone", arrive_effects=[])], recast_window=6.0, recast_requires="summon:shadow_clone"),
      dict(name="바꿔치기", glyph="바", desc="조준한 방향으로 순간이동하고 1.5초 동안 은신합니다. 빠르게 누르면 가장 가까운 적의 반대쪽으로 갑니다.", mode=2, mana_cost=(45,), cd=(13, 12, 11, 10), rng=360,
           effects=[tele(360), status("stealth", (1.5,), to_caster=True)], ai=3, away=True, vfx="shadow", sound="teleport", color=C(0.5, 0.5, 0.6, 1)),
      dict(name="그림자 난무", glyph="난", desc="대상 뒤로 순간이동해 주변 적 모두에게 큰 물리 피해를 줍니다. 분신이 있으면 분신도 함께 뛰어들어 벱니다.", mode=1, mana_cost=(100,), cd=(60, 50, 40), rng=420, max_rank=3,
           effects=[tele(0, [area(0, 170, [dmg((170, 260, 350), 0, ad=1.1)])], behind=30)], ai=1, vfx="shadow", sound="slash", color=C(0.45, 0.35, 0.7, 1))],
     aggr=0.7)

# ── 총잡이: 먼 거리에서 꾸준히 쏘고, 구르기로 거리를 벌린다 ──
hero("gunslinger", "총잡이", "원거리 연사 딜러", 2, "황야를 떠도는 명사수. 쌍권총으로 쉴 새 없이 쏘아대고, 위험하면 굴러서 빠져나간다.",
     (0.85, 0.6, 0.35), "총", "bow",
     dict(max_hp=510, max_mp=300, attack=47, armor=20, magic_resist=25, attack_speed=0.85, move_speed=230, crit_chance=0.1, hp_regen=2.5, mp_regen=2.6),
     RANGED_G, 440, True, "hunter", AD_RANGED,
     dict(id="six_shooter", display_name="육연발", description="탄창에 6발이 들어 있습니다. 6발을 다 쏘면 1.2초 동안 재장전하고, 마지막 한 발은 2배 피해입니다. 구르기를 쓰면 바로 재장전합니다.", trigger="attack_hit", every=1, effects=[]),
     [dict(name="조준 사격", glyph="조", desc="0.6초 동안 멈춰 조준한 뒤, 아주 먼 곳까지 한 줄로 꿰뚫는 저격탄을 쏴 큰 물리 피해를 줍니다.", mode=2, mana_cost=(50,), cd=(9, 8.5, 8, 7.5), rng=1300, width=44,
           effects=[linez(1300, 44, [dmg((90, 140, 190, 240), 0, ad=1.0)], delay=0.6, color=C(1, 0.9, 0.5, 0.4))], ai_range=1100, cast_lock=0.6, vfx="bullet", sound="arrow", color=C(1, 0.85, 0.5, 1)),
      dict(name="섬광탄", glyph="섬", desc="지정한 곳에 0.5초 뒤 섬광탄을 터뜨려 물리 피해를 주고 1초 동안 기절시킵니다.", mode=3, mana_cost=(65,), cd=(13, 12, 11, 10), rng=600, radius=130,
           effects=[area(1, 130, [dmg((60, 95, 130, 165), 0, ad=0.5), stun((1.0,))], delay=0.5)], vfx="bullet", sound="explosion", color=C(1, 1, 0.8, 1)),
      dict(name="구르기", glyph="구", desc="조준한 방향으로 굴러 이동하고, 탄창을 다시 채우며, 3초 동안 공격 속도가 35% 빨라집니다. 빠르게 누르면 가장 가까운 적의 반대쪽으로 구릅니다.", mode=2, mana_cost=(40,), cd=(11, 10, 9, 8), rng=300,
           effects=[dash(300, speed=1100), status("overdrive", (3,), to_caster=True), dict(cls="ReloadEffect")], ai=3, away=True, vfx="bullet", sound="dash", color=C(0.9, 0.7, 0.4, 1)),
      dict(name="총알 세례", glyph="세", desc="2.4초 동안 조준한 방향으로 쌍권총을 난사합니다. 총알 16발이 부채꼴로 흩어지며 한 발마다 물리 피해를 주고 맞은 적을 잠깐 둔화시킵니다. 쏘는 동안에는 느리게 움직입니다.", mode=2, mana_cost=(100,), cd=(60, 50, 40), rng=820, width=120, max_rank=3,
           effects=[barrage([proj([dmg((22, 32, 42), 0, ad=0.15), slow((0.6,), (0.2,))], speed=1900, width=30, rng=820)], 16, 0.15, spread=11, slow=0.35, sound="arrow")],
           vfx="bullet", sound="arrow", color=C(1, 0.8, 0.4, 1))],
     aggr=0.5, pspeed=1500.0, avfx="bullet",
     extra=dict(magazine_size=6, reload_time=1.2, last_shot_mult=2.0, gauge_pips=True))

# ── 기공사: 기를 모아 한 방에 쏟아내는 근접·마법 혼합형 ──
hero("ki_master", "기공사", "기공 원거리 격투가", 2, "산에서 수련한 무도가. 주먹으로 기탄을 날려 떨어진 적을 치고, 모은 기를 거대한 기공파로 터뜨린다.",
     (1.0, 0.75, 0.25), "기", "fist",
     dict(max_hp=590, max_mp=320, attack=48, ability_power=18, armor=25, magic_resist=26, attack_speed=0.85, move_speed=235, hp_regen=2.8, mp_regen=2.8),
     HYBRID_G, 320, True, "fighter", ["swift_boots", "hero_sword", "chrono_scepter", "guardian_plate", "archmage_crown", "dragon_shield"],
     dict(id="fighting_spirit", display_name="기와 투지", description="공격이 맞으면 기가 찹니다(최대 100, 기본 공격 10, 장풍 15). 가까운 적(130 안)은 기탄 대신 주먹으로 25% 세게 칩니다. 체력이 40% 아래일 때 기본 공격이 맞으면 보호막을 얻습니다 (20초마다).", trigger="attack_hit", every=1,
          self_below_hp=0.4, cooldown=20.0, effects=[shield((90, 150, 210, 270), (4,), ap=0.5)]),
     [dict(name="장풍", glyph="장", desc="기 덩어리를 쏴 처음 맞은 적과 주변에 마법 피해를 줍니다.", mode=2, mana_cost=(45,), cd=(6, 5.5, 5, 4.5), rng=600, width=50,
           effects=[proj([dmg((70, 110, 150, 190), 1, ad=0.4, ap=0.6), area(2, 100, [dmg((25, 40, 55, 70), 1, ap=0.3)]), stack("gauge", 15)], speed=1200, width=50)], vfx="ki", sound="fire", color=C(1, 0.9, 0.4, 1)),
      dict(name="순보", glyph="순", desc="대상 뒤로 순식간에 이동해 물리 피해를 주고 0.75초 동안 기절시킵니다.", mode=1, mana_cost=(55,), cd=(12, 11, 10, 9), rng=420,
           effects=[tele(0, [dmg((55, 85, 115, 145), 0, ad=0.8), stun((0.75,))], behind=30)], ai=1, vfx="ki", sound="punch", color=C(1, 0.8, 0.5, 1)),
      dict(name="기 모으기", glyph="모", desc="단숨에 기를 40 모으고 마나를 회복하며, 5초 동안 공격력 +25, 주문력 +40, 공격 속도 +20% 를 얻습니다.", mode=0, mana_cost=(0,), cd=(18, 17, 16, 15),
           effects=[mana((60, 80, 100, 120)), status("ki_charge", (5,), to_caster=True), stack("gauge", 40)], ai=2, vfx="ki", sound="holy", color=C(1, 0.95, 0.5, 1)),
      dict(name="천지 기공파", glyph="파", desc="0.9초 동안 기를 모은 뒤 앞으로 거대한 기공파를 쏴 큰 마법 피해를 줍니다. 모은 기 1 당 피해가 0.8% 늘고(기 100 이면 +80%), 기를 모두 씁니다.", mode=2, mana_cost=(120,), cd=(70, 60, 50), rng=1000, width=170, max_rank=3,
           effects=[linez(1000, 170, [dmg((220, 340, 460), 1, ad=0.5, ap=0.9) | dict(gauge_bonus=0.008, consume_gauge=True)], delay=0.9)], vfx="ki", sound="meteor", color=C(1, 0.9, 0.4, 1))],
     aggr=0.6, pspeed=1100.0, avfx="ki",
     extra=dict(gauge_name="기", gauge_max=100.0, gauge_on_hit=10.0, gauge_decay_delay=5.0, gauge_decay=6.0, gauge_color=C(1, 0.85, 0.3, 1),
                close_melee_range=130.0, close_mult=1.25))

# ── 마법소녀: 별빛으로 아군을 북돋우고 적을 묶는 지원 마법사 ──
hero("star_girl", "별빛 마법소녀", "지원형 마법사", 2, "별의 힘을 빌린 마법소녀. 리본으로 적을 묶고, 응원으로 아군을 북돋우며, 별빛을 쏟아붓는다.",
     (1.0, 0.6, 0.8), "별", "staff",
     dict(max_hp=650, max_mp=420, attack=48, ability_power=46, armor=24, magic_resist=30, attack_speed=0.75, move_speed=228, hp_regen=2.4, mp_regen=3.8),
     MAGE_G, 400, True, "support", AP,
     dict(id="star_guard", display_name="별의 가호", description="스킬을 쓰면 3초 동안 피해를 막는 보호막을 얻습니다 (6초마다).", trigger="skill_cast", cooldown=6.0,
          effects=[shield((40, 65, 90, 115), (3,), ap=0.3)]),
     [dict(name="별 부메랑", glyph="부", desc="별을 던집니다. 별은 끝까지 날아간 뒤 돌아오며, 가고 올 때 지나간 적에게 각각 마법 피해를 줍니다.", mode=2, mana_cost=(50,), cd=(7,), rng=620, width=46,
           effects=[proj([dmg((60, 90, 120, 150), 1, ap=0.45)], speed=1100, width=46) | dict(returns=True)], vfx="star", sound="holy", color=C(1, 0.7, 0.9, 1)),
      dict(name="리본 속박", glyph="리", desc="대상을 리본으로 묶어 마법 피해를 주고 1~1.3초 동안 기절시킵니다. 근처(350)에 다른 적이 있으면 리본으로 이어 대상 쪽으로 끌어당기고 함께 기절시킵니다.", mode=1, mana_cost=(70,), cd=(13, 12, 11, 10), rng=520,
           effects=[dmg((60, 95, 130, 165), 1, ap=0.5), stun((1.0, 1.1, 1.2, 1.3)),
                    dict(cls="ChainEffect", radius=350.0, effects=[dmg((40, 60, 80, 100), 1, ap=0.3), dict(cls="KnockbackEffect", distance=-200.0, speed=900.0, from_point=True), stun((1.0, 1.1, 1.2, 1.3))])], vfx="star", sound="ice", color=C(1, 0.5, 0.75, 1)),
      dict(name="리본 연결", glyph="연", desc="아군 한 명과 6초 동안 리본으로 연결해 공격력 +20, 주문력 +30, 공격 속도 +15% 를 줍니다 (자신도 응원으로 빨라짐). 6초 안에 다시 누르면 연결된 아군 곁으로 날아갑니다.", mode=1, mana_cost=(60,), cd=(15, 14, 13, 12), rng=650,
           effects=[status("ribbon_link", (6,)), status("haste", (4,), (0.2,), to_caster=True)], team=1, ai=4, vfx="star", sound="heal", color=C(1, 0.7, 0.85, 1),
           recast_effects=[dict(cls="TeleportEffect", distance=0.0, behind=0.0, destination="link:ribbon_link", arrive_effects=[])], recast_window=6.0, recast_requires="link:ribbon_link"),
      dict(name="별빛 폭격", glyph="폭", desc="지정한 지역에 0.8초 뒤 별 5개를 떨어뜨려 각각 마법 피해를 줍니다.", mode=3, mana_cost=(120,), cd=(70, 60, 50), rng=750, radius=260, max_rank=3,
           effects=[multi_area(1, 120, [dmg((120, 180, 240), 1, ap=0.45)], 5, 190, delay=0.8)], vfx="star", sound="meteor", color=C(1, 0.8, 0.95, 1))],
     aggr=0.4, avfx="star")

# ── 사신: 싸울수록 살아나는 흡혈 근접 전사 ──
hero("reaper", "사신", "흡혈 근접 전사", 2, "영혼을 거두는 낫잡이. 적을 벨수록 체력을 되찾고, 죽어 가는 적을 놓치지 않는다.",
     (0.5, 0.3, 0.6), "사", "spear",
     dict(max_hp=700, max_mp=290, attack=62, armor=30, magic_resist=26, attack_speed=0.82, move_speed=232, life_steal=0.06, hp_regen=3.0, mp_regen=2.5),
     MELEE_G, 75, False, "fighter", ["swift_boots", "blood_blade", "hero_sword", "guardian_plate", "conqueror_axe", "spirit_king_robe"],
     dict(id="soul_reap", display_name="영혼 거두기", description="적 영웅을 처치하면 영혼 2개, 도와주면 1개를 얻습니다(최대 30). 영혼 하나당 공격력 +3이고, 죽으면 영혼의 절반을 잃습니다. 적을 처치하면 체력을 회복합니다.", trigger="kill",
          effects=[heal((40, 70, 100, 130), ad=0.3, to_caster=True)]),
     [dict(name="낫 휩쓸기", glyph="낫", desc="낫을 크게 휘둘러 주변 적에게 물리 피해를 주고 3초 동안 출혈시킵니다.", mode=0, mana_cost=(45,), cd=(7, 6.5, 6, 5.5), radius=190,
           effects=[area(0, 190, [dmg((60, 95, 130, 165), 0, ad=0.75), status("bleed", (3,), (10, 16, 22, 28), ad=0.1)])], ai_range=170, vfx="soul", sound="spin", color=C(0.6, 0.3, 0.7, 1)),
      dict(name="영혼 사슬", glyph="슬", desc="대상을 사슬로 옭아매 마법 피해를 주고 2초 동안 크게 둔화시킵니다.", mode=1, mana_cost=(55,), cd=(11, 10.5, 10, 9.5), rng=480,
           effects=[dmg((50, 80, 110, 140), 1, ad=0.4), slow((2.0,), (0.45,))], vfx="soul", sound="dark", color=C(0.5, 0.25, 0.65, 1)),
      dict(name="망령 걸음", glyph="망", desc="4초 동안 이동 속도가 30% 빨라지고 흡혈이 15% 늘어납니다.", mode=0, mana_cost=(45,), cd=(15, 14, 13, 12),
           effects=[status("haste", (4,), (0.3,), to_caster=True), status("reaper_mark", (4,), to_caster=True)], ai=1, ai_range=650, vfx="soul", sound="stealth", color=C(0.45, 0.3, 0.6, 1)),
      dict(name="사형 선고", glyph="형", desc="대상에게 순간이동해 큰 물리 피해를 주고 주변 적에게도 피해를 퍼뜨립니다. 대상의 체력이 15/20/25% 아래면 그대로 쓰러뜨립니다.", mode=1, mana_cost=(100,), cd=(60, 50, 40), rng=400, max_rank=3,
           effects=[tele(0, [dmg((190, 290, 390), 0, ad=1.0) | dict(execute_below=P(0.15, 0.2, 0.25)), area(0, 160, [dmg((70, 105, 140), 0, ad=0.4)])], behind=30)], ai=1, vfx="soul", sound="slash", color=C(0.65, 0.2, 0.5, 1))],
     aggr=0.75,
     extra=dict(gauge_name="영혼", gauge_max=30.0, gauge_on_kill=2.0, gauge_on_assist=1.0, gauge_decay=0.0, gauge_keep_on_death=0.5,
                gauge_stat="attack", gauge_stat_per=3.0, gauge_color=C(0.7, 0.4, 0.9, 1)))

# ── 기계공: 포탑과 방어막으로 진지를 만드는 원거리 지원형 ──
hero("mechanic", "기계공", "포탑 설치 지원", 2, "무엇이든 만들어 내는 발명가. 포탑을 깔아 자리를 잡고, 방어막과 폭격으로 싸움을 뒤집는다.",
     (0.45, 0.75, 0.85), "공", "staff",
     dict(max_hp=570, max_mp=380, attack=50, ability_power=30, armor=22, magic_resist=28, attack_speed=0.8, move_speed=225, hp_regen=2.5, mp_regen=3.4),
     MAGE_G, 410, True, "support", AP,
     dict(id="auto_repair", display_name="자가 수리", description="6초마다 자신의 체력을 회복합니다.", trigger="periodic", interval=6.0,
          effects=[heal((20, 32, 44, 56), ap=0.1, to_caster=True)]),
     [dict(name="포탑 설치", glyph="포", desc="30초 동안 근처의 적을 쏘는 자동 포탑을 설치합니다. 포탑은 움직이지 않고, 최대 3개까지 둘 수 있습니다(넘으면 가장 오래된 포탑이 사라짐).", mode=3, mana_cost=(60,), cd=(11, 10, 9, 8), rng=350,
           effects=[summon("turret", (1,), (30,)) | dict(max_alive=3)], ai=5, vfx="tech", sound="summon", color=C(0.5, 0.8, 0.9, 1)),
      dict(name="로켓", glyph="로", desc="로켓을 쏴 처음 맞은 적과 주변에 마법 피해를 주고 1.5초 동안 둔화시킵니다.", mode=2, mana_cost=(55,), cd=(8, 7.5, 7, 6.5), rng=720, width=44,
           effects=[proj([dmg((75, 115, 155, 195), 1, ap=0.6), area(2, 120, [dmg((30, 45, 60, 75), 1, ap=0.25), slow((1.5,), (0.3,))])], speed=1100, width=44)], vfx="tech", sound="explosion", color=C(1, 0.6, 0.3, 1)),
      dict(name="정비 드론", glyph="정", desc="주변(600)의 내 포탑을 수리하고 5초 동안 과부하시켜 공격 속도를 35% 높입니다. 자신에게는 3초 동안 보호막을 씌웁니다.", mode=0, mana_cost=(60,), cd=(14, 13, 12, 11), radius=600,
           effects=[area(0, 600, [heal((120, 180, 240, 300), ap=0.6), status("overdrive", (5,))], affects=1, color=C(0.5, 0.9, 1, 0.2)) | dict(owned_summons_only=True),
                    shield((60, 95, 130, 165), (3,), ap=0.4)], ai=2, vfx="tech", sound="shield", color=C(0.5, 0.85, 1, 1)),
      dict(name="궤도 폭격", glyph="궤", desc="지정한 지역에 1초 뒤 포탄 3발을 떨어뜨려 큰 마법 피해를 주고 1초 동안 기절시킵니다.", mode=3, mana_cost=(120,), cd=(75, 65, 55), rng=800, radius=250, max_rank=3,
           effects=[multi_area(1, 150, [dmg((150, 225, 300), 1, ap=0.55), stun((1.0,))], 3, 150, delay=1.0)], vfx="tech", sound="meteor", color=C(1, 0.5, 0.3, 1))],
     aggr=0.4, avfx="tech")

print("만든 영웅:", ", ".join(["ninja", "gunslinger", "ki_master", "star_girl", "reaper", "mechanic"]))
