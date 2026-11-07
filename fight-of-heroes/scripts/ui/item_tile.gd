class_name ItemTile
extends Button
## 아이템 칸 하나. 아이콘이 없으면 분류 색과 글자로 그린다. 가격·개수·선택 표시도 그린다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var item: ItemData = null
var count := 0
var show_price := false
var price := -1
var selected := false
var dimmed := false
var owned_mark := false


func _init() -> void:
	flat = true
	focus_mode = Control.FOCUS_NONE
	custom_minimum_size = Vector2(84, 84)


func set_item(it: ItemData, n := 1) -> void:
	item = it
	count = n
	queue_redraw()


func _draw() -> void:
	var r := Rect2(Vector2(3, 3), size - Vector2(6, 6))
	var style := StyleBoxFlat.new()
	style.set_corner_radius_all(10)
	if item == null:
		style.bg_color = Color(0, 0, 0, 0.35)
		style.border_color = Color(1, 1, 1, 0.15)
		style.set_border_width_all(2)
		draw_style_box(style, r)
		return
	style.bg_color = item.color.darkened(0.35 if not dimmed else 0.7)
	style.border_color = [Color(0.7, 0.7, 0.7), Color(0.4, 0.75, 1.0), Color(1.0, 0.75, 0.3)][clampi(item.tier - 1, 0, 2)]
	style.set_border_width_all(4 if selected else 2)
	if selected:
		style.border_color = Color(1, 1, 1)
	draw_style_box(style, r)
	if item.icon != null:
		draw_texture_rect(item.icon, r.grow(-8), false)
	else:
		var fs := int(size.y * 0.38)
		var w := FONT.get_string_size(item.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(FONT, Vector2((size.x - w) * 0.5, size.y * 0.5 + fs * 0.3), item.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 0.45 if dimmed else 0.95))
	if count > 1:
		draw_string_outline(FONT, Vector2(size.x - 24, size.y - 10), str(count), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, 4, Color(0, 0, 0, 0.8))
		draw_string(FONT, Vector2(size.x - 24, size.y - 10), str(count), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
	if show_price:
		var p := str(price if price >= 0 else item.cost)
		var pw := FONT.get_string_size(p, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
		draw_string_outline(FONT, Vector2((size.x - pw) * 0.5, size.y - 9), p, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0, 0, 0, 0.85))
		draw_string(FONT, Vector2((size.x - pw) * 0.5, size.y - 9), p, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 0.85, 0.3))
	if owned_mark:
		draw_circle(Vector2(size.x - 14, 14), 9, Color(0.2, 0.75, 0.3))
		var c := Vector2(size.x - 14, 14)
		draw_polyline(PackedVector2Array([c + Vector2(-5, 0), c + Vector2(-1, 4), c + Vector2(5, -4)]), Color.WHITE, 2.5)
