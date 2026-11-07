extends TestCase
## 몬스터와 보스: 반격, 캠프 동료 반격, 돌아가 회복, 보상, 리스폰, 위험 지역 패턴, 분노, 팀 버프, 최종 보스 승리.

const MONSTER_SCENE := preload("res://scenes/monsters/monster.tscn")


func _monster(id: String, pos: Vector2) -> Monster:
	var m: Monster = MONSTER_SCENE.instantiate()
	world.add_child(m)
	m.setup(DataRegistry.monster(id), pos)
	return m


func test_camp_fights_back_together() -> void:
	var a := _monster("wolf", Vector2(600, 500))
	var b := _monster("wolf", Vector2(650, 500))
	a.camp_mates = [a, b]
	b.camp_mates = [a, b]
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(700, 600), {"max_hp": 5000.0})
	CombatManager.apply_damage(a, DamageInfo.new(h, 10.0, Enums.DamageType.TRUE))
	await frames(40)
	eq(a.target, h, "맞은 몬스터가 반격")
	eq(b.target, h, "같은 캠프 몬스터도 반격")
	check(h.health.hp < 5000.0, "영웅이 피해를 받음")


func test_leash_and_reset() -> void:
	var m := _monster("wolf", Vector2(600, 500))
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(660, 500), {"max_hp": 5000.0, "move_speed": 600.0})
	CombatManager.apply_damage(m, DamageInfo.new(h, 100.0, Enums.DamageType.TRUE))
	await frames(10)
	h.move_input = Vector2.RIGHT
	await frames(120)
	check(m.returning or m.global_position.distance_to(m.home) < 30.0, "멀어지면 캠프로 돌아감")
	await frames(240)
	check(m.global_position.distance_to(m.home) < 30.0, "캠프에 도착")
	near(m.health.ratio(), 1.0, 0.001, "돌아가면 체력이 가득")
	check(m.target == null, "위협 초기화")


func test_camp_respawn_and_rewards() -> void:
	var map := MapData.new()
	map.size = Vector2(2400, 1400)
	var c := CampData.new()
	c.id = "test"
	c.position = Vector2(800, 500)
	c.monsters = PackedStringArray(["wolf", "wolf"])
	c.first_spawn = 0.0
	c.respawn = 2.0
	map.camps = [c]
	var mm := MonsterManager.new()
	world.add_child(mm)
	mm.setup(world, map, null)
	await frames(2)
	eq(mm.alive_monsters().size(), 2, "캠프에 몬스터 2마리")
	var h := _fresh_hero(Vector2(700, 500))
	var hm := HeroManager.new()
	world.add_child(hm)
	hm.heroes = [h]
	hm.map = DataRegistry.map_data("arena_01")
	var xm := ExperienceManager.new()
	world.add_child(xm)
	xm.setup(hm)
	for m in mm.alive_monsters():
		CombatManager.apply_damage(m, DamageInfo.new(h, 9999.0, Enums.DamageType.TRUE))
	near(h.xp, 70.0, 0.01, "늑대 2마리 경험치")
	eq(h.gold - DataRegistry.progression().start_gold, 50, "늑대 2마리 골드")
	await frames(30)
	eq(mm.alive_monsters().size(), 0, "모두 처치")
	await frames(100)
	eq(mm.alive_monsters().size(), 2, "2초 뒤 다시 나타남")
	xm.queue_free()


func _fresh_hero(pos: Vector2, team := Enums.Team.BLUE) -> Hero:
	var h: Hero = HERO_SCENE.instantiate()
	world.add_child(h)
	h.global_position = pos
	h.setup(DataRegistry.hero("blade_master"), team)
	return h


func test_boss_slam_telegraph() -> void:
	var boss := _monster("forest_guardian", Vector2(800, 500))
	var near_h := spawn_dummy(Enums.Team.BLUE, Vector2(900, 500), {"max_hp": 5000.0})
	var far_h := spawn_dummy(Enums.Team.BLUE, Vector2(1200, 500), {"max_hp": 5000.0})
	eq(boss.skill_caster.cast(0, CastAim.new()), Enums.CastResult.OK, "내려찍기")
	check(not boss.can_move(), "준비 동작 중에는 움직이지 않음")
	eq(get_tree().get_nodes_in_group("telegraphs").size(), 1, "위험 지역 표시")
	await frames(30)
	near(near_h.health.hp, 5000.0, 0.01, "예고 시간에는 피해 없음")
	await frames(40)
	check(near_h.health.hp < 5000.0, "1초 뒤 범위 안 피해")
	check(near_h.status.is_stunned(), "기절")
	near(far_h.health.hp, 5000.0, 0.01, "범위 밖은 그대로")


