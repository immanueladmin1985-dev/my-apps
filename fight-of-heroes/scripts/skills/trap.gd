class_name Trap
extends Node2D
## 덫 (TrapEffect 가 놓는다). 적이 들어오면 터진다. 같은 팀에게만 보인다.

var effect: TrapEffect
var ctx: SkillContext
var owner_unit = null
var _age := 0.0


func setup(e: TrapEffect, c: SkillContext) -> void:
	effect = e
	ctx = c
	owner_unit = c.caster
	add_to_group("traps")


func _physics_process(delta: float) -> void:
	_age += delta
	if _age >= effect.lifetime or not ctx.caster_valid():
		queue_free()
		return
	if _age < effect.arm_time:
		return
	var hit := Targeting.in_radius(get_tree(), global_position, effect.radius * 0.6, ctx.team(), Enums.TargetTeam.ENEMY, true)
	if hit.is_empty():
		return
	for u in Targeting.in_radius(get_tree(), global_position, effect.radius, ctx.team(), Enums.TargetTeam.ENEMY, true):
		SkillEffect.apply_list(effect.effects, ctx.with_target(u))
	SkillFx.burst(owner_unit, global_position, effect.radius, SkillFx.style_of(ctx.skill))
	queue_free()


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if owner_unit == null or not is_instance_valid(owner_unit) or owner_unit.team != UnitVisual.viewer_team:
		return
	var c := SkillFx.colors(SkillFx.style_of(ctx.skill))
	var armed := _age >= effect.arm_time
	draw_circle(Vector2.ZERO, 16.0, Color(c.c, 0.6))
	for i in 6:
		var a := TAU * i / 6.0
		draw_line(Vector2.from_angle(a) * 8.0, Vector2.from_angle(a) * 20.0, Color(c.a, 0.9 if armed else 0.4), 3.0)
	draw_arc(Vector2.ZERO, effect.radius, 0, TAU, 40, Color(c.b, 0.18 if armed else 0.08), 2.0)
