extends Control
## 같은 와이파이 대전 로비.
## 방에 들어가기 전: 내 이름, 방 만들기, 같은 와이파이에서 찾은 방 목록, IP 로 들어가기.
## 방 안: 블루 3자리·레드 3자리 (빈자리는 AI), 자리 옮기기, 영웅 고르기, 방장은 시작하기.

var body: VBoxContainer
var status_label: Label
var name_edit: LineEdit
var ip_edit: LineEdit
var _shown := ""  # 지금 그린 화면 ("outside" / "room")
var ban_board: BanBoard = null
var _ban_pick := ""  # 밴 단계에서 눌러 둔 영웅 (방 화면을 다시 그려도 남긴다)


func _ready() -> void:
	var box := UiKit.page(self, 10)
	var head := UiKit.header(box, "같은 와이파이 대전", on_back)
	head.add_child(UiKit.spacer())
	status_label = UiKit.label("", 18, UiKit.MUTED)
	status_label.name = "Status"
	head.add_child(status_label)
	body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(body)
	Net.lobby_changed.connect(_rebuild)
	Net.rooms_changed.connect(_rebuild_rooms)
	Net.status.connect(_on_status)
	Net.left.connect(_rebuild)
	_rebuild()


func _exit_tree() -> void:
	Net.stop_discovery()
	for pair in [[Net.lobby_changed, _rebuild], [Net.rooms_changed, _rebuild_rooms], [Net.status, _on_status], [Net.left, _rebuild]]:
		if pair[0].is_connected(pair[1]):
			pair[0].disconnect(pair[1])


func _on_status(text: String) -> void:
	status_label.text = text


func on_back() -> void:
	if Net.is_online():
		Net.leave()
		_rebuild()
		return
	GameManager.go_main()


func _process(_delta: float) -> void:
	if ban_board != null and is_instance_valid(ban_board) and Net.ban_turn >= 0:
		ban_board.set_time_left(Net.ban_left)


func _clear() -> void:
	if ban_board != null and is_instance_valid(ban_board):
		_ban_pick = ban_board.selected
	ban_board = null
	for c in body.get_children():
		body.remove_child(c)
		c.queue_free()


func _rebuild() -> void:
	if Net.is_online() and (Net.is_host() or not Net.slots.is_empty()):
		_build_room()
	elif Net.is_client():
		_shown = "waiting"
		_clear()
		body.add_child(UiKit.label("방장에게 연결하는 중입니다...", 24))
	else:
		_build_outside()


# ---- 방에 들어가기 전 ----

func _build_outside() -> void:
	_shown = "outside"
	_clear()
	Net.start_discovery()
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	body.add_child(top)
	top.add_child(UiKit.label("내 이름", 20))
	name_edit = LineEdit.new()
	name_edit.name = "NameEdit"
	name_edit.text = Net.my_name
	name_edit.max_length = 10
	name_edit.custom_minimum_size = Vector2(240, 52)
	name_edit.add_theme_font_size_override("font_size", 20)
	name_edit.text_changed.connect(func(t: String):
		var n := t.strip_edges()
		if n != "":
			Net.my_name = n
			SaveManager.set_setting("lan_name", n))
	top.add_child(name_edit)
	top.add_child(UiKit.spacer())
	var make := UiKit.button("방 만들기", Vector2(220, 60), 22)
	make.name = "HostButton"
	make.pressed.connect(func():
		Net.stop_discovery()
		Net.host())
	top.add_child(make)

	var p := UiKit.panel()
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	p.add_child(v)
	v.add_child(UiKit.label("같은 와이파이에서 찾은 방", 20, UiKit.ACCENT))
	var list := VBoxContainer.new()
	list.name = "Rooms"
	list.add_theme_constant_override("separation", 6)
	var sc := UiKit.scroll(Vector2(0, 160))
	sc.add_child(list)
	v.add_child(sc)
	_fill_rooms(list)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	body.add_child(row)
	row.add_child(UiKit.label("방이 안 보이면 방장 화면의 IP 로", 18, UiKit.MUTED))
	ip_edit = LineEdit.new()
	ip_edit.name = "IpEdit"
	ip_edit.placeholder_text = "예: 192.168.0.12"
	ip_edit.text = str(SaveManager.get_setting("lan_last_ip", ""))
	ip_edit.custom_minimum_size = Vector2(260, 52)
	ip_edit.add_theme_font_size_override("font_size", 20)
	ip_edit.virtual_keyboard_type = LineEdit.KEYBOARD_TYPE_NUMBER_DECIMAL
	row.add_child(ip_edit)
	var go := UiKit.button("들어가기", Vector2(150, 52))
	go.pressed.connect(func():
		var ip := ip_edit.text.strip_edges()
		if ip.count(".") != 3:
			_on_status("IP 를 192.168.0.12 처럼 넣어 주세요")
			return
		SaveManager.set_setting("lan_last_ip", ip)
		_join(ip))
	row.add_child(go)
	body.add_child(UiKit.wrap_label("두 폰이 같은 와이파이에 있어야 합니다. 방장 폰이 게임을 진행하고, 빈자리는 AI 가 맡습니다. 휴대폰 핫스팟에 다른 폰이 붙어도 됩니다.", 16, UiKit.MUTED))


