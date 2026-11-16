extends TestCase
## PHASE 14: 새 영웅, 상대 팀 다양성, 큰 맵과 용의 둥지

const BATTLE := preload("res://scenes/battlefield/battle.tscn")

var _recent


func before_each() -> void:
	super.before_each()
	_recent = SaveManager.get_setting("recent_enemies", [])
	SaveManager.data.settings["recent_enemies"] = []


func after_each() -> void:
	SaveManager.data.settings["recent_enemies"] = _recent
	await super.after_each()


func test_enemy_teams_vary() -> void:
	var seen := {}
	var last: Array = []
	for i in 5:
		var c := GameManager.default_config("blade_master")
		var red := Array(c.red_heroes)
		check(not red.has("blade_master") and not Array(c.blue_heroes).slice(1).has("blade_master"), "내 영웅은 한 번만")
		for id in red:
			check(not last.has(id), "직전 경기의 상대(%s)가 바로 다시 나오지 않음" % id)
			seen[id] = true
		last = red
		GameManager.remember_enemies(c)
	check(seen.size() >= 13, "5판 동안 서로 다른 상대 %d명" % seen.size())
	eq(GameManager.default_config("monk").map_id, "valley_02", "새 게임은 큰 맵")
	check(GameManager.default_config("monk").random_teams, "무작위 팀 표시")


func test_big_map_and_lair() -> void:
	var m := DataRegistry.map_data("valley_02")
	check(m != null and m.size.x > 5000.0, "큰 맵")
	var dragon: CampData = null
	var guards := 0
	for c: CampData in m.camps:
		if c.is_final_boss:
			dragon = c
		if c.power_tier > 1:
			guards += 1
			check(c.aggro_radius > 0.0, "둥지 몬스터는 먼저 공격함: " + c.id)
	check(guards >= 6, "둥지 캠프 %d개" % guards)
	check(not m.lava_areas.is_empty() and m.lava_areas[0].has_point(dragon.position), "최종 보스는 둥지 안쪽")
	check(dragon.position.distance_to(m.size * 0.5) > 1000.0, "최종 보스가 중앙에 나오지 않음")
	near(dragon.position.distance_to(m.blue_spawn), dragon.position.distance_to(m.red_spawn), 1.0, "양 팀에서 같은 거리")


func test_lair_guards_attack_first() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	cfg.autoplay = true
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var mm: MonsterManager = battle.monster_manager
	var camp = null
	for c in mm.camps:
		if c.data.id == "lair_gate_l":
			camp = c
	camp.left = 0.0
	await frames(3)
	var g: Monster = camp.units[0]
	eq(g.tier, 2, "둥지 몬스터 단계")
	check(g.health.max_hp() > DataRegistry.monster(g.data.id).base_stats.max_hp * 1.2, "더 셈")
	var h: Hero = battle.player_hero
	h.controller.set_physics_process(false)
	h.global_position = camp.data.position + Vector2(200, 0)
	await frames(40)
	check(g.target == h, "가까이 온 영웅을 먼저 공격")
	battle.queue_free()


func test_new_hero_kits() -> void:
	var ninja := spawn_hero("ninja", Enums.Team.BLUE, Vector2(400, 400))
	var e := spawn_dummy(Enums.Team.RED, Vector2(520, 400), {"max_hp": 50000.0})
	ninja.skill_caster.cast(1, CastAim.new())
	await frames(3)
	var clones := get_tree().get_nodes_in_group("summons").filter(func(m): return m.owner_unit == ninja)
	check(clones.size() >= 2, "분신술 (%d)" % clones.size())
	var mech := spawn_hero("mechanic", Enums.Team.BLUE, Vector2(400, 700))
	mech.skill_caster.cast(0, CastAim.at_point(Vector2(500, 700)))
	await frames(3)
	var turrets := get_tree().get_nodes_in_group("summons").filter(func(m): return m.owner_unit == mech)
	eq(turrets.size(), 1, "포탑 설치")
	var e2 := spawn_dummy(Enums.Team.RED, Vector2(800, 700), {"max_hp": 50000.0})
	var p0: Vector2 = turrets[0].global_position
	await frames(150)
	check(turrets[0].global_position.distance_to(p0) < 12.0, "포탑은 움직이지 않음")
	check(e2.health.hp < 50000.0, "포탑이 적을 쏨")
	var ki := spawn_hero("ki_master", Enums.Team.BLUE, Vector2(400, 1000))
	var e3 := spawn_dummy(Enums.Team.RED, Vector2(1100, 1000), {"max_hp": 50000.0})
	ki.skill_caster.cast(3, CastAim.toward(Vector2.RIGHT))
	await frames(80)
	check(e3.health.hp < 50000.0, "기공파가 멀리 있는 적을 맞힘")
	check(e.health.hp <= 50000.0, "끝")
