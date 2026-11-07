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
	style.border_color = Color(1, 1, 1, 0.35)
	style.set_border_width_all(2)
	draw_style_box(style, r)
	var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	draw_string(FONT, Vector2((size.x - w) * 0.5, size.y * 0.5 + font_size * 0.36), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, fg)
