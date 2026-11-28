extends CanvasLayer
## 전투 화면 UI. 화면 비율이 달라도 모서리 기준(anchor)으로 배치한다.
## 왼쪽: 조이스틱, 오른쪽: 공격·Q/W/E/R, 위: 점수·시간·일시정지, 아래: 체력·마나.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const ATTACK_CENTER := Vector2(-135, -125)
const ATTACK_RADIUS := 70.0
const SKILL_RADIUS := 50.0
const SKILL_RING := 190.0
const SKILL_ANGLES := [180.0, 147.0, 114.0, 81.0]

var hero = null
var controller: PlayerController = null
var battle: BattleManager = null

var root: Control
var joystick: TouchJoystick
var attack_button: SkillButton
var skill_buttons: Array = []
var cancel_zone: PanelContainer
var hp_bar: StatBar
var mp_bar: StatBar
var name_label: Label
var score_label: Label
var time_label: Label
var fps_label: Label
var message_label: Label
## 큰 처치 알림 (첫 처치, 더블 킬, 연속 처치 등)
var banner_label: Label
var _banner_left := 0.0
var _multi: Dictionary = {}  # 영웅 -> [연속 처치 수, 마지막 처치 시각]
var pause_button: TouchButton
var pause_panel: Control
var result_panel: Control
var result_title: Label
var result_detail: Label
var minimap: Minimap
## 카메라가 내 영웅을 떠나 있을 때 보이는 "내 영웅 보기" 버튼
var focus_button: TouchButton
var blue_status: TeamStatus
var red_status: TeamStatus
var kill_feed: VBoxContainer
var xp_bar: StatBar
var gold_label: Label
var boss_label: Label
var boss_bar: StatBar
var monster_manager: MonsterManager
var ai_manager: AIManager
var gather_button: TouchButton
## 신호(핑): 버튼 → 종류 고르기 → 미니맵이나 화면을 눌러 찍기
var ping_button: TouchButton
var ping_menu: Control
var ping_mode := ""
## 빠른 대화: 버튼 → 문장 고르기. 받은 문장은 왼쪽 미니맵 아래에 몇 초 동안 보인다.
var chat_button: TouchButton
var chat_menu: Control
var chat_all_button: TouchButton
var chat_feed: VBoxContainer
var chat_to_all := false
var quick_chat: QuickChat
var shop_button: TouchButton
var shop: ShopManager
var shop_panel: ShopPanel
var inventory_bar: InventoryBar
## 소모품 빠른 사용 버튼 (Q 버튼 왼쪽 아래)
var quick_item: QuickItemButton
## 점수판
var score_button: TouchButton
var scoreboard: Scoreboard
var shop_open := false

var _message_left := 0.0
var show_fps := false


func _ready() -> void:
	add_to_group("hud")
	show_fps = bool(SaveManager.get_setting("show_fps", false))
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build()
	get_viewport().size_changed.connect(_apply_safe_area)
	_apply_safe_area()


func setup(h, c: PlayerController, bm: BattleManager) -> void:
	hero = h
	controller = c
	battle = bm
	EventBus.kill_score_changed.connect(_on_score)
	EventBus.notice.connect(show_message)
	EventBus.hero_killed.connect(_on_hero_killed)
	bm.ended.connect(_on_match_ended)
	var playable: bool = hero != null and controller != null
	for n in [joystick, attack_button, hp_bar, mp_bar, xp_bar, name_label, gather_button, ping_button, chat_button, shop_button, inventory_bar, quick_item] + skill_buttons:
		n.visible = playable
	if not playable:
		return
	attack_button.hero = hero
	inventory_bar.hero = hero
	quick_item.hero = hero
	for b in skill_buttons:
		b.hero = hero
		var s: SkillData = hero.skill_caster.get_skill(b.slot)
		if s != null:
			b.glyph = s.glyph if s.glyph != "" else s.display_name.left(1)
	joystick.changed.connect(func(v): controller.joystick = v)
	attack_button.pressed_down.connect(func(_s): controller.attack_held = true)
	attack_button.released.connect(func(_s, _v, _d, _c): controller.attack_held = false)
	for b in skill_buttons:
		b.show_learn = true
		b.learn_pressed.connect(func(slot):
			hero.learn(slot)
			_show_skill_info(slot, 2.5))
		b.pressed_down.connect(_on_skill_down)
		b.aim_changed.connect(_on_skill_aim)
		b.released.connect(_on_skill_released)
		b.info_requested.connect(_on_skill_info)
	controller.cast_failed.connect(show_message)
	hero.leveled_up.connect(func(lv): show_message("레벨 %d! 스킬 버튼의 + 를 눌러 스킬을 올리세요" % lv))
	name_label.text = "%s · %s" % [hero.display_name, hero.data.role]
	show_message("스킬 버튼을 꾹 누르면 설명이 나옵니다")


func _exit_tree() -> void:
	if EventBus.kill_score_changed.is_connected(_on_score):
		EventBus.kill_score_changed.disconnect(_on_score)
	if EventBus.notice.is_connected(show_message):
		EventBus.notice.disconnect(show_message)
	if EventBus.hero_killed.is_connected(_on_hero_killed):
		EventBus.hero_killed.disconnect(_on_hero_killed)


