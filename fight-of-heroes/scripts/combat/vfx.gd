class_name Vfx
extends Node2D
## 임시 이펙트(원, 직선)가 잠깐 보였다가 사라진다. 실제 이펙트 에셋이 생기면 이 부분만 바꾼다.

var kind := "circle"
var radius := 50.0
var from := Vector2.ZERO
var to := Vector2.ZERO
var width := 20.0
var color := Color.WHITE
var life := 0.3
var _age := 0.0


static func circle(parent_of: Node, pos: Vector2, r: float, c: Color, time := 0.3) -> void:
	var v := Vfx.new()
	v.kind = "circle"
	v.radius = r
	v.color = c
	v.life = time
	Targeting.effects_parent(parent_of).add_child(v)
	v.global_position = pos


static func line(parent_of: Node, a: Vector2, b: Vector2, w: float, c: Color, time := 0.3) -> void:
	var v := Vfx.new()
	v.kind = "line"
	v.from = Vector2.ZERO
	v.to = b - a
	v.width = w
	v.color = c
	v.life = time
	Targeting.effects_parent(parent_of).add_child(v)
	v.global_position = a


func _process(delta: float) -> void:
	_age += delta
	if _age >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	var t := clampf(_age / life, 0.0, 1.0)
	var c := Color(color, color.a * (1.0 - t))
	if kind == "circle":
		draw_circle(Vector2.ZERO, radius * (0.7 + 0.3 * t), c)
		draw_arc(Vector2.ZERO, radius, 0, TAU, 48, Color(color, 1.0 - t), 3.0)
	else:
		draw_line(from, to, c, width)
