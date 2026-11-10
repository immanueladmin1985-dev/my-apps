class_name ShopPanel
extends Control
## 상점 창. 분류별 아이템 목록, 선택한 아이템의 능력치·재료·가격, 구매·판매, 내 아이템 6칸, 내 능력치.
## 기지(우물) 밖에서도 목록은 볼 수 있고, 사고팔기는 기지 안이나 사망 중에만 된다.

signal closed

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const CATEGORIES := [
	["recommend", "추천"], ["weapon", "무기"], ["armor", "방어구"], ["boots", "신발"],
	["accessory", "장신구"], ["potion", "물약·특수"],
]

var hero = null
var shop: ShopManager = null
var category := "recommend"
## 고른 아이템의 재료 칸 (누르면 그 재료를 고른다)
var parts_row: HBoxContainer
var selected: ItemData = null
var selected_slot := -1

var gold_label: Label
var where_label: Label
var grid: GridContainer
var detail_name: Label
var detail_info: Label
var detail_stats: Label
var detail_parts: Label
var price_label: Label
var buy_button: Button
var sell_button: Button
var inv_tiles: Array = []
var stats_label: Label
var cat_buttons: Array = []
var tiles: Array = []
var panel: PanelContainer
var shade: ColorRect


func build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	shade = ColorRect.new()
	shade.color = Color(0, 0, 0, 0.55)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(shade)
	panel = PanelContainer.new()
	var ps := StyleBoxFlat.new()
	ps.bg_color = Color(0.1, 0.12, 0.15, 0.97)
	ps.set_corner_radius_all(16)
	ps.set_content_margin_all(16)
	ps.border_color = Color(1, 0.85, 0.4, 0.5)
	ps.set_border_width_all(2)
	panel.add_theme_stylebox_override("panel", ps)
	panel.custom_minimum_size = Vector2(1180, 640)
	add_child(panel)
	get_viewport().size_changed.connect(_layout)
	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 10)
	panel.add_child(root)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	root.add_child(header)
	header.add_child(_label("상점", 28, Color(1, 0.85, 0.4)))
	gold_label = _label("", 24, Color(1, 0.85, 0.3))
	header.add_child(gold_label)
	where_label = _label("", 18, Color(0.85, 0.85, 0.9))
	where_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(where_label)
	var close := _button("닫기", Vector2(110, 50))
	close.pressed.connect(func(): closed.emit())
	header.add_child(close)

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(body)
	var cats := VBoxContainer.new()
	cats.add_theme_constant_override("separation", 6)
	body.add_child(cats)
	for c in CATEGORIES:
		var b := _button(c[1], Vector2(130, 56))
		b.toggle_mode = true
		b.pressed.connect(_set_category.bind(c[0]))
		b.set_meta("cat", c[0])
		cats.add_child(b)
		cat_buttons.append(b)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(560, 400)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(scroll)
	grid = GridContainer.new()
	grid.columns = 6
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	scroll.add_child(grid)

	var detail := VBoxContainer.new()
	detail.custom_minimum_size = Vector2(330, 0)
	detail.add_theme_constant_override("separation", 6)
	body.add_child(detail)
	detail_name = _label("아이템을 고르세요", 24, Color.WHITE)
	detail.add_child(detail_name)
	detail_info = _label("", 16, Color(0.75, 0.8, 0.85))
	detail.add_child(detail_info)
	detail_stats = _label("", 19, Color(0.6, 1, 0.65))
	detail.add_child(detail_stats)
	detail_parts = _label("", 16, Color(0.85, 0.85, 0.9))
	detail_parts.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail_parts.custom_minimum_size = Vector2(330, 0)
	detail.add_child(detail_parts)
	parts_row = HBoxContainer.new()
	parts_row.name = "PartsRow"
	parts_row.add_theme_constant_override("separation", 6)
	detail.add_child(parts_row)
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail.add_child(spacer)
	price_label = _label("", 20, Color(1, 0.85, 0.3))
	detail.add_child(price_label)
	var btns := HBoxContainer.new()
	btns.add_theme_constant_override("separation", 8)
	detail.add_child(btns)
	buy_button = _button("구매", Vector2(160, 60))
	buy_button.pressed.connect(_buy)
	btns.add_child(buy_button)
	sell_button = _button("판매", Vector2(160, 60))
	sell_button.pressed.connect(_sell)
	btns.add_child(sell_button)

	var footer := HBoxContainer.new()
	footer.add_theme_constant_override("separation", 6)
	root.add_child(footer)
	footer.add_child(_label("내 아이템", 18, Color(0.85, 0.85, 0.9)))
	for i in InventoryComponent.SIZE:
		var t := ItemTile.new()
		t.custom_minimum_size = Vector2(70, 70)
		t.pressed.connect(_select_slot.bind(i))
		footer.add_child(t)
		inv_tiles.append(t)
	stats_label = _label("", 15, Color(0.8, 0.85, 0.9))
	stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(stats_label)