## 미니맵과 팀 상태 표시를 연결한다.
func setup_overview(map: MapData, hm: HeroManager, cam: Camera2D, mm: MonsterManager = null) -> void:
	monster_manager = mm
	minimap.setup(map, hm, hero, cam)
	minimap.ai_manager = ai_manager
	var h := 120.0
	minimap.offset_bottom = minimap.offset_top + h
	minimap.offset_right = minimap.offset_left + h * map.size.x / map.size.y
	scoreboard = Scoreboard.new()
	scoreboard.name = "Scoreboard"
	scoreboard.anchor_right = 1.0
	scoreboard.anchor_bottom = 1.0
	scoreboard.setup(hm, battle, hero.team if hero != null else Enums.Team.BLUE)
	scoreboard.visible = false
	scoreboard.closed.connect(toggle_scoreboard)
	root.add_child(scoreboard)
	blue_status.setup(hm.team_heroes(Enums.Team.BLUE), Enums.Team.BLUE, hero, false)
	red_status.setup(hm.team_heroes(Enums.Team.RED), Enums.Team.RED, hero, true)


# ---- 화면 구성 ----

func _build() -> void:
	root = Control.new()
	root.name = "Root"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	joystick = TouchJoystick.new()
	joystick.name = "Joystick"
	root.add_child(joystick)
	joystick.anchor_left = 0.0
	joystick.anchor_right = 0.42
	joystick.anchor_top = 0.3
	joystick.anchor_bottom = 1.0

	attack_button = SkillButton.new()
	attack_button.name = "AttackButton"
	attack_button.configure(-1, "", "공격", ATTACK_RADIUS, Color(0.75, 0.25, 0.2))
	_place(attack_button, Vector2(1, 1), ATTACK_CENTER - Vector2.ONE * ATTACK_RADIUS, attack_button.size)
	root.add_child(attack_button)

	for i in 4:
		var b := SkillButton.new()
		b.name = "Skill" + Enums.SLOT_KEYS[i]
		b.configure(i, Enums.SLOT_KEYS[i], Enums.SLOT_KEYS[i], SKILL_RADIUS * (1.08 if i == 3 else 1.0), Color(0.3, 0.35, 0.5))
		var a := deg_to_rad(SKILL_ANGLES[i])
		var center := ATTACK_CENTER + Vector2(cos(a), -sin(a)) * SKILL_RING
		_place(b, Vector2(1, 1), center - b.size * 0.5, b.size)
		root.add_child(b)
		skill_buttons.append(b)

	quick_item = QuickItemButton.new()
	quick_item.name = "QuickItem"
	quick_item.setup(34.0)
	var q_center := ATTACK_CENTER + Vector2(-268, 62)
	_place(quick_item, Vector2(1, 1), q_center - quick_item.size * 0.5, quick_item.size)
	quick_item.used.connect(func(slot): _on_inventory_slot(slot))
	root.add_child(quick_item)

	cancel_zone = PanelContainer.new()
	cancel_zone.name = "CancelZone"
	cancel_zone.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var cz_style := StyleBoxFlat.new()
	cz_style.bg_color = Color(0.6, 0.1, 0.1, 0.55)
	cz_style.set_corner_radius_all(14)
	cancel_zone.add_theme_stylebox_override("panel", cz_style)
	var cz_label := _label("여기서 놓으면 취소", 18, HORIZONTAL_ALIGNMENT_CENTER)
	cancel_zone.add_child(cz_label)
	_place(cancel_zone, Vector2(1, 0), Vector2(-250, 200), Vector2(200, 70))
	cancel_zone.visible = false
	root.add_child(cancel_zone)
	for b in skill_buttons:
		b.cancel_zone = cancel_zone
	_build_skill_info()

	name_label = _label("", 18, HORIZONTAL_ALIGNMENT_CENTER)
	_place(name_label, Vector2(0.5, 1), Vector2(-200, -96), Vector2(400, 28))
	root.add_child(name_label)
	hp_bar = StatBar.new()
	hp_bar.name = "HPBar"
	_place(hp_bar, Vector2(0.5, 1), Vector2(-200, -64), Vector2(400, 24))
	root.add_child(hp_bar)
	mp_bar = StatBar.new()
	mp_bar.name = "MPBar"
	mp_bar.fill = Color(0.3, 0.5, 1.0)
	_place(mp_bar, Vector2(0.5, 1), Vector2(-200, -38), Vector2(400, 16))
	root.add_child(mp_bar)
	xp_bar = StatBar.new()
	xp_bar.name = "XPBar"
	xp_bar.fill = Color(0.85, 0.7, 0.25)
	xp_bar.show_text = false
	_place(xp_bar, Vector2(0.5, 1), Vector2(-200, -18), Vector2(400, 8))
	root.add_child(xp_bar)
	# 골드는 상점 버튼 안에 크게 보여 준다. 이 글자는 체력 막대 옆의 보조 표시.
	gold_label = _label("0 G", 20, HORIZONTAL_ALIGNMENT_LEFT)
	gold_label.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	_place(gold_label, Vector2(0.5, 1), Vector2(208, -66), Vector2(140, 28))
	gold_label.visible = false
	root.add_child(gold_label)
	boss_label = _label("", 18, HORIZONTAL_ALIGNMENT_CENTER)
	_place(boss_label, Vector2(0.5, 0), Vector2(-200, 70), Vector2(400, 24))
	boss_label.visible = false
	root.add_child(boss_label)
	boss_bar = StatBar.new()
	boss_bar.name = "BossBar"
	boss_bar.fill = Color(0.7, 0.35, 0.9)
	_place(boss_bar, Vector2(0.5, 0), Vector2(-200, 96), Vector2(400, 16))
	boss_bar.visible = false
	root.add_child(boss_bar)

	score_label = _label("블루 0 : 0 레드", 26, HORIZONTAL_ALIGNMENT_CENTER)
	_place(score_label, Vector2(0.5, 0), Vector2(-200, 6), Vector2(400, 40))
	root.add_child(score_label)
	time_label = _label("00:00", 18, HORIZONTAL_ALIGNMENT_CENTER)
	_place(time_label, Vector2(0.5, 0), Vector2(-100, 44), Vector2(200, 26))
	root.add_child(time_label)
	blue_status = TeamStatus.new()
	blue_status.name = "BlueStatus"
	_place(blue_status, Vector2(0, 0), Vector2(8, 6), Vector2(170, 52))
	root.add_child(blue_status)
	red_status = TeamStatus.new()
	red_status.name = "RedStatus"
	_place(red_status, Vector2(1, 0), Vector2(-338, 6), Vector2(170, 52))
	root.add_child(red_status)
	minimap = Minimap.new()
	minimap.name = "Minimap"
	_place(minimap, Vector2(0, 0), Vector2(12, 66), Vector2(206, 120))
	root.add_child(minimap)
	focus_button = TouchButton.new()
	focus_button.name = "FocusButton"
	focus_button.setup("내 영웅 보기", 16, Color(0.2, 0.3, 0.45, 0.9))
	_place(focus_button, Vector2(0, 0), Vector2(12, 192), Vector2(130, 46))
	focus_button.visible = false
	root.add_child(focus_button)
	fps_label = _label("", 13, HORIZONTAL_ALIGNMENT_LEFT)
	_place(fps_label, Vector2(0, 0), Vector2(150, 206), Vector2(120, 20))
	root.add_child(fps_label)
	chat_feed = VBoxContainer.new()
	chat_feed.name = "ChatFeed"
	chat_feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	chat_feed.add_theme_constant_override("separation", 0)
	chat_feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(chat_feed, Vector2(0, 0), Vector2(14, 244), Vector2(440, 104))
	root.add_child(chat_feed)
	kill_feed = VBoxContainer.new()
	kill_feed.name = "KillFeed"
	kill_feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	kill_feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(kill_feed, Vector2(1, 0), Vector2(-520, 76), Vector2(420, 120))
	root.add_child(kill_feed)
	banner_label = _label("", 40, HORIZONTAL_ALIGNMENT_CENTER)
	banner_label.add_theme_constant_override("outline_size", 10)
	banner_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	_place(banner_label, Vector2(0.5, 0), Vector2(-400, 160), Vector2(800, 60))
	banner_label.visible = false
	root.add_child(banner_label)
	message_label = _label("", 22, HORIZONTAL_ALIGNMENT_CENTER)
	_place(message_label, Vector2(0.5, 0), Vector2(-320, 118), Vector2(640, 36))
	root.add_child(message_label)

	pause_button = TouchButton.new()
	pause_button.name = "PauseButton"
	pause_button.setup("II", 26)
	_place(pause_button, Vector2(1, 0), Vector2(-84, 10), Vector2(70, 58))
	pause_button.pressed.connect(set_paused.bind(true))
	root.add_child(pause_button)

	score_button = TouchButton.new()
	score_button.name = "ScoreButton"
	score_button.setup("점수", 18)
	_place(score_button, Vector2(1, 0), Vector2(-160, 10), Vector2(70, 58))
	score_button.pressed.connect(toggle_scoreboard)
	root.add_child(score_button)

	gather_button = TouchButton.new()
	gather_button.name = "GatherButton"
	gather_button.setup("모여!", 19)
	_place(gather_button, Vector2(1, 0), Vector2(-84, 76), Vector2(70, 52))
	gather_button.pressed.connect(call_gather)
	root.add_child(gather_button)

	ping_button = TouchButton.new()
	ping_button.name = "PingButton"
	ping_button.setup("신호", 19, Color(0.3, 0.2, 0.12, 0.88))
	_place(ping_button, Vector2(1, 0), Vector2(-84, 134), Vector2(70, 52))
	ping_button.pressed.connect(toggle_ping_menu)
	root.add_child(ping_button)
	ping_menu = Control.new()
	ping_menu.name = "PingMenu"
	ping_menu.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(ping_menu, Vector2(1, 0), Vector2(-84 - 3 * 78, 134), Vector2(3 * 78, 52))
	ping_menu.visible = false
	root.add_child(ping_menu)
	var kinds := ["attack", "danger", "gather"]
	for i in kinds.size():
		var b := TouchButton.new()
		b.name = "Ping_" + kinds[i]
		b.setup(AIManager.PING_KINDS[kinds[i]], 18, PingMarker.color_of(kinds[i]).darkened(0.45))
		_place(b, Vector2(0, 0), Vector2(i * 78, 0), Vector2(72, 52))
		b.pressed.connect(choose_ping.bind(kinds[i]))
		ping_menu.add_child(b)

	_build_chat_menu()

	shop_button = TouchButton.new()
	shop_button.name = "ShopButton"
	shop_button.setup("상점", 17, Color(0.35, 0.28, 0.1, 0.92))
	# 아이템 칸 왼쪽: "모여!" 버튼과 떨어뜨리고, 골드를 크게 보여 준다.
	_place(shop_button, Vector2(0.5, 1), Vector2(-264, -160), Vector2(104, 64))
	shop_button.pressed.connect(toggle_shop)
	root.add_child(shop_button)

	inventory_bar = InventoryBar.new()
	inventory_bar.name = "InventoryBar"
	_place(inventory_bar, Vector2(0.5, 1), Vector2(-150, -150), Vector2(301, 46))
	inventory_bar.slot_pressed.connect(_on_inventory_slot)
	root.add_child(inventory_bar)

	if _is_lan():
		# 와이파이 대전: 멈추지 않고, 다시 시작 대신 방 나가기·로비로
		pause_panel = _make_dialog("메뉴 (경기는 계속됩니다)", [
			["계속하기", set_paused.bind(false)],
			["방 나가기", func(): Net.leave(); GameManager.go_main()],
		])
		result_panel = _make_dialog("", [
			["로비로", func(): GameManager.goto(GameManager.LAN_SCENE)],
			["처음 화면", func(): Net.leave(); GameManager.go_main()],
		])
	else:
		pause_panel = _make_dialog("일시정지", [
			["계속하기", set_paused.bind(false)],
			["다시 시작", func(): GameManager.restart_match()],
			["저장하고 처음 화면", func(): GameManager.leave_battle()],
		])
		result_panel = _make_dialog("", [
			["다시 하기", func(): GameManager.restart_match()],
			["처음 화면", func(): GameManager.go_main()],
		])
	result_title = result_panel.get_node("Box/Title")
	shop_panel = ShopPanel.new()
	shop_panel.name = "ShopPanel"
	root.add_child(shop_panel)
	shop_panel.build()
	shop_panel.visible = false
	shop_panel.closed.connect(toggle_shop)
	result_detail = _label("", 20, HORIZONTAL_ALIGNMENT_CENTER)
	result_panel.get_node("Box").add_child(result_detail)
	result_panel.get_node("Box").move_child(result_detail, 1)


