extends TestCase
## 빠른 대화: 보내는 간격 제한, 팀에게만·전체에게, 아군 AI 반응, 방장의 요청 확인

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Net.leave()
	Net.role = Net.Role.OFFLINE
	Net.slots = {}
	GameManager.match_config = null
	await super.after_each()


func _solo_battle() -> Node:
	GameManager.match_config = GameManager.default_config()
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	return battle


func _lines(battle: Node) -> Array:
	var out: Array = []
	for l in battle.hud.chat_feed.get_children():
		if not l.is_queued_for_deletion():
			out.append(l.text)
	return out


func test_rate_limit_and_hint() -> void:
	var battle: Node = await _solo_battle()
	var qc: QuickChat = battle.quick_chat
	var me: Hero = battle.player_hero
	eq(battle.hud.send_chat(QuickChat.WELL_DONE), QuickChat.Result.OK, "첫 문장은 보내짐")
	eq(battle.hud.send_chat(QuickChat.THANKS), QuickChat.Result.TOO_FAST, "1.5초 안에 또 보내면 막힘")
	check(battle.hud.message_label.text.contains("너무 자주"), "너무 자주 보냈다는 안내")
	eq(_lines(battle).size(), 1, "막힌 문장은 안 보임")
	check(_lines(battle)[0].begins_with("[팀] %s: 잘했어!" % me.display_name), "[팀] 이름: 문장 (%s)" % str(_lines(battle)))
	qc._last[me] -= QuickChat.RATE_SECONDS + 0.1
	eq(qc.player_say(QuickChat.THANKS), QuickChat.Result.OK, "시간이 지나면 다시 보내짐")
	eq(qc.player_say(99), QuickChat.Result.BAD, "없는 문장 번호")
	eq(qc.player_say(QuickChat.OK_REPLY), QuickChat.Result.BAD, "AI 대답용 문장은 사람이 못 보냄")
	for i in 5:
		qc.deliver(me.team, "아군", 4, false)
	eq(battle.hud.chat_feed.get_child_count(), 4, "대화는 4줄까지")
	battle.hud.toggle_chat_menu()
	check(battle.hud.chat_menu.visible, "대화 창 열기")
	battle.hud.toggle_chat_all()
	check(battle.hud.chat_to_all and battle.hud.chat_all_button.text.contains("전체"), "전체에게 바꾸기")
	battle.queue_free()


func test_team_filter() -> void:
	var battle: Node = await _solo_battle()
	var qc: QuickChat = battle.quick_chat
	var me: Hero = battle.player_hero
	var foe: int = Enums.Team.RED if me.team == Enums.Team.BLUE else Enums.Team.BLUE
	qc.deliver(foe, "상대", QuickChat.HELP, false)
	eq(_lines(battle).size(), 0, "상대 팀끼리 한 말은 안 보임")
	qc.deliver(foe, "상대", QuickChat.GOOD_GAME, true)
	eq(_lines(battle).size(), 1, "상대가 전체에게 한 말은 보임")
	check(_lines(battle)[0].begins_with("[전체] 상대: 좋은 경기였어"), "전체 표시")
	# 방장이 보낼 참가자: 블루 0(방장)·1(참가자 7), 레드 3(참가자 8), 관전자 9
	var humans := {0: 1, 1: 7, 3: 8}
	eq(QuickChat.peers_for(Enums.Team.BLUE, false, [7, 8, 9], humans), [7, 9], "블루 팀 말: 블루 참가자와 관전자만")
	eq(QuickChat.peers_for(Enums.Team.RED, false, [7, 8, 9], humans), [8, 9], "레드 팀 말: 레드 참가자와 관전자만")
	eq(QuickChat.peers_for(Enums.Team.BLUE, true, [7, 8, 9], humans), [7, 8, 9], "전체에게: 모두")
	battle.queue_free()


