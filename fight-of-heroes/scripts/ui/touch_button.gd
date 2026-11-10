class_name TouchButton
extends Control
## 손가락 번호와 상관없이 눌리는 버튼. 조이스틱을 누른 채로도 쓸 수 있다.
## (Godot 의 Button 은 첫 번째 손가락만 마우스로 바꿔 받기 때문에 이동 중에는 눌리지 않는다.)

signal pressed

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var text := ""
var font_size := 20
var bg := Color(0.12, 0.14, 0.18, 0.85)
var fg := Color(1, 1, 1)
var _down := -1
## 둘째 줄 글자 (상점 버튼의 골드 등)
var sub_text := ""
var sub_color := Color(1, 0.85, 0.3)
## 테두리 강조 (상점에서 살 수 있을 때 등)
var highlight := false


func setup(label: String, size_px := 20, color := Color(0.12, 0.14, 0.18, 0.85)) -> void:
	text = label
	font_size = size_px
	bg = color
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and _down < 0 and get_global_rect().has_point(event.position):
			_down = event.index
			queue_redraw()
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _down:
			_down = -1
			queue_redraw()
			get_viewport().set_input_as_handled()
			if get_global_rect().grow(20).has_point(event.position):
				pressed.emit()


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	var style := StyleBoxFlat.new()
	style.bg_color = bg.lightened(0.25) if _down >= 0 else bg
	style.set_corner_radius_all(10)
	style.border_color = Color(1, 0.85, 0.3, 0.95) if highlight else Color(1, 1, 1, 0.35)
	style.set_border_width_all(4 if highlight else 2)
	draw_style_box(style, r)
	var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	if sub_text == "":
		draw_string(FONT, Vector2((size.x - w) * 0.5, size.y * 0.5 + font_size * 0.36), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, fg)
		return
	draw_string(FONT, Vector2((size.x - w) * 0.5, size.y * 0.3 + font_size * 0.36), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, fg)
	var ss := font_size + 4
	var sw := FONT.get_string_size(sub_text, HORIZONTAL_ALIGNMENT_LEFT, -1, ss).x
	var sp := Vector2((size.x - sw) * 0.5, size.y * 0.72 + ss * 0.36)
	draw_string_outline(FONT, sp, sub_text, HORIZONTAL_ALIGNMENT_LEFT, -1, ss, 4, Color(0, 0, 0, 0.8))
	draw_string(FONT, sp, sub_text, HORIZONTAL_ALIGNMENT_LEFT, -1, ss, sub_color)