func _place(c: Control, anchor: Vector2, pos: Vector2, sz: Vector2) -> void:
	c.anchor_left = anchor.x
	c.anchor_right = anchor.x
	c.anchor_top = anchor.y
	c.anchor_bottom = anchor.y
	c.offset_left = pos.x
	c.offset_top = pos.y
	c.offset_right = pos.x + sz.x
	c.offset_bottom = pos.y + sz.y


func _label(text: String, size: int, align: int) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("outline_size", 5)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _make_dialog(title: String, buttons: Array) -> Control:
	var shade := ColorRect.new()
	shade.color = Color(0, 0, 0, 0.55)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.visible = false
	root.add_child(shade)
	var box := VBoxContainer.new()
	box.name = "Box"
	box.add_theme_constant_override("separation", 14)
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.custom_minimum_size = Vector2(320, 0)
	box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	box.grow_vertical = Control.GROW_DIRECTION_BOTH
	shade.add_child(box)
	var t := _label(title, 34, HORIZONTAL_ALIGNMENT_CENTER)
	t.name = "Title"
	box.add_child(t)
	for b in buttons:
		var btn := Button.new()
		btn.text = b[0]
		btn.custom_minimum_size = Vector2(320, 64)
		btn.add_theme_font_size_override("font_size", 24)
		btn.focus_mode = Control.FOCUS_NONE
		btn.pressed.connect(b[1])
		box.add_child(btn)
	return shade


