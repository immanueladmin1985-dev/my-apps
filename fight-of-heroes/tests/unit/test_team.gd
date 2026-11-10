extends TestCase
## 팀 기능: 도움 처리, 승패 판정은 한 번만, 아군 겹침 방지, 리더 따라가기, 아군 지원, 집중 공격 대상.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func _battle_manager(kill_target := 15) -> BattleManager:
	var bm := BattleManager.new()
	world.add_child(bm)
	var cfg := MatchConfig.new()
	cfg.kill_target = kill_target
	bm.setup(cfg)
	return bm


func test_kill_and_assist() -> void:
	var bm := _battle_manager()
	var victim := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"max_hp": 300.0})
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(400, 500), {})
	var b := spawn_dummy(Enums.Team.BLUE, Vector2(600, 500), {})
	var c := spawn_dummy(Enums.Team.BLUE, Vector2(700, 500), {})
	CombatManager.apply_damage(victim, DamageInfo.new(a, 100.0, Enums.DamageType.TRUE))
	CombatManager.apply_damage(victim, DamageInfo.new(b, 250.0, Enums.DamageType.TRUE))
	check(victim.is_dead, "처치")
	eq(b.kills, 1, "마지막 일격 = 처치")
	eq(a.assists, 1, "피해를 준 아군 = 도움")
	eq(c.assists, 0, "피해를 주지 않은 아군은 도움 없음")
	eq(bm.kills[Enums.Team.BLUE], 1, "팀 킬 점수")
	eq(victim.deaths, 1, "사망 수")


func test_assist_window_expires() -> void:
	var bm := _battle_manager()
	var victim := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"max_hp": 100.0})
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(400, 500), {})
	var b := spawn_dummy(Enums.Team.BLUE, Vector2(600, 500), {})
	victim.recent_attackers[a] = Unit.now() - 20.0
	CombatManager.apply_damage(victim, DamageInfo.new(b, 200.0, Enums.DamageType.TRUE))
	eq(a.assists, 0, "10초보다 오래된 피해는 도움이 아님")
	eq(bm.kills[Enums.Team.BLUE], 1, "킬 점수")


func test_kill_by_status_credits_last_attacker() -> void:
	var bm := _battle_manager()
	var victim := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"max_hp": 100.0})
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(400, 500), {})
	CombatManager.apply_damage(victim, DamageInfo.new(a, 50.0, Enums.DamageType.TRUE))
	CombatManager.apply_damage(victim, DamageInfo.new(null, 80.0, Enums.DamageType.TRUE))
	eq(a.kills, 1, "출처 없는 피해로 죽으면 최근에 때린 적이 처치")
	eq(bm.kills[Enums.Team.BLUE], 1, "킬 점수")


func test_victory_once() -> void:
	var bm := _battle_manager(2)
	var ends := [0]
	bm.ended.connect(func(_t, _r): ends[0] += 1)
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(100, 100), {})
	var r := spawn_dummy(Enums.Team.RED, Vector2(900, 100), {})
	for i in 2:
		var v := spawn_dummy(Enums.Team.RED, Vector2(500, 300 + i * 100), {"max_hp": 10.0})
		CombatManager.apply_damage(v, DamageInfo.new(a, 50.0, Enums.DamageType.TRUE))
	check(bm.match_over, "목표 킬 2 달성으로 경기 종료")
	eq(bm.winner, Enums.Team.BLUE, "블루 승리")
	bm.finish(Enums.Team.RED, "boss")
	var v2 := spawn_dummy(Enums.Team.BLUE, Vector2(500, 700), {"max_hp": 10.0})
	CombatManager.apply_damage(v2, DamageInfo.new(r, 50.0, Enums.DamageType.TRUE))
	eq(bm.winner, Enums.Team.BLUE, "먼저 판정된 결과 유지")
	eq(bm.end_reason, "kills", "종료 사유 유지")
	eq(ends[0], 1, "종료 신호 한 번")


func test_allies_do_not_overlap() -> void:
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {})
	var b := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {})
	var e := spawn_dummy(Enums.Team.RED, Vector2(800, 500), {})
	var e2 := spawn_dummy(Enums.Team.RED, Vector2(800, 500), {})
	e.status.apply(load("res://data/status/stun.tres"), 5.0, 0.0)
	e2.status.apply(load("res://data/status/stun.tres"), 5.0, 0.0)
	await frames(40)
	check(a.global_position.distance_to(b.global_position) >= 28.0, "아군끼리 밀어냄 (%.1f)" % a.global_position.distance_to(b.global_position))
	near(e.global_position.distance_to(e2.global_position), 0.0, 0.5, "기절한 유닛은 밀려나지 않음")


