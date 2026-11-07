class_name SkillButton
extends Control
## 둥근 스킬 버튼. 짧게 누르면 자동 조준, 끌면 직접 조준, 취소 영역에서 떼면 취소한다.
## slot 이 -1 이면 기본 공격 버튼(누르고 있는 동안 공격)으로 동작한다.

signal pressed_down(slot: int)
signal aim_changed(slot: int, vec: Vector2)
signal released(slot: int, vec: Vector2, dragged: bool, cancelled: bool)

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const DEADZONE := 24.0
const DRAG_MAX := 110.0

var slot := 0
var key_label := "Q"
var glyph := ""
var button_radius := 46.0
var base_color := Color(0.3, 0.35, 0.45)
var hero = null
var cancel_zone: Control = null

var touch_index := -1
var press_pos := Vector2.ZERO
var drag_vec := Vector2.ZERO
var dragged := false


func configure(s: int, label: String, glyph_text: String, r: float, color: Color) -> void:
	slot = s
	key_label = label
	glyph = glyph_text
	button_radius = r
	base_color = color
	custom_minimum_size = Vector2(r, r) * 2.0
	size = custom_minimum_size
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func center_global() -> Vector2:
	return global_position + size * 0.5


func is_held() -> bool:
	return touch_index >= 0


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and touch_index < 0 and event.position.distance_to(center_global()) <= button_radius * 1.15:
			touch_index = event.index
			press_pos = event.position
			drag_vec = Vector2.ZERO
			dragged = false
			pressed_down.emit(slot)
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == touch_index:
			var cancelled := dragged and cancel_zone != null and cancel_zone.visible and cancel_zone.get_global_rect().has_point(event.position)
			touch_index = -1
			released.emit(slot, drag_vec, dragged, cancelled)
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == touch_index:
		var off: Vector2 = event.position - press_pos
		if off.length() > DEADZONE:
			dragged = true
		if dragged:
			drag_vec = (off / DRAG_MAX).limit_length(1.0)
			aim_changed.emit(slot, drag_vec)
		get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var c := size * 0.5
	var r := button_radius
	var caster = hero.skill_caster if hero != null else null
	var s: SkillData = caster.get_skill(slot) if caster != null and slot >= 0 else null
	var col := base_color
	if s != null:
		col = s.color.darkened(0.35)
	draw_circle(c, r, Color(0, 0, 0, 0.5))
	draw_circle(c, r - 3.0, Color(col, 0.92))
	var text := glyph
	var fs := int(r * 0.62)
	var tw := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_string(FONT, c + Vector2(-tw * 0.5, fs * 0.35), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 0.95))
	if s != null and hero != null:
		if not hero.mana.has(caster.mana_cost(slot)):
			draw_circle(c, r - 3.0, Color(0.1, 0.2, 0.6, 0.55))
		var ratio: float = caster.cooldown_ratio(slot)
		if ratio > 0.0:
			var pts := PackedVector2Array([c])
			var steps := 32
			for i in steps + 1:
				var a := -PI / 2.0 + TAU * ratio * float(i) / steps
				pts.append(c + Vector2.from_angle(a) * (r - 3.0))
			draw_colored_polygon(pts, Color(0, 0, 0, 0.6))
			var secs := "%d" % ceili(caster.cooldowns[slot]) if caster.cooldowns[slot] >= 1.0 else "%.1f" % caster.cooldowns[slot]
			var sw := FONT.get_string_size(secs, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			draw_string_outline(FONT, c + Vector2(-sw * 0.5, fs * 0.35), secs, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(0, 0, 0, 0.8))
			draw_string(FONT, c + Vector2(-sw * 0.5, fs * 0.35), secs, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1))
		if hero.is_dead or hero.status.is_stunned():
			draw_circle(c, r - 3.0, Color(0.3, 0.3, 0.3, 0.5))
	if key_label != "":
		var ks := int(maxf(11.0, r * 0.28))
		var kw := FONT.get_string_size(key_label, HORIZONTAL_ALIGNMENT_LEFT, -1, ks).x
		draw_string(FONT, c + Vector2(-kw * 0.5, r - 6.0), key_label, HORIZONTAL_ALIGNMENT_LEFT, -1, ks, Color(1, 1, 1, 0.7))
	draw_arc(c, r - 1.5, 0, TAU, 48, Color(1, 1, 1, 0.9 if is_held() else 0.35), 3.0 if is_held() else 2.0)
	if dragged and is_held():
		draw_circle(c + drag_vec * r * 0.6, r * 0.22, Color(1, 1, 1, 0.8))