## 휴대폰의 노치·둥근 모서리를 피해 UI 를 안쪽으로 옮긴다.
func _apply_safe_area() -> void:
	if root == null:
		return
	var m := Vector4.ZERO  # left, top, right, bottom
	if OS.has_feature("mobile"):
		var safe := DisplayServer.get_display_safe_area()
		var win := DisplayServer.window_get_size()
		var vp := get_viewport().get_visible_rect().size
		if win.x > 0 and safe.size.x > 0:
			var k := vp.x / float(win.x)
			m = Vector4(safe.position.x, safe.position.y, win.x - safe.end.x, win.y - safe.end.y) * k
			m = m.clamp(Vector4.ZERO, Vector4(120, 60, 120, 60))
	root.offset_left = m.x
	root.offset_top = m.y
	root.offset_right = -m.z
	root.offset_bottom = -m.w


# ---- 갱신 ----

func _process(delta: float) -> void:
	fps_label.visible = show_fps
	if show_fps:
		fps_label.text = "FPS %d" % Engine.get_frames_per_second()
	if battle != null:
		var t := int(battle.elapsed)
		time_label.text = "%02d:%02d" % [t / 60, t % 60]
		var raid: bool = battle.is_raid()
		if raid:
			_update_raid_timer()
		elif battle.config != null and battle.config.is_quick():
			time_label.text += "  ·  짧은 판 %d킬 먼저" % battle.config.kill_target
		if monster_manager != null:
			var fb := int(ceil(monster_manager.time_to_final_boss()))
			if fb > 0:
				time_label.text += "  ·  %s %d:%02d" % ["레이드 보스 등장까지" if raid else "최종 보스", fb / 60, fb % 60]
		if hero != null:
			var d: int = battle.deficit(hero.team)
			if d > 0:
				var cfg := DataRegistry.progression()
				time_label.text += "  ·  역전 보너스 골드 +%d%% 부활 -%d%%" % [roundi((cfg.comeback_gold(d) - 1.0) * 100.0), roundi((1.0 - cfg.comeback_respawn(d)) * 100.0)]
	_update_boss_bar()
	if _skill_info_left > 0.0:
		_skill_info_left -= delta
		if _skill_info_left <= 0.0 and skill_info != null:
			skill_info.visible = false
	if hero != null and controller != null:
		hp_bar.set_values(hero.health.hp, hero.health.max_hp(), hero.health.shield_total())
		mp_bar.set_values(hero.mana.mp, hero.mana.max_mp())
		xp_bar.set_values(hero.xp_ratio(), 1.0)
		gold_label.text = "%d G" % hero.gold
		shop_button.sub_text = "%d G" % hero.gold
		shop_button.highlight = shop != null and shop.can_shop(hero)
		shop_button.queue_redraw()
		cancel_zone.visible = controller.aiming_slot >= 0 and controller.aim_dragged
		if hero.is_dead:
			name_label.text = "부활까지 %d초" % ceili(hero.respawn_left)
		else:
			name_label.text = "%s · Lv.%d" % [hero.display_name, hero.level]
			if hero.has_gauge():
				name_label.text += "  ·  %s %d/%d" % [hero.data.gauge_name, int(hero.gauge), int(hero.data.gauge_max)]
			if hero.attack.magazine > 0:
				name_label.text += "  ·  " + ("재장전 중" if hero.attack.reloading else "탄창 %d/%d" % [hero.attack.ammo, hero.attack.magazine])
	if _banner_left > 0.0:
		# 대화 창이 열려 있으면 가리지 않게 처치 알림을 왼쪽으로 비켜 둔다.
		banner_label.offset_left = (-400.0 - (chat_menu.size.x * 0.5 + 40.0)) if chat_menu != null and chat_menu.visible else -400.0
		banner_label.offset_right = banner_label.offset_left + 800.0
		_banner_left -= delta
		banner_label.modulate.a = clampf(_banner_left / 0.5, 0.0, 1.0)
		if _banner_left <= 0.0:
			banner_label.visible = false
	if _message_left > 0.0:
		_message_left -= delta
		message_label.modulate.a = clampf(_message_left / 0.4, 0.0, 1.0)
		if _message_left <= 0.0:
			message_label.text = ""


