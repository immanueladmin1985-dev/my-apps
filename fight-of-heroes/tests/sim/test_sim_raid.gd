extends TestCase
## 보스 레이드 전체 시뮬레이션: 블루 AI 셋이 사냥하며 준비하다가 레이드 보스에 모여 제한 시간 안에 쓰러뜨리는지.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func test_ai_raid_clears() -> void:
	var r := await _play(["blade_master", "fire_mage", "saint"], 21)
	if not r.won:
		print("       첫 도전 실패 (%s, 보스 체력 %d%%), 다른 영웅·난수로 다시 도전" % [r.reason, r.boss_hp])
		r = await _play(["dragon_knight", "elf_archer", "paladin"], 22)
	check(r.won, "AI 셋이 제한 시간 안에 레이드 보스를 쓰러뜨림 (%s, 보스 체력 %d%%)" % [r.reason, r.boss_hp])
	check(r.engaged_at >= 0.0, "AI 가 보스에 도전함")
	print("       레이드: %s %.0f초 (보스 도전 시작 %.0f초), 영웅 사망 %d, 피하기 %d번, 레벨 %s" % [r.reason, r.time, r.engaged_at, r.deaths, r.dodges, str(r.levels)])


func _play(heroes: Array, seed_value: int) -> Dictionary:
	var cfg := MatchConfig.new()
	cfg.map_id = GameManager.DEFAULT_MAP
	cfg.blue_heroes = PackedStringArray(heroes)
	cfg.red_heroes = PackedStringArray(["monk", "frost_mage", "paladin"])
	cfg.difficulty = "normal"
	cfg.autoplay = true
	cfg.apply_game_type("raid")
	GameManager.match_config = cfg
	GameManager.dev_args["seed"] = str(seed_value)
	seed(seed_value)
	CombatManager.rng.seed = seed_value
	var battle := BATTLE.instantiate()
	add_child(battle)
	var bm: BattleManager = battle.battle_manager
	var am: AIManager = battle.ai_manager
	var t := 0
	var engaged_at := -1.0
	var boss_hp := 100
	while not bm.match_over and t < 61 * 60 * 10:
		await frames(60)
		t += 60
		if engaged_at < 0.0 and am.plan_for(Enums.Team.BLUE).get("kind", "") == "boss":
			engaged_at = bm.elapsed
		var boss = battle.monster_manager.final_boss()
		if boss != null:
			boss_hp = roundi(boss.health.ratio() * 100.0)
		if OS.has_environment("SIM_DEBUG") and (t / 60) % 15 == 0:
			var hs := []
			for h in battle.hero_manager.heroes:
				hs.append("%s Lv%d %s hp%d%% g%d" % [h.data.glyph, h.level, AIController.State.keys()[h.controller.state], roundi(h.health.ratio() * 100), h.gold])
			print("DBG %d초 보스 %d%% | %s" % [t / 60, boss_hp, " / ".join(hs)])
	var deaths := 0
	var dodges := 0
	var levels := []
	for h in battle.hero_manager.heroes:
		deaths += h.deaths
		dodges += h.controller.dodge_count
		levels.append(h.level)
	var r := {
		"won": bm.match_over and bm.winner == Enums.Team.BLUE, "reason": bm.end_reason, "time": bm.elapsed,
		"engaged_at": engaged_at, "boss_hp": boss_hp if not (bm.match_over and bm.winner == Enums.Team.BLUE) else 0,
		"deaths": deaths, "dodges": dodges, "levels": levels,
	}
	get_tree().paused = false
	GameManager.dev_args.erase("seed")
	battle.queue_free()
	await get_tree().process_frame
	return r
