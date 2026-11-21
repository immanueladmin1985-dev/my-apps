extends TestCase
## 밴 단계(혼자 하기·와이파이 대전)와 와이파이 대전 관전 자리

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Net.leave()
	Net.role = Net.Role.OFFLINE
	GameManager.match_config = null
	await super.after_each()


func test_ban_order() -> void:
	var b := BanPhase.new()
	eq(b.current_team(), Enums.Team.BLUE, "블루가 먼저")
	eq(b.turn_text(), "블루 팀 밴 1/2", "차례 글자")
	check(b.ban("monk"), "블루 첫 금지")
	eq(b.current_team(), Enums.Team.RED, "다음은 레드")
	eq(b.turn_text(), "레드 팀 밴 1/2", "레드 차례 글자")
	check(not b.ban("monk"), "이미 금지한 영웅은 못 금지")
	check(not b.ban("없는영웅"), "없는 영웅은 못 금지")
	check(b.ban("saint"), "레드 첫 금지")
	eq(b.turn_text(), "블루 팀 밴 2/2", "블루 두 번째")
	check(b.ban("ninja"), "블루 두 번째 금지")
	eq(b.current_team(), Enums.Team.RED, "마지막은 레드")
	check(b.ban("reaper"), "레드 두 번째 금지")
	check(b.done(), "네 번 금지하면 끝")
	eq(b.current_team(), -1, "끝나면 차례 없음")
	check(not b.ban("paladin"), "끝난 뒤에는 못 금지")
	eq(b.bans, ["monk", "saint", "ninja", "reaper"], "금지 순서")


func test_ai_bans() -> void:
	var banned := ["reaper", "ninja"]
	for i in 60:
		var id := BanPhase.choose_ai_ban(banned, ["assassin"])
		check(DataRegistry.hero(id) != null, "있는 영웅")
		check(not banned.has(id), "이미 금지한 영웅은 고르지 않음")
		check(id != "assassin", "지킬 영웅은 고르지 않음")
	var b := BanPhase.new()
	for i in 4:
		check(b.ai_ban() != "", "AI 가 차례마다 금지")
	check(b.done(), "AI 만으로도 끝남")
	var uniq := {}
	for id in b.bans:
		uniq[id] = true
	eq(uniq.size(), 4, "서로 다른 영웅 4명")
	eq(BanPhase.allowed(b.bans).size(), DataRegistry.ids("heroes").size() - 4, "남은 영웅")


func test_banned_heroes_excluded_from_random_teams() -> void:
	var bans := PackedStringArray(["monk", "saint", "ninja", "reaper"])
	for i in 30:
		var c := GameManager.default_config("blade_master", 3, bans)
		eq(c.bans, bans, "설정에 금지 목록")
		for id in Array(c.blue_heroes) + Array(c.red_heroes):
			check(not bans.has(id), "무작위 팀에 금지된 영웅(%s)이 없음" % id)
	var order := GameManager.pick_order("blade_master", bans)
	for id in bans:
		check(not order.has(id), "뽑을 순서에 금지된 영웅이 없음")


func test_new_game_ban_flow() -> void:
	var scr: Control = load(GameManager.NEW_GAME_SCENE).instantiate()
	add_child(scr)
	await frames(2)
	scr.set_ban_on(true)
	check(scr.find_child("BanToggle", true, false) != null, "밴 단계 설정 버튼")
	scr.select_hero("monk")
	scr.start_pressed()
	await frames(1)
	check(scr.ban_overlay != null and scr.find_child("BanBoard", true, false) != null, "시작을 누르면 밴 화면")
	eq(scr.ban_board.turn_label.text, "블루 팀 밴 1/2", "차례 표시")
	check(scr.ban_board.time_label.text.contains("20"), "20초 타이머")
	check(scr.player_ban("monk"), "블루(나)가 금지 (내 영웅이어도 됨)")
	check(not scr.player_ban("saint"), "레드 차례에는 내가 금지할 수 없음")
	var b: Button = scr.ban_board.hero_buttons["monk"]
	check(b.disabled and b.get_node("Cross").visible, "금지한 영웅은 흐리고 X")
	check(scr.ai_ban() != "", "레드(AI) 금지")
	# 시간이 다 되면 대신 금지한다.
	scr.ban_left = 0.01
	await frames(3)
	eq(scr.ban_phase.turn, 3, "시간이 지나 자동으로 금지")
	check(not scr.ban_phase.bans.has("monk") or scr.ban_phase.bans.count("monk") == 1, "같은 영웅을 두 번 금지하지 않음")
	await frames(int(BanPhase.AI_DELAY * 60) + 10)
	check(scr.ban_phase == null or scr.ban_phase.done(), "레드 AI 가 기다렸다가 금지")
	await frames(80)
	check(scr.bans_done and scr.ban_overlay == null, "끝나면 영웅 고르기로 돌아감")
	eq(scr.bans.size(), 4, "금지 4명")
	check(not scr.bans.has(scr.slots[0]), "금지된 내 영웅은 다른 영웅으로 바뀜")
	for hb in scr.hero_buttons:
		if scr.bans.has(hb.get_meta("id")):
			check(hb.disabled, "영웅 고르기에서 금지된 영웅은 못 누름")
	scr._on_hero(scr.bans[0])
	check(scr.slots[0] != scr.bans[0], "금지된 영웅을 눌러도 안 바뀜")
	scr._set_team_mode("manual")
	var c: MatchConfig = scr.build_config()
	eq(c.bans, scr.bans, "경기 설정에 금지 목록")
	for id in Array(c.blue_heroes) + Array(c.red_heroes):
		check(not scr.bans.has(id), "직접 구성의 빈칸에도 금지된 영웅이 없음")
	scr._set_team_mode("random")
	scr.set_ban_on(false)
	check(scr.build_config().bans.is_empty(), "밴 단계를 끄면 금지가 풀림")
	scr.queue_free()


