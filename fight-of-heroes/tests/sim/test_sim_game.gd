extends TestCase
## 경기 전체 시뮬레이션: 성장, 사냥, 보스, 승패까지 AI 끼리 끝까지 진행한다.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func test_full_match_kills() -> void:
	await _play("normal", 15, 600.0, 61, 20 * 60)


func test_full_match_hard() -> void:
	await _play("hard", 15, 600.0, 73, 25 * 60)


func _play(difficulty: String, kill_target: int, boss_time: float, seed_value: int, max_seconds: int) -> Dictionary:
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray(["blade_master", "fire_mage", "saint"] if seed_value % 2 == 1 else ["dragon_knight", "summoner", "paladin"])
	cfg.red_heroes = PackedStringArray(["monk", "frost_mage", "paladin"] if seed_value % 2 == 1 else ["assassin", "elf_archer", "saint"])
	cfg.difficulty = difficulty
	cfg.kill_target = kill_target
	cfg.final_boss_time = boss_time
	cfg.autoplay = true
	GameManager.match_config = cfg
	GameManager.dev_args["seed"] = str(seed_value)
	CombatManager.rng.seed = seed_value
	seed(seed_value)
	var stats := {"monster_kills": 0, "boss_kills": [], "casts": {}}
	var on_died := func(v, _k):
		if v is Monster:
			stats.monster_kills += 1
	var on_boss := func(b, team): stats.boss_kills.append("%s→%s" % [b.data.id, Enums.team_name(team)])
	var on_cast := func(c, slot, _s):
		if c is Hero:
			stats.casts[[c, slot]] = true
	var learned := {}
	var on_level := func(h, _lv):
		for slot in 4:
			if h.skill_caster.ranks[slot] > 0 and not learned.has([h, slot]):
				learned[[h, slot]] = Unit.now()
	EventBus.unit_died.connect(on_died)
	EventBus.boss_killed.connect(on_boss)
	EventBus.skill_cast.connect(on_cast)
	EventBus.hero_level_up.connect(on_level)
	var battle := BATTLE.instantiate()
	add_child(battle)
	var bm: BattleManager = battle.battle_manager
	var t := 0
	var timeline := []
	while not bm.match_over and t < max_seconds * 60:
		await frames(60)
		t += 60
		if (t / 60) % 120 == 0:
			var lv := []
			for h in battle.hero_manager.heroes:
				lv.append(h.level)
			timeline.append("%d초 레벨 %s 점수 %d:%d" % [t / 60, str(lv), bm.kills[1], bm.kills[2]])
	await frames(90)
	get_tree().paused = false
	EventBus.unit_died.disconnect(on_died)
	EventBus.boss_killed.disconnect(on_boss)
	EventBus.skill_cast.disconnect(on_cast)
	EventBus.hero_level_up.disconnect(on_level)
	GameManager.dev_args.erase("seed")
	var heroes: Array = battle.hero_manager.heroes
	var levels := []
	for h: Hero in heroes:
		levels.append("%d/%s" % [h.level, h.inventory.slots.filter(func(x): return x != null and not x.item.consumable).size()])
		check(h.max_stuck_time < 2.0, "%s 이(가) %.1f초 동안 끼어 있었음" % [h.display_name, h.max_stuck_time])
		var gear := 0
		var gear_names := []
		for i in InventoryComponent.SIZE:
			var it: ItemData = h.inventory.item_at(i)
			if it != null and not it.consumable:
				gear += it.cost
				gear_names.append(it.display_name)
		check(gear >= 1000 or gear_names.size() >= 2, "%s 이(가) 장비를 갖춤 (장비 가치 %d, %s)" % [h.display_name, gear, ", ".join(gear_names)])
		# 배운 지 60초가 넘은 스킬은 한 번 이상 썼어야 한다 (1레벨에 배운 스킬은 레벨업 전이라 기록에서 빠질 수 있어 따로 본다).
		for slot in 4:
			var at = learned.get([h, slot])
			# R 은 상대 체력이 줄었을 때만 아껴 쓰므로 기록만 한다.
			var old_enough: bool = (at != null and Unit.now() - at > 60.0) or (at == null and h.skill_caster.ranks[slot] > 0)
			if old_enough and slot != 3 and _offensive(h, slot):
				check(stats.casts.has([h, slot]), "%s 이(가) 배운 지 60초가 넘은 %s 스킬을 쓰지 않음" % [h.display_name, Enums.SLOT_KEYS[slot]])
	check(bm.match_over, "%d분 안에 경기가 끝남" % (max_seconds / 60))
	check(stats.monster_kills >= 6, "몬스터 처치 %d" % stats.monster_kills)
	print("       %s: 결과 %s(%s) %.0f초, 점수 %d:%d, 레벨 %s, 몬스터 %d, 보스 %s" % [difficulty, Enums.team_name(bm.winner), bm.end_reason, bm.elapsed, bm.kills[1], bm.kills[2], str(levels), stats.monster_kills, str(stats.boss_kills)])
	for line in timeline:
		print("         ", line)
	battle.queue_free()
	await get_tree().process_frame
	return {"bm": bm}


## 위험할 때만 쓰는 스킬(방어·후퇴)은 상황에 따라 안 쓸 수 있으므로 공격·돌진용만 검사한다.
func _offensive(h, slot: int) -> bool:
	var sk: SkillData = h.skill_caster.get_skill(slot)
	return sk != null and (sk.ai_use == Enums.AIUse.OFFENSE or sk.ai_use == Enums.AIUse.ENGAGE)
