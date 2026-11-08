extends TestCase
## PHASE 7: 전투 이어 하기 (저장 → 새 전투 화면에 되돌리기)

const BATTLE := preload("res://scenes/battlefield/battle.tscn")

var _saved_path := ""


func before_each() -> void:
	super.before_each()
	_saved_path = SaveManager.save_path
	SaveManager.save_path = "user://test_resume.json"
	SaveManager.clear_battle()


func after_each() -> void:
	SaveManager.clear_battle()
	SaveManager.save_path = _saved_path
	GameManager.resume_snapshot = {}
	get_tree().paused = false
	await super.after_each()


func _config(autoplay := true) -> MatchConfig:
	var cfg := MatchConfig.new()
	cfg.map_id = "valley_01"
	cfg.blue_heroes = PackedStringArray(["monk", "saint", "elf_archer"])
	cfg.red_heroes = PackedStringArray(["assassin", "fire_mage", "paladin"])
	cfg.kill_target = 99
	cfg.final_boss_time = 500.0
	cfg.autoplay = autoplay
	return cfg


func _open(cfg: MatchConfig, snap := {}, wait := 2) -> Node:
	GameManager.match_config = cfg
	GameManager.resume_snapshot = snap
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	# 되돌리기는 _ready 에서 끝난다. AI 가 움직이기 전(상점 이용 등)에 비교하려면 wait = 0.
	if wait > 0:
		await frames(wait)
	return battle


func test_snapshot_roundtrip() -> void:
	var a: Node = await _open(_config())
	await frames(60 * 20)
	var bm: BattleManager = a.battle_manager
	var heroes: Array = a.hero_manager.heroes
	# 눈에 띄는 상태를 일부러 만든다.
	var monk: Hero = heroes[0]
	monk.add_xp(5000.0)
	monk.add_gold(3000)
	monk.inventory.add(ItemManager.get_item("dagger"))
	monk.inventory.add(ItemManager.get_item("health_potion"))
	monk.inventory.add(ItemManager.get_item("health_potion"))
	monk.learn(0)
	monk.skill_caster.cooldowns[0] = 4.5
	monk.status.apply(DataRegistry.get_item("status", "haste"), 7.0, 0.2, null)
	monk.health.hp = monk.health.max_hp() * 0.5
	var archer: Hero = heroes[2]
	CombatManager.apply_damage(archer, DamageInfo.new(heroes[3], 99999.0, Enums.DamageType.TRUE))
	check(archer.is_dead, "궁수를 쓰러뜨림")
	bm.kills[Enums.Team.RED] = 4
	var snap := BattleSnapshot.capture(a)
	# 파일에 쓰는 것처럼 JSON 을 거친다.
	snap = JSON.parse_string(JSON.stringify(snap))
	var before := {
		"elapsed": bm.elapsed, "level": monk.level, "gold": monk.gold, "potions": monk.inventory.count_of("health_potion"),
		"dagger": monk.inventory.count_of("dagger"), "rank0": monk.skill_caster.ranks[0], "hp": monk.health.hp,
		"max_hp": monk.health.max_hp(), "attack": monk.stats.get_stat("attack_damage"), "pos": monk.global_position,
		"respawn": archer.respawn_left, "monsters": a.monster_manager.alive_monsters().size(),
		"boss_left": a.monster_manager.time_to_final_boss(), "red_deaths": heroes[2].deaths,
	}
	a.queue_free()
	await frames(2)
	var cfg := BattleSnapshot.make_config(snap)
	check(cfg != null, "저장 내용으로 경기 설정을 만듦")
	eq(Array(cfg.red_heroes), ["assassin", "fire_mage", "paladin"], "레드 팀 영웅")
	cfg.autoplay = true
	var b: Node = await _open(cfg, snap, 0)
	check(b.resumed, "되돌리기 성공")
	var bm2: BattleManager = b.battle_manager
	var m2: Hero = b.hero_manager.heroes[0]
	var a2: Hero = b.hero_manager.heroes[2]
	near(bm2.elapsed, before.elapsed, 0.2, "경기 시간")
	eq(bm2.kills[Enums.Team.RED], 4, "킬 점수")
	eq(m2.level, before.level, "레벨")
	eq(m2.gold, before.gold, "골드")
	eq(m2.inventory.count_of("health_potion"), before.potions, "물약 개수")
	eq(m2.inventory.count_of("dagger"), before.dagger, "단검")
	eq(m2.skill_caster.ranks[0], before.rank0, "스킬 단계")
	check(m2.skill_caster.cooldowns[0] > 4.0, "쿨타임 (%.2f)" % m2.skill_caster.cooldowns[0])
	check(m2.status.has("haste"), "상태 효과")
	near(m2.stats.get_stat("attack_damage"), before.attack, 0.01, "아이템이 붙은 공격력")
	near(m2.health.max_hp(), before.max_hp, 0.01, "최대 체력")
	check(absf(m2.health.hp - before.hp) < m2.health.max_hp() * 0.05, "체력 (%.0f / %.0f)" % [m2.health.hp, before.hp])
	check(m2.global_position.distance_to(before.pos) < 30.0, "위치")
	check(a2.is_dead, "쓰러진 영웅은 쓰러진 채로")
	near(a2.respawn_left, before.respawn, 0.2, "부활 남은 시간")
	eq(a2.deaths, before.red_deaths, "데스 수")
	eq(b.monster_manager.alive_monsters().size(), before.monsters, "살아 있는 몬스터 수")
	near(b.monster_manager.time_to_final_boss(), before.boss_left, 0.2, "최종 보스까지 남은 시간")
	# 되돌린 뒤에도 경기가 계속 진행된다.
	await frames(60 * 5)
	check(bm2.elapsed > before.elapsed + 4.0, "경기가 이어짐")
	check(not a2.is_dead or a2.respawn_left < before.respawn, "부활 시간이 줄어듦")
	b.queue_free()