func _host_room() -> void:
	Net.role = Net.Role.HOST
	Net._reset_room_extras()
	Net.ban_enabled = true
	Net.slots = {
		0: {"peer": 1, "name": "방장", "hero": "blade_master"},
		1: {"peer": 5, "name": "친구", "hero": "saint"},
		3: {"peer": 7, "name": "상대", "hero": "gunslinger"},
	}


func test_lan_ban_validation() -> void:
	_host_room()
	Net.start_match()
	eq(Net.ban_turn, 0, "시작하기를 누르면 밴 단계부터")
	eq(Net.current_banner_peer(), 1, "블루 금지는 블루의 첫 사람(방장)")
	check(Net.my_ban_turn(), "방장 차례")
	Net._move_slot(5, 2)
	check(Net.slots.has(1), "밴 중에는 자리를 못 옮김")
	check(not Net._do_ban(5, "monk"), "블루의 둘째 사람은 금지 못 함")
	check(not Net._do_ban(7, "monk"), "상대 팀은 블루 차례에 금지 못 함")
	check(not Net._do_ban(1, "없는영웅"), "없는 영웅은 못 금지")
	check(Net._do_ban(1, "monk"), "방장이 금지")
	eq(Net.current_banner_peer(), 7, "레드 금지는 레드의 첫 사람")
	check(not Net._do_ban(1, "ninja"), "레드 차례에 블루는 못 함")
	check(not Net._do_ban(7, "monk"), "이미 금지한 영웅은 못 금지")
	check(Net._do_ban(7, "blade_master"), "레드가 방장의 영웅을 금지")
	# 블루 두 번째: 시간이 다 되면 방장이 대신 고른다.
	Net._ban_tick(BanPhase.TURN_SECONDS + 1.0)
	eq(Net.ban_turn, 3, "시간이 지나 대신 금지")
	check(not Net.bans.has("saint"), "대신 고를 때 우리 팀 영웅은 피함")
	# 레드 사람이 나가면 AI 가 금지한다.
	Net.slots.erase(3)
	eq(Net.current_banner_peer(), 0, "사람이 없는 팀은 AI")
	check(not Net._do_ban(7, "paladin"), "나간 사람의 요청은 무시")
	Net._ban_tick(BanPhase.AI_DELAY + 0.1)
	eq(Net.bans.size(), 4, "AI 가 금지")
	check(Net.bans_done and Net.ban_turn == -1, "밴이 끝나면 방으로")
	check(not Net.bans.has(Net.slots[0].hero), "금지된 영웅을 고른 사람은 다른 영웅으로 바뀜")
	Net._set_hero(1, "monk")
	check(Net.slots[0].hero != "monk", "금지된 영웅은 고를 수 없음")
	var cfg := Net.build_start_cfg()
	eq(cfg.bans.size(), 4, "경기 설정에 금지 목록")
	var all: Array = cfg.blue + cfg.red
	for id in all:
		check(id != "" and not Net.bans.has(id), "AI 빈자리에도 금지된 영웅(%s)이 없음" % id)
	Net.set_ban_enabled(false)
	check(Net.bans.is_empty() and not Net.bans_done, "밴 단계를 끄면 금지가 풀림")