## 보스 레이드: 위쪽 가운데에 남은 시간을 크게 보여 준다 (1분 아래로 남으면 빨갛게).
func _update_raid_timer() -> void:
	var left := battle.raid_time_left()
	if left < 0.0:
		score_label.text = "보스 레이드"
		return
	var s := ceili(left)
	score_label.text = "보스 레이드 · 남은 시간 %d:%02d" % [s / 60, s % 60]
	score_label.add_theme_color_override("font_color", UiKit.BAD if left <= 60.0 else UiKit.TEXT)


## 화면 가운데(카메라) 가까이에 살아 있는 보스가 있으면 이름과 체력 막대를 보여 준다.
## 보스 레이드에서는 레이드 보스가 어디에 있든 늘 보여 준다.
func _update_boss_bar() -> void:
	var cam := get_viewport().get_camera_2d()
	var boss = null
	if battle != null and battle.is_raid() and monster_manager != null:
		boss = monster_manager.final_boss()
	if boss == null and cam != null:
		var center := cam.get_screen_center_position()
		var best := 900.0
		for b in get_tree().get_nodes_in_group("bosses"):
			if not b.is_dead and b.global_position.distance_to(center) < best:
				best = b.global_position.distance_to(center)
				boss = b
	boss_label.visible = boss != null
	boss_bar.visible = boss != null
	if boss != null:
		boss_label.text = boss.display_name + ("  (분노)" if boss.phase > 0 else "")
		boss_bar.set_values(boss.health.hp, boss.health.max_hp())


func show_message(text: String) -> void:
	if text == "":
		return
	message_label.text = text
	message_label.modulate.a = 1.0
	_message_left = 1.6