func _rebuild_rooms() -> void:
	if _shown != "outside":
		return
	var list := body.find_child("Rooms", true, false)
	if list != null:
		_fill_rooms(list)


func _fill_rooms(list: Control) -> void:
	for c in list.get_children():
		c.queue_free()
	if Net.rooms.is_empty():
		list.add_child(UiKit.label("찾는 중... (방장이 방을 만들면 여기에 나옵니다)", 18, UiKit.MUTED))
		return
	for ip in Net.rooms:
		var r: Dictionary = Net.rooms[ip]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		row.add_child(UiKit.label("%s  (%d명)" % [r.name, r.players], 20))
		var same: bool = r.ver == str(ProjectSettings.get_setting("application/config/version", ""))
		if not same:
			row.add_child(UiKit.label("버전 %s" % r.ver, 16, UiKit.BAD))
		row.add_child(UiKit.spacer())
		row.add_child(UiKit.label(ip, 16, UiKit.MUTED))
		var b := UiKit.button("들어가기", Vector2(140, 50))
		b.disabled = not same
		b.pressed.connect(_join.bind(ip))
		row.add_child(b)
		list.add_child(row)


func _join(ip: String) -> void:
	Net.stop_discovery()
	Net.join(ip)
	_rebuild()


# ---- 방 안 ----

