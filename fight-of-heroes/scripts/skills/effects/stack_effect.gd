class_name StackEffect
extends SkillEffect
## 쌓기. key 가 "gauge" 이면 시전자 영웅의 고유 게이지(기·분노 등)를, 아니면 대상(또는 시전자)의 쌓기를 바꾼다.
## amount 가 음수면 줄인다. 대상 쌓기가 max_value 에 닿으면 full_status 를 걸고 쌓기를 비운다 (냉기 → 빙결).

@export var key: String = "gauge"
@export var amount: float = 1.0
@export var max_value: float = 3.0
@export var duration: float = 0.0
@export var to_caster: bool = false
@export var full_status: StatusEffectData
@export var full_duration: float = 1.0


func apply(ctx: SkillContext) -> void:
	if key == "gauge":
		if ctx.caster_valid() and ctx.caster is Hero:
			ctx.caster.add_gauge(amount)
		return
	var t = ctx.caster if to_caster else ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead:
		return
	if not to_caster and t == ctx.caster:
		return
	var v: float = t.add_stack(key, amount, max_value, duration)
	if full_status != null and v >= max_value:
		t.set_stack(key, 0.0)
		t.status.apply(full_status, full_duration, 0.0, ctx.caster if ctx.caster_valid() else null)
		SkillFx.burst(t, t.global_position, 60.0, SkillFx.style_of(ctx.skill) if ctx.skill != null else "ice")