func _on_hero_killed(victim, killer, helpers: Array) -> void:
	var kname: String = ("%s %s" % [Enums.team_name(killer.team), killer.display_name]) if killer != null else "?"
	var text := "%s  ▶  %s %s" % [kname, Enums.team_name(victim.team), victim.display_name]
	if not helpers.is_empty():
		text += "  (도움 %d)" % helpers.size()
	var l := _label(text, 17, HORIZONTAL_ALIGNMENT_RIGHT)
	l.add_theme_color_override("font_color", Enums.team_color(killer.team if killer != null else Enums.Team.NEUTRAL).lightened(0.3))
	kill_feed.add_child(l)
	while kill_feed.get_child_count() > 4:
		kill_feed.get_child(0).free()
	get_tree().create_timer(5.0).timeout.connect(l.queue_free)
	_announce(victim, killer)
	if hero != null and victim == hero:
		show_message("처치당했습니다. 우물에서 부활합니다")
	elif hero != null and killer == hero:
		show_message("%s 처치!" % victim.display_name)


func _on_score(blue: int, red: int) -> void:
	score_label.text = "블루 %d : %d 레드" % [blue, red]


## ---- 스킬 설명 (스킬 버튼을 꾹 누르거나 + 로 배울 때) ----

var skill_info: PanelContainer
var skill_info_label: Label
var _skill_info_left := 0.0


func _build_skill_info() -> void:
	skill_info = PanelContainer.new()
	skill_info.name = "SkillInfo"
	skill_info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var st := StyleBoxFlat.new()
	st.bg_color = Color(0.06, 0.07, 0.1, 0.92)
	st.border_color = Color(1, 0.85, 0.3, 0.8)
	st.set_border_width_all(2)
	st.set_corner_radius_all(12)
	st.set_content_margin_all(14)
	skill_info.add_theme_stylebox_override("panel", st)
	skill_info_label = _label("", 17, HORIZONTAL_ALIGNMENT_LEFT)
	skill_info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	skill_info_label.custom_minimum_size = Vector2(440, 0)
	skill_info.add_child(skill_info_label)
	_place(skill_info, Vector2(1, 1), Vector2(-770, -330), Vector2(470, 0))
	skill_info.visible = false
	root.add_child(skill_info)


## 스킬 설명 글: 이름·단계, 마나·쿨타임·사거리(지금 단계 기준), 설명
static func skill_text(h: Hero, slot: int) -> String:
	var s: SkillData = h.skill_caster.get_skill(slot)
	if s == null:
		return ""
	var keys := ["Q", "W", "E", "R"]
	var rank: int = h.skill_caster.ranks[slot]
	var i := clampi(rank - 1, 0, s.max_rank - 1)
	var cd: float = s.cooldown[mini(i, s.cooldown.size() - 1)] if not s.cooldown.is_empty() else 0.0
	var mp: float = s.mana_cost[mini(i, s.mana_cost.size() - 1)] if not s.mana_cost.is_empty() else 0.0
	var head := "%s  %s  (%s)" % [keys[slot], s.display_name, ("%d/%d단계" % [rank, s.max_rank]) if rank > 0 else "아직 배우지 않음"]
	var parts: Array = ["마나 %d" % roundi(mp), "쿨타임 %s초" % str(snappedf(cd, 0.1))]
	if s.cast_range > 0.0:
		parts.append("사거리 %d" % roundi(s.cast_range))
	return "%s\n%s\n%s" % [head, " · ".join(parts), s.description]


func _show_skill_info(slot: int, seconds := 0.0) -> void:
	if skill_info == null or hero == null:
		return
	skill_info_label.text = skill_text(hero, slot)
	skill_info.visible = skill_info_label.text != ""
	skill_info.reset_size()
	_skill_info_left = seconds


func _on_skill_info(slot: int, show: bool) -> void:
	if show:
		_show_skill_info(slot)
	elif skill_info != null:
		skill_info.visible = false


func _on_skill_down(slot: int) -> void:
	controller.begin_aim(slot)


func _on_skill_aim(slot: int, vec: Vector2) -> void:
	controller.update_aim(slot, vec)


func _on_skill_released(slot: int, vec: Vector2, dragged: bool, cancelled: bool) -> void:
	controller.end_aim(slot, vec, dragged, cancelled)


func toggle_shop() -> void:
	if hero == null or shop == null:
		return
	shop_open = not shop_open
	if shop_open:
		_release_all_touches()
		shop_panel.open_for(hero, shop)
	else:
		shop_panel.visible = false
	for n in [joystick, attack_button, gather_button, chat_button, shop_button, pause_button, inventory_bar] + skill_buttons:
		n.visible = not shop_open
	chat_menu.visible = false


func _on_inventory_slot(i: int) -> void:
	var it: ItemData = hero.inventory.item_at(i)
	if it == null:
		toggle_shop()
		return
	if it.consumable:
		var r := shop.use_item(hero, i)
		if r != ShopManager.Result.OK:
			show_message(ShopManager.RESULT_TEXT.get(r, ""))
	else:
		show_message("%s: %s" % [it.display_name, ", ".join(it.stat_lines())])


