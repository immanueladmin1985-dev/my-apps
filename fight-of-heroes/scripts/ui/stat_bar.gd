class_name StatBar
extends Control
## 체력·마나 막대. 값과 최대값을 글자로 함께 보여 준다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var value := 0.0
var max_value := 1.0
var extra := 0.0  # 보호막
var fill := Color(0.3, 0.85, 0.4)


func set_values(v: float, m: float, e := 0.0) -> void:
	if v != value or m != max_value or e != extra:
		value = v
		max_value = maxf(m, 1.0)
		extra = e
		queue_redraw()


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	draw_rect(r, Color(0, 0, 0, 0.6))
	var ratio := clampf(value / max_value, 0.0, 1.0)
	draw_rect(Rect2(1, 1, (size.x - 2) * ratio, size.y - 2), fill)
	if extra > 0.0:
		var ew := minf((size.x - 2) * extra / max_value, size.x - 2)
		var ex := minf(1 + (size.x - 2) * ratio, size.x - 1 - ew)
		draw_rect(Rect2(ex, 1, ew, size.y - 2), Color(0.95, 0.95, 0.95, 0.8))
	var text := "%d / %d" % [roundi(value), roundi(max_value)]
	var fs := int(size.y * 0.72)
	var tw := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var p := Vector2((size.x - tw) * 0.5, size.y * 0.5 + fs * 0.36)
	draw_string_outline(FONT, p, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0, 0, 0, 0.7))
	draw_string(FONT, p, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1))
