class_name ApplyStatusEffect
extends SkillEffect
## 상태 효과(기절, 둔화, 지속 피해, 가속, 능력치 버프)를 건다.

@export var status: StatusEffectData
@export var duration: PackedFloat32Array = PackedFloat32Array([1.0])
@export var magnitude: PackedFloat32Array = PackedFloat32Array([0.0])
## 지속 피해의 세기에 더할 주문력·공격력 계수
@export var ap_ratio: float = 0.0
@export var ad_ratio: float = 0.0
@export var to_caster: bool = false


func apply(ctx: SkillContext) -> void:
	var t = ctx.caster if to_caster else ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead:
		return
	if not to_caster and t == ctx.caster:
		return
	var mag := scaled(ctx, magnitude, ad_ratio, ap_ratio)
	t.status.apply(status, SkillData.at(duration, ctx.rank), mag, ctx.caster)