## 처치 알림: 여러 명을 연달아(10초 안) 잡으면 더블·트리플 킬, 상대를 모두 쓰러뜨리면 전멸,
## 경기 첫 처치는 첫 처치, 죽지 않고 계속 잡으면 연속 처치 알림.
func _announce(victim, killer) -> void:
	if killer == null or battle == null:
		return
	var now := Unit.now()
	var m: Array = _multi.get(killer, [0, -100.0])
	m = BattleManager.next_multi(m, now)
	_multi[killer] = m
	_multi.erase(victim)
	var text := ""
	var all_dead := true
	for h in battle.hero_manager.team_heroes(victim.team) if battle.hero_manager != null else []:
		if not h.is_dead and h != victim:
			all_dead = false
	var streak: int = battle.streaks.get(killer, 0)
	if m[0] >= 3:
		text = "트리플 킬!"
	elif all_dead and battle.hero_manager != null and battle.hero_manager.team_heroes(victim.team).size() > 1:
		text = "전멸!"
	elif m[0] == 2:
		text = "더블 킬!"
	elif battle.kills[Enums.Team.BLUE] + battle.kills[Enums.Team.RED] == 1:
		text = "첫 처치!"
	elif streak >= 7:
		text = "전설!"
	elif streak == 5:
		text = "학살 중!"
	elif streak == 3:
		text = "연속 처치 중!"
	if text == "":
		return
	banner_label.text = "%s  %s" % [killer.display_name, text]
	banner_label.add_theme_color_override("font_color", Enums.team_color(killer.team).lightened(0.35))
	banner_label.visible = true
	banner_label.modulate.a = 1.0
	banner_label.scale = Vector2.ONE
	_banner_left = 2.6
	AudioManager.play("crit" if killer.team == (hero.team if hero != null else Enums.Team.BLUE) else "hurt", 0.1, 0.9)


## 신호 버튼: 종류 고르는 창을 열고 닫는다. 찍을 곳을 고르는 중이면 취소한다.
func toggle_ping_menu() -> void:
	if ping_mode != "":
		ping_mode = ""
		show_message("신호를 취소했습니다")
		return
	ping_menu.visible = not ping_menu.visible
	chat_menu.visible = false


func choose_ping(kind: String) -> void:
	ping_menu.visible = false
	ping_mode = kind
	show_message("미니맵이나 화면을 눌러 '%s' 신호를 찍으세요" % AIManager.PING_KINDS[kind])


## 고른 종류의 신호를 pos 에 찍는다. 아군 AI 는 이 신호를 참고해 움직일지 정한다.
func place_ping(pos: Vector2) -> void:
	var kind := ping_mode
	ping_mode = ""
	if ai_manager == null or hero == null or kind == "":
		return
	if not NetSync.client_request("ping", [kind, pos.x, pos.y]):
		ai_manager.add_ping(hero.team, kind, pos)
		PingMarker.spawn(hero, pos, kind, AIManager.PING_SECONDS)
		NetSync.host_ping(hero.team, kind, pos)
	AudioManager.play("skill", 0.1, 0.6)
	show_message("'%s' 신호를 찍었습니다" % AIManager.PING_KINDS[kind])


## 점수판 열기·닫기 (화면은 멈추지 않는다)
func toggle_scoreboard() -> void:
	if scoreboard == null:
		return
	scoreboard.visible = not scoreboard.visible


## 아군 AI 를 플레이어 자리로 부른다.
func call_gather() -> void:
	if ai_manager == null or hero == null or hero.is_dead:
		return
	if not NetSync.client_request("gather", []):
		ai_manager.request_gather(hero.team, hero.global_position)
	show_message("아군을 불렀습니다 (%d초)" % int(AIManager.GATHER_SECONDS))


func _is_lan() -> bool:
	return GameManager.match_config != null and GameManager.match_config.mode == "lan"


func set_paused(p: bool) -> void:
	if battle != null and battle.match_over:
		return
	get_tree().paused = p and not _is_lan()
	pause_panel.visible = p
	if p:
		_release_all_touches()


func _release_all_touches() -> void:
	joystick.release()
	if controller != null:
		controller.attack_held = false
		controller.aiming_slot = -1


func _on_match_ended(winner: int, reason: String) -> void:
	var player_team: int = hero.team if hero != null else Enums.Team.BLUE
	result_title.text = "승리!" if winner == player_team else "패배"
	var why := "목표 킬 달성" if reason == "kills" else "최종 보스 처치"
	result_detail.text = "%s 팀 %s (블루 %d : %d 레드)" % [Enums.team_name(winner), why, battle.kills[Enums.Team.BLUE], battle.kills[Enums.Team.RED]]
	if battle.is_raid():
		var t := int(battle.elapsed)
		var won := winner == Enums.Team.BLUE
		result_title.text = "레이드 성공!" if won else "레이드 실패"
		result_detail.text = {"raid": "레이드 보스를 쓰러뜨렸습니다. 걸린 시간 %d:%02d" % [t / 60, t % 60],
			"timeout": "제한 시간 안에 레이드 보스를 쓰러뜨리지 못했습니다.",
			"wiped": "우리 팀 영웅이 모두 쓰러졌습니다."}.get(reason, "")
	_release_all_touches()
	await get_tree().create_timer(1.2).timeout
	get_tree().paused = true
	result_panel.visible = true


