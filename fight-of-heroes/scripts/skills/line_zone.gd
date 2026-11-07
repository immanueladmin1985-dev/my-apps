class_name LineZone
extends Node2D
## 직선 위험 지역 예고와 발동.

var effect: LineZoneEffect
var ctx: SkillContext
var from := Vector2.ZERO
var dir := Vector2.RIGHT
var _left := 0.0
var _total := 0.0
var _fired := false


func setup(e: LineZoneEffect, c: SkillContext, start: Vector2, direction: Vector2) -> void:
	effect = e
	ctx = c
	from = start
	dir = direction.normalized() if direction.length() > 0.01 else Vector2.RIGHT
	_left = e.delay
	_total = maxf(0.01, e.delay)


func _ready() -> void:
	add_to_group("telegraphs")
	rotation = dir.angle()


func end_point() -> Vector2:
	return from + dir * effect.length


func threatens(unit, margin := 0.0) -> bool:
	if _fired or not ctx.caster_valid() or not Enums.is_enemy(ctx.team(), unit.team):
		return false
	var p := Geometry2D.get_closest_point_to_segment(unit.global_position, from, end_point())
	return p.distance_to(unit.global_position) <= effect.width * 0.5 + unit.radius + margin


func escape_dir(unit) -> Vector2:
	var p := Geometry2D.get_closest_point_to_segment(unit.global_position, from, end_point())
	var d: Vector2 = unit.global_position - p
	return d.normalized() if d.length() > 1.0 else dir.orthogonal()


func time_left() -> float:
	return _left


func elapsed() -> float:
	return _total - _left


func _physics_process(delta: float) -> void:
	if not ctx.caster_valid() or ctx.caster.is_dead:
		queue_free()
		return
	if _fired:
		return
	_left -= delta
	queue_redraw()
	if _left > 0.0:
		return
	_fired = true
	remove_from_group("telegraphs")
	var list := effect.effects
	if effect.dash_caster:
		# 돌진이 끝날 때까지 이 노드를 남겨 둔다 (넘긴 함수가 이 노드에 묶여 있다).
		visible = false
		ctx.caster.start_dash(dir, effect.length, effect.dash_speed, effect.width,
			func(u): SkillEffect.apply_list(list, ctx.with_target(u)), queue_free)
		return
	else:
		for u in Targeting.on_segment(get_tree(), from, end_point(), effect.width, ctx.team(), effect.affects):
			SkillEffect.apply_list(list, ctx.with_target(u))
		Vfx.line(ctx.caster, from, end_point(), effect.width, effect.color, 0.3)
	queue_free()


func _draw() -> void:
	var t := 1.0 - clampf(_left / _total, 0.0, 1.0)
	var h := effect.width * 0.5
	draw_rect(Rect2(0, -h, effect.length, effect.width), Color(effect.color, 0.12))
	draw_rect(Rect2(0, -h, effect.length * t, effect.width), Color(effect.color, 0.3))
	draw_rect(Rect2(0, -h, effect.length, effect.width), Color(1, 0.3, 0.2, 0.9), false, 2.5)