func open_for(h, s: ShopManager) -> void:
	hero = h
	shop = s
	if not hero.inventory.changed.is_connected(refresh):
		hero.inventory.changed.connect(refresh)
		hero.gold_changed.connect(func(_g): refresh())
	visible = true
	_set_category(category)
	_layout.call_deferred()


## 화면(뷰포트) 크기에 맞춰 가운데에 놓는다. 화면이 작으면 줄인다.
func _layout() -> void:
	var vp := get_viewport().get_visible_rect().size
	position = -get_parent().global_position if get_parent() is Control else Vector2.ZERO
	size = vp
	shade.position = Vector2.ZERO
	shade.size = vp
	var want := panel.get_combined_minimum_size()
	var k := minf(1.0, minf((vp.x - 24.0) / want.x, (vp.y - 24.0) / want.y))
	panel.scale = Vector2(k, k)
	panel.size = want
	panel.position = (vp - want * k) * 0.5


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _button(text: String, min_size: Vector2) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", 20)
	return b


func _items_for(cat: String) -> Array:
	var all := ItemManager.all_items()
	match cat:
		"recommend":
			# 추천 완성품마다 재료를 먼저(재료의 재료부터) 늘어놓아, 재료부터 사 모을 수 있게 한다.
			var out: Array = []
			for fid in hero.data.ai_build:
				_add_with_parts(ItemManager.get_item(fid), out)
			for pid in ["health_potion", "mana_potion", "recall_scroll"]:
				var p := ItemManager.get_item(pid)
				if p != null:
					out.append(p)
			return out
		"accessory":
			return all.filter(func(it): return it.category == "ring" or it.category == "necklace")
		"potion":
			return all.filter(func(it): return it.category == "potion" or it.category == "special")
	return all.filter(func(it): return it.category == cat)


func _add_with_parts(it: ItemData, out: Array) -> void:
	if it == null or out.has(it):
		return
	for cid in it.components:
		_add_with_parts(ItemManager.get_item(cid), out)
	out.append(it)


func _set_category(cat: String) -> void:
	category = cat
	for b in cat_buttons:
		b.button_pressed = b.get_meta("cat") == cat
	for c in grid.get_children():
		c.queue_free()
	tiles.clear()
	for it in _items_for(cat):
		var t := ItemTile.new()
		t.show_price = true
		t.set_item(it)
		t.pressed.connect(_select_item.bind(it))
		grid.add_child(t)
		tiles.append(t)
	refresh()


func _select_item(it: ItemData) -> void:
	selected = it
	selected_slot = -1
	refresh()


func _select_slot(i: int) -> void:
	var it: ItemData = hero.inventory.item_at(i)
	if it == null:
		return
	selected = it
	selected_slot = i
	refresh()


func refresh() -> void:
	if hero == null or not visible:
		return
	gold_label.text = "%d G" % hero.gold
	var in_shop := shop.can_shop(hero)
	where_label.text = "기지에서 사고팔 수 있습니다" if in_shop else "기지(우물)에서만 사고팔 수 있습니다. 목록은 볼 수 있습니다."
	for t in tiles:
		var plan := shop.check_buy(hero, t.item)
		t.price = plan.price
		t.dimmed = plan.price > hero.gold
		t.owned_mark = hero.inventory.count_of(t.item.id) > 0
		t.selected = t.item == selected and selected_slot < 0
		t.queue_redraw()
	for i in inv_tiles.size():
		var t: ItemTile = inv_tiles[i]
		t.set_item(hero.inventory.item_at(i), hero.inventory.count_at(i))
		t.selected = i == selected_slot
		t.queue_redraw()
	_refresh_detail(in_shop)
	_refresh_stats()