# ---- 전투 화면을 띄우는 시험 ----

func _start_battle(blue: Array, red: Array, difficulty := "normal", map_id := "arena_01") -> Node:
	var cfg := MatchConfig.new()
	cfg.map_id = map_id
	cfg.blue_heroes = PackedStringArray(blue)
	cfg.red_heroes = PackedStringArray(red)
	cfg.difficulty = difficulty
	cfg.kill_target = 999
	GameManager.match_config = cfg
	var battle := BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	return battle


func _freeze(h: Hero) -> void:
	h.controller.set_physics_process(false)
	h.clear_orders()


func test_gather_brings_allies() -> void:
	var battle := await _start_battle(["blade_master", "elf_archer", "blade_master"], ["elf_archer"])
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	_freeze(red)
	red.global_position = Vector2(2300, 100)
	var player: Hero = battle.player_hero
	player.global_position = Vector2(1000, 1250)
	battle.hud.call_gather()
	await frames(360)
	for a in battle.ai_manager.allies_of(player):
		var d: float = a.global_position.distance_to(player.global_position)
		check(d < 320.0, "%s 이(가) 모임 (거리 %.0f)" % [a.display_name, d])
	battle.queue_free()


func test_allies_do_not_follow_player() -> void:
	var battle := await _start_battle(["blade_master", "elf_archer", "blade_master"], ["elf_archer"], "normal", "valley_01")
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	_freeze(red)
	red.global_position = red.spawn_point
	var player: Hero = battle.player_hero
	player.global_position = Vector2(300, 300)
	await frames(1500)
	# 지원 역할은 돌격 AI 가 없으면 플레이어 곁을 지킬 수 있다. 사냥꾼과 돌격은 따라오지 않는다.
	for a in battle.ai_manager.allies_of(player):
		if a.controller.role != "support":
			check(a.global_position.distance_to(player.global_position) > 400.0, "%s(%s) 이(가) 플레이어를 따라오지 않음" % [a.display_name, a.controller.role])
	battle.queue_free()


func test_roles_are_distinct() -> void:
	var cfg := MatchConfig.new()
	cfg.map_id = "valley_01"
	cfg.blue_heroes = PackedStringArray(["blade_master", "blade_master", "blade_master"])
	cfg.red_heroes = PackedStringArray(["elf_archer", "blade_master", "elf_archer"])
	cfg.autoplay = true
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var roles := []
		for h in battle.hero_manager.team_heroes(team):
			roles.append(h.controller.role)
		roles.sort()
		eq(roles, ["fighter", "hunter", "support"], "%s 팀 역할이 겹치지 않음" % Enums.team_name(team))
	for h in battle.hero_manager.team_heroes(Enums.Team.RED):
		if h.data.id == "blade_master":
			eq(h.controller.role, "fighter", "검성은 선호 역할(돌격)")
	battle.queue_free()


func test_roles_go_to_their_areas() -> void:
	var cfg := MatchConfig.new()
	cfg.map_id = "valley_01"
	cfg.blue_heroes = PackedStringArray(["blade_master", "elf_archer", "blade_master"])
	cfg.red_heroes = PackedStringArray(["elf_archer"])
	cfg.autoplay = true
	cfg.kill_target = 999
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	_freeze(red)
	var seen := {}
	for i in 30:
		await frames(60)
		for h in battle.hero_manager.team_heroes(Enums.Team.BLUE):
			var c: AIController = h.controller
			if c.state == AIController.State.FARM and c.objective is Vector2:
				seen[c.role + ":" + ("center" if absf(c.objective.x - 2100.0) < 300.0 else ("own" if c.objective.x < 2100.0 else "enemy"))] = true
			elif c.role == "support" and c.state in [AIController.State.FOLLOW, AIController.State.IDLE] and c.objective is Hero:
				seen["support:" + c.objective.controller.role] = true
			if c.role == "fighter" and h.global_position.distance_to(Vector2(2100, 1300)) < 450.0:
				seen["fighter:center"] = true
	check(seen.has("hunter:own"), "사냥꾼이 자기 진영 던전으로 감 (%s)" % str(seen.keys()))
	check(seen.has("fighter:center"), "돌격이 중앙으로 감 (%s)" % str(seen.keys()))
	check(seen.has("support:fighter"), "지원이 돌격 곁을 지킴 (%s)" % str(seen.keys()))
	battle.queue_free()


