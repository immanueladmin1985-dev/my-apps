#!/usr/bin/env python3
"""PHASE 17: 기존 영웅 10명에게 고유 장치를 준다. (새 영웅 6명은 tools/gen_heroes2.py)
바뀌지 않는 스킬 파일은 그대로 두고, 바뀌는 스킬은 새로 만들거나 필요한 항목만 고친다.
패시브는 data/passives/<영웅>.tres 로 따로 만들어 영웅 파일에 연결한다.
사용: python3 tools/gen_heroes3.py   (여러 번 돌려도 결과가 같다)"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hero_gen import ROOT, C, P, PI, area, build, dash, dmg, heal, proj, shield, skill, slow, st, status, stun, tele, val  # noqa: E402

SKILLS = os.path.join(ROOT, "skills")
HEROES = os.path.join(ROOT, "heroes")


# ---- .tres 고치기 도구 ----

def _split_blocks(text):
    """[헤더] 단위로 나눈다. 반환: [(헤더 줄, [본문 줄...]), ...]"""
    blocks = []
    cur = None
    for line in text.split("\n"):
        if line.startswith("["):
            cur = (line, [])
            blocks.append(cur)
        elif cur is not None:
            cur[1].append(line)
    return blocks


def _join(blocks):
    out = []
    for head, body in blocks:
        out.append(head)
        out += body
    return "\n".join(out)


def _set_key(body, key, value_text):
    for i, line in enumerate(body):
        if line.startswith(key + " = "):
            body[i] = "%s = %s" % (key, value_text)
            return
    # 빈 줄 앞에 넣는다
    j = len(body)
    while j > 0 and body[j - 1].strip() == "":
        j -= 1
    body.insert(j, "%s = %s" % (key, value_text))


def patch(skill_id, res=None, subs=None):
    """res: [resource] 에 넣을 값, subs: {sub_resource id 또는 'Class*': {key: value}}"""
    path = os.path.join(SKILLS, skill_id + ".tres")
    text = open(path, encoding="utf-8").read()
    blocks = _split_blocks(text)
    for head, body in blocks:
        if head == "[resource]" and res:
            for k, v in res.items():
                _set_key(body, k, val(v))
        m = re.match(r'\[sub_resource type="Resource" id="(\w+)"\]', head)
        if m and subs:
            sid = m.group(1)
            for key, fields in subs.items():
                if key == sid or (key.endswith("*") and sid.startswith(key[:-1])):
                    for k, v in fields.items():
                        _set_key(body, k, val(v))
    open(path, "w", encoding="utf-8").write(_join(blocks))


def set_passive(hero_id, passive, extra=None, alt_skills=None):
    """패시브를 data/passives/<영웅>.tres 로 만들어 연결하고, 영웅 데이터에 extra 항목을 넣는다."""
    pid = passive["id"]
    build(os.path.join(ROOT, "passives", hero_id + ".tres"), "PassiveData", dict(passive))
    path = os.path.join(HEROES, hero_id + ".tres")
    text = open(path, encoding="utf-8").read()
    blocks = _split_blocks(text)
    # 예전에 넣은 연결(ext id 가 p 로 시작)은 지우고 다시 넣는다
    blocks = [b for b in blocks if not re.match(r'\[ext_resource [^\]]*id="(pz\d+|az\d+)"\]', b[0])]
    last_ext = max(i for i, b in enumerate(blocks) if b[0].startswith("[ext_resource"))
    new_ext = [('[ext_resource type="Resource" path="res://data/passives/%s.tres" id="pz1"]' % hero_id, [])]
    if alt_skills:
        for i, sid in enumerate(alt_skills):
            new_ext.append(('[ext_resource type="Resource" path="res://data/skills/%s.tres" id="az%d"]' % (sid, i + 1), []))
    # 마지막 ext 의 본문(빈 줄)은 맨 뒤 것으로 옮긴다
    tail_body = blocks[last_ext][1]
    blocks[last_ext] = (blocks[last_ext][0], [])
    new_ext[-1] = (new_ext[-1][0], tail_body if any(x.strip() == "" for x in tail_body) else [""])
    blocks[last_ext + 1:last_ext + 1] = new_ext
    for head, body in blocks:
        if head == "[resource]":
            _set_key(body, "passive", 'ExtResource("pz1")')
            _set_key(body, "passive_description", val("%s: %s" % (passive["display_name"], passive["description"])))
            for k, v in (extra or {}).items():
                _set_key(body, k, val(v))
            if alt_skills:
                _set_key(body, "alt_skills", "Array[Resource]([%s])" % ", ".join('ExtResource("az%d")' % (i + 1) for i in range(len(alt_skills))))
    open(path, "w", encoding="utf-8").write(_join(blocks))


def stack(key, amount, max_value=3.0, duration=0.0, to_caster=False, full=None, full_duration=1.0):
    d = dict(cls="StackEffect", key=key, amount=float(amount), max_value=float(max_value), duration=float(duration), to_caster=to_caster)
    if full:
        d["full_status"] = st(full)
        d["full_duration"] = float(full_duration)
    return d


def knock(distance, wall=None, wall_duration=1.0, from_point=False, speed=1200.0):
    d = dict(cls="KnockbackEffect", distance=float(distance), speed=float(speed), from_point=from_point)
    if wall:
        d["wall_status"] = st(wall)
        d["wall_duration"] = float(wall_duration)
    return d


def status_def(id, name, kind, color, mods=(), **more):
    f = dict(id=id, display_name=name, kind=kind, color=C(*color), tick_interval=0.5, damage_type=1)
    if mods:
        f["stat_modifiers"] = [dict(cls="StatModifier", stat=a, flat=float(b), percent=float(c)) for a, b, c in mods]
    f.update(more)
    build(os.path.join(ROOT, "status", id + ".tres"), "StatusEffectData", f)


# ── 새 상태 효과 ── kind: STUN0 SLOW1 DOT2 STAT_BUFF3 HASTE4 HOT5 MOT6 STEALTH7 TAUNT8
status_def("taunt", "도발", 8, (1, 0.5, 0.2, 1))
status_def("guarded", "수호", 3, (1, 0.9, 0.5, 1), [("armor", 10, 0)], redirect_ratio=0.3)
status_def("assassin_mark", "표식", 3, (0.9, 0.2, 0.3, 1))
status_def("ribbon_link", "리본 연결", 3, (1, 0.6, 0.85, 1), [("attack", 20, 0), ("ability_power", 30, 0), ("attack_speed", 0, 0.15)])

GOLD = (1, 0.85, 0.3, 1)

# ── 검성: 검기를 쌓아 일섬으로 터뜨린다. 돌진 베기로 처치하면 바로 다시 쓴다 ──
set_passive("blade_master", dict(id="sword_qi", display_name="검기", description="기본 공격이 맞을 때마다 검기가 1 쌓입니다(최대 5, 6초 동안 공격하지 않으면 줄어듦). 일섬은 검기 하나당 25% 더 세지고 검기를 모두 씁니다.",
                                 trigger="attack_hit", every=1, effects=[]),
            dict(gauge_name="검기", gauge_max=5.0, gauge_on_hit=1.0, gauge_decay_delay=6.0, gauge_decay=1.0, gauge_pips=True, gauge_color=C(0.6, 0.85, 1, 1)))
patch("blade_master_q", res=dict(reset_on_kill=True, description="바라보는 방향으로 빠르게 돌진하며 지나가는 길의 적에게 물리 피해를 줍니다. 이 스킬로 적을 처치하면 바로 다시 쓸 수 있습니다."))
patch("blade_master_r", res=dict(description="한 줄기 섬광처럼 멀리 돌진해 지나간 적에게 큰 물리 피해를 주고 기절시킵니다. 검기 하나당 피해가 25% 늘고, 검기를 모두 씁니다."),
      subs={"DamageEffect*": dict(gauge_bonus=0.25, consume_gauge=True)})

# ── 암살자: 뒤에서 치면 세고, 표식 단검으로 파고들며, 처형으로 처치하면 바로 다시 쓴다 ──
set_passive("assassin", dict(id="backstab", display_name="뒤치기", description="적의 뒤쪽에서 주는 모든 피해가 40% 늘어납니다.",
                             trigger="always", stat_modifiers=[dict(cls="StatModifier", stat="backstab", flat=0.4, percent=0.0)]))
# 재사용 효과: 표식 대상 뒤로 순간이동 (build 로 다시 만든다)
build(os.path.join(SKILLS, "assassin_q.tres"), "SkillData", dict(vfx="shadow", sound="dash", id="assassin_q", display_name="표식 단검", glyph="표",
      description="단검을 던져 처음 맞은 적에게 물리 피해를 주고 4초 동안 표식을 남깁니다. 4초 안에 다시 누르면 표식이 남은 적의 뒤로 순간이동합니다.",
      max_rank=4, mana_cost=P(50), cooldown=P(9, 8.5, 8, 7.5), target_mode=2, target_team=0, cast_range=650.0, radius=0.0, width=34.0,
      auto_aim_away=False, ai_use=0, ai_range=0.0, color=C(0.8, 0.3, 0.4, 1),
      effects=[proj([dmg((60, 95, 130, 165), 0, ad=0.7), status("assassin_mark", (4,))], speed=1500, width=34)],
      recast_effects=[dict(cls="TeleportEffect", distance=0.0, behind=30.0, destination="mark:assassin_mark", arrive_effects=[])],
      recast_window=4.0, recast_requires="mark:assassin_mark"))
patch("assassin_r", res=dict(reset_on_kill=True, description="대상에게 순간이동해 큰 물리 피해를 줍니다. 대상이 잃은 체력만큼 피해가 늘어나고(최대 2배), 처치하면 바로 다시 쓸 수 있습니다."),
      subs={"DamageEffect*": dict(missing_hp_bonus=1.0)})

# ── 용기사: 분노를 채워야 변신하고, 변신하면 스킬이 바뀐다 ──
set_passive("dragon_knight", dict(id="dragon_rage", display_name="용의 분노", description="공격하고 맞을수록 분노가 찹니다. 분노가 가득 차야 용으로 변신할 수 있고, 변신하면 Q·W·E 가 용의 스킬로 바뀝니다. 체력이 35% 아래면 방어력·마법 저항력 +30.",
                                  trigger="periodic", interval=0.5, self_below_hp=0.35, effects=[status("dragon_blood", (1.0,), to_caster=True)]),
            dict(gauge_name="분노", gauge_max=100.0, gauge_on_hit=8.0, gauge_on_damaged=3.0, gauge_on_cast=9.0, gauge_decay_delay=8.0, gauge_decay=2.5, gauge_color=C(1, 0.35, 0.2, 1),
                 alt_status="dragon_form"),
            alt_skills=["dragon_knight_tail", "dragon_knight_breath", "dragon_knight_soar"])
patch("dragon_knight_r", res=dict(requires_gauge=100.0, description="분노가 가득 차면 쓸 수 있습니다. 8~12초 동안 용으로 변신해 체력·공격력·방어력이 크게 오르고, 기본 공격이 멀리 날아가는 화염이 되며, Q·W·E 가 꼬리치기·용의 숨결·비상으로 바뀝니다."))
skill("dragon_knight_tail", "꼬리치기", "꼬", "꼬리를 크게 휘둘러 주변 적에게 물리 피해를 주고 멀리 밀쳐냅니다. 벽에 부딪힌 적은 기절합니다.", 0, (30,), (6, 5.5, 5, 4.5),
      [area(0, 200, [dmg((80, 120, 160, 200), 0, ad=0.8), knock(240, wall="stun", wall_duration=1.0)])], radius=200, ai_range=190, vfx="fire", sound="slash", color=C(1, 0.5, 0.3, 1))
skill("dragon_knight_breath", "용의 숨결", "숨", "앞으로 길고 넓게 불을 뿜어 큰 마법 피해를 주고 불태웁니다.", 2, (50,), (8, 7.5, 7, 6.5),
      [dict(cls="LineZoneEffect", length=560.0, width=220.0, delay=0.35, affects=0, color=C(1, 0.5, 0.2, 0.35),
            effects=[dmg((120, 180, 240, 300), 1, ad=0.5, ap=0.5), status("burn", (3,), (20, 30, 40, 50))])], rng=560, width=220, vfx="fire", sound="fire", color=C(1, 0.45, 0.2, 1))
skill("dragon_knight_soar", "비상", "비", "날아올라 지정한 곳으로 뛰어들어 주변 적에게 물리 피해를 주고 밀쳐냅니다.", 3, (40,), (10, 9.5, 9, 8.5),
      [tele(0, arrive=[area(0, 170, [dmg((90, 135, 180, 225), 0, ad=0.7), knock(160)])])], rng=550, radius=170, ai=1, vfx="fire", sound="explosion", color=C(1, 0.55, 0.25, 1))

# ── 엘프 궁수: 멀리서 쏠수록 세고, 덫을 깔아 둔다 ──
set_passive("elf_archer", dict(id="hawk_eye", display_name="매의 눈", description="멀리 있는 적을 맞힐수록 기본 공격 피해가 늘어납니다(사거리 끝에서 +20%). 기본 공격이 맞으면 1.5초 동안 이동 속도가 빨라집니다.",
                               trigger="attack_hit", every=1, effects=[status("haste", (1.5,), (0.1, 0.12, 0.14, 0.16), to_caster=True)]),
            dict(far_bonus=0.2))
skill("elf_archer_q", "바람 화살", "바", "멀리 날아가는 화살을 쏩니다. 적을 꿰뚫고, 멀리 날아가 맞을수록 피해가 늘어납니다(끝에서 1.7배).", 2, (45, 50, 55, 60), (8, 7.5, 7, 6.5),
      [dict(cls="ProjectileEffect", speed=1700.0, width=34.0, pierce=True, max_range=0.0, color=C(0.8, 1, 0.6, 1), distance_bonus=0.7, effects=[dmg((55, 85, 115, 145), 0, ad=0.8)])],
      rng=1000, width=34, ai_range=900, vfx="nature", sound="arrow", color=C(0.7, 1, 0.5, 1))
skill("elf_archer_w", "가시 덫", "덫", "지정한 곳에 덫을 숨겨 둡니다(최대 3개, 40초). 적이 밟으면 터져 마법 피해를 주고 기절시킵니다. 적에게는 보이지 않습니다.", 3, (55,), (10, 9, 8, 7),
      [dict(cls="TrapEffect", radius=100.0, lifetime=40.0, arm_time=0.6, max_traps=3, effects=[dmg((50, 80, 110, 140), 1, ad=0.4), stun((1.1, 1.2, 1.3, 1.4))])],
      rng=600, radius=100, vfx="nature", sound="arrow", color=C(0.6, 0.9, 0.4, 1))

# ── 화염술사: 화상을 터뜨리고 불바다를 남긴다 ──
set_passive("fire_mage", dict(id="ignite", display_name="점화", description="기본 공격이 3초 동안 적을 불태웁니다. 불타는 적에게 화염구·메테오를 맞히면 화상을 터뜨려 추가 피해를 줍니다.",
                              trigger="attack_hit", every=1, effects=[status("burn", (3,), (12, 18, 24, 30))]))
patch("fire_mage_q", res=dict(description="화염구를 던집니다. 처음 맞은 적과 주변에 마법 피해를 주고, 불타는 적은 화상이 터져 피해가 60% 늘어납니다."),
      subs={"DamageEffect*": dict(status_bonus_id="burn", status_bonus=0.6, status_consume=True)})
skill("fire_mage_w", "불기둥", "기", "지정한 곳에 0.6초 뒤 불기둥을 세워 마법 피해를 주고 불태웁니다. 그 자리에 3초 동안 불길이 남아 계속 피해를 줍니다.", 3, (70,), (10, 9.5, 9, 8.5),
      [area(1, 110, [dmg((85, 130, 175, 220), 1, ap=0.6), status("burn", (3,), (15, 22, 29, 36), ap=0.08)], delay=0.6),
       area(1, 110, [dmg((12, 18, 24, 30), 1, ap=0.08)], delay=0.6, duration=3.0, tick=0.5, color=C(1, 0.4, 0.1, 0.25))],
      rng=600, radius=110, vfx="fire", sound="fire", color=C(1, 0.5, 0.2, 1))
patch("fire_mage_r", res=dict(description="1.1초 뒤 넓은 지역에 운석을 떨어뜨려 큰 마법 피해를 주고 기절시킵니다. 불타는 적은 화상이 터져 피해가 30% 늘어납니다."),
      subs={"DamageEffect*": dict(status_bonus_id="burn", status_bonus=0.3, status_consume=True)})

# ── 빙결술사: 냉기를 쌓아 얼리고, 얼음벽으로 길을 막는다 ──
set_passive("frost_mage", dict(id="chill", display_name="냉기", description="기본 공격과 얼음 창이 적에게 냉기를 쌓습니다. 냉기가 3번 쌓이면 1초 동안 얼어붙습니다(기절).",
                               trigger="attack_hit", every=1, effects=[slow((1,), (0.2, 0.25, 0.3, 0.35)), stack("frost", 1, 3, 4.0, full="freeze", full_duration=1.0)]))
skill("frost_mage_q", "얼음 창", "창", "일직선의 적을 꿰뚫는 얼음 창을 던져 마법 피해를 주고 둔화시키며 냉기를 쌓습니다.", 2, (50,), (7,),
      [proj([dmg((85, 125, 165, 205), 1, ap=0.6), slow((2,), (0.4,)), stack("frost", 1, 3, 4.0, full="freeze", full_duration=1.0)], speed=1200, width=40, pierce=True)],
      rng=750, width=40, vfx="ice", sound="ice", color=C(0.6, 0.85, 1, 1))
skill("frost_mage_e", "얼음벽", "벽", "지정한 곳에 길을 막는 얼음벽을 세웁니다. 유닛과 투사체가 지나갈 수 없습니다.", 3, (60,), (16, 15, 14, 13),
      [dict(cls="WallEffect", length=300.0, thickness=36.0, duration=P(2.5, 3.0, 3.5, 4.0), style="ice")], rng=600, radius=150, ai=3, vfx="ice", sound="ice", color=C(0.7, 0.9, 1, 1))

# ── 무투가: 스킬을 이어 쓸수록 세고, 철산고로 벽에 처박는다 ──
set_passive("monk", dict(id="flurry", display_name="연타·연계", description="세 번째 공격마다 추가 물리 피해를 주고 3초 동안 공격 속도가 30% 빨라집니다. 스킬을 쓸 때마다 연계가 1 쌓여(최대 3, 2.5초) 다음 스킬 피해가 하나당 10% 늘어납니다.",
                         trigger="attack_hit", every=3, effects=[dmg((20, 35, 50, 65), 0, ad=0.3), status("monk_flow", (3,), to_caster=True)]),
            dict(gauge_name="연계", gauge_max=3.0, gauge_on_cast=1.0, gauge_decay_delay=2.5, gauge_decay=3.0, gauge_pips=True, gauge_color=C(1, 0.7, 0.3, 1)))
for sid in ["monk_q", "monk_w", "monk_r"]:
    patch(sid, subs={"DamageEffect*": dict(gauge_bonus=0.1)})
skill("monk_e", "철산고", "철", "어깨로 짧게 들이받아 물리 피해를 주고 멀리 밀쳐냅니다. 벽에 부딪힌 적은 1.2초 동안 기절합니다.", 2, (45,), (11, 10, 9, 8),
      [dash(160, [dmg((70, 105, 140, 175), 0, ad=0.7, ap=0.0) | dict(gauge_bonus=0.1), knock(260, wall="stun", wall_duration=1.2)], speed=1300, width=70)],
      rng=160, width=70, ai=0, ai_range=220, vfx="impact", sound="punch", color=C(1, 0.75, 0.4, 1))

# ── 성기사: 도발로 적을 끌고, 수호로 아군의 피해를 나눠 받는다 (패시브는 그대로) ──
skill("paladin_q", "도발", "도", "방패를 내리쳐 주변 적에게 마법 피해를 주고, 1.25~2초 동안 자신만 공격하게 만듭니다.", 0, (55,), (11, 10.5, 10, 9.5),
      [area(0, 260, [dmg((60, 90, 120, 150), 1, ad=0.2, ap=0.4), status("taunt", (1.25, 1.5, 1.75, 2.0))])], radius=260, ai_range=240, vfx="holy", sound="punch", color=C(1, 0.8, 0.4, 1))
skill("paladin_w", "수호", "수", "아군 한 명(자신 포함)에게 3초 동안 보호막을 씌우고, 4초 동안 그 아군이 받는 피해의 30%를 대신 받습니다.", 1, (60,), (12, 11, 10, 9),
      [shield((100, 150, 200, 250), (3,), ap=0.6, to_caster=False), status("guarded", (4,))], rng=600, team=1, ai=4, vfx="holy", sound="shield", color=C(1, 0.9, 0.5, 1))

# ── 성녀: 쓰러진 아군을 되살리고, 넘친 회복은 보호막이 된다 ──
set_passive("saint", dict(id="blessing", display_name="축복", description="5초마다 주변 아군(자신 포함)의 체력을 회복시킵니다. 성녀의 회복이 넘치면 넘친 양의 60%가 보호막이 됩니다.",
                          trigger="periodic", interval=5.0, effects=[area(0, 450, [dict(heal((70, 100, 130, 160), ap=0.15)) | dict(overheal_shield=0.6)], affects=1, color=C(1, 1, 0.7, 0.2))]))
patch("saint_w", res=dict(description="아군 한 명(자신 포함)의 체력을 크게 회복시킵니다. 넘친 회복의 60%는 3초 동안 보호막이 됩니다."), subs={"HealEffect*": dict(overheal_shield=0.6)})
skill("saint_r", "부활의 기도", "부", "가장 최근에 쓰러진 아군 한 명을 쓰러진 자리에서 되살리고(체력 35/45/55%), 넓은 범위의 아군 모두의 체력을 크게 회복시킵니다.", 0, (120,), (110, 95, 80),
      [dict(cls="ReviveEffect", hp_ratio=P(0.35, 0.45, 0.55), radius=0.0),
       area(0, 650, [dict(heal((250, 375, 500), ap=1.0)) | dict(overheal_shield=0.6)], affects=1)],
      radius=650, team=1, ai=4, max_rank=3, vfx="holy", sound="heal", color=C(1, 1, 0.7, 1))

# ── 소환술사: 해골 군단을 거느리고, 근처에서 쓰러진 적 자리에서 해골을 일으킨다 ──
set_passive("summoner", dict(id="raise_dead", display_name="망자의 부름", description="근처(700)에서 적이나 몬스터가 쓰러지면 그 자리에서 해골 전사를 일으킵니다(1.5초마다, 해골은 최대 6마리).",
                             trigger="nearby_death", radius=700.0, cooldown=1.5,
                             effects=[dict(cls="SummonEffect", monster_id="skeleton", count=PI(1), duration=P(14), at_context_point=True, max_alive=6)]))
patch("summoner_q", res=dict(description="14초 동안 해골 전사 2~3마리를 부릅니다. 해골은 최대 6마리까지 거느릴 수 있습니다."), subs={"SummonEffect*": dict(max_alive=6)})

print("기존 영웅 10명 고유 장치 적용 완료")
