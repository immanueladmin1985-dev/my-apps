class_name QuickItemButton
extends Control
## 소모품 빠른 사용 버튼 (스킬 버튼 옆, 엄지가 닿는 곳). 가진 소모품 중 하나를 크게 보여 주고 누르면 바로 쓴다.
## 체력이 줄었으면 체력 물약을 먼저 고른다. 개수를 숫자로 보여 준다. 다른 손가락으로 조이스틱을 잡고 있어도 눌린다.

signal used(slot: int)

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var hero = null
var radius := 34.0
var _down := -1


func setup(r: float) -> void:
	radius = r
	custom_minimum_size = Vector2(r, r) * 2.0
	size = custom_minimum_size
	mouse_filter = Control.MOUSE_FILTER_IGNORE


## 지금 쓸 소모품 칸 (-1 이면 없음)
func pick_slot() -> int:
	if hero == null:
		return -1
	var best := -1
	var best_score := -1.0
	for i in InventoryComponent.SIZE:
		var it: ItemData = hero.inventory.item_at(i)
		if it == null or not it.consumable or it.use_kind == "none":
			continue
		var sc := 1.0
		if it.id == "health_potion":
			sc = 3.0 if hero.health.ratio() < 0.9 else 1.5
		elif it.id == "mana_potion":
			sc = 2.5 if hero.mana.mp < hero.mana.max_mp() * 0.5 else 1.2
		elif it.use_kind == "recall":
			sc = 0.5
		if sc > best_score:
			best_score = sc
			best = i
	return best


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree() or hero == null:
		return
	if event is InputEventScreenTouch:
		var c := global_position + size * 0.5
		if event.pressed and _down < 0 and event.position.distance_to(c) <= radius + 6.0:
			_down = event.index
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _down:
			_down = -1
			get_viewport().set_input_as_handled()
			if event.position.distance_to(c) <= radius + 30.0:
				var s := pick_slot()
				if s >= 0:
					used.emit(s)


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var c := size * 0.5
	var s := pick_slot()
	var it: ItemData = hero.inventory.item_at(s) if s >= 0 else null
	draw_circle(c, radius, Color(0, 0, 0, 0.55))
	draw_circle(c, radius - 3.0, Color(0.25, 0.15, 0.2, 0.9) if it == null else Color(it.color.darkened(0.45), 0.92))
	if it == null:
		var t := "물약"
		var w := FONT.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
		draw_string(FONT, c + Vector2(-w * 0.5, 5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1, 0.4))
	else:
		var icon := Art.item_icon(it)
		if icon != null:
			draw_texture_rect(icon, Rect2(c - Vector2(radius, radius) * 0.72, Vector2(radius, radius) * 1.44), false)
		else:
			var g := it.glyph if it.glyph != "" else it.display_name.left(1)
			var gw := FONT.get_string_size(g, HORIZONTAL_ALIGNMENT_LEFT, -1, 26).x
			draw_string(FONT, c + Vector2(-gw * 0.5, 9), g, HORIZONTAL_ALIGNMENT_LEFT, -1, 26, Color.WHITE)
		var n: int = hero.inventory.count_at(s)
		if n > 1:
			var p := c + Vector2(radius * 0.68, radius * 0.6)
			draw_circle(p, 11.0, Color(0, 0, 0, 0.85))
			var nt := str(n)
			var nw := FONT.get_string_size(nt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
			draw_string(FONT, p + Vector2(-nw * 0.5, 5), nt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 0.9, 0.5))
	draw_arc(c, radius - 1.5, 0, TAU, 40, Color(1, 1, 1, 0.9 if _down >= 0 else 0.35), 3.0 if _down >= 0 else 2.0)