func test_ai_allies_react() -> void:
	var battle: Node = await _solo_battle()
	var qc: QuickChat = battle.quick_chat
	var me: Hero = battle.player_hero
	qc.reply_delay = Vector2(0.05, 0.05)
	me.global_position += Vector2(300, 0)
	eq(qc.player_say(QuickChat.HELP), QuickChat.Result.OK, "도와줘!")
	var plan: Dictionary = battle.ai_manager.plan_for(me.team)
	eq(plan.get("kind", ""), "gather", "아군 AI 가 내 쪽으로 모임")
	check(plan.get("pos", Vector2.ZERO).distance_to(me.global_position) < 1.0, "모이는 자리는 내 위치")
	await frames(20)
	var replied := false
	for t in _lines(battle):
		if t.contains("가는 중!"):
			replied = true
	check(replied, "아군 AI 가 대답함 (%s)" % str(_lines(battle)))
	qc._last[me] = -1000.0
	qc.player_say(QuickChat.RETREAT)
	eq(battle.ai_manager.plan_for(me.team).get("kind", ""), "retreat", "후퇴하자 → 아군 AI 가 물러남")
	var ai_c: AIController = battle.ai_manager.controllers.filter(func(c): return c.hero.team == me.team)[0]
	ai_c.think()
	eq(ai_c.state, AIController.State.RETREAT, "AI 가 우물로 감")
	qc._last[me] = -1000.0
	qc.player_say(QuickChat.BOSS)
	await frames(20)
	var no_boss := false
	for t in _lines(battle):
		if t.contains("지금은 보스가 없어"):
			no_boss = true
	check(no_boss, "보스가 없으면 그렇게 대답함")
	battle.queue_free()


func test_host_validates_requests() -> void:
	Net.role = Net.Role.HOST
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"])
	c.red_heroes = PackedStringArray(["gunslinger", "monk", "elf_archer"])
	c.mode = "lan"
	c.net_seed = 77
	c.net_humans = {0: 1, 3: 42}
	c.net_my_slot = 0
	c.player_index = 0
	c.net_my_team = Enums.Team.BLUE
	GameManager.match_config = c
	Net.slots = {0: {"peer": 1, "name": "방장", "hero": "blade_master"}, 3: {"peer": 42, "name": "친구", "hero": "gunslinger"}}
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var ns: NetSync = battle.net_sync
	var remote: Hero = battle.hero_manager.heroes[3]
	ns.handle_request(remote, "chat", [99, true])
	ns.handle_request(remote, "chat", [-1, true])
	ns.handle_request(remote, "chat", [QuickChat.OK_REPLY, true])
	ns.handle_request(remote, "chat", ["도와줘!", true])
	ns.handle_request(remote, "chat", [0])
	eq(_lines(battle).size(), 0, "잘못된 요청은 버림")
	ns.handle_request(remote, "chat", [QuickChat.HELP, false])
	eq(_lines(battle).size(), 0, "레드 참가자가 팀에게 한 말은 블루 방장에게 안 보임")
	eq(battle.ai_manager.plan_for(Enums.Team.RED).get("kind", ""), "gather", "레드 AI 는 참가자의 도와줘에 반응")
	ns.handle_request(remote, "chat", [QuickChat.GOOD_GAME, true])
	eq(_lines(battle).size(), 0, "1.5초 안에 다시 보낸 요청은 버림")
	battle.quick_chat._last[remote] = -1000.0
	ns.handle_request(remote, "chat", [QuickChat.GOOD_GAME, true])
	eq(_lines(battle).size(), 1, "전체에게 한 말은 보임")
	check(_lines(battle)[0].begins_with("[전체] 친구: 좋은 경기였어"), "참가자 이름으로 보임 (%s)" % str(_lines(battle)))
	battle.queue_free()


func test_client_shows_forwarded_line() -> void:
	Net.role = Net.Role.CLIENT
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"])
	c.red_heroes = PackedStringArray(["gunslinger", "monk", "elf_archer"])
	c.mode = "lan"
	c.net_seed = 77
	c.net_humans = {0: 1, 3: 42}
	c.net_my_slot = 3
	c.player_index = 0
	c.net_my_team = Enums.Team.RED
	GameManager.match_config = c
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(1)
	battle.net_sync._chat_event(Enums.Team.BLUE, "방장", QuickChat.HELP, false)
	eq(_lines(battle).size(), 0, "다른 팀의 팀 대화는 참가자에게도 안 보임")
	battle.net_sync._chat_event(Enums.Team.RED, "AI", QuickChat.ON_MY_WAY, false)
	eq(_lines(battle).size(), 1, "우리 팀 대화는 보임")
	battle.net_sync._chat_event(Enums.Team.RED, "AI", 500, false)
	eq(_lines(battle).size(), 1, "없는 문장 번호는 무시")
	Net.role = Net.Role.OFFLINE
	battle.queue_free()
