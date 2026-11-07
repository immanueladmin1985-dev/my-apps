class_name DamageEffect
extends SkillEffect
## 피해 = 단계별 기본값 + 공격력 × ad_ratio + 주문력 × ap_ratio

@export var damage_type: Enums.DamageType = Enums.DamageType.PHYSICAL
@export var base: PackedFloat32Array = PackedFloat32Array([])
@export var ad_ratio: float = 0.0
@export var ap_ratio: float = 0.0
@export var can_crit: bool = false


func apply(ctx: SkillContext) -> void:
	var t = ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead or t == ctx.caster:
		return
	var info := DamageInfo.new(ctx.caster if ctx.caster_valid() else null, scaled(ctx, base, ad_ratio, ap_ratio), damage_type)
	info.can_crit = can_crit
	info.skill = ctx.skill
	CombatManager.apply_damage(t, info)
