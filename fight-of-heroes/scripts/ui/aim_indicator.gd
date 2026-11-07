class_name AimIndicator
extends Node2D
## 월드 위에 그리는 조준 표시: 선택한 공격 대상, 스킬 사거리와 범위, 방향.

var hero = null
var controller: PlayerController = null


func setup(h, c: PlayerController) -> void:
	hero = h
	controller = c


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if hero == null or controller == null or hero.is_dead:
		return
	var t = controller.selected
	if t != null and is_instance_valid(t) and not t.is_dead:
		var tp: Vector2 = t.global_position
		draw_arc(tp, t.radius + 9.0, 0, TAU, 40, Color(1, 0.25, 0.2, 0.95), 3.0)
	if controller.attack_held:
		draw_arc(hero.global_position, hero.attack.attack_range + hero.radius, 0, TAU, 64, Color(1, 1, 1, 0.25), 2.0)
	var slot := controller.aiming_slot
	if slot < 0:
		return
	var s: SkillData = hero.skill_caster.get_skill(slot)
	if s == null:
		return
	var pos: Vector2 = hero.global_position
	var aim := controller.manual_aim(slot, controller.aim_vec) if controller.aim_dragged else controller.auto_aim(slot)
	var c := Color(s.color, 0.35)
	var edge := Color(s.color.lightened(0.3), 0.85)
	if s.cast_range > 0.0:
		draw_arc(pos, s.cast_range, 0, TAU, 72, Color(1, 1, 1, 0.3), 2.0)
	match s.target_mode:
		Enums.TargetMode.SELF:
			if s.radius > 0.0:
				draw_circle(pos, s.radius, c)
				draw_arc(pos, s.radius, 0, TAU, 48, edge, 2.0)
		Enums.TargetMode.DIRECTION:
			var dir: Vector2 = aim.direction.normalized() if aim != null and aim.direction.length() > 0.01 else hero.facing
			var w := maxf(s.width, 20.0)
			var end := pos + dir * s.cast_range
			draw_line(pos, end, c, w)
			draw_line(pos + dir.orthogonal() * w * 0.5, end + dir.orthogonal() * w * 0.5, edge, 2.0)
			draw_line(pos - dir.orthogonal() * w * 0.5, end - dir.orthogonal() * w * 0.5, edge, 2.0)
		Enums.TargetMode.POINT:
			var p: Vector2 = aim.point if aim != null and aim.has_point else pos
			p = pos + (p - pos).limit_length(s.cast_range)
			draw_circle(p, maxf(s.radius, 20.0), c)
			draw_arc(p, maxf(s.radius, 20.0), 0, TAU, 48, edge, 2.0)
		Enums.TargetMode.UNIT:
			if aim != null and aim.unit != null and is_instance_valid(aim.unit):
				draw_arc(aim.unit.global_position, aim.unit.radius + 12.0, 0, TAU, 40, edge, 4.0)