func _refresh_detail(in_shop: bool) -> void:
	if selected == null:
		detail_name.text = "아이템을 고르세요"
		detail_info.text = ""
		detail_stats.text = ""
		detail_parts.text = ""
		for c in parts_row.get_children():
			c.queue_free()
		price_label.text = ""
		buy_button.disabled = true
		sell_button.disabled = true
		return
	var it := selected
	detail_name.text = it.display_name
	detail_info.text = "%s · %s" % [it.category_name(), ["재료", "중간 단계", "완성품"][it.tier - 1]]
	detail_stats.text = "\n".join(it.stat_lines())
	var parts := PackedStringArray()
	if it.description != "":
		parts.append(it.description)
	if not it.components.is_empty():
		var names := PackedStringArray()
		for cid in it.components:
			var c := ItemManager.get_item(cid)
			if c != null:
				names.append(c.display_name + (" (보유)" if hero.inventory.count_of(cid) > 0 else ""))
		parts.append("재료: " + ", ".join(names) + " + 조합 %d G" % ItemManager.combine_fee(it))
	for c in parts_row.get_children():
		c.queue_free()
	if not it.components.is_empty():
		parts.append("재료를 눌러 먼저 살 수 있습니다.")
		for cid in it.components:
			var comp := ItemManager.get_item(cid)
			if comp == null:
				continue
			var t := ItemTile.new()
			t.custom_minimum_size = Vector2(62, 62)
			t.show_price = true
			t.set_item(comp)
			var cplan := shop.check_buy(hero, comp)
			t.price = cplan.price
			t.dimmed = cplan.price > hero.gold
			t.owned_mark = hero.inventory.count_of(cid) > 0
			t.pressed.connect(_select_item.bind(comp))
			parts_row.add_child(t)
	var ups := ItemManager.builds_into(it.id)
	if not ups.is_empty():
		parts.append("만들 수 있는 아이템: " + ", ".join(ups.map(func(u): return u.display_name)))
	if it.max_owned > 0:
		parts.append("최대 %d개 (신발은 하나만)" % it.max_owned if it.category == "boots" else "최대 %d개" % it.max_owned)
	detail_parts.text = "\n".join(parts)
	var plan := shop.check_buy(hero, it)
	var reason: String = ShopManager.RESULT_TEXT.get(plan.result, "")
	price_label.text = "가격 %d G" % plan.price + ("" if plan.price == it.cost else " (원래 %d G)" % it.cost)
	if reason != "":
		price_label.text += "\n" + reason
	buy_button.disabled = plan.result != ShopManager.Result.OK
	sell_button.disabled = selected_slot < 0 or not in_shop
	sell_button.text = "판매 %d G" % ItemManager.sell_price(it) if selected_slot >= 0 else "판매"


func _refresh_stats() -> void:
	var st: StatsComponent = hero.stats
	stats_label.text = "공격력 %d · 주문력 %d · 방어 %d · 마저 %d · 공속 %.2f · 이속 %d · 치명 %d%% · 쿨감 %d%% · 흡혈 %d%%" % [
		roundi(st.get_stat("attack")), roundi(st.get_stat("ability_power")), roundi(st.get_stat("armor")),
		roundi(st.get_stat("magic_resist")), st.get_stat("attack_speed"), roundi(st.get_stat("move_speed")),
		roundi(st.get_stat("crit_chance") * 100), roundi(st.get_stat("cooldown_reduction") * 100), roundi(st.get_stat("life_steal") * 100)]


func _buy() -> void:
	if selected == null:
		return
	var r := shop.buy(hero, selected.id)
	if r != ShopManager.Result.OK:
		EventBus.notice.emit(ShopManager.RESULT_TEXT.get(r, ""))
	refresh()


func _sell() -> void:
	if selected_slot < 0:
		return
	var r := shop.sell(hero, selected_slot)
	if r != ShopManager.Result.OK:
		EventBus.notice.emit(ShopManager.RESULT_TEXT.get(r, ""))
	selected = null
	selected_slot = -1
	refresh()
