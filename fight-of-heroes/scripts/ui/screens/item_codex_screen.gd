extends Control
## 아이템 도감: 분류별 아이템 목록, 능력치·가격·재료·상위 아이템.

const CATEGORIES := [
	["all", "전체"], ["weapon", "무기"], ["armor", "방어구"], ["boots", "신발"],
	["accessory", "장신구"], ["potion", "물약·특수"],
]

var category := "all"
var cat_buttons: Array = []
var grid: GridContainer
var detail: VBoxContainer
var selected: ItemData = null


func _ready() -> void:
	var box := UiKit.page(self)
	UiKit.header(box, "아이템 도감", on_back)
	var cats := HBoxContainer.new()
	cats.add_theme_constant_override("separation", 8)
	box.add_child(cats)
	for c in CATEGORIES:
		var b := UiKit.toggle(c[1], Vector2(130, 50))
		b.set_meta("cat", c[0])
		b.pressed.connect(_set_category.bind(c[0]))
		cats.add_child(b)
		cat_buttons.append(b)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 14)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(body)
	var gs := UiKit.scroll(Vector2(680, 0))
	gs.size_flags_horizontal = Control.SIZE_FILL
	body.add_child(gs)
	grid = GridContainer.new()
	grid.columns = 7
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	gs.add_child(grid)
	var p := UiKit.panel()
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(p)
	detail = VBoxContainer.new()
	detail.add_theme_constant_override("separation", 8)
	p.add_child(detail)
	_set_category("all")


func _set_category(cat: String) -> void:
	category = cat
	for b in cat_buttons:
		b.button_pressed = b.get_meta("cat") == cat
	for c in grid.get_children():
		c.queue_free()
	var first: ItemData = null
	for it: ItemData in ItemManager.all_items():
		var ok := cat == "all" or it.category == cat
		if cat == "accessory":
			ok = it.category == "ring" or it.category == "necklace"
		elif cat == "potion":
			ok = it.category == "potion" or it.category == "special"
		if not ok:
			continue
		if first == null:
			first = it
		var t := ItemTile.new()
		t.show_price = true
		t.set_item(it)
		t.pressed.connect(show_item.bind(it))
		grid.add_child(t)
	if first != null:
		show_item(first)


func show_item(it: ItemData) -> void:
	selected = it
	for t in grid.get_children():
		if t is ItemTile:
			t.selected = t.item == it
			t.queue_redraw()
	for c in detail.get_children():
		c.queue_free()
	detail.add_child(UiKit.label(it.display_name, 28, UiKit.ACCENT))
	detail.add_child(UiKit.label("%s · %s · %d 골드" % [it.category_name(), ["재료", "중간 단계", "완성품"][it.tier - 1], it.cost], 17, UiKit.MUTED))
	for line in it.stat_lines():
		detail.add_child(UiKit.label(line, 19, UiKit.GOOD))
	if it.description != "":
		detail.add_child(UiKit.wrap_label(it.description, 17))
	if not it.components.is_empty():
		var names := PackedStringArray()
		for cid in it.components:
			var c := ItemManager.get_item(cid)
			if c != null:
				names.append("%s(%d)" % [c.display_name, c.cost])
		detail.add_child(UiKit.wrap_label("재료: %s + 조합 %d 골드" % [" + ".join(names), ItemManager.combine_fee(it)], 17))
	var ups := ItemManager.builds_into(it.id)
	if not ups.is_empty():
		detail.add_child(UiKit.wrap_label("만들 수 있는 아이템: " + ", ".join(ups.map(func(u): return u.display_name)), 17))
	if it.max_owned > 0:
		detail.add_child(UiKit.label("신발은 하나만 가질 수 있습니다." if it.category == "boots" else "최대 %d개" % it.max_owned, 16, UiKit.MUTED))
	detail.add_child(UiKit.label("판매 가격 %d 골드" % ItemManager.sell_price(it), 16, UiKit.MUTED))


func on_back() -> void:
	GameManager.go_main()
