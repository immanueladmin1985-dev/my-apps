extends TestCase
## 3대3 자동 대전 시뮬레이션: 여섯 영웅 모두 AI. 게임 시간 240초.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func test_team_battle_normal() -> void:
	await _run(["blade_master", "elf_archer", "blade_master"], ["elf_archer", "blade_master", "elf_archer"], "normal", 31)


func test_team_battle_hard() -> void:
	await _run(["elf_archer", "elf_archer", "blade_master"], ["blade_master", "blade_master", "elf_archer"], "hard", 47)


func test_match_ends_at_kill_target() -> void:
	var cfg := _config(["blade_master", "elf_archer", "blade_master"], ["elf_archer", "blade_master", "elf_archer"], "easy", 53)
	cfg.kill_target = 3
	GameManager.match_config = cfg
	var battle := BATTLE.instantiate()
	add_child(battle)
	var bm: BattleManager = battle.battle_manager
	var t := 0
	while not bm.match_over and t < 360 * 60:
		await frames(60)
		t += 60
	check(bm.match_over, "6분 안에 목표 킬 3 달성")
	eq(bm.kills[bm.winner], 3, "이긴 팀 킬 수 = 목표")
	check(bm.kills[Enums.Team.BLUE + Enums.Team.RED - bm.winner] < 3, "진 팀은 목표 미달")
	await frames(120)
	check(get_tree().paused, "결과 화면에서 게임 멈춤")
	check(battle.hud.result_panel.visible, "결과 창 표시")
	var k: int = bm.kills[bm.winner]
	await frames(120)
	eq(bm.kills[bm.winner], k, "종료 뒤에는 점수가 바뀌지 않음")
	get_tree().paused = false
	print("       목표 킬 3: %s 팀 승리, 경기 시간 %.0f초" % [Enums.team_name(bm.winner), bm.elapsed])
	GameManager.dev_args.erase("seed")
	battle.queue_free()
	await get_tree().process_frame


func _config(blue: Array, red: Array, difficulty: String, seed_value: int) -> MatchConfig:
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray(blue)
	cfg.red_heroes = PackedStringArray(red)
	cfg.difficulty = difficulty
	cfg.kill_target = 999
	cfg.autoplay = true
	GameManager.dev_args["seed"] = str(seed_value)
	CombatManager.rng.seed = seed_value
	seed(seed_value)
	return cfg


func _run(blue: Array, red: Array, difficulty: String, seed_value: int) -> void:
	GameManager.match_config = _config(blue, red, difficulty, seed_value)
	var casts := {}
	var on_cast := func(caster, slot, _s): casts[[caster, slot]] = casts.get([caster, slot], 0) + 1
	var respawns := [0]
	var on_respawn := func(_h): respawns[0] += 1
	EventBus.skill_cast.connect(on_cast)
	EventBus.hero_respawned.connect(on_respawn)
	var battle := BATTLE.instantiate()
	add_child(battle)
	await frames(180 * 60)
	var learned := {}
	for h in battle.hero_manager.heroes:
		learned[h] = h.skill_caster.ranks.duplicate()
	await frames(60 * 60)
	EventBus.skill_cast.disconnect(on_cast)
	EventBus.hero_respawned.disconnect(on_respawn)
	GameManager.dev_args.erase("seed")
	var heroes: Array = battle.hero_manager.heroes
	var deaths := 0
	var assists := 0
	var followed := 0
	var lines := []
	for h: Hero in heroes:
		deaths += h.deaths
		assists += h.assists
		var used := []
		for slot in 4:
			var n: int = casts.get([h, slot], 0)
			used.append(n)
			if learned[h][slot] > 0 and _offensive(h, slot):
				check(n >= 1, "%s(%s) 이(가) 배운 %s 스킬을 쓰지 않음" % [h.display_name, Enums.team_name(h.team), Enums.SLOT_KEYS[slot]])
		check(h.max_stuck_time < 2.0, "%s 이(가) %.1f초 동안 끼어 있었음" % [h.display_name, h.max_stuck_time])
		if h.controller.state_log.has(AIController.State.FARM):
			followed += 1
		lines.append("%s%s Lv%d %d/%d/%d" % [Enums.team_name(h.team).left(1), h.data.glyph, h.level, h.kills, h.deaths, h.assists])
	var bm: BattleManager = battle.battle_manager
	check(deaths >= 2, "240초 동안 사망 %d번" % deaths)
	check(respawns[0] >= 1, "부활 없음")
	check(assists >= 1, "도움 없음")
	check(followed >= 2, "사냥(FARM)을 한 AI 가 %d명" % followed)
	eq(bm.kills[Enums.Team.BLUE] + bm.kills[Enums.Team.RED], deaths, "킬 점수 합 = 사망 수")
	print("       %s: 점수 %d:%d, 킬/데스/도움 %s, 부활 %d" % [difficulty, bm.kills[Enums.Team.BLUE], bm.kills[Enums.Team.RED], " ".join(lines), respawns[0]])
	battle.queue_free()
	await get_tree().process_frame


## 위험할 때만 쓰는 스킬(방어·후퇴)은 상황에 따라 안 쓸 수 있으므로 공격·돌진용만 검사한다.
func _offensive(h, slot: int) -> bool:
	var sk: SkillData = h.skill_caster.get_skill(slot)
	return sk != null and (sk.ai_use == Enums.AIUse.OFFENSE or sk.ai_use == Enums.AIUse.ENGAGE)
