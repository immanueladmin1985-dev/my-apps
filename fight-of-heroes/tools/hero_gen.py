#!/usr/bin/env python3
"""영웅·스킬·패시브·소환수·상태 효과 데이터(.tres)를 만드는 도구 모음.
새 영웅 묶음은 tools/gen_heroes2.py 처럼 이 파일을 불러 hero(...) 를 부른다. 만든 뒤에는 .tres 를 직접 고쳐도 된다."""
import os, re
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SCRIPTS = {k: "res://scripts/%s.gd" % v for k, v in {
 "SkillData": "skills/skill_data", "DamageEffect": "skills/effects/damage_effect", "ApplyStatusEffect": "skills/effects/apply_status_effect",
 "ShieldEffect": "skills/effects/shield_effect", "HealEffect": "skills/effects/heal_effect", "AreaEffect": "skills/effects/area_effect",
 "ProjectileEffect": "skills/effects/projectile_effect", "DashEffect": "skills/effects/dash_effect", "LineZoneEffect": "skills/effects/line_zone_effect",
 "TeleportEffect": "skills/effects/teleport_effect", "SummonEffect": "skills/effects/summon_effect", "ManaEffect": "skills/effects/mana_effect", "BarrageEffect": "skills/effects/barrage_effect",
 "MonsterData": "map/monster_data", "StatusEffectData": "combat/status_effect_data", "StatModifier": "combat/stat_modifier",
 "HeroData": "heroes/hero_data", "PassiveData": "heroes/passive_data",
 "StackEffect": "skills/effects/stack_effect", "KnockbackEffect": "skills/effects/knockback_effect", "ReviveEffect": "skills/effects/revive_effect",
 "ChainEffect": "skills/effects/chain_effect", "ReloadEffect": "skills/effects/reload_effect", "WallEffect": "skills/effects/wall_effect",
 "TrapEffect": "skills/effects/trap_effect", "ItemData": "items/item_data"}.items()}

def pf(v): return "PackedFloat32Array(%s)" % ", ".join(repr(float(x)) for x in v)
def val(v):
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, float): return repr(v)
    if isinstance(v, int): return str(v)
    if isinstance(v, str): return '"%s"' % v
    k = v[0]
    if k == "pf": return pf(v[1])
    if k == "pi": return "PackedInt32Array(%s)" % ", ".join(str(x) for x in v[1])
    if k == "ps": return "PackedStringArray(%s)" % ", ".join('"%s"' % x for x in v[1])
    if k == "color": return "Color(%s)" % ", ".join(str(x) for x in v[1])
    if k == "dict": return "{\n" + ",\n".join('"%s": %s' % (a, repr(float(b))) for a, b in sorted(v[1].items())) + "\n}"
    raise ValueError(v)
P=lambda *v:("pf",v); PI=lambda *v:("pi",v); PS=lambda *v:("ps",v); C=lambda *v:("color",v); D=lambda **k:("dict",k)

def build(path, cls, fields):
    ext = {}; subs = []
    def ext_id(p, typ):
        if p not in ext: ext[p] = (str(len(ext) + 1), typ)
        return ext[p][0]
    def ref(e):
        if isinstance(e, dict): return 'SubResource("%s")' % emit(dict(e))
        return 'ExtResource("%s")' % ext_id(e, "Resource")
    def emit_fields(f):
        lines = []
        for k, v in f.items():
            if isinstance(v, list):
                lines.append("%s = Array[Resource]([%s])" % (k, ", ".join(ref(e) for e in v)))
            elif isinstance(v, dict) or (isinstance(v, str) and v.startswith("res://")):
                lines.append("%s = %s" % (k, ref(v)))
            else:
                lines.append("%s = %s" % (k, val(v)))
        return lines
    def emit(e):
        c = e.pop("cls")
        sid = "%s_%d" % (c, len(subs) + 1)
        subs.append(None); idx = len(subs) - 1
        subs[idx] = (sid, ['script = ExtResource("%s")' % ext_id(SCRIPTS[c], "Script")] + emit_fields(e))
        return sid
    head = emit_fields(fields)
    head = ['script = ExtResource("%s")' % ext_id(SCRIPTS[cls], "Script")] + head
    out = ['[gd_resource type="Resource" script_class="%s" format=3]' % cls, ""]
    for p, (i, typ) in ext.items():
        out.append('[ext_resource type="%s" path="%s" id="%s"]' % (typ, p, i))
    out.append("")
    for i in sorted(range(len(subs)), key=lambda i: -i):
        sid, lines = subs[i]
        out += ['[sub_resource type="Resource" id="%s"]' % sid] + lines + [""]
    out += ["[resource]"] + head
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write("\n".join(out) + "\n")

def st(id): return "res://data/status/%s.tres" % id
def dmg(base, t=0, ad=0.0, ap=0.0): return dict(cls="DamageEffect", damage_type=t, base=P(*base), ad_ratio=ad, ap_ratio=ap)
def status(sid, dur, mag=(0,), to_caster=False, ad=0.0, ap=0.0): return dict(cls="ApplyStatusEffect", status=st(sid), duration=P(*dur), magnitude=P(*mag), to_caster=to_caster, ad_ratio=ad, ap_ratio=ap)
def stun(d): return status("stun", d)
def slow(d, m): return status("slow", d, m)
def shield(base, dur=(3,), ad=0.0, ap=0.0, to_caster=True): return dict(cls="ShieldEffect", base=P(*base), duration=P(*dur), ad_ratio=ad, ap_ratio=ap, to_caster=to_caster)
def heal(base, ap=0.0, ad=0.0, to_caster=False): return dict(cls="HealEffect", base=P(*base), ap_ratio=ap, ad_ratio=ad, to_caster=to_caster)
def area(center, radius, effects, delay=0.0, duration=0.0, tick=0.5, affects=0, color=C(1,0.6,0.3,0.35)):
    return dict(cls="AreaEffect", center=center, radius=float(radius), delay=float(delay), duration=float(duration), tick_interval=float(tick), affects=affects, color=color, effects=effects)