func test_boss_charge_line() -> void:
	var boss := _monster("ancient_dragon", Vector2(600, 500))
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(900, 500), {"max_hp": 9000.0})
	var side := spawn_dummy(Enums.Team.BLUE, Vector2(900, 700), {"max_hp": 9000.0})
	eq(boss.skill_caster.cast(2, CastAim.toward(Vector2.RIGHT)), Enums.CastResult.OK, "돌진")
	await frames(50)
	near(h.health.hp, 9000.0, 0.01, "예고 중에는 피해 없음")
	await frames(40)
	check(h.health.hp < 9000.0, "직선 위의 영웅이 피해")
	near(side.health.hp, 9000.0, 0.01, "직선 밖은 그대로")
	check(boss.global_position.x > 900.0, "보스가 돌진함 (%.0f)" % boss.global_position.x)


func test_boss_enrage_unlocks_pattern() -> void:
	var boss := _monster("lava_giant", Vector2(800, 500))
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(860, 500), {"max_hp": 99999.0})
	CombatManager.apply_damage(boss, DamageInfo.new(h, 10.0, Enums.DamageType.TRUE))
	var aspd := boss.stats.get_stat("attack_speed")
	eq(boss.phase, 0, "처음에는 1단계")
	await frames(20)
	CombatManager.apply_damage(boss, DamageInfo.new(h, boss.health.max_hp() * 0.6, Enums.DamageType.TRUE))
	await frames(20)
	eq(boss.phase, 1, "체력 50% 아래에서 분노")
	near(boss.stats.get_stat("attack_speed"), aspd * 1.3, 0.01, "분노하면 공격 속도 30% 증가")


func test_boss_rewards_and_final_victory() -> void:
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray(["blade_master", "elf_archer"])
	cfg.red_heroes = PackedStringArray(["blade_master"])
	cfg.kill_target = 999
	cfg.autoplay = true
	cfg.final_boss_time = 1.0
	GameManager.match_config = cfg
	var battle: Node = load("res://scenes/battlefield/battle.tscn").instantiate()
	add_child(battle)
	await frames(80)
	for h in battle.hero_manager.heroes:
		h.controller.set_physics_process(false)
		h.clear_orders()
	var blue: Array = battle.hero_manager.team_heroes(Enums.Team.BLUE)
	var mm: MonsterManager = battle.monster_manager
	var dragon = mm.final_boss()
	check(dragon != null, "1초 뒤 최종 보스 등장")
	# 중립 보스를 바로 꺼내 처치한다.
	for camp in mm.camps:
		if camp.data.id == "forest_guardian":
			mm.spawn_camp(camp)
	var guardian = mm.bosses().filter(func(b): return b.data.id == "forest_guardian")[0]
	CombatManager.apply_damage(guardian, DamageInfo.new(blue[0], 99999.0, Enums.DamageType.TRUE))
	for h in blue:
		check(h.status.has("forest_blessing"), "%s 에게 팀 버프" % h.display_name)
		check(h.gold >= 300, "보스 골드를 팀 전원이 받음")
	check(not battle.battle_manager.match_over, "중립 보스로는 경기가 끝나지 않음")
	CombatManager.apply_damage(dragon, DamageInfo.new(blue[1], 99999.0, Enums.DamageType.TRUE))
	check(battle.battle_manager.match_over, "최종 보스 처치로 경기 종료")
	eq(battle.battle_manager.winner, Enums.Team.BLUE, "처치한 팀 승리")
	eq(battle.battle_manager.end_reason, "boss", "종료 사유")
	get_tree().paused = false
	battle.queue_free()


func test_ai_dodges_telegraph() -> void:
	var boss := _monster("forest_guardian", Vector2(800, 500))
	var h: Hero = HERO_SCENE.instantiate()
	world.add_child(h)
	h.global_position = Vector2(880, 500)
	h.setup(DataRegistry.hero("elf_archer"), Enums.Team.BLUE)
	var ai := AIController.new()
	h.set_controller(ai)
	ai.setup(DataRegistry.ai_profile("hard"), Vector2(200, 500), Vector2(1200, 700))
	boss.skill_caster.cast(0, CastAim.new())
	await frames(80)
	near(h.health.ratio(), 1.0, 0.001, "보스 바로 옆에서도 AI 가 위험 지역 밖으로 피함")
	check(ai.dodge_count >= 1, "피하기 동작")
