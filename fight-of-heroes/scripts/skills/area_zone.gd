class_name AreaZone
extends Node2D
## 시간차·지속형 범위 효과. 발동 전에는 예고 표시가 점점 차오른다.

var effect: AreaEffect
var ctx: SkillContext
var _delay_left := 0.0
var _life_left := 0.0
var _tick_left := 0.0
var _started := false


func setup(e: AreaEffect, c: SkillContext, _pos: Vector2) -> void:
	effect = e
	ctx = c
	_delay_left = e.delay
	_life_left = e.duration
	_tick_left = 0.0


func _physics_process(delta: float) -> void:
	if not ctx.caster_valid():
		queue_free()
		return
	if not _started:
		_delay_left -= delta
		if _delay_left <= 0.0:
			_started = true
			if effect.duration <= 0.0:
				effect.hit(ctx, global_position)
				Vfx.circle(self, global_position, effect.radius, effect.color, 0.35)
				queue_free()
				return
	else:
		_tick_left -= delta
		if _tick_left <= 0.0:
			_tick_left += effect.tick_interval
			effect.hit(ctx, global_position)
		_life_left -= delta
		if _life_left <= 0.0:
			queue_free()
			return
	queue_redraw()


func _draw() -> void:
	var c := effect.color
	if not _started:
		var t := 1.0 - clampf(_delay_left / maxf(0.01, effect.delay), 0.0, 1.0)
		draw_circle(Vector2.ZERO, effect.radius, Color(c, 0.12))
		draw_circle(Vector2.ZERO, effect.radius * t, Color(c, 0.3))
		draw_arc(Vector2.ZERO, effect.radius, 0, TAU, 48, Color(1, 0.3, 0.2, 0.9), 2.5)
	else:
		draw_circle(Vector2.ZERO, effect.radius, Color(c, c.a))
		draw_arc(Vector2.ZERO, effect.radius, 0, TAU, 48, Color(c, 0.9), 2.0)
