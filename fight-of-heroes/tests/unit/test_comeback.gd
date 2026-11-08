extends TestCase
## PHASE 8: 따라잡기 (킬 점수가 뒤진 팀은 골드를 더 받고 더 빨리 부활한다)


func _setup(heroes: Array) -> Array:
	var hm := HeroManager.new()
	world.add_child(hm)
	hm.heroes = heroes
	for h in heroes:
		h.died.connect(hm._on_hero_died.bind(h))
	hm.map = DataRegistry.map_data("arena_01")
	var bm := BattleManager.new()
	world.add_child(bm)
	var cfg := MatchConfig.new()
	cfg.kill_target = 99
	bm.setup(cfg, hm)
	hm.battle = bm
	var xm := ExperienceManager.new()
	world.add_child(xm)
	xm.setup(hm, bm)
	return [bm, hm, xm]


func test_multipliers() -> void:
	var cfg := DataRegistry.progression()
	near(cfg.comeback_gold(0), 1.0, 0.001, "앞서면 그대로")
	near(cfg.comeback_gold(3), 1.24, 0.001, "3킬 뒤지면 골드 +24%")
	near(cfg.comeback_gold(20), 1.5, 0.001, "골드 최대 +50%")
	near(cfg.comeback_respawn(3), 0.82, 0.001, "3킬 뒤지면 부활 -18%")
	near(cfg.comeback_respawn(20), 0.6, 0.001, "부활 최대 -40%")


func test_deficit_and_rewards() -> void:
	var blue := spawn_hero("monk", Enums.Team.BLUE, Vector2(400, 500))
	var red := spawn_hero("saint", Enums.Team.RED, Vector2(800, 500))
	var parts := _setup([blue, red])
	var bm: BattleManager = parts[0]
	bm.kills[Enums.Team.RED] = 5
	eq(bm.deficit(Enums.Team.BLUE), 5, "블루가 5킬 뒤짐")
	eq(bm.deficit(Enums.Team.RED), 0, "레드는 앞섬")
	# 시간당 골드: 뒤진 팀이 더 받는다.
	var b0 := blue.gold
	var r0 := red.gold
	await frames(600)
	var bg := blue.gold - b0
	var rg := red.gold - r0
	check(bg > rg, "뒤진 팀의 시간당 골드가 더 많음 (블루 %d, 레드 %d)" % [bg, rg])
	# 부활 시간: 뒤진 팀이 더 짧다.
	CombatManager.apply_damage(blue, DamageInfo.new(null, 99999.0, Enums.DamageType.TRUE))
	CombatManager.apply_damage(red, DamageInfo.new(null, 99999.0, Enums.DamageType.TRUE))
	var base := DataRegistry.combat_config().respawn_time(1)
	near(red.respawn_left, base, 0.05, "앞선 팀은 기본 부활 시간")
	near(blue.respawn_left, base * 0.7, 0.05, "뒤진 팀은 30% 짧게")


func test_kill_gold_bonus() -> void:
	var killer := spawn_hero("monk", Enums.Team.BLUE, Vector2(400, 500))
	var victim := spawn_hero("saint", Enums.Team.RED, Vector2(450, 500))
	var parts := _setup([killer, victim])
	var bm: BattleManager = parts[0]
	bm.kills[Enums.Team.RED] = 4
	var g0 := killer.gold
	CombatManager.apply_damage(victim, DamageInfo.new(killer, 99999.0, Enums.DamageType.TRUE))
	# 처치 뒤 킬 차이 3 → 270 × 1.24
	eq(killer.gold - g0, int(270 * 1.24), "뒤진 팀의 처치 골드 보너스")
