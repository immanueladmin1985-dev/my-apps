extends TestCase
## PHASE 6: 저장(기록·이전 형식), 현상금, 경험치 따라잡기, 경기 요약·MVP, 효과음, 메뉴 화면.

var _saved_path := ""


func before_each() -> void:
	super.before_each()
	_saved_path = SaveManager.save_path
	SaveManager.save_path = "user://test_save.json"
	SaveManager.reset_records()


func after_each() -> void:
	SaveManager.save_path = _saved_path
	SaveManager.load_data()
	await super.after_each()


func _summary(won: bool, kills := 5) -> Dictionary:
	return {
		"winner": Enums.Team.BLUE if won else Enums.Team.RED, "reason": "kills", "time": 400.0, "mvp": "monk",
		"blue_kills": 15, "red_kills": 9, "difficulty": "normal", "kill_target": 15, "mode": "team",
		"heroes": [
			{"id": "monk", "name": "무투가", "team": Enums.Team.BLUE, "is_player": true, "level": 9, "kills": kills, "deaths": 2, "assists": 4, "gold": 300, "damage": 9000, "items": []},
			{"id": "saint", "name": "성녀", "team": Enums.Team.RED, "is_player": false, "level": 8, "kills": 1, "deaths": 5, "assists": 2, "gold": 100, "damage": 3000, "items": []},
		],
	}


func test_record_match() -> void:
	SaveManager.record_match(_summary(true, 7))
	SaveManager.record_match(_summary(false, 3))
	var r := SaveManager.records()
	eq(int(r.games), 2, "경기 수")
	eq(int(r.wins), 1, "승리")
	eq(int(r.losses), 1, "패배")
	eq(int(r.best_kills), 7, "최고 킬")
	eq(int(r.heroes.monk.games), 2, "영웅별 경기 수")
	eq(int(r.heroes.monk.kills), 10, "영웅별 누적 킬")
	eq(r.history.size(), 2, "최근 경기")
	check(not r.history[0].won and r.history[1].won, "최근 경기가 앞에")
	SaveManager.load_data()
	eq(int(SaveManager.records().games), 2, "파일에 저장되고 다시 읽힘")


func test_watch_mode_is_not_recorded() -> void:
	var s := _summary(true)
	s.heroes[0].is_player = false
	SaveManager.record_match(s)
	eq(int(SaveManager.records().games), 0, "플레이어가 없는 경기는 기록하지 않음")


func test_history_is_capped() -> void:
	for i in 40:
		SaveManager.record_match(_summary(i % 2 == 0))
	eq(SaveManager.records().history.size(), SaveManager.HISTORY_MAX, "최근 경기는 최대 30개")
	eq(int(SaveManager.records().games), 40, "경기 수는 모두 셈")


func test_migrate_version_1() -> void:
	var old := {"version": 1, "settings": {"difficulty": "hard"}, "records": {"wins": 3, "losses": 2, "best_kills": 9, "heroes": {}, "history": []}}
	var d: Dictionary = SaveManager._migrate(old)
	eq(int(d.version), SaveManager.SAVE_VERSION, "버전 올림")
	eq(d.settings.difficulty, "hard", "설정 유지")
	eq(int(d.records.games), 5, "경기 수를 승+패로 채움")
	check(d.settings.has("sfx_volume"), "새 설정 항목은 기본값")


func _bm(heroes: Array) -> BattleManager:
	var hm := HeroManager.new()
	world.add_child(hm)
	hm.heroes = heroes
	hm.map = DataRegistry.map_data("arena_01")
	var bm := BattleManager.new()
	world.add_child(bm)
	bm.setup(MatchConfig.new(), hm)
	var xm := ExperienceManager.new()
	world.add_child(xm)
	xm.setup(hm)
	return bm


func test_bounty_on_streak() -> void:
	var a := spawn_hero("monk", Enums.Team.BLUE, Vector2(400, 500))
	var b := spawn_hero("saint", Enums.Team.RED, Vector2(800, 500))
	var victims: Array = []
	for i in 3:
		victims.append(spawn_dummy(Enums.Team.BLUE, Vector2(900, 300 + i * 80), {"max_hp": 10.0}))
	var bm := _bm([a, b] + victims)
	for v in victims:
		CombatManager.apply_damage(v, DamageInfo.new(b, 99.0, Enums.DamageType.TRUE))
	eq(bm.streaks[b], 3, "연속 처치 3")
	eq(bm.bounty_of(b), 120, "현상금 (3−1)×60")
	var gold := a.gold
	CombatManager.apply_damage(b, DamageInfo.new(a, 99999.0, Enums.DamageType.TRUE))
	check(a.gold - gold >= 270 + 120, "처치 골드 + 현상금 (%d)" % (a.gold - gold))
	eq(bm.streaks[b], 0, "죽으면 연속 처치 초기화")


