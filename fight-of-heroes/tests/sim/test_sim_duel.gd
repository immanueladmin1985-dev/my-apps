extends TestCase
## 1대1 자동 대전 시뮬레이션. 두 영웅 모두 AI 가 조작하고 게임 시간 180초 동안 진행한다.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")
const SECONDS := 180


func test_duel_normal() -> void:
	await _duel("blade_master", "elf_archer", "normal", 7)


func test_duel_hard_mirror_side() -> void:
	await _duel("elf_archer", "blade_master", "hard", 21)


func _duel(blue: String, red: String, difficulty: String, seed_value: int) -> void:
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray([blue])
	cfg.red_heroes = PackedStringArray([red])
	cfg.difficulty = difficulty
	cfg.kill_target = 999
	cfg.autoplay = true
	GameManager.match_config = cfg
	GameManager.dev_args["seed"] = str(seed_value)
	CombatManager.rng.seed = seed_value
	seed(seed_value)
	var casts := {}
	var on_cast := func(caster, slot, _s): casts["%s:%d" % [caster.data.id, slot]] = casts.get("%s:%d" % [caster.data.id, slot], 0) + 1
	var respawns := [0]
	var on_respawn := func(_h): respawns[0] += 1
	EventBus.skill_cast.connect(on_cast)
	EventBus.hero_respawned.connect(on_respawn)
	var battle := BATTLE.instantiate()
	add_child(battle)
	var min_hp := {}
	for sec in SECONDS - 60:
		await frames(60)
		for h in battle.hero_manager.heroes:
			min_hp[h] = minf(min_hp.get(h, 1.0), 0.0 if h.is_dead else h.health.ratio())
	var learned := {}
	for h in battle.hero_manager.heroes:
		learned[h] = h.skill_caster.ranks.duplicate()
	for sec in 60:
		await frames(60)
		for h in battle.hero_manager.heroes:
			min_hp[h] = minf(min_hp.get(h, 1.0), 0.0 if h.is_dead else h.health.ratio())
	EventBus.skill_cast.disconnect(on_cast)
	EventBus.hero_respawned.disconnect(on_respawn)
	GameManager.dev_args.erase("seed")
	var heroes: Array = battle.hero_manager.heroes
	var report := []
	for h: Hero in heroes:
		var used := []
		for slot in 4:
			var n: int = casts.get("%s:%d" % [h.data.id, slot], 0)
			used.append(n)
			if learned[h][slot] > 0 and _offensive(h, slot):
				check(n >= 1, "%s 이(가) 배운 %s 스킬을 한 번도 쓰지 않음" % [h.display_name, Enums.SLOT_KEYS[slot]])
		check(h.max_stuck_time < 2.0, "%s 이(가) %.1f초 동안 끼어 있었음" % [h.display_name, h.max_stuck_time])
		report.append("%s Lv%d 킬 %d 데스 %d 스킬 %s 최대 끼임 %.2f초" % [h.display_name, h.level, h.kills, h.deaths, str(used), h.max_stuck_time])
	var total_deaths: int = heroes.reduce(func(acc, h): return acc + h.deaths, 0)
	# 1대1 에서는 AI 가 물러나 우물에서 회복하므로 아무도 죽지 않을 수 있다. 실제로 싸웠는지를 본다.
	var both_hurt: bool = min_hp.values().all(func(v): return v < 0.4)
	check(total_deaths >= 1 or both_hurt, "180초 동안 사망도 없고 체력이 40%% 아래로 내려간 적도 없음 (최저 %s)" % str(min_hp.values()))
	# 끝나기 직전에 죽은 영웅은 아직 부활 전일 수 있다.
	check(respawns[0] <= total_deaths and respawns[0] >= total_deaths - 2, "사망한 만큼 부활 (사망 %d, 부활 %d)" % [total_deaths, respawns[0]])
	var bm: BattleManager = battle.battle_manager
	eq(bm.kills[Enums.Team.BLUE] + bm.kills[Enums.Team.RED], total_deaths, "킬 점수 합 = 사망 수")
	print("       %s: %s / 점수 %d:%d / 부활 %d / 최저 체력 %s" % [difficulty, " | ".join(report), bm.kills[Enums.Team.BLUE], bm.kills[Enums.Team.RED], respawns[0], str(min_hp.values().map(func(v): return roundi(v * 100)))])
	battle.queue_free()
	await get_tree().process_frame


## 위험할 때만 쓰는 스킬(방어·후퇴)은 상황에 따라 안 쓸 수 있으므로 공격·돌진용만 검사한다.
func _offensive(h, slot: int) -> bool:
	var sk: SkillData = h.skill_caster.get_skill(slot)
	return sk != null and (sk.ai_use == Enums.AIUse.OFFENSE or sk.ai_use == Enums.AIUse.ENGAGE)