def proj(effects, speed=1200.0, width=36.0, pierce=False, rng=0.0, color=C(1,1,0.7,1)):
    return dict(cls="ProjectileEffect", speed=float(speed), width=float(width), pierce=pierce, max_range=float(rng), color=color, effects=effects)
def dash(dist, effects=(), end=(), speed=1000.0, width=60.0):
    return dict(cls="DashEffect", distance=float(dist), speed=float(speed), width=float(width), path_effects=list(effects), end_effects=list(end))
def tele(dist=300.0, arrive=(), behind=40.0): return dict(cls="TeleportEffect", distance=float(dist), behind=float(behind), arrive_effects=list(arrive))
def summon(mid, count, dur): return dict(cls="SummonEffect", monster_id=mid, count=PI(*count), duration=P(*dur))
def barrage(effects, shots, interval, spread=12.0, slow=0.4, sound=""):
    return dict(cls="BarrageEffect", shots=int(shots), interval=float(interval), spread=float(spread), caster_status=st("slow"), slow_caster=float(slow), shot_sound=sound, effects=list(effects))
def mana(base, ap=0.0): return dict(cls="ManaEffect", base=P(*base), ap_ratio=ap, to_caster=True)

# 0 SELF 1 UNIT 2 DIRECTION 3 POINT / team: 0 ENEMY 1 ALLY / ai: 0 OFF 1 ENGAGE 2 DEF 3 ESCAPE 4 SUPPORT 5 SUMMON / area center: 0 CASTER 1 POINT 2 TARGET
def skill(id, name, glyph, desc, mode, mana_cost, cd, effects, rng=0.0, radius=0.0, width=0.0, team=0, ai=0, ai_range=0.0, max_rank=4, color=C(1,0.7,0.4,1), away=False, vfx="arcane", sound="", **more):
    """more: SkillData 의 그 밖의 항목 (recast_effects, recast_window, recast_requires, requires_gauge, reset_on_kill, cast_lock 등)"""
    build("%s/skills/%s.tres" % (ROOT, id), "SkillData", dict(vfx=vfx, sound=sound, id=id, display_name=name, glyph=glyph, description=desc, max_rank=max_rank,
        mana_cost=P(*mana_cost), cooldown=P(*cd), target_mode=mode, target_team=team, cast_range=float(rng), radius=float(radius), width=float(width),
        auto_aim_away=away, ai_use=ai, ai_range=float(ai_range), color=color, effects=effects, **more))

# ── 상태 효과 ── kind: STUN0 SLOW1 DOT2 STAT_BUFF3 HASTE4 HOT5 MOT6 STEALTH7
def status_file(id, name, kind, color, mods=(), tick=0.5, dtype=1, scale=1.0, tint=None):
    f = dict(id=id, display_name=name, kind=kind, color=C(*color), tick_interval=float(tick), damage_type=dtype)
    if mods:
        f["stat_modifiers"] = [dict(cls="StatModifier", stat=a, flat=float(b), percent=float(c)) for a, b, c in mods]
    if scale != 1.0: f["visual_scale"] = float(scale)
    if tint: f["visual_tint"] = C(*tint)
    build("%s/status/%s.tres" % (ROOT, id), "StatusEffectData", f)

def monster(id, **f): build("%s/monsters/%s.tres" % (ROOT, id), "MonsterData", dict(id=id, **f))

heroes = []
def hero(id, name, role, diff, lore, color, glyph, weapon, base, growth, rng, ranged, pref, build_items, passive, skills, prio=(0, 1, 2), aggr=0.5, pspeed=1000.0, avfx="", extra=None):
    heroes.append(id)
    ids = []
    for i, s in enumerate(skills):
        sid = "%s_%s" % (id, "qwer"[i])
        skill(sid, **s)
        ids.append("res://data/skills/%s.tres" % sid)
    pas = dict(cls="PassiveData", **passive)
    extra = dict(extra or {})
    if avfx:
        extra["attack_vfx"] = avfx
    build("%s/heroes/%s.tres" % (ROOT, id), "HeroData", dict(id=id, display_name=name, role=role, difficulty=diff, lore=lore, color=C(*color, 1),
        glyph=glyph, weapon=weapon, base_stats=D(**base), growth_stats=D(**growth), attack_range=float(rng), is_ranged=ranged,
        projectile_speed=float(pspeed), passive=pas, passive_description="%s: %s" % (passive["display_name"], passive["description"]),
        skills=ids, preferred_role=pref, ai_build=PS(*build_items), ai_skill_priority=PI(*prio), ai_aggression=float(aggr), **extra))

MELEE_G = dict(max_hp=85, max_mp=25, attack=4, armor=3.5, magic_resist=1.5, attack_speed=0.02, hp_regen=0.3, mp_regen=0.15)
MAGE_G = dict(max_hp=72, max_mp=32, attack=2.5, ability_power=5, armor=2.8, magic_resist=1.5, attack_speed=0.015, hp_regen=0.25, mp_regen=0.2)
