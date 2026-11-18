class_name Ward
extends Node2D
## 감시 와드: 정해진 시간 동안 주변을 밝힌다(전장의 안개). 풀숲 안에 꽂으면 그 풀숲 안도 보인다. 적에게는 보이지 않는다.

const SIGHT := 500.0
const MAX_PER_HERO := 3

var team := 0
var owner_unit = null
var life := 90.0
var _age := 0.0


static func place(h, pos: Vector2, seconds: float) -> Ward:
	var mine: Array = []
	for w in h.get_tree().get_nodes_in_group("wards"):
		if w.owner_unit == h and not w.is_queued_for_deletion():
			mine.append(w)
	while mine.size() >= MAX_PER_HERO:
		mine.pop_front().queue_free()
	var w := Ward.new()
	w.team = h.team
	w.owner_unit = h
	w.life = seconds
	w.add_to_group("wards")
	Targeting.effects_parent(h).add_child(w)
	w.global_position = pos
	return w


func _process(delta: float) -> void:
	_age += delta
	if _age >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	if team != UnitVisual.viewer_team:
		return
	var left := clampf((life - _age) / life, 0.0, 1.0)
	draw_arc(Vector2.ZERO, SIGHT, 0, TAU, 64, Color(1, 0.9, 0.4, 0.12), 2.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, View.upright()))
	draw_line(Vector2(0, 4), Vector2(0, -26), Color(0.15, 0.1, 0.05), 5.0)
	draw_circle(Vector2(0, -30), 10.0, Color(0.15, 0.1, 0.05))
	draw_circle(Vector2(0, -30), 8.0, Color(1, 0.85, 0.35))
	draw_circle(Vector2(0, -30), 3.5, Color(0.2, 0.15, 0.1))
	draw_arc(Vector2(0, -30), 13.0, -PI / 2.0, -PI / 2.0 + TAU * left, 24, Color(1, 0.9, 0.5, 0.9), 2.5)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
