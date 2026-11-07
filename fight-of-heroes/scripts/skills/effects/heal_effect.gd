class_name HealEffect
extends SkillEffect
## 회복 = 단계별 기본값 + 주문력 × ap_ratio (+ 공격력 × ad_ratio)

@export var base: PackedFloat32Array = PackedFloat32Array([])
@export var ad_ratio: float = 0.0
@export var ap_ratio: float = 0.0
@export var to_caster: bool = false


func apply(ctx: SkillContext) -> void:
	var t = ctx.caster if to_caster else ctx.target_unit
	CombatManager.heal(t, scaled(ctx, base, ad_ratio, ap_ratio), ctx.caster)
