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
var pause_button: Button
var pause_panel: Control
var result_panel: Control
var result_title: Label
var result_detail: Label
var minimap: Minimap
var blue_status: TeamStatus
var red_status: TeamStatus
var kill_feed: VBoxContainer
var xp_bar: StatBar
var gold_label: Label
var boss_label: Label
var boss_bar: StatBar
var monster_manager: MonsterManager

var _message_left := 0.0


func _ready() -> void:
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
	for n in [joystick, attack_button, hp_bar, mp_bar, xp_bar, gold_label, name_label] + skill_buttons:
		n.visible = playable
	if not playable:
		return
	attack_button.hero = hero
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
		b.learn_pressed.connect(func(slot): hero.learn(slot))
		b.pressed_down.connect(_on_skill_down)
		b.aim_changed.connect(_on_skill_aim)
		b.released.connect(_on_skill_released)
	controller.cast_failed.connect(show_message)
	hero.leveled_up.connect(func(lv): show_message("레벨 %d! 스킬 버튼의 + 를 눌러 스킬을 올리세요" % lv))
	name_label.text = "%s · %s" % [hero.display_name, hero.data.role]


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
	var h := 120.0
	minimap.offset_bottom = minimap.offset_top + h
	minimap.offset_right = minimap.offset_left + h * map.size.x / map.size.y
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
	gold_label = _label("0 G", 20, HORIZONTAL_ALIGNMENT_LEFT)
	gold_label.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	_place(gold_label, Vector2(0.5, 1), Vector2(208, -66), Vector2(140, 28))
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
	_place(red_status, Vector2(1, 0), Vector2(-268, 6), Vector2(170, 52))
	root.add_child(red_status)
	minimap = Minimap.new()
	minimap.name = "Minimap"
	_place(minimap, Vector2(0, 0), Vector2(12, 66), Vector2(206, 120))
	root.add_child(minimap)
	fps_label = _label("", 13, HORIZONTAL_ALIGNMENT_LEFT)
	_place(fps_label, Vector2(0, 0), Vector2(14, 188), Vector2(200, 20))
	root.add_child(fps_label)
	kill_feed = VBoxContainer.new()
	kill_feed.name = "KillFeed"
	kill_feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	kill_feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(kill_feed, Vector2(1, 0), Vector2(-430, 76), Vector2(420, 120))
	root.add_child(kill_feed)
	message_label = _label("", 22, HORIZONTAL_ALIGNMENT_CENTER)
	_place(message_label, Vector2(0.5, 0), Vector2(-320, 118), Vector2(640, 36))
	root.add_child(message_label)

	pause_button = Button.new()
	pause_button.name = "PauseButton"
	pause_button.text = "II"
	pause_button.add_theme_font_size_override("font_size", 26)
	pause_button.focus_mode = Control.FOCUS_NONE
	_place(pause_button, Vector2(1, 0), Vector2(-84, 10), Vector2(70, 58))
	pause_button.pressed.connect(set_paused.bind(true))
	root.add_child(pause_button)

	pause_panel = _make_dialog("일시정지", [
		["계속하기", set_paused.bind(false)],
		["다시 시작", func(): GameManager.restart_match()],
		["처음 화면", func(): GameManager.go_main()],
	])
	result_panel = _make_dialog("", [
		["다시 하기", func(): GameManager.restart_match()],
		["처음 화면", func(): GameManager.go_main()],
	])
	result_title = result_panel.get_node("Box/Title")
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
	fps_label.text = "FPS %d" % Engine.get_frames_per_second()
	if battle != null:
		var t := int(battle.elapsed)
		time_label.text = "%02d:%02d" % [t / 60, t % 60]
		if monster_manager != null:
			var fb := int(ceil(monster_manager.time_to_final_boss()))
			if fb > 0:
				time_label.text += "  ·  최종 보스 %d:%02d" % [fb / 60, fb % 60]
	_update_boss_bar()
	if hero != null and controller != null:
		hp_bar.set_values(hero.health.hp, hero.health.max_hp(), hero.health.shield_total())
		mp_bar.set_values(hero.mana.mp, hero.mana.max_mp())
		xp_bar.set_values(hero.xp_ratio(), 1.0)
		gold_label.text = "%d G" % hero.gold
		cancel_zone.visible = controller.aiming_slot >= 0 and controller.aim_dragged
		if hero.is_dead:
			name_label.text = "부활까지 %d초" % ceili(hero.respawn_left)
		else:
			name_label.text = "%s · Lv.%d" % [hero.display_name, hero.level]
	if _message_left > 0.0:
		_message_left -= delta
		message_label.modulate.a = clampf(_message_left / 0.4, 0.0, 1.0)
		if _message_left <= 0.0:
			message_label.text = ""


## 화면 가운데(카메라) 가까이에 살아 있는 보스가 있으면 이름과 체력 막대를 보여 준다.
func _update_boss_bar() -> void:
	var cam := get_viewport().get_camera_2d()
	var boss = null
	if cam != null:
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
	if hero != null and victim == hero:
		show_message("처치당했습니다. 우물에서 부활합니다")
	elif hero != null and killer == hero:
		show_message("%s 처치!" % victim.display_name)


func _on_score(blue: int, red: int) -> void:
	score_label.text = "블루 %d : %d 레드" % [blue, red]


func _on_skill_down(slot: int) -> void:
	controller.begin_aim(slot)


func _on_skill_aim(slot: int, vec: Vector2) -> void:
	controller.update_aim(slot, vec)


func _on_skill_released(slot: int, vec: Vector2, dragged: bool, cancelled: bool) -> void:
	controller.end_aim(slot, vec, dragged, cancelled)


func set_paused(p: bool) -> void:
	if battle != null and battle.match_over:
		return
	get_tree().paused = p
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
	_release_all_touches()
	await get_tree().create_timer(1.2).timeout
	get_tree().paused = true
	result_panel.visible = true
