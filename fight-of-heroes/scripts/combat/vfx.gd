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


## 바깥으로 퍼지는 고리 (레벨업·처치)
static func ring(parent_of: Node, pos: Vector2, r: float, c: Color, time := 0.5) -> void:
	var v := Vfx.new()
	v.kind = "ring"
	v.radius = r
	v.color = c
	v.life = time
	Targeting.effects_parent(parent_of).add_child(v)
	v.global_position = pos


## 짧게 튀는 불꽃 (타격)
static func spark(parent_of: Node, pos: Vector2, c: Color, size := 14.0) -> void:
	var v := Vfx.new()
	v.kind = "spark"
	v.radius = size
	v.color = c
	v.life = 0.18
	v.rotation = randf() * TAU
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
	elif kind == "ring":
		draw_arc(Vector2.ZERO, radius * (0.3 + 0.9 * t), 0, TAU, 48, Color(color, 1.0 - t), 4.0 * (1.0 - t) + 1.0)
	elif kind == "spark":
		for i in 6:
			var d := Vector2.from_angle(TAU * i / 6.0)
			draw_line(d * radius * t * 0.6, d * radius * (0.4 + t), Color(color, 1.0 - t), 2.5)
	else:
		draw_line(from, to, c, width)