func test_catch_up_xp() -> void:
	var low := spawn_hero("monk", Enums.Team.BLUE, Vector2(400, 500))
	var high := spawn_hero("saint", Enums.Team.RED, Vector2(500, 500))
	high.add_xp(2000.0)
	var bm := _bm([low, high])
	CombatManager.apply_damage(high, DamageInfo.new(low, 99999.0, Enums.DamageType.TRUE))
	var base: float = DataRegistry.progression().hero_xp_base + DataRegistry.progression().hero_xp_per_level * high.level
	var gained := low.xp
	for l in range(1, low.level):
		gained += DataRegistry.progression().xp_to_next(l)
	check(gained > base * 1.2, "레벨이 낮은 쪽이 처치하면 경험치를 더 받음 (%.0f > %.0f)" % [gained, base])


func test_summary_and_mvp() -> void:
	var a := spawn_hero("monk", Enums.Team.BLUE, Vector2(400, 500))
	var b := spawn_hero("saint", Enums.Team.RED, Vector2(600, 500))
	a.get_node("Visual").is_player = true
	var bm := _bm([a, b])
	CombatManager.apply_damage(b, DamageInfo.new(a, 300.0, Enums.DamageType.TRUE))
	CombatManager.apply_damage(b, DamageInfo.new(a, 99999.0, Enums.DamageType.TRUE))
	bm.finish(Enums.Team.BLUE, "kills")
	var s := bm.summary()
	eq(s.winner, Enums.Team.BLUE, "승리 팀")
	eq(s.heroes.size(), 2, "영웅 2명")
	var me = s.heroes.filter(func(h): return h.is_player)[0]
	eq(me.kills, 1, "킬")
	check(me.damage >= 300, "영웅에게 준 피해 (%d)" % me.damage)
	eq(s.mvp, "monk", "MVP")


func test_audio_sounds_exist_and_play() -> void:
	for n in ["hit", "crit", "hurt", "skill", "death", "level_up", "buy", "boss", "victory", "defeat", "click"]:
		check(AudioManager.sounds.has(n) and AudioManager.sounds[n].data.size() > 100, "효과음 %s" % n)
	var before := AudioManager.play_count
	AudioManager.play("buy", 0.0)
	check(AudioManager.play_count == before + 1, "효과음 재생")


func test_menu_screens_build() -> void:
	SaveManager.record_match(_summary(true))
	GameManager.last_summary = _summary(true)
	for path in [GameManager.MAIN_SCENE, GameManager.NEW_GAME_SCENE, GameManager.HERO_CODEX_SCENE, GameManager.ITEM_CODEX_SCENE,
			GameManager.RECORDS_SCENE, GameManager.SETTINGS_SCENE, GameManager.RESULTS_SCENE]:
		var sc: Node = load(path).instantiate()
		world.add_child(sc)
		await frames(2)
		check(sc.get_child_count() > 0, "%s 화면이 만들어짐" % path.get_file())
		check(sc.has_method("on_back"), "%s 뒤로 가기 처리" % path.get_file())
		sc.queue_free()
		await frames(1)


func test_new_game_manual_team() -> void:
	var sc: Node = load(GameManager.NEW_GAME_SCENE).instantiate()
	world.add_child(sc)
	await frames(1)
	sc._set_team_mode("manual")
	sc._select_slot(0)
	sc._on_hero("monk")
	sc._select_slot(1)
	sc._on_hero("saint")
	sc._select_slot(3)
	sc._on_hero("assassin")
	var c: MatchConfig = sc.build_config()
	eq(c.blue_heroes[0], "monk", "나")
	eq(c.blue_heroes[1], "saint", "아군 직접 선택")
	eq(c.red_heroes[0], "assassin", "적 직접 선택")
	var all := Array(c.blue_heroes) + Array(c.red_heroes)
	var uniq := {}
	for id in all:
		uniq[id] = true
	eq(uniq.size(), 6, "빈칸은 겹치지 않는 무작위 영웅")
	sc._set_mode("practice")
	c = sc.build_config()
	eq(c.blue_heroes.size(), 1, "1대1 연습은 1명씩")
	eq(c.red_heroes.size(), 1, "1대1 연습은 1명씩")
	sc._set_mode("watch")
	check(sc.build_config().autoplay, "관전은 모두 AI")
	sc._set_team_mode("random")