func _build_room() -> void:
	_shown = "room"
	_clear()
	Net.stop_discovery()
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	body.add_child(top)
	top.add_child(UiKit.label(Net.room_name, 24, UiKit.ACCENT))
	if Net.is_host():
		var ips := Net.local_ips()
		top.add_child(UiKit.label("내 IP: %s" % (", ".join(ips) if not ips.is_empty() else "알 수 없음"), 18, UiKit.MUTED))
	top.add_child(UiKit.spacer())
	if Net.is_host():
		var k := int(SaveManager.get_setting("kill_target", 15))
		var diff: String = {"easy": "쉬움", "normal": "보통", "hard": "어려움"}.get(SaveManager.get_setting("difficulty", "normal"), "보통")
		var rule := "목표 킬 %s · AI %s" % [str(k) if k > 0 else "무제한", diff]
		if Net.game_type == "quick":
			rule = "목표 %d킬 · AI %s" % [MatchConfig.QUICK_KILL_TARGET, diff]
		elif Net.is_raid():
			rule = "AI 아군 %s" % diff
		top.add_child(UiKit.label(rule, 18, UiKit.MUTED))
	if not Net.is_raid():
		top.add_child(UiKit.label("밴 단계", 18, UiKit.MUTED))
	if Net.is_raid():
		pass  # 보스 레이드는 밴 단계가 없다.
	elif Net.is_host():
		var bt := UiKit.toggle("켬" if Net.ban_enabled else "끔", Vector2(90, 52))
		bt.name = "BanToggle"
		bt.button_pressed = Net.ban_enabled
		bt.disabled = Net.ban_turn >= 0
		bt.pressed.connect(func(): Net.set_ban_enabled(not Net.ban_enabled))
		top.add_child(bt)
	else:
		top.add_child(UiKit.label("켬" if Net.ban_enabled else "끔", 18, UiKit.ACCENT if Net.ban_enabled else UiKit.MUTED))
	var leave := UiKit.button("방 나가기", Vector2(150, 52))
	leave.pressed.connect(on_back)
	top.add_child(leave)

	if Net.ban_turn >= 0:
		_build_ban_phase()
		return
	# 게임 방식: 방장이 고르고, 참가자는 보기만 한다.
	var grow := HBoxContainer.new()
	grow.add_theme_constant_override("separation", 8)
	body.add_child(grow)
	grow.add_child(UiKit.label("게임 방식", 18, UiKit.MUTED))
	for t in MatchConfig.GAME_TYPES:
		var gb := UiKit.toggle(MatchConfig.GAME_TYPE_NAMES[t], Vector2(140, 42), 17)
		gb.name = "GameType_" + t
		gb.button_pressed = Net.game_type == t
		gb.disabled = not Net.is_host()
		gb.pressed.connect(Net.set_game_type.bind(t))
		grow.add_child(gb)
	var gdesc := {"normal": "3대3 대전입니다.", "quick": "6레벨·2500골드로 시작하고 5킬을 먼저 올리면 이깁니다.",
		"raid": "사람은 모두 블루 팀에서 함께 고대 흑룡을 10분 안에 잡습니다. 밴 단계는 하지 않습니다."}
	grow.add_child(UiKit.label(gdesc.get(Net.game_type, ""), 16, UiKit.ACCENT))
	var teams := HBoxContainer.new()
	teams.add_theme_constant_override("separation", 14)
	body.add_child(teams)
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var p := UiKit.panel()
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		teams.add_child(p)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 6)
		p.add_child(v)
		v.add_child(UiKit.label("%s 팀" % Enums.team_name(team), 20, Enums.team_color(team)))
		if team == Enums.Team.RED and Net.is_raid():
			v.add_child(UiKit.wrap_label("보스 레이드에는 레드 팀이 없습니다. 상대는 맵 가운데에 나타나는 고대 흑룡입니다.", 17, UiKit.MUTED))
			continue
		for i in 3:
			v.add_child(_slot_row(i + (0 if team == Enums.Team.BLUE else 3)))

	body.add_child(_spectator_row())

	# 영웅 고르기 (내 팀이 이미 고른 영웅과 금지된 영웅은 못 고름). 관전자는 고르지 않는다.
	var mine := Net.my_slot()
	var used: Array = []
	for s in Net.slots:
		if s != mine and (int(s) < 3) == (mine < 3):
			used.append(Net.slots[s].hero)
	var hp := UiKit.panel()
	hp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(hp)
	var hv := VBoxContainer.new()
	hp.add_child(hv)
	if mine < 0:
		hv.add_child(UiKit.wrap_label("관전 중입니다. 경기가 시작되면 영웅 없이 모든 곳을 볼 수 있습니다. 경기에 참여하려면 빈자리의 \"이 자리로\"를 누르세요.", 18, UiKit.MUTED))
		_add_bottom()
		return
	var title := "내 영웅 고르기"
	if Net.bans_done and not Net.bans.is_empty():
		title += "   ·   금지된 영웅: " + _ban_names()
	hv.add_child(UiKit.label(title, 18, UiKit.ACCENT))
	var sc := UiKit.scroll()
	hv.add_child(sc)
	var grid := GridContainer.new()
	grid.name = "HeroGrid"
	grid.columns = 8
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	sc.add_child(grid)
	var my_hero: String = Net.slots[mine].hero if Net.slots.has(mine) else ""
	for id in DataRegistry.ids("heroes"):
		var d := DataRegistry.hero(id)
		var b := UiKit.toggle("", Vector2(142, 56), 16)
		b.name = "Hero_" + id
		b.button_pressed = id == my_hero
		b.disabled = used.has(id) or Net.bans.has(id)
		if Net.bans.has(id):
			b.modulate = Color(0.45, 0.45, 0.48)
		var row := HBoxContainer.new()
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.set_anchors_preset(Control.PRESET_FULL_RECT)
		row.add_theme_constant_override("separation", 4)
		row.add_child(UiKit.hero_badge(d, 44))
		var l := UiKit.label(d.display_name, 14)
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(l)
		b.add_child(row)
		b.pressed.connect(func(): Net.request_hero(id); SaveManager.set_setting("last_hero", id))
		grid.add_child(b)
	_add_bottom()


