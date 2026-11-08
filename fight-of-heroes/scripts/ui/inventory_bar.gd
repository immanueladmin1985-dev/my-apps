class_name InventoryBar
extends Control
## 화면 아래의 아이템 6칸. 사용 아이템(물약 등)을 누르면 바로 쓴다. 어느 손가락으로 눌러도 된다.

signal slot_pressed(index: int)

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const SLOT := 46.0
const GAP := 5.0

var hero = null


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func slot_rect(i: int) -> Rect2:
	return Rect2(Vector2(i * (SLOT + GAP), 0), Vector2(SLOT, SLOT))


func _input(event: InputEvent) -> void:
	if hero == null or not is_visible_in_tree():
		return
	if event is InputEventScreenTouch and event.pressed:
		var local: Vector2 = event.position - global_position
		for i in InventoryComponent.SIZE:
			if slot_rect(i).grow(3).has_point(local):
				slot_pressed.emit(i)
				get_viewport().set_input_as_handled()
				return


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	if hero == null:
		return
	for i in InventoryComponent.SIZE:
		var r := slot_rect(i)
		var it: ItemData = hero.inventory.item_at(i)
		draw_rect(r, Color(0, 0, 0, 0.5))
		if it != null:
			draw_rect(r.grow(-3), it.color.darkened(0.3))
			var icon := Art.item_icon(it)
			if icon != null:
				draw_texture_rect(icon, r.grow(-4), false)
			else:
				var fs := 20
				var w := FONT.get_string_size(it.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
				draw_string(FONT, r.position + Vector2((SLOT - w) * 0.5, SLOT * 0.5 + fs * 0.36), it.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color.WHITE)
			var n: int = hero.inventory.count_at(i)
			if n > 1:
				draw_string_outline(FONT, r.position + Vector2(SLOT - 15, SLOT - 5), str(n), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, 3, Color(0, 0, 0, 0.8))
				draw_string(FONT, r.position + Vector2(SLOT - 15, SLOT - 5), str(n), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.WHITE)
			if it.consumable:
				draw_rect(r, Color(0.4, 1, 0.5, 0.8), false, 2.0)
		draw_rect(r, Color(1, 1, 1, 0.25), false, 1.5)
	if hero.is_recalling():
		var t := "귀환 %.1f초" % hero.recall_left
		draw_string_outline(FONT, Vector2(0, -8), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, 4, Color(0, 0, 0, 0.8))
		draw_string(FONT, Vector2(0, -8), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(0.7, 0.85, 1))
