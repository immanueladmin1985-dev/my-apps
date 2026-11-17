class_name TempWall
extends StaticBody2D
## 잠시 생기는 벽 (얼음벽). 유닛과 투사체를 막고 시간이 지나면 녹아 사라진다.

var length := 260.0
var thickness := 36.0
var life := 3.0
var style := "ice"
var _age := 0.0


func setup(l: float, t: float, seconds: float, s: String) -> void:
	length = l
	thickness = t
	life = seconds
	style = s
	collision_layer = 1
	collision_mask = 0
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(length, thickness)
	shape.shape = rect
	add_child(shape)
	add_to_group("temp_walls")


func _process(delta: float) -> void:
	_age += delta
	if _age >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	var c := SkillFx.colors(style)
	var fade := clampf((life - _age) / 0.5, 0.0, 1.0)
	var r := Rect2(Vector2(-length, -thickness) * 0.5, Vector2(length, thickness))
	draw_rect(r.grow(6), Color(c.c, 0.35 * fade))
	draw_rect(r, Color(c.b, 0.85 * fade))
	# 얼음 결정 무늬
	var n := int(length / 40.0)
	for i in n:
		var x := r.position.x + (i + 0.5) * length / n
		draw_line(Vector2(x - 10, r.position.y + 4), Vector2(x + 6, r.end.y - 4), Color(c.a, 0.8 * fade), 3.0)
	draw_rect(r, Color(c.a, fade), false, 3.0)