func test_allies_join_player_on_boss() -> void:
	var cfg := MatchConfig.new()
	cfg.map_id = "valley_01"
	cfg.blue_heroes = PackedStringArray(["blade_master", "elf_archer", "blade_master"])
	cfg.red_heroes = PackedStringArray(["elf_archer"])
	cfg.kill_target = 999
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	_freeze(battle.hero_manager.team_heroes(Enums.Team.RED)[0])
	var mm: MonsterManager = battle.monster_manager
	for camp in mm.camps:
		if camp.data.id == "forest_guardian":
			mm.spawn_camp(camp)
	var boss = mm.bosses()[0]
	var player: Hero = battle.player_hero
	player.global_position = boss.global_position + Vector2(0, 300)
	player.attack_order = boss
	await frames(90)
	eq(battle.ai_manager.plan_for(Enums.Team.BLUE).get("kind"), "boss", "플레이어가 보스를 공격하면 팀 계획이 보스 도전")
	for a in battle.ai_manager.allies_of(player):
		eq(a.controller.state, AIController.State.BOSS_FIGHT, "%s 이(가) 보스 공략에 합류" % a.display_name)
	get_tree().paused = false
	battle.queue_free()


func test_ally_supports_attacked_player() -> void:
	var battle := await _start_battle(["blade_master", "elf_archer"], ["blade_master"])
	var enemy: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	var player: Hero = battle.player_hero
	var ally: Hero = battle.ai_manager.allies_of(player)[0]
	ally.controller.role = "support"
	_freeze(enemy)
	player.global_position = Vector2(1500, 300)
	ally.global_position = Vector2(500, 300)
	enemy.global_position = Vector2(1560, 300)
	enemy.health.hp = 9999.0
	await frames(5)
	for i in 4:
		CombatManager.apply_damage(player, DamageInfo.new(enemy, 1.0, Enums.DamageType.TRUE))
		await frames(20)
	eq(ally.controller.target, enemy, "지원 AI 가 멀리서 플레이어를 공격한 적을 노림")
	check(ally.global_position.x > 650.0, "지원하러 이동 (%.0f)" % ally.global_position.x)
	battle.queue_free()


func test_focus_target_is_weakest_near() -> void:
	var battle := await _start_battle(["blade_master"], ["elf_archer", "blade_master"], "hard")
	battle.player_controller.queue_free()
	var reds: Array = battle.hero_manager.team_heroes(Enums.Team.RED)
	for h in battle.hero_manager.heroes:
		if h.controller != null and h.controller is AIController:
			_freeze(h)
	var blue: Hero = battle.player_hero
	blue.global_position = Vector2(1000, 700)
	reds[0].global_position = Vector2(1300, 700)
	reds[1].global_position = Vector2(1200, 700)
	reds[0].health.hp = 80.0
	await frames(40)
	eq(battle.ai_manager.focus_target(Enums.Team.BLUE), reds[0], "체력이 낮은 적을 집중 공격 대상으로")
	battle.queue_free()


func test_enemy_fountain_hurts() -> void:
	var battle := await _start_battle(["blade_master"], ["blade_master"])
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	var blue: Hero = battle.player_hero
	_freeze(red)
	red.global_position = blue.spawn_point + Vector2(60, 0)
	var hp := red.health.hp
	await frames(60)
	check(red.health.hp < hp - red.health.max_hp() * 0.15, "상대 우물 안에서는 초당 20%%의 피해 (%.0f → %.0f)" % [hp, red.health.hp])
	near(blue.health.ratio(), 1.0, 0.001, "자기 우물에서는 피해 없음")
	# 적이 자기 우물로 숨으면 AI 는 쫓지 않는다.
	red.respawn_at(red.spawn_point)
	blue.global_position = red.spawn_point - Vector2(450, 0)
	var ai: AIController = battle.ai_manager.attach(blue, blue.spawn_point, Vector2(1200, 700))
	await frames(2)
	ai.think()
	check(ai.target != red, "AI 는 상대 우물 안의 적을 쫓지 않음")
	red.global_position = red.spawn_point - Vector2(600, 0)
	await frames(8)  # 안개(시야) 갱신
	ai.think()
	eq(ai.target, red, "우물 밖으로 나오면 다시 노림")
	battle.queue_free()
