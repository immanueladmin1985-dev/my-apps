extends TestCase
## 밸런스 측정: 무작위 3대3 경기를 AI 끼리 여러 판 돌려 영웅별 승률·평균 킬/데스를 출력한다.
## 실행: tools/run_tests.sh --balance [--games=40]  (기본 시험에는 들어가지 않는다)

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func test_balance_report() -> void:
	var games := int(GameManager.dev_args.get("games", "30"))
	var stat := {}
	var lengths: Array = []
	var stomps := 0
	for g in games:
		var pool: Array = DataRegistry.ids("heroes")
		seed(1000 + g)
		pool.shuffle()
		var cfg := MatchConfig.new()
		cfg.blue_heroes = PackedStringArray(pool.slice(0, 3))
		cfg.red_heroes = PackedStringArray(pool.slice(3, 6))
		cfg.difficulty = "normal"
		cfg.kill_target = 10
		cfg.autoplay = true
		GameManager.match_config = cfg
		GameManager.dev_args["seed"] = str(1000 + g)
		var battle := BATTLE.instantiate()
		add_child(battle)
		var bm: BattleManager = battle.battle_manager
		var t := 0
		while not bm.match_over and t < 900 * 60:
			await frames(60)
			t += 60
		lengths.append(bm.elapsed)
		var lose_kills: int = bm.kills[Enums.Team.BLUE + Enums.Team.RED - bm.winner] if bm.match_over else 0
		if bm.match_over and lose_kills <= 3:
			stomps += 1
		for h: Hero in battle.hero_manager.heroes:
			var e: Dictionary = stat.get(h.data.id, {"games": 0, "wins": 0, "kills": 0, "deaths": 0, "damage": 0.0})
			e.games += 1
			e.wins += 1 if (bm.match_over and h.team == bm.winner) else 0
			e.kills += h.kills
			e.deaths += h.deaths
			e.damage += bm.damage_to_heroes.get(h, 0.0)
			stat[h.data.id] = e
		get_tree().paused = false
		battle.queue_free()
		await frames(2)
	GameManager.dev_args.erase("seed")
	var ids: Array = stat.keys()
	ids.sort_custom(func(a, b): return float(stat[a].wins) / stat[a].games > float(stat[b].wins) / stat[b].games)
	print("BALANCE %d판, 평균 길이 %.0f초, 일방적인 경기(진 팀 3킬 이하) %d판" % [games, lengths.reduce(func(a, b): return a + b, 0.0) / maxf(1, games), stomps])
	for id in ids:
		var e: Dictionary = stat[id]
		print("BALANCE %-14s 승률 %3d%% (%d판)  킬 %.1f  데스 %.1f  영웅 피해 %d" % [id, roundi(100.0 * e.wins / e.games), e.games, float(e.kills) / e.games, float(e.deaths) / e.games, roundi(e.damage / e.games)])
