extends TestCase
## PHASE 20: 같은 와이파이 대전 (로비 자리·영웅 정하기, 방장 쪽 원격 조작, 참가자 쪽 상태 맞추기), 메뉴 화면

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Net.leave()
	Net.role = Net.Role.OFFLINE
	GameManager.match_config = null
	await super.after_each()


func _lan_config(humans: Dictionary, my_slot := 0) -> MatchConfig:
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"])
	c.red_heroes = PackedStringArray(["gunslinger", "monk", "elf_archer"])
	c.mode = "lan"
	c.net_seed = 77
	c.net_humans = humans
	c.net_my_slot = my_slot
	c.player_index = my_slot % 3
	c.net_my_team = Enums.Team.BLUE if my_slot < 3 else Enums.Team.RED
	return c


func test_lobby_slots_balance_and_unique_heroes() -> void:
	Net.role = Net.Role.HOST
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}}
	eq(Net._free_slot(), 3, "사람이 적은 팀(레드)부터 채움")
	Net.slots[3] = {"peer": 5, "name": "친구", "hero": "monk"}
	eq(Net._free_slot(), 1, "같으면 블루")
	eq(Net._unique_hero(1, "blade_master"), Net._unique_hero(1, "blade_master"), "같은 값")
	check(Net._unique_hero(1, "blade_master") != "blade_master", "같은 팀이 이미 고른 영웅은 못 고름")
	eq(Net._unique_hero(4, "blade_master"), "blade_master", "상대 팀과는 겹쳐도 됨")
	Net._move_slot(5, 1)
	check(Net.slots.has(1) and not Net.slots.has(3) and int(Net.slots[1].peer) == 5, "자리 옮기기")
	Net._move_slot(5, 0)
	check(int(Net.slots[0].peer) == 1, "이미 찬 자리로는 못 감")


func test_lobby_screen_builds() -> void:
	var scr: Control = load(GameManager.LAN_SCENE).instantiate()
	add_child(scr)
	await frames(2)
	check(scr.find_child("HostButton", true, false) != null, "방 만들기 버튼")
	check(scr.find_child("Rooms", true, false) != null, "찾은 방 목록")
	check(scr.find_child("IpEdit", true, false) != null, "IP 로 들어가기")
	Net.host()
	await frames(2)
	check(Net.is_host(), "방을 만듦")
	check(scr.find_child("StartButton", true, false) != null, "방장은 시작하기 버튼")
	check(scr.find_child("Slot0", true, false) != null and scr.find_child("Slot5", true, false) != null, "자리 여섯 개")
	check(scr.find_child("Hero_monk", true, false) != null, "영웅 고르기")
	(scr.find_child("Hero_monk", true, false) as Button).pressed.emit()
	await frames(2)
	eq(Net.slots[0].hero, "monk", "영웅을 바꿈")
	scr.on_back()
	await frames(1)
	check(not Net.is_online(), "방 나가기")
	scr.queue_free()


func test_host_battle_remote_controller() -> void:
	Net.role = Net.Role.HOST
	GameManager.match_config = _lan_config({0: 1, 3: 42})
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	check(battle.net_sync != null, "동기화 장치")
	var remote: Hero = battle.hero_manager.heroes[3]
	check(remote.controller is RemoteController, "참가자 영웅은 원격 조작")
	check(battle.hero_manager.heroes[4].controller is AIController, "빈자리는 AI")
	check(battle.player_hero == battle.hero_manager.heroes[0], "방장 영웅")
	eq(remote.net_id, 3, "영웅 번호는 자리 번호")
	check(not battle.can_save(), "와이파이 대전은 이어 하기 저장을 안 함")
	var p0 := remote.global_position
	remote.controller.move = Vector2.LEFT
	await frames(20)
	check(remote.global_position.x < p0.x - 20.0, "참가자가 보낸 방향으로 움직임")
	battle.hud.set_paused(true)
	check(not get_tree().paused, "메뉴를 열어도 경기는 멈추지 않음")
	battle.hud.set_paused(false)
	battle.queue_free()


func test_client_applies_snapshot() -> void:
	Net.role = Net.Role.CLIENT
	GameManager.match_config = _lan_config({0: 1, 3: 42}, 3)
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(1)
	var me: Hero = battle.player_hero
	check(me == battle.hero_manager.heroes[3] and me.team == Enums.Team.RED, "참가자는 자기 자리 영웅을 조작")
	check(battle.ai_manager.controllers.is_empty(), "참가자 화면에는 AI 가 없음")
	var ns: NetSync = battle.net_sync
	ns._snapshot([12.5, 2, 1, PackedInt32Array([100]), [], [], []])
	var e := [1500, 1600, 1.0, 0.0, 300, 900, 50, 400, 80, false, 0.0, 4, 0.0, 6, false, PackedStringArray(), 3, 1, 2, 0.0, false]
	ns._heroes(3, [e])
	ns._monsters([[100, "wolf", Enums.Team.NEUTRAL, 2000, 2000, 1, 120, 300, false, -1, null, 1, false]])
	eq(battle.battle_manager.elapsed, 12.5, "경기 시간")
	eq(battle.battle_manager.kills[Enums.Team.BLUE], 2, "킬 수")
	eq(me.net_pos, Vector2(1500, 1600), "따라갈 위치")
	eq(me.health.hp, 300.0, "체력")
	eq(me.health.max_hp(), 900.0, "최대 체력")
	eq(me.health.shield_total(), 80.0, "보호막")
	eq(me.level, 4, "레벨")
	eq(me.kills, 3, "처치")
	var m = ns.unit_by_id(100)
	check(m != null and m is Monster and m.data.id == "wolf", "몬스터를 만듦")
	ns._snapshot([13.0, 2, 1, PackedInt32Array(), [], [], []])
	check(ns.unit_by_id(100) == null, "목록에서 빠진 몬스터는 지움")
	ns._me([777, 10.0, 2, [1, 0, 0, 0], [0.0, 0.0, 0.0, 0.0], [5.0, 5.0, 5.0, 5.0], [0.0, 0.0, 0.0, 0.0], [["health_potion", 2], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]], {}, "gunslinger"])
	eq(me.gold, 777, "골드")
	eq(me.inventory.count_of("health_potion"), 2, "아이템 칸")
	eq(me.skill_caster.ranks[0], 1, "스킬 단계")
	Net.role = Net.Role.OFFLINE
	battle.queue_free()


func test_main_menu_has_lan() -> void:
	var scr: Control = load(GameManager.MAIN_SCENE).instantiate()
	add_child(scr)
	await frames(2)
	var found := false
	for b in scr.find_children("*", "Button", true, false):
		if b.text.contains("와이파이"):
			found = true
	check(found, "처음 화면에 와이파이 대전")
	scr.queue_free()
