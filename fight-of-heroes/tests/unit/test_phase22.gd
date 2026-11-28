extends TestCase
## PHASE 22: 와이파이 대전 게임 방식(보스 레이드 협동·짧은 판), 참가자 결과 기록, 숙련도 메달 숨기기

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Net.leave()
	Net.role = Net.Role.OFFLINE
	Net.game_type = "normal"
	SaveManager.set_setting("lan_game_type", "normal")
	Net.spectators = {}
	GameManager.match_config = null
	await super.after_each()


func test_lan_raid_moves_red_humans_to_blue() -> void:
	Net.role = Net.Role.HOST
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}, 3: {"peer": 5, "name": "친구", "hero": "monk"}}
	Net.set_game_type("raid")
	check(not Net.slots.has(3), "레드 자리는 닫힘")
	var moved := false
	for s in Net.slots:
		if int(Net.slots[s].peer) == 5:
			moved = int(s) < 3
	check(moved, "레드에 있던 사람은 블루 빈자리로 옮김")
	eq(Net._free_slot(), 2, "새로 들어오면 블루 빈자리")
	Net._move_slot(5, 4)
	check(not Net.slots.has(4), "레이드에서는 레드 자리로 못 감")
	var cfg := Net.build_start_cfg()
	eq(cfg.red.size(), 0, "레이드 시작 설정은 레드 팀이 비어 있음")
	eq(cfg.game_type, "raid", "게임 방식이 설정에 들어감")


func test_lan_raid_full_blue_sends_extra_to_spectators() -> void:
	Net.role = Net.Role.HOST
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}, 1: {"peer": 2, "name": "가", "hero": "monk"},
		2: {"peer": 3, "name": "나", "hero": "saint"}, 3: {"peer": 4, "name": "다", "hero": "ninja"}}
	Net.set_game_type("raid")
	check(Net.spectators.has(4), "블루가 차 있으면 관전으로")


func test_lan_quick_start_applies_rules() -> void:
	Net.role = Net.Role.HOST
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}}
	Net.game_type = "quick"
	var cfg := Net.build_start_cfg()
	var c := MatchConfig.new()
	c.kill_target = 15
	c.apply_game_type(str(cfg.game_type))
	eq(c.kill_target, 5, "짧은 판은 5킬")
	eq(c.start_level, 6, "6레벨로 시작")


func test_client_end_event_copies_host_feats() -> void:
	Net.role = Net.Role.CLIENT
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"])
	c.red_heroes = PackedStringArray(["gunslinger", "monk", "elf_archer"])
	c.mode = "lan"
	c.net_humans = {0: 1, 3: 42}
	c.net_my_slot = 3
	c.player_index = 0
	c.net_my_team = Enums.Team.RED
	GameManager.match_config = c
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(1)
	var stats: Array = []
	for i in 6:
		stats.append([{"best_multi": 3 if i == 3 else 0, "boss_kills": 2 if i == 3 else 0, "final_boss_kills": 0, "wards": 1}, 1000 * i, 2000 * i, 500 + i])
	battle.net_sync._end_event(Enums.Team.RED, "kills", stats)
	var me: Hero = battle.player_hero
	var s: Dictionary = battle.battle_manager.summary()
	var mine: Dictionary = {}
	for e in s.heroes:
		if e.is_player:
			mine = e
	eq(int(mine.get("best_multi", 0)), 3, "트리플 킬 기록을 방장에게서 받음")
	eq(int(mine.get("boss_kills", 0)), 2, "보스 처치 기록")
	eq(int(mine.get("damage", 0)), 3000, "준 피해")
	check(battle.battle_manager.match_over, "경기 끝")
	check(me != null, "내 영웅")
	Net.role = Net.Role.OFFLINE
	battle.queue_free()


func test_lobby_shows_game_type_row() -> void:
	var scr: Control = load(GameManager.LAN_SCENE).instantiate()
	add_child(scr)
	await frames(1)
	Net.host()
	await frames(2)
	check(scr.find_child("GameType_raid", true, false) != null, "게임 방식 고르기")
	(scr.find_child("GameType_raid", true, false) as Button).pressed.emit()
	await frames(2)
	eq(Net.game_type, "raid", "방장이 보스 레이드를 고름")
	check(scr.find_child("Slot3", true, false) == null, "레드 자리는 보이지 않음")
	scr.on_back()
	scr.queue_free()
