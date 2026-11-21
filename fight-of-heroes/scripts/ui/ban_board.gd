class_name BanBoard
extends VBoxContainer
## 밴 단계 화면: 차례 표시("블루 팀 밴 1/2"), 남은 시간, 팀별 금지한 영웅, 영웅 고르기 칸, 밴하기 버튼.
## 금지한 영웅은 흐리게 하고 빨간 X 를 긋는다. 혼자 하기(새 게임)와 와이파이 대전 로비가 함께 쓴다.

signal ban_confirmed(hero_id: String)

var turn_label: Label
var time_label: Label
var who_label: Label
var ban_button: Button
var picks_row: HBoxContainer
var hero_buttons: Dictionary = {}  # id -> Button
var selected := ""
var _bans: Array = []
var _can_act := false


func _init() -> void:
	name = "BanBoard"
	add_theme_constant_override("separation", 10)
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 16)
	add_child(top)
	turn_label = UiKit.label("", 30, UiKit.ACCENT)
	turn_label.name = "TurnLabel"
	top.add_child(turn_label)
	time_label = UiKit.label("", 24, UiKit.TEXT)
	time_label.name = "TimeLabel"
	top.add_child(time_label)
	top.add_child(UiKit.spacer())
	picks_row = HBoxContainer.new()
	picks_row.name = "BanSlots"
	picks_row.add_theme_constant_override("separation", 8)
	top.add_child(picks_row)
	who_label = UiKit.wrap_label("", 18, UiKit.MUTED)
	who_label.name = "WhoLabel"
	add_child(who_label)

	var p := UiKit.panel()
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(p)
	var sc := UiKit.scroll()
	p.add_child(sc)
	var grid := GridContainer.new()
	grid.name = "BanGrid"
	grid.columns = 8
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	sc.add_child(grid)
	var heroes: Array = DataRegistry.get_all("heroes")
	heroes.sort_custom(func(a, b): return a.display_name < b.display_name)
	for h: HeroData in heroes:
		var b := UiKit.toggle("", Vector2(136, 96), 15)
		b.name = "Ban_" + h.id
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var row := HBoxContainer.new()
		row.name = "Row"
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.set_anchors_preset(Control.PRESET_FULL_RECT)
		row.add_theme_constant_override("separation", 6)
		row.add_child(UiKit.hero_badge(h, 60))
		var l := UiKit.wrap_label(h.display_name, 17)
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(l)
		b.add_child(row)
		var x := Control.new()
		x.name = "Cross"
		x.mouse_filter = Control.MOUSE_FILTER_IGNORE
		x.set_anchors_preset(Control.PRESET_FULL_RECT)
		x.visible = false
		x.draw.connect(func():
			var s := x.size
			var m := 10.0
			x.draw_line(Vector2(m, m), s - Vector2(m, m), Color(1, 0.2, 0.2, 0.95), 5.0, true)
			x.draw_line(Vector2(s.x - m, m), Vector2(m, s.y - m), Color(1, 0.2, 0.2, 0.95), 5.0, true))
		b.add_child(x)
		b.pressed.connect(_on_hero.bind(h.id))
		grid.add_child(b)
		hero_buttons[h.id] = b

	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 12)
	add_child(bottom)
	bottom.add_child(UiKit.wrap_label("영웅을 누른 뒤 밴하기를 누르면 그 영웅은 이번 경기에서 아무도 고를 수 없습니다.", 16, UiKit.MUTED))
	ban_button = UiKit.button("밴하기", Vector2(220, 62), 24)
	ban_button.name = "BanButton"
	ban_button.pressed.connect(_confirm)
	bottom.add_child(ban_button)


## 화면을 지금 상태로 맞춘다. bans: 금지한 순서대로의 영웅 id, turn: 몇 번째 차례(끝났으면 ORDER 크기 이상),
## can_act: 이 화면의 사람이 지금 금지할 차례인지, who: 누가 고르는지 설명.
func show_state(bans: Array, turn: int, can_act: bool, who: String) -> void:
	_bans = bans.duplicate()
	_can_act = can_act
	if _bans.has(selected):
		selected = ""
	var team: int = BanPhase.ORDER[turn] if turn >= 0 and turn < BanPhase.ORDER.size() else -1
	turn_label.text = BanPhase.turn_text_of(turn)
	turn_label.add_theme_color_override("font_color", Enums.team_color(team) if team >= 0 else UiKit.ACCENT)
	who_label.text = who
	for id in hero_buttons:
		var b: Button = hero_buttons[id]
		var banned := _bans.has(id)
		b.disabled = banned or not can_act
		b.button_pressed = id == selected and not banned
		(b.get_node("Row") as Control).modulate = Color(0.4, 0.4, 0.43, 0.8) if banned else Color.WHITE
		var x: Control = b.get_node("Cross")
		x.visible = banned
		x.queue_redraw()
	ban_button.disabled = not can_act or selected == ""
	ban_button.visible = can_act
	_fill_slots(turn)


func set_time_left(sec: float) -> void:
	time_label.text = "남은 시간 %d초" % ceili(maxf(sec, 0.0)) if sec >= 0.0 else ""
	time_label.add_theme_color_override("font_color", UiKit.BAD if sec <= 5.0 else UiKit.TEXT)


## 오른쪽 위: 블루 밴 2칸, 레드 밴 2칸
func _fill_slots(turn: int) -> void:
	for c in picks_row.get_children():
		picks_row.remove_child(c)
		c.queue_free()
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		picks_row.add_child(UiKit.label(Enums.team_name(team), 16, Enums.team_color(team)))
		for i in BanPhase.ORDER.size():
			if BanPhase.ORDER[i] != team:
				continue
			var cell := PanelContainer.new()
			var sb := StyleBoxFlat.new()
			sb.bg_color = Color(0, 0, 0, 0.35)
			sb.set_corner_radius_all(8)
			sb.set_border_width_all(2)
			sb.border_color = Enums.team_color(team) if i == turn else Color(1, 1, 1, 0.15)
			cell.add_theme_stylebox_override("panel", sb)
			cell.custom_minimum_size = Vector2(52, 52)
			if i < _bans.size():
				var d := DataRegistry.hero(_bans[i])
				if d != null:
					var badge := UiKit.hero_badge(d, 44)
					badge.modulate = Color(0.6, 0.6, 0.6)
					cell.add_child(badge)
			picks_row.add_child(cell)


func _on_hero(id: String) -> void:
	if not _can_act or _bans.has(id):
		return
	selected = id
	for hid in hero_buttons:
		hero_buttons[hid].button_pressed = hid == selected
	ban_button.disabled = false


func _confirm() -> void:
	if _can_act and selected != "" and not _bans.has(selected):
		var id := selected
		selected = ""
		ban_confirmed.emit(id)
