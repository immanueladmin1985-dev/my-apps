class_name PingMarker
extends Node2D
## 맵 위에 찍힌 신호 표시: 바닥에서 퍼지는 고리와 세워 그린 글자. 신호가 끝나면 사라진다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const COLORS := {"attack": Color(1.0, 0.35, 0.3), "danger": Color(1.0, 0.85, 0.25), "gather": Color(0.4, 0.75, 1.0)}
const LABELS := {"attack": "공격!", "danger": "위험!", "gather": "모여!"}

var kind := "attack"
var life := 10.0
var _age := 0.0


static func spawn(parent_of: Node, pos: Vector2, k: String, seconds: float) -> PingMarker:
	var m := PingMarker.new()
	m.kind = k
	m.life = seconds
	Targeting.effects_parent(parent_of).add_child(m)
	m.global_position = pos
	m.z_index = 5
	return m


static func color_of(k: String) -> Color:
	return COLORS.get(k, Color.WHITE)


func _process(delta: float) -> void:
	_age += delta
	if _age >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	var c := color_of(kind)
	var fade := clampf((life - _age) / 1.5, 0.0, 1.0)
	# 처음 1.2초 동안 크게 퍼지는 고리 세 개
	for i in 3:
		var t := fmod(_age * 1.2 + i / 3.0, 1.0)
		if _age < 1.2 or i == 0:
			draw_arc(Vector2.ZERO, 20.0 + t * 90.0, 0, TAU, 48, Color(c, (1.0 - t) * 0.9 * fade), 4.0)
	draw_circle(Vector2.ZERO, 22.0, Color(c, 0.35 * fade))
	draw_arc(Vector2.ZERO, 22.0, 0, TAU, 40, Color(c, 0.95 * fade), 3.0)
	# 글자는 세워서 그린다
	var up := View.upright()
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, up))
	var bob := sin(_age * 6.0) * 4.0
	var text: String = LABELS.get(kind, "!")
	var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x
	var p := Vector2(-w * 0.5, -42.0 + bob)
	draw_string_outline(FONT, p, text, HORIZONTAL_ALIGNMENT_LEFT, -1, 22, 5, Color(0, 0, 0, 0.8 * fade))
	draw_string(FONT, p, text, HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(c.lightened(0.3), fade))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