func test_lan_spectators() -> void:
	Net.role = Net.Role.HOST
	Net._reset_room_extras()
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}}
	for i in range(1, 6):
		Net.slots[i] = {"peer": 10 + i, "name": "사람%d" % i, "hero": "monk" if i >= 3 else ["saint", "ninja"][i - 1]}
	check(Net.add_joiner(20, "관전1", "reaper"), "자리가 차면 관전으로")
	check(Net.spectators.has(20), "관전자 목록")
	check(Net.add_joiner(21, "관전2", "reaper"), "관전 두 명까지")
	check(not Net.add_joiner(22, "관전3", "reaper"), "관전 자리도 차면 못 들어옴")
	eq(Net.spectators.size(), 2, "관전 2명")
	eq(Net._human_count(), 8, "방 알림의 사람 수")
	Net._move_slot(20, 2)
	check(Net.spectators.has(20), "찬 자리로는 못 감")
	Net.slots.erase(2)
	Net._move_slot(20, 2)
	check(not Net.spectators.has(20) and int(Net.slots[2].peer) == 20, "관전자가 빈자리에 앉음")
	eq(Net.slots[2].hero, "reaper", "관전 전에 고른 영웅")
	check(not Net._to_spectator(1), "방장은 관전할 수 없음")
	check(Net.add_joiner(22, "관전3", "reaper") and Net.spectators.size() == 2, "자리가 비면 다시 관전 자리")
	check(not Net._to_spectator(13), "관전 자리가 차면 못 옮김")
	Net.spectators.erase(21)
	check(Net._to_spectator(13) and not Net.slots.has(3), "참가자가 관전으로 옮김")
	var cfg := Net.build_start_cfg()
	for e in cfg.humans:
		check(int(e[1]) != 13, "관전자는 경기의 사람 자리에 없음")


func test_lan_lobby_ban_screen() -> void:
	var scr: Control = load(GameManager.LAN_SCENE).instantiate()
	add_child(scr)
	await frames(2)
	if Net.host() != OK:
		# 다른 시험이 포트를 쓰고 있으면 건너뛴다.
		scr.queue_free()
		return
	Net.set_ban_enabled(true)
	await frames(1)
	check(scr.find_child("BanToggle", true, false) != null, "방장은 밴 단계 켜기 버튼")
	check(scr.find_child("Spectators", true, false) != null, "관전 줄")
	Net.start_match()
	await frames(2)
	var board: BanBoard = scr.find_child("BanBoard", true, false)
	check(board != null, "밴 화면")
	if board == null:
		scr.queue_free()
		return
	eq(board.turn_label.text, "블루 팀 밴 1/2", "차례 표시")
	(board.hero_buttons["ninja"] as Button).pressed.emit()
	(board.find_child("BanButton", true, false) as Button).pressed.emit()
	await frames(2)
	eq(Net.bans, ["ninja"], "방장이 금지")
	await frames(int(BanPhase.AI_DELAY * 60) + 20)
	eq(Net.bans.size(), 2, "사람이 없는 레드는 AI 가 금지")
	board = scr.find_child("BanBoard", true, false)
	check(board != null and board.hero_buttons["ninja"].disabled, "금지한 영웅은 못 누름")
	scr.queue_free()


func test_spectator_client_battle() -> void:
	Net.role = Net.Role.CLIENT
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"])
	c.red_heroes = PackedStringArray(["gunslinger", "monk", "elf_archer"])
	c.mode = "lan"
	c.net_seed = 77
	c.net_humans = {0: 1, 3: 42}
	c.net_my_slot = -1
	c.player_index = -1
	c.net_spectator = true
	GameManager.match_config = c
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	check(battle.player_hero == null and battle.player_controller == null, "관전자는 영웅이 없음")
	check(battle.ai_manager.controllers.is_empty(), "관전자 화면에는 AI 가 없음")
	for h in battle.hero_manager.heroes:
		check(FogOfWar.can_see(h), "안개 없이 모두 보임 (%s)" % h.data.id)
	var ns: NetSync = battle.net_sync
	ns._snapshot([5.0, 0, 0, PackedInt32Array(), [], [[1000, 1000]], [[Enums.Team.BLUE, 900, 900, 30.0], [Enums.Team.RED, 1900, 900, 30.0]]])
	eq(get_tree().get_nodes_in_group("coins").size(), 1, "금화")
	eq(get_tree().get_nodes_in_group("wards").size(), 2, "관전자는 두 팀 와드를 모두 봄")
	ns._ping_event(Enums.Team.BLUE, "attack", 100.0, 100.0)
	ns._me([777, 10.0, 2, [1, 0, 0, 0], [0.0, 0.0, 0.0, 0.0], [5.0, 5.0, 5.0, 5.0], [0.0, 0.0, 0.0, 0.0], [], {}, "gunslinger"])
	battle.look_at_point(Vector2(2000, 2000))
	check(battle.free_look, "미니맵처럼 원하는 곳을 봄")
	Net.role = Net.Role.OFFLINE
	battle.queue_free()
