class_name ManaEffect
extends SkillEffect
## 마나 회복 = 단계별 기본값 + 주문력 × ap_ratio

@export var base: PackedFloat32Array = PackedFloat32Array([50.0])
@export var ap_ratio: float = 0.0
@export var to_caster: bool = true


func apply(ctx: SkillContext) -> void:
	var t = ctx.caster if to_caster else ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead:
		return
	t.mana.restore(scaled(ctx, base, 0.0, ap_ratio))