func test_save_file_and_menu_button() -> void:
	check(not SaveManager.has_battle(), "처음에는 저장한 전투가 없음")
	var auto: Node = await _open(_config(true))
	check(not auto.can_save(), "자동 진행 경기(관전·시험)는 저장하지 않음")
	auto.queue_free()
	await frames(2)
	var cfg := _config(false)
	var b: Node = await _open(cfg)
	check(b.can_save(), "사람이 하는 경기는 저장")
	check(b.save_snapshot(), "저장 성공")
	check(SaveManager.has_battle(), "파일이 생김")
	var loaded := SaveManager.load_battle()
	eq(str(loaded.config.blue[0]), "monk", "저장 파일 내용")
	b.queue_free()
	await frames(2)
	var menu: Control = load(GameManager.MAIN_SCENE).instantiate()
	add_child(menu)
	await frames(1)
	check(menu.find_child("이어 하기", true, false) != null, "메인 메뉴에 이어 하기 버튼")
	menu.queue_free()
	SaveManager.clear_battle()
	check(not SaveManager.has_battle(), "지우기")
	menu = load(GameManager.MAIN_SCENE).instantiate()
	add_child(menu)
	await frames(1)
	check(menu.find_child("이어 하기", true, false) == null, "저장한 전투가 없으면 버튼 없음")
	menu.queue_free()


func test_autosave_and_finish_clears() -> void:
	var b: Node = await _open(_config(false))
	b.hud.set_paused(false)
	await frames(int(60 * (b.AUTOSAVE_INTERVAL + 1.0)))
	check(SaveManager.has_battle(), "경기 중 자동 저장")
	b.battle_manager.finish(Enums.Team.BLUE, "kills")
	await frames(2)
	check(not SaveManager.has_battle(), "경기가 끝나면 저장한 전투를 지움")
	check(not b.save_snapshot(), "끝난 경기는 저장하지 않음")
	get_tree().paused = false
	b.queue_free()


func test_bad_snapshots_are_rejected() -> void:
	check(BattleSnapshot.make_config({}) == null, "빈 저장 내용")
	check(BattleSnapshot.make_config({"version": 999, "config": {}}) == null, "다른 버전")
	var bad := {"version": BattleSnapshot.VERSION, "config": {"blue": ["no_such_hero"], "red": ["monk"]}}
	check(BattleSnapshot.make_config(bad) == null, "없는 영웅")
	# 영웅 구성이 다른 저장 내용은 되돌리지 않고 새 경기로 시작한다.
	var snap := {"version": BattleSnapshot.VERSION, "heroes": [{"id": "monk"}], "camps": []}
	var b: Node = await _open(_config(), snap)
	check(not b.resumed, "구성이 다르면 되돌리지 않음")
	near(b.battle_manager.elapsed, 0.0, 0.2, "새 경기")
	b.queue_free()
