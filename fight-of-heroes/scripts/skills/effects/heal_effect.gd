class_name HealEffect
extends SkillEffect
## 회복 = 단계별 기본값 + 주문력 × ap_ratio (+ 공격력 × ad_ratio)

@export var base: PackedFloat32Array = PackedFloat32Array([])
@export var ad_ratio: float = 0.0
@export var ap_ratio: float = 0.0
@export var to_caster: bool = false
## 체력이 가득 차서 넘친 회복량의 이 비율만큼 보호막을 씌운다 (3초)
@export var overheal_shield: float = 0.0


func apply(ctx: SkillContext) -> void:
	var t = ctx.caster if to_caster else ctx.target_unit
	var amount := scaled(ctx, base, ad_ratio, ap_ratio)
	var healed := CombatManager.heal(t, amount, ctx.caster)
	if overheal_shield > 0.0 and t != null and is_instance_valid(t) and not t.is_dead and amount - healed > 1.0:
		t.health.add_shield((amount - healed) * overheal_shield, 3.0)
	if t != null and is_instance_valid(t) and not t.is_dead and ctx.skill != null:
		SkillFx.sparkle(t, "heal", 12)
