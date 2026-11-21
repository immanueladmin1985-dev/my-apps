extends Control
## 도전과 업적: 왼쪽은 오늘의 도전 과제(진행 막대, 보상 별)와 영웅 숙련도, 오른쪽은 업적 목록(못 얻은 것은 흐리게, 얻는 방법 안내).

var left: VBoxContainer
var right: VBoxContainer
var star_label: Label


func _ready() -> void:
	var box := UiKit.page(self)
	var head := UiKit.header(box, "도전과 업적", on_back)
	head.add_child(UiKit.spacer())
	star_label = UiKit.label("", 26, UiKit.ACCENT)
	star_label.name = "Stars"
	head.add_child(star_label)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(body)
	var ls := UiKit.scroll()
	ls.size_flags_stretch_ratio = 1.0
	body.add_child(ls)
	left = VBoxContainer.new()
	left.add_theme_constant_override("separation", 8)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ls.add_child(left)
	var rs := UiKit.scroll()
	rs.size_flags_stretch_ratio = 1.15
	body.add_child(rs)
	right = VBoxContainer.new()
	right.add_theme_constant_override("separation", 8)
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rs.add_child(right)
	_fill()


func _fill() -> void:
	for c in left.get_children() + right.get_children():
		c.queue_free()
	star_label.text = "★ 별 %d개" % ProgressMeta.stars()
	_fill_daily()
	_fill_mastery()
	_fill_achievements()


func _fill_daily() -> void:
	var date := ProgressMeta.today()
	var p := date.split("-")
	var when := "%d월 %d일" % [int(p[1]), int(p[2])] if p.size() == 3 else date
	left.add_child(UiKit.label("오늘의 도전 과제 (%s)" % when, 22, UiKit.ACCENT))
	for c in ProgressMeta.daily_for(date):
		var done := ProgressMeta.challenge_done(c.id, date)
		var cur := mini(ProgressMeta.challenge_progress(c.id, date), int(c.target))
		var card := _card(UiKit.GOOD if done else Color(1, 1, 1, 0.12), 0.1 if done else 0.0)
		card.name = "Daily_" + str(c.id)
		left.add_child(card)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 4)
		card.add_child(v)
		var top := HBoxContainer.new()
		v.add_child(top)
		var t := UiKit.wrap_label(c.text, 18, UiKit.TEXT)
		top.add_child(t)
		top.add_child(UiKit.label("★ %d" % int(c.stars), 18, UiKit.ACCENT))
		var bot := HBoxContainer.new()
		bot.add_theme_constant_override("separation", 10)
		v.add_child(bot)
		bot.add_child(UiKit.progress_bar(float(cur) / maxf(1.0, float(c.target)), Vector2(120, 10), UiKit.GOOD if done else UiKit.ACCENT))
		bot.add_child(UiKit.label("완료했습니다" if done else "%d / %d" % [cur, int(c.target)], 16, UiKit.GOOD if done else UiKit.MUTED))
	left.add_child(UiKit.wrap_label("직접 한 경기만 셉니다(관전 제외). 날짜가 바뀌면 새 과제 3개로 바뀌고, 끝내지 못한 진행은 사라집니다.", 15, UiKit.MUTED))


func _fill_mastery() -> void:
	left.add_child(UiKit.label("영웅 숙련도", 22, UiKit.ACCENT))
	var m: Dictionary = ProgressMeta.meta().mastery
	var ids: Array = m.keys().filter(func(id): return DataRegistry.hero(str(id)) != null)
	ids.sort_custom(func(a, b): return int(m[a]) > int(m[b]))
	if ids.is_empty():
		left.add_child(UiKit.wrap_label("아직 숙련도가 없습니다. 이기면 100점, 지면 40점, 처치 1번에 10점, 도움 1번에 5점을 얻습니다.", 16, UiKit.MUTED))
		return
	for id in ids.slice(0, 6):
		var h := DataRegistry.hero(str(id))
		var pts := int(m[id])
		var lv := ProgressMeta.level_for(pts)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		left.add_child(row)
		var face := Control.new()
		face.custom_minimum_size = Vector2(36, 36)
		face.add_child(UiKit.hero_badge(h, 36.0))
		var mb := UiKit.mastery_badge(lv, 18.0)
		mb.position = Vector2(21, 20)
		face.add_child(mb)
		row.add_child(face)
		var nm := UiKit.label(h.display_name, 17)
		nm.custom_minimum_size = Vector2(120, 0)
		row.add_child(nm)
		row.add_child(UiKit.label("%d단계" % lv, 17, ProgressMeta.tier_color(lv)))
		row.add_child(UiKit.progress_bar(ProgressMeta.level_progress(pts), Vector2(80, 8), ProgressMeta.tier_color(lv)))
		var nxt := ProgressMeta.points_to_next(pts)
		row.add_child(UiKit.label("다음까지 %d" % nxt if nxt > 0 else "최고 단계", 15, UiKit.MUTED))
	if ids.size() > 6:
		left.add_child(UiKit.label("나머지 영웅은 영웅 도감에서 볼 수 있습니다.", 15, UiKit.MUTED))


func _fill_achievements() -> void:
	var got := 0
	for a in ProgressMeta.ACHIEVEMENTS:
		if ProgressMeta.has_achievement(a.id):
			got += 1
	right.add_child(UiKit.label("업적 %d / %d" % [got, ProgressMeta.ACHIEVEMENTS.size()], 22, UiKit.ACCENT))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(grid)
	var ach: Dictionary = ProgressMeta.meta().achievements
	for a in ProgressMeta.ACHIEVEMENTS:
		var has: bool = ach.has(a.id)
		var card := _card(UiKit.ACCENT if has else Color(1, 1, 1, 0.08), 0.12 if has else 0.0)
		card.name = "Ach_" + str(a.id)
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.custom_minimum_size = Vector2(0, 74)
		card.modulate = Color.WHITE if has else Color(1, 1, 1, 0.55)
		grid.add_child(card)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 2)
		card.add_child(v)
		var top := HBoxContainer.new()
		top.add_theme_constant_override("separation", 6)
		v.add_child(top)
		top.add_child(UiKit.label("★" if has else "☆", 18, UiKit.ACCENT if has else UiKit.MUTED))
		top.add_child(UiKit.label(a.name, 18, UiKit.ACCENT if has else UiKit.TEXT))
		if has:
			top.add_child(UiKit.spacer())
			top.add_child(UiKit.label(str(ach[a.id]), 13, UiKit.MUTED))
		v.add_child(UiKit.wrap_label(a.hint, 14, UiKit.MUTED))


func _card(border: Color, fill := 0.0) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(border, fill) if fill > 0.0 else UiKit.PANEL
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.border_width_left = 5
	sb.set_corner_radius_all(10)
	sb.content_margin_left = 14
	sb.content_margin_right = 12
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	p.add_theme_stylebox_override("panel", sb)
	return p


func on_back() -> void:
	GameManager.go_main()
