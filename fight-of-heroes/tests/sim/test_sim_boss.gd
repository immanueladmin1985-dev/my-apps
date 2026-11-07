extends TestCase
## AI 팀이 보스를 실제로 잡을 수 있는지: 상대 팀 영웅 한 명은 우물에 묶어 두고,
## 블루 AI 세 명이 정해진 레벨에서 보스에 도전한다. 보스는 위험 지역 예고·분노 패턴을 모두 쓴다.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


## 보스 패턴과 AI 판단에 난수가 섞여 있어, 서로 다른 난수로 두 번까지 도전한다.
func test_ai_team_kills_final_boss() -> void:
	var r := await _attempt("ancient_dragon", 10, "normal", 360)
	if not r.killed:
		print("       첫 도전 실패 (남은 체력 %d%%), 다른 난수로 다시 도전" % r.hp)
		GameManager.dev_args["boss_seed"] = "2"
		r = await _attempt("ancient_dragon", 10, "normal", 360)
		GameManager.dev_args.erase("boss_seed")
	check(r.killed, "최종 보스를 360초 안에 처치 (남은 체력 %d%%, 사망 %d)" % [r.hp, r.deaths])
	check(r.won, "최종 보스 처치로 승리")
	check(r.enraged, "보스가 분노 단계까지 감")
	print("       최종 보스: %.0f초 만에 처치, 영웅 사망 %d, 피하기 %d번" % [r.time, r.deaths, r.dodges])


func test_ai_team_kills_neutral_boss() -> void:
	var r := await _attempt("forest_guardian", 7, "normal", 240)
	check(r.killed, "중립 보스를 240초 안에 처치 (남은 체력 %d%%)" % r.hp)
	check(r.buffed, "팀 버프를 받음")
	check(not r.won, "중립 보스로는 경기가 끝나지 않음")
	print("       중립 보스: %.0f초 만에 처치, 영웅 사망 %d, 피하기 %d번" % [r.time, r.deaths, r.dodges])


func _attempt(boss_id: String, level: int, difficulty: String, limit: int) -> Dictionary:
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray(["blade_master", "elf_archer", "blade_master"])
	cfg.red_heroes = PackedStringArray(["elf_archer"])
	cfg.difficulty = difficulty
	cfg.kill_target = 999
	cfg.final_boss_time = 1.0 if boss_id == "ancient_dragon" else 99999.0
	cfg.autoplay = true
	GameManager.match_config = cfg
	var sv := int(GameManager.dev_args.get("boss_seed", "5"))
	GameManager.dev_args["seed"] = str(sv)
	seed(sv)
	CombatManager.rng.seed = sv
	var battle := BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var mm: MonsterManager = battle.monster_manager
	# 다른 캠프는 비우고 시험할 보스만 남긴다.
	for camp in mm.camps:
		camp.left = 99999.0
		if camp.data.id == boss_id:
			camp.left = 0.5
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	red.controller.set_physics_process(false)
	red.clear_orders()
	var blue: Array = battle.hero_manager.team_heroes(Enums.Team.BLUE)
	var cfgp := DataRegistry.progression()
	for h in blue:
		var need := 0.0
		for l in range(1, level):
			need += cfgp.xp_to_next(l)
		h.add_xp(need)
	await frames(60)
	var boss = null
	for b in mm.bosses():
		if b.data.id == boss_id:
			boss = b
	check(boss != null, "보스 등장")
	var enraged := false
	var t := 0
	while boss != null and is_instance_valid(boss) and not boss.is_dead and t < limit * 60:
		await frames(30)
		t += 30
		enraged = enraged or boss.phase > 0
		if GameManager.dev_args.has("dbg") and t % 120 == 0:
			var hs := []
			for h in blue:
				hs.append("%s:%s d%d hp%d%%" % [h.data.glyph, AIController.State.keys()[h.controller.state], roundi(h.global_position.distance_to(boss.global_position)), roundi(h.health.ratio()*100)])
			print("DBG %ds boss %d%% ret=%s home_d=%d thr=%d tgt=%s | %s" % [t/60, roundi(boss.health.ratio()*100), boss.returning, roundi(boss.global_position.distance_to(boss.home)), boss.threat.size(), boss.target.data.glyph if boss.target else "-", " ".join(hs)])
	var deaths := 0
	var dodges := 0
	for h in blue:
		deaths += h.deaths
		dodges += h.controller.dodge_count
	var r := {
		"killed": boss != null and (not is_instance_valid(boss) or boss.is_dead),
		"hp": roundi(boss.health.ratio() * 100) if boss != null and is_instance_valid(boss) else 0,
		"won": battle.battle_manager.match_over and battle.battle_manager.winner == Enums.Team.BLUE,
		"enraged": enraged,
		"buffed": blue.any(func(h): return h.status.has("forest_blessing")),
		"time": t / 60.0,
		"deaths": deaths,
		"dodges": dodges,
	}
	get_tree().paused = false
	GameManager.dev_args.erase("seed")
	battle.queue_free()
	await get_tree().process_frame
	return r
