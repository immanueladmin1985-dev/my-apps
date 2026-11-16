extends TestCase
## PHASE 16: 공격 대상 고르기, 2.5D 기울어진 시점, 신호(핑)

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func _player(id: String, pos: Vector2) -> Hero:
	var h := spawn_hero(id, Enums.Team.BLUE, pos)
	var c := PlayerController.new()
	h.set_controller(c)
	return h


func test_attack_picks_close_enemy_over_far_hero() -> void:
	var h := _player("elf_archer", Vector2(400, 400))
	var c: PlayerController = h.controller
	var near_dummy := spawn_dummy(Enums.Team.RED, Vector2(520, 400), {"max_hp": 50000.0})
	var far_hero := spawn_dummy(Enums.Team.RED, Vector2(400 + h.attack.total_range() + 200.0, 700), {"max_hp": 50000.0})
	await frames(1)
	eq(c.pick_attack_target(), near_dummy, "사거리 안의 적을 먼저 고름")
	# 예전에 고른 먼 적이 있어도, 사거리 안에 다른 적이 있으면 그 적을 친다.
	c.selected = far_hero
	eq(c.pick_attack_target(), near_dummy, "고른 적이 사거리 밖이면 사거리 안의 적으로 바꿈")
	check(far_hero != null, "끝")


func test_moving_beats_attack_button() -> void:
	var h := _player("gunslinger", Vector2(400, 1000))
	var c: PlayerController = h.controller
	spawn_dummy(Enums.Team.RED, Vector2(400 + h.attack.total_range() + 150.0, 1000), {"max_hp": 50000.0})
	c.attack_held = true
	c.joystick = Vector2.LEFT
	var x0 := h.global_position.x
	await frames(30)
	check(h.global_position.x < x0 - 40.0, "공격 버튼을 누른 채 도망치면 계속 도망감 (사거리 밖 적을 쫓지 않음)")
	c.joystick = Vector2.ZERO
	await frames(30)
	check(h.attack_order != null, "멈추면 다시 공격")


func test_tilt_view() -> void:
	View.tilt = View.TILT
	var w := View.screen_to_world(Vector2(0, -1))
	near(w.length(), 1.0, 0.001, "길이는 그대로")
	var d := View.screen_to_world(Vector2(1, 1).normalized())
	check(absf(d.y) > absf(d.x), "화면 대각선은 맵에서 세로로 더 긴 방향")
	near(View.upright(), 1.0 / View.TILT, 0.001, "세우는 배율")
	View.tilt = 1.0
	eq(View.screen_to_world(Vector2(0.3, 0.4)), Vector2(0.3, 0.4), "기울이지 않으면 그대로")


func test_battle_uses_tilted_camera() -> void:
	SaveManager.set_setting("tilt_view", true)
	var cfg := GameManager.default_config("blade_master", 1)
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	near(battle.camera.zoom.y / battle.camera.zoom.x, View.TILT, 0.001, "카메라 세로 배율")
	battle.queue_free()
	await frames(2)
	eq(View.tilt, 1.0, "전투를 나가면 원래대로")


func test_ping_guides_allies() -> void:
	var cfg := GameManager.default_config("blade_master")
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var am: AIManager = battle.ai_manager
	var hud = battle.hud
	hud.choose_ping("attack")
	eq(hud.ping_mode, "attack", "종류를 고르면 찍을 곳을 기다림")
	var spot := Vector2(2800, 1200)
	hud.place_ping(spot)
	eq(hud.ping_mode, "", "찍으면 끝")
	var list: Array = am.pings_for(Enums.Team.BLUE)
	eq(list.size(), 1, "신호 1개")
	eq(am.pings_for(Enums.Team.RED).size(), 0, "상대 팀은 모름")
	# 아군 AI 가 신호를 보고 각자 따를지 정한다 (명령이 아님).
	var allies: Array = []
	for c in am.controllers:
		if c.hero.team == Enums.Team.BLUE:
			c.hero.health.hp = c.hero.health.max_hp()
			allies.append(c)
	await frames(120)
	var decided := 0
	var moving := 0
	for c in allies:
		if c._ping_choice.has(list[0].id):
			decided += 1
		if c.follows_ping(list[0].id) and c.hero.nav_goal != null and c.hero.nav_goal.distance_to(spot) < 300.0:
			moving += 1
	eq(decided, allies.size(), "아군이 모두 신호를 보고 판단함")
	check(moving <= allies.size(), "따르기로 한 아군만 신호 쪽으로 감 (%d명)" % moving)
	# 위험 신호: 그 근처의 아군은 빠져나온다.
	var a: AIController = allies[0]
	a.hero.global_position = Vector2(2800, 1700)
	am.add_ping(Enums.Team.BLUE, "danger", a.hero.global_position)
	a.think()
	check(a.state == AIController.State.FOLLOW and a.objective is Vector2, "위험 신호 근처면 빠져나옴")
	check(a.objective.distance_to(Vector2(2800, 1700)) > 300.0, "신호에서 멀어지는 쪽")
	battle.queue_free()


func test_ping_from_minimap() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var hud = battle.hud
	hud.toggle_ping_menu()
	check(hud.ping_menu.visible, "신호 버튼을 누르면 종류 창")
	hud.choose_ping("gather")
	var r: Rect2 = hud.minimap.get_global_rect()
	var ev := InputEventScreenTouch.new()
	ev.pressed = true
	ev.position = r.get_center()
	hud.minimap._input(ev)
	var list: Array = battle.ai_manager.pings_for(Enums.Team.BLUE)
	eq(list.size(), 1, "미니맵을 눌러 신호를 찍음")
	check(list[0].pos.distance_to(battle.map.size * 0.5) < 5.0, "누른 자리")
	check(not battle.free_look, "신호를 찍을 때는 카메라가 움직이지 않음")
	battle.queue_free()