func _add_bottom() -> void:
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 12)
	body.add_child(bottom)
	if Net.is_host():
		var seats := 3 if Net.is_raid() else 6
		bottom.add_child(UiKit.label("사람 %d명 · 빈자리 %d개는 AI · 관전 %d명" % [Net.slots.size(), seats - Net.slots.size(), Net.spectators.size()], 18, UiKit.MUTED))
		bottom.add_child(UiKit.spacer())
		var need_bans: bool = Net.ban_enabled and not Net.bans_done and not Net.is_raid()
		var start := UiKit.button("밴 단계 시작" if need_bans else "시작하기", Vector2(240, 62), 24)
		start.name = "StartButton"
		start.pressed.connect(Net.start_match)
		bottom.add_child(start)
	else:
		bottom.add_child(UiKit.label("방장이 시작하기를 누르면 경기가 시작됩니다", 18, UiKit.MUTED))


func _slot_row(slot: int) -> Control:
	var row := HBoxContainer.new()
	row.name = "Slot%d" % slot
	row.custom_minimum_size = Vector2(0, 44)
	row.add_theme_constant_override("separation", 10)
	if Net.slots.has(slot):
		var e: Dictionary = Net.slots[slot]
		var d := DataRegistry.hero(e.hero)
		if d != null:
			row.add_child(UiKit.hero_badge(d, 44))
		var me: bool = int(e.peer) == Net.my_id()
		row.add_child(UiKit.label("%s%s" % [e.name, " (나)" if me else ""], 20, UiKit.ACCENT if me else UiKit.TEXT))
		row.add_child(UiKit.spacer())
		row.add_child(UiKit.label(d.display_name if d != null else "", 18, UiKit.MUTED))
		if int(e.peer) == 1:
			row.add_child(UiKit.label("방장", 16, UiKit.GOOD))
	else:
		row.add_child(UiKit.label("AI", 20, UiKit.MUTED))
		row.add_child(UiKit.spacer())
		var b := UiKit.button("이 자리로", Vector2(130, 46), 17)
		b.pressed.connect(Net.request_slot.bind(slot))
		row.add_child(b)
	return row


## 관전 줄: 관전자 이름과 "관전으로" 버튼 (방장은 경기를 진행하므로 관전할 수 없다)
func _spectator_row() -> Control:
	var row := HBoxContainer.new()
	row.name = "Spectators"
	row.add_theme_constant_override("separation", 12)
	row.add_child(UiKit.label("관전 (%d/%d)" % [Net.spectators.size(), Net.MAX_SPECTATORS], 18, UiKit.ACCENT))
	var names: Array = []
	for p in Net.spectators:
		names.append(str(Net.spectators[p].name) + (" (나)" if int(p) == Net.my_id() else ""))
	row.add_child(UiKit.label(", ".join(names) if not names.is_empty() else "아무도 없습니다", 18, UiKit.TEXT if not names.is_empty() else UiKit.MUTED))
	row.add_child(UiKit.spacer())
	if not Net.is_host() and not Net.is_spectator():
		var b := UiKit.button("관전으로", Vector2(150, 46), 17)
		b.name = "SpectateButton"
		b.disabled = Net.spectators.size() >= Net.MAX_SPECTATORS
		b.pressed.connect(Net.request_spectate)
		row.add_child(b)
	return row


func _ban_names() -> String:
	var names: Array = []
	for id in Net.bans:
		var d := DataRegistry.hero(id)
		names.append(d.display_name if d != null else str(id))
	return ", ".join(names)


## 밴 단계 화면 (모두 같은 화면을 보고, 차례인 사람만 누를 수 있다)
func _build_ban_phase() -> void:
	ban_board = BanBoard.new()
	body.add_child(ban_board)
	ban_board.selected = _ban_pick
	ban_board.ban_confirmed.connect(func(id: String):
		_ban_pick = ""
		Net.request_ban(id))
	var team: int = BanPhase.ORDER[Net.ban_turn] if Net.ban_turn < BanPhase.ORDER.size() else Enums.Team.BLUE
	var bs := Net.banner_slot(team)
	var who := ""
	if Net.my_ban_turn():
		who = "내 차례입니다. 상대가 쓰지 못하게 할 영웅을 고르고 밴하기를 누르세요. 시간이 지나면 대신 금지합니다."
	elif bs >= 0:
		who = "%s 팀의 %s 이(가) 금지할 영웅을 고르고 있습니다." % [Enums.team_name(team), Net.slots[bs].name]
	else:
		who = "%s 팀은 사람이 없어 AI 가 금지할 영웅을 고르고 있습니다." % Enums.team_name(team)
	ban_board.show_state(Net.bans, Net.ban_turn, Net.my_ban_turn(), who)
	ban_board.set_time_left(Net.ban_left)
