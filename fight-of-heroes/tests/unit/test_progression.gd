extends TestCase
## 성장: 경험치·레벨업, 스킬 단계 한도, 스킬 포인트, AI 자동 습득, 골드.


func _fresh(team := Enums.Team.BLUE, pos := Vector2(500, 500)) -> Hero:
	var h: Hero = HERO_SCENE.instantiate()
	world.add_child(h)
	h.global_position = pos
	h.setup(DataRegistry.hero("blade_master"), team)
	return h


func test_curve_and_caps() -> void:
	var cfg := DataRegistry.progression()
	near(cfg.xp_to_next(1), 100.0, 0.01, "1→2 레벨")
	near(cfg.xp_to_next(5), 340.0, 0.01, "5→6 레벨")
	eq(cfg.rank_cap(0, 1, 4), 1, "1레벨 Q 한도")
	eq(cfg.rank_cap(0, 4, 4), 2, "4레벨 Q 한도")
	eq(cfg.rank_cap(0, 7, 4), 4, "7레벨 Q 최대")
	eq(cfg.rank_cap(3, 5, 3), 0, "5레벨 R 잠김")
	eq(cfg.rank_cap(3, 6, 3), 1, "6레벨 R 1단계")
	eq(cfg.rank_cap(3, 11, 3), 2, "11레벨 R 2단계")
	eq(cfg.rank_cap(3, 15, 3), 3, "15레벨 R 3단계")


func test_level_up_grows_stats() -> void:
	var h := _fresh()
	eq(h.skill_points, 1, "1레벨 스킬 포인트 1")
	var max_hp := h.health.max_hp()
	h.health.hp = 300.0
	var levels := [0]
	h.leveled_up.connect(func(_l): levels[0] += 1)
	h.add_xp(130.0)
	eq(h.level, 2, "100 경험치로 2레벨")
	near(h.xp, 30.0, 0.01, "남은 경험치")
	eq(h.skill_points, 2, "스킬 포인트 +1")
	near(h.health.max_hp(), max_hp + 85.0, 0.01, "최대 체력 성장")
	near(h.health.hp, 385.0, 0.01, "늘어난 최대 체력만큼 회복")
	eq(levels[0], 1, "레벨업 신호")
	h.add_xp(1000000.0)
	eq(h.level, 15, "최대 15레벨")
	eq(h.skill_points, 15, "스킬 포인트 15")
	near(h.xp_ratio(), 1.0, 0.001, "최대 레벨이면 경험치 막대가 가득")


func test_learning_rules() -> void:
	var h := _fresh()
	check(not h.can_learn(3), "1레벨에는 R 을 배울 수 없음")
	check(h.learn(0), "Q 배움")
	check(not h.learn(1), "포인트가 없으면 배울 수 없음")
	h.add_xp(100.0)
	check(not h.learn(0), "2레벨에는 Q 를 2단계로 올릴 수 없음")
	check(h.learn(1), "W 배움")
	eq(h.skill_caster.cast(1, CastAim.new()), Enums.CastResult.OK, "배운 스킬은 쓸 수 있음")
	eq(h.skill_caster.cast(2, CastAim.new()), Enums.CastResult.NOT_LEARNED, "배우지 않은 스킬은 쓸 수 없음")


func test_all_points_fit_at_max_level() -> void:
	var h := _fresh()
	h.add_xp(1000000.0)
	for slot in [3, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3, 3]:
		check(h.learn(slot), "슬롯 %d 배움" % slot)
	eq(h.skill_points, 0, "포인트를 모두 씀")
	eq(h.skill_caster.ranks, [4, 4, 4, 3], "모든 스킬 최대 단계")


func test_ai_auto_learns_ultimate_first() -> void:
	var h := _fresh()
	var ai := AIController.new()
	h.set_controller(ai)
	ai.setup(DataRegistry.ai_profile("normal"), h.spawn_point, Vector2(1200, 700))
	await frames(1)
	eq(h.skill_caster.ranks[0], 1, "1레벨에 Q 를 배움")
	var cfg := DataRegistry.progression()
	var need := 0.0
	for l in range(1, 6):
		need += cfg.xp_to_next(l)
	h.add_xp(need)
	eq(h.level, 6, "6레벨")
	eq(h.skill_caster.ranks[3], 1, "6레벨이 되면 R 을 배움")
	eq(h.skill_points, 0, "포인트를 모두 씀")
	var total: int = h.skill_caster.ranks.reduce(func(a, b): return a + b, 0)
	eq(total, 6, "6레벨에 스킬 단계 합 6")


func _xp_manager(heroes: Array) -> ExperienceManager:
	var hm := HeroManager.new()
	world.add_child(hm)
	hm.heroes = heroes
	hm.map = DataRegistry.map_data("arena_01")
	var xm := ExperienceManager.new()
	world.add_child(xm)
	xm.setup(hm)
	return xm


func test_passive_gold() -> void:
	var a := _fresh()
	var xm := _xp_manager([a])
	await frames(300)
	var g := a.gold - DataRegistry.progression().start_gold
	check(g >= 9 and g <= 11, "5초에 약 10골드 (%d)" % g)
	xm.queue_free()


func test_hero_kill_rewards() -> void:
	var killer := _fresh(Enums.Team.BLUE, Vector2(500, 500))
	var helper := _fresh(Enums.Team.BLUE, Vector2(600, 500))
	var far := _fresh(Enums.Team.BLUE, Vector2(2300, 1300))
	var victim := _fresh(Enums.Team.RED, Vector2(550, 560))
	var xm := _xp_manager([killer, helper, far, victim])
	var bm := BattleManager.new()
	world.add_child(bm)
	bm.setup(MatchConfig.new())
	CombatManager.apply_damage(victim, DamageInfo.new(helper, 100.0, Enums.DamageType.TRUE))
	CombatManager.apply_damage(victim, DamageInfo.new(killer, 9999.0, Enums.DamageType.TRUE))
	var sg := DataRegistry.progression().start_gold
	eq(killer.gold - sg, 270, "처치 골드 250 + 20 × 레벨")
	eq(helper.gold - sg, 135, "도움 골드 = 처치 골드의 절반")
	eq(far.gold - sg, 0, "먼 아군은 골드 없음")
	near(killer.xp, 55.0, 0.01, "경험치 110 을 두 명이 나눔")
	near(far.xp, 0.0, 0.01, "먼 아군은 경험치 없음")
	xm.queue_free()
