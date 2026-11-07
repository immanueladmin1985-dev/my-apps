class_name TouchJoystick
extends Control
## 가상 조이스틱. 영역 안 아무 곳이나 누르면 그 자리에 조이스틱이 생긴다.
## 손가락 번호(index)로 구분하므로 스킬 버튼과 동시에 누를 수 있다.

signal changed(vec: Vector2)

const DEADZONE := 0.12

var radius := 85.0
var knob_radius := 36.0
var touch_index := -1
var base_center := Vector2.ZERO
var knob_center := Vector2.ZERO
var output := Vector2.ZERO


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func rest_center() -> Vector2:
	return global_position + Vector2(radius + 40.0, size.y - radius - 30.0)


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and touch_index < 0 and get_global_rect().has_point(event.position):
			touch_index = event.index
			base_center = _clamp_base(event.position)
			knob_center = event.position
			_update()
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == touch_index:
			release()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == touch_index:
		knob_center = event.position
		_update()
		get_viewport().set_input_as_handled()


func release() -> void:
	touch_index = -1
	output = Vector2.ZERO
	changed.emit(output)
	queue_redraw()


func _clamp_base(p: Vector2) -> Vector2:
	var r := get_global_rect()
	return Vector2(clampf(p.x, r.position.x + radius, r.end.x - radius), clampf(p.y, r.position.y + radius, r.end.y - radius))


func _update() -> void:
	var off := knob_center - base_center
	if off.length() > radius * 1.6:
		base_center = knob_center - off.normalized() * radius * 1.6
		off = knob_center - base_center
	var v := (off / radius).limit_length(1.0)
	output = v if v.length() > DEADZONE else Vector2.ZERO
	changed.emit(output)
	queue_redraw()


func _draw() -> void:
	var active := touch_index >= 0
	var bc := (base_center if active else rest_center()) - global_position
	draw_circle(bc, radius, Color(0, 0, 0, 0.28 if active else 0.18))
	draw_arc(bc, radius, 0, TAU, 48, Color(1, 1, 1, 0.45 if active else 0.25), 3.0)
	draw_circle(bc + output * radius, knob_radius, Color(1, 1, 1, 0.55 if active else 0.3))