# ---- 빠른 대화 ----

const CHAT_COLS := 3
const CHAT_CELL := Vector2(150, 44)
const CHAT_GAP := 6.0


## "대화" 버튼(신호 버튼 아래)과 문장 창(버튼 왼쪽). 창은 3줄 4칸의 문장과 받는 사람 바꾸기 버튼.
func _build_chat_menu() -> void:
	chat_button = TouchButton.new()
	chat_button.name = "ChatButton"
	chat_button.setup("대화", 19, Color(0.14, 0.26, 0.24, 0.88))
	_place(chat_button, Vector2(1, 0), Vector2(-84, 192), Vector2(70, 52))
	chat_button.pressed.connect(toggle_chat_menu)
	root.add_child(chat_button)
	var rows := ceili(float(QuickChat.PANEL_COUNT) / CHAT_COLS)
	var pad := 10.0
	var w := CHAT_COLS * CHAT_CELL.x + (CHAT_COLS - 1) * CHAT_GAP + pad * 2.0
	var h := (rows + 1) * (CHAT_CELL.y + CHAT_GAP) - CHAT_GAP + pad * 2.0
	chat_menu = Panel.new()
	chat_menu.name = "ChatMenu"
	chat_menu.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var st := StyleBoxFlat.new()
	st.bg_color = Color(0.05, 0.07, 0.1, 0.86)
	st.border_color = Color(1, 1, 1, 0.25)
	st.set_border_width_all(2)
	st.set_corner_radius_all(12)
	chat_menu.add_theme_stylebox_override("panel", st)
	_place(chat_menu, Vector2(1, 0), Vector2(-92 - w, 66), Vector2(w, h))
	chat_menu.visible = false
	root.add_child(chat_menu)
	for i in QuickChat.PANEL_COUNT:
		var b := TouchButton.new()
		b.name = "Chat_%d" % i
		b.setup(QuickChat.PHRASES[i], 16, Color(0.16, 0.2, 0.27, 0.95))
		var cell := Vector2(i % CHAT_COLS, i / CHAT_COLS)
		_place(b, Vector2(0, 0), Vector2(pad, pad) + cell * (CHAT_CELL + Vector2.ONE * CHAT_GAP), CHAT_CELL)
		b.pressed.connect(send_chat.bind(i))
		chat_menu.add_child(b)
	chat_all_button = TouchButton.new()
	chat_all_button.name = "ChatAll"
	chat_all_button.setup("", 16)
	_place(chat_all_button, Vector2(0, 0), Vector2(pad, pad + rows * (CHAT_CELL.y + CHAT_GAP)), Vector2(w - pad * 2.0, CHAT_CELL.y))
	chat_all_button.pressed.connect(toggle_chat_all)
	chat_menu.add_child(chat_all_button)
	_refresh_chat_all()


func toggle_chat_menu() -> void:
	chat_menu.visible = not chat_menu.visible
	if chat_menu.visible:
		ping_menu.visible = false


## 받는 사람 바꾸기: 우리 팀 ↔ 전체(양 팀)
func toggle_chat_all() -> void:
	chat_to_all = not chat_to_all
	_refresh_chat_all()


func _refresh_chat_all() -> void:
	chat_all_button.text = "받는 사람: 전체에게 (상대 팀도 봅니다)" if chat_to_all else "받는 사람: 우리 팀에게만 (누르면 전체에게)"
	chat_all_button.bg = Color(0.4, 0.28, 0.1, 0.95) if chat_to_all else Color(0.12, 0.22, 0.32, 0.95)
	chat_all_button.queue_redraw()


## 문장 버튼: 보내고 창을 닫는다. 너무 자주 보내면 알려 주고 창은 그대로 둔다.
func send_chat(idx: int) -> int:
	if quick_chat == null:
		return QuickChat.Result.BAD
	var r := quick_chat.player_say(idx, chat_to_all)
	if r == QuickChat.Result.TOO_FAST:
		show_message("너무 자주 보냈습니다. 잠시 뒤에 다시 보내 주세요")
	elif r == QuickChat.Result.OK:
		chat_menu.visible = false
		AudioManager.play("skill", 0.1, 0.4)
	return r


## 대화 한 줄: "[팀] 이름: 문장" (전체에게 보낸 것은 [전체]), 보낸 팀 색. 4줄까지, 몇 초 뒤 사라진다.
func add_chat_line(team: int, who: String, text: String, to_all: bool) -> void:
	var l := _label("%s %s: %s" % ["[전체]" if to_all else "[팀]", who, text], 17, HORIZONTAL_ALIGNMENT_LEFT)
	l.add_theme_color_override("font_color", Enums.team_color(team).lightened(0.35))
	l.clip_text = true
	l.custom_minimum_size = Vector2(0, 26)
	chat_feed.add_child(l)
	while chat_feed.get_child_count() > 4:
		chat_feed.get_child(0).free()
	var tw := l.create_tween()
	tw.tween_interval(QuickChat.FEED_SECONDS - 0.6)
	tw.tween_property(l, "modulate:a", 0.0, 0.6)
	tw.tween_callback(l.queue_free)
