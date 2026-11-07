class_name ShieldEffect
extends SkillEffect
## 보호막. duration 초 동안 남아 있고, 피해를 체력보다 먼저 받는다.

@export var base: PackedFloat32Array = PackedFloat32Array([])
@export var ad_ratio: float = 0.0
@export var ap_ratio: float = 0.0
@export var duration: PackedFloat32Array = PackedFloat32Array([3.0])
@export var to_caster: bool = true


func apply(ctx: SkillContext) -> void:
	var t = ctx.caster if to_caster else ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead:
		return
	t.health.add_shield(scaled(ctx, base, ad_ratio, ap_ratio), SkillData.at(duration, ctx.rank))
