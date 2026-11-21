extends TestCase
## 게임 방식: 짧은 판(높은 레벨·골드로 시작, 5킬, 빠른 부활·몬스터)과 보스 레이드(아군 셋 대 강해진 고대 흑룡).

const BATTLE := preload("res://scenes/battlefield/battle.tscn")
const NEW_GAME := preload("res://scenes/selection/new_game.tscn")
const RESULTS := preload("res://scenes/results/results.tscn")

var _saved_path := ""
var _battle: Node = null


func before_each() -> void:
	super.before_each()
	_saved_path = SaveManager.save_path
	SaveManager.save_path = "user://test_modes.json"
	SaveManager.clear_battle()


func after_each() -> void:
	if _battle != null and is_instance_valid(_battle):
		_battle.queue_free()
		_battle = null
	get_tree().paused = false
	GameManager.dev_args.erase("seed")
	SaveManager.clear_battle()
	SaveManager.save_path = _saved_path
	await super.after_each()


func _config(game_type: String, autoplay := true) -> MatchConfig:
	var cfg := MatchConfig.new()
	cfg.map_id = GameManager.DEFAULT_MAP
	cfg.blue_heroes = PackedStringArray(["blade_master", "saint", "elf_archer"])
	cfg.red_heroes = PackedStringArray(["monk", "fire_mage", "paladin"])
	cfg.kill_target = 15
	cfg.autoplay = autoplay
	cfg.apply_game_type(game_type)
	return cfg


func _open(cfg: MatchConfig, seed_value := 7) -> Node:
	GameManager.match_config = cfg
	GameManager.dev_args["seed"] = str(seed_value)
	seed(seed_value)
	CombatManager.rng.seed = seed_value
	_battle = BATTLE.instantiate()
	add_child(_battle)
	return _battle


func _ranks(h: Hero) -> int:
	var n := 0
	for slot in 4:
		n += h.skill_caster.ranks[slot]
	return n


# ---- 짧은 판 ----

func test_quick_config_rules() -> void:
	var c := _config("quick")
	eq(c.kill_target, 5, "목표 킬 5 (고른 값과 상관없이)")
	eq(c.start_level, 6, "시작 레벨")
	eq(c.start_gold, 2500, "시작 골드")
	near(c.respawn_scale, 0.5, 0.001, "부활 시간 절반")
	near(c.camp_spawn_scale, 0.5, 0.001, "몬스터 첫 등장 절반")
	eq(c.red_heroes.size(), 3, "상대 팀은 그대로")
	c.apply_game_type("normal")
	eq(c.start_level, 1, "일반으로 되돌리면 시작 레벨 1")
	near(c.respawn_scale, 1.0, 0.001, "일반으로 되돌리면 부활 배율 1")


func test_quick_start_state() -> void:
	var b := _open(_config("quick", false))
	var hm: HeroManager = b.hero_manager
	eq(hm.heroes.size(), 6, "영웅 6명")
	for h: Hero in hm.heroes:
		eq(h.level, 6, "%s 시작 레벨" % h.display_name)
		eq(h.gold, 2500, "%s 시작 골드" % h.display_name)
		eq(h.skill_points, 0, "%s 스킬 포인트를 모두 배움" % h.display_name)
		eq(_ranks(h), 6, "%s 배운 스킬 단계 합" % h.display_name)
		check(h.skill_caster.ranks[Enums.Slot.R] >= 1, "%s 궁극기(6레벨)를 배움" % h.display_name)
		near(h.health.hp, h.health.max_hp(), 0.5, "%s 체력이 가득 참" % h.display_name)
	check(b.player_controller != null, "플레이어가 조작하는 영웅이 있음")
	eq(b.battle_manager.config.kill_target, 5, "전투의 목표 킬 5")
	# 몬스터 첫 등장 시각이 절반
	var mm: MonsterManager = b.monster_manager
	for camp in mm.camps:
		var c: CampData = camp.data
		if c.is_final_boss:
			near(camp.left, 300.0, 0.5, "최종 보스는 5분")
		else:
			near(camp.left, c.first_spawn * 0.5, 0.5, "%s 첫 등장 절반" % c.id)
	# 부활 시간 절반
	var victim: Hero = hm.team_heroes(Enums.Team.RED)[0]
	victim.die(null)
	var expected := DataRegistry.combat_config().respawn_time(victim.level) * 0.5
	near(victim.respawn_left, expected, 0.01, "부활 시간 절반")


func test_quick_five_kills_win() -> void:
	var b := _open(_config("quick"))
	await frames(2)
	var hm: HeroManager = b.hero_manager
	var killer: Hero = hm.team_heroes(Enums.Team.BLUE)[0]
	var reds: Array = hm.team_heroes(Enums.Team.RED)
	var bm: BattleManager = b.battle_manager
	for i in 5:
		var v: Hero = reds[i % reds.size()]
		if v.is_dead:
			v.respawn_at(v.spawn_point)
		v.die(killer)
		if i < 4:
			check(not bm.match_over, "%d킬에서는 끝나지 않음" % (i + 1))
	check(bm.match_over, "5킬이면 끝남")
	eq(bm.winner, Enums.Team.BLUE, "블루 승리")
	eq(bm.end_reason, "kills", "사유: 목표 킬")
	eq(bm.summary().get("game_type"), "quick", "요약에 게임 방식")


func test_quick_snapshot_keeps_rules() -> void:
	var b := _open(_config("quick", false))
	await frames(2)
	var snap := BattleSnapshot.capture(b)
	var cfg := BattleSnapshot.make_config(snap)
	check(cfg != null, "저장한 짧은 판을 되돌릴 수 있음")
	if cfg != null:
		eq(cfg.game_type, "quick", "게임 방식 유지")
		near(cfg.respawn_scale, 0.5, 0.001, "부활 배율 유지")
		eq(cfg.kill_target, 5, "목표 킬 유지")


# ---- 보스 레이드 ----

func test_raid_config_rules() -> void:
	var c := _config("raid")
	eq(c.red_heroes.size(), 0, "레드 팀이 비어 있음")
	eq(c.blue_heroes.size(), 3, "아군 셋")
	eq(c.kill_target, 0, "킬 목표 없음")
	eq(c.start_level, 8, "시작 레벨")
	eq(c.start_gold, 3000, "시작 골드")
	near(c.raid_time_limit, 600.0, 0.01, "제한 시간 10분")
	near(c.final_boss_time, 20.0, 0.01, "레이드 보스는 20초 뒤")


func test_raid_start_and_boss_spawn() -> void:
	var warnings: Array = []
	var on_notice := func(t: String): warnings.append(t)
	EventBus.notice.connect(on_notice)
	var b := _open(_config("raid", false))
	# AI 는 첫 판단에서 바로 물건을 사므로 기다리지 않고 시작 상태를 본다.
	var hm: HeroManager = b.hero_manager
	eq(hm.team_heroes(Enums.Team.RED).size(), 0, "레드 영웅 없음")
	eq(hm.team_heroes(Enums.Team.BLUE).size(), 3, "블루 영웅 셋")
	for h: Hero in hm.heroes:
		eq(h.level, 8, "%s 시작 레벨" % h.display_name)
		eq(h.gold, 3000, "%s 시작 골드" % h.display_name)
	check(not b.can_save(), "보스 레이드는 이어 하기용으로 저장하지 않음")
	var mm: MonsterManager = b.monster_manager
	check(mm.camps.all(func(c): return c.data.wave_interval <= 0.0), "가운데 미니언 무대는 쉼")
	var raid_camp = null
	for camp in mm.camps:
		if camp.data.is_final_boss:
			raid_camp = camp
	check(raid_camp != null, "레이드 보스 자리가 있음")
	if raid_camp == null:
		EventBus.notice.disconnect(on_notice)
		return
	eq(raid_camp.data.position, b.map.size * 0.5, "레이드 보스 자리는 맵 가운데")
	var map_camp: CampData = null
	for c: CampData in b.map.camps:
		if c.is_final_boss:
			map_camp = c
	check(map_camp != null and map_camp.position != b.map.size * 0.5, "맵 자료(공유 리소스)는 바뀌지 않음")
	check(mm.final_boss() == null, "처음에는 보스가 없음")
	# 20초 뒤 등장
	await frames(60 * 19)
	check(warnings.any(func(t): return t.contains("레이드 보스") and t.contains("초 뒤")), "등장 예고 알림")
	check(mm.final_boss() == null, "19초에는 아직 없음")
	await frames(60 * 2)
	var boss = mm.final_boss()
	check(boss != null, "20초 뒤 레이드 보스 등장")
	if boss != null:
		var base: float = DataRegistry.monster("ancient_dragon").base_stats.max_hp
		near(boss.health.max_hp(), base * b.config.raid_boss_hp_scale, 1.0, "체력 배율")
		near(boss.health.hp, boss.health.max_hp(), 1.0, "체력이 가득 참")
		check(boss.global_position.distance_to(b.map.size * 0.5) < 80.0, "맵 가운데에서 나타남")
		check(b.hud.boss_bar.visible, "위쪽에 보스 체력 막대")
	check(b.hud.score_label.text.contains("남은 시간"), "위쪽에 남은 시간 표시 (%s)" % b.hud.score_label.text)
	EventBus.notice.disconnect(on_notice)


func _spawn_raid_boss(b: Node) -> Monster:
	var mm: MonsterManager = b.monster_manager
	for camp in mm.camps:
		if camp.data.is_final_boss and not camp.alive:
			mm.spawn_camp(camp)
	return mm.final_boss()


func test_raid_boss_death_wins() -> void:
	var b := _open(_config("raid"))
	await frames(2)
	var boss := _spawn_raid_boss(b)
	check(boss != null, "보스를 부름")
	if boss == null:
		return
	var hero: Hero = b.hero_manager.team_heroes(Enums.Team.BLUE)[0]
	CombatManager.apply_damage(boss, DamageInfo.new(hero, boss.health.max_hp() * 10.0, Enums.DamageType.TRUE))
	await frames(2)
	var bm: BattleManager = b.battle_manager
	check(bm.match_over, "보스를 쓰러뜨리면 끝남")
	eq(bm.winner, Enums.Team.BLUE, "레이드 성공 (블루 승리)")
	eq(bm.end_reason, "raid", "사유: 레이드 보스 처치")
	var s := bm.summary()
	eq(s.game_type, "raid", "요약에 게임 방식")
	check(s.mvp != "", "MVP 를 고름")
	check(b.hud.result_title.text == "레이드 성공!", "전투 화면 결과 창에 레이드 성공 (%s)" % b.hud.result_title.text)
	# 결과 화면
	GameManager.last_summary = s
	var r: Control = RESULTS.instantiate()
	add_child(r)
	await frames(1)
	var texts := _label_texts(r)
	check(texts.any(func(t): return t == "레이드 성공!"), "결과 화면에 레이드 성공")
	check(texts.any(func(t): return t.begins_with("클리어 시간")), "결과 화면에 클리어 시간")
	r.queue_free()


func test_raid_timeout_loses() -> void:
	var b := _open(_config("raid"))
	await frames(2)
	var bm: BattleManager = b.battle_manager
	bm.elapsed = 599.5
	await frames(60)
	check(bm.match_over, "제한 시간이 다 되면 끝남")
	eq(bm.winner, Enums.Team.RED, "레이드 실패")
	eq(bm.end_reason, "timeout", "사유: 시간 초과")
	GameManager.last_summary = bm.summary()
	var r: Control = RESULTS.instantiate()
	add_child(r)
	await frames(1)
	check(_label_texts(r).any(func(t): return t == "레이드 실패"), "결과 화면에 레이드 실패")
	r.queue_free()


func test_raid_all_dead_loses() -> void:
	var b := _open(_config("raid"))
	await frames(2)
	var bm: BattleManager = b.battle_manager
	var blue: Array = b.hero_manager.team_heroes(Enums.Team.BLUE)
	blue[0].die(null)
	blue[1].die(null)
	check(not bm.match_over, "둘만 쓰러지면 계속")
	# 한 명이 부활한 뒤 다시 쓰러져도 동시에 셋이 아니면 계속
	blue[0].respawn_at(blue[0].spawn_point)
	blue[2].die(null)
	check(not bm.match_over, "한꺼번에 셋이 아니면 계속")
	blue[0].die(null)
	check(bm.match_over, "셋이 모두 쓰러지면 끝남")
	eq(bm.winner, Enums.Team.RED, "레이드 실패")
	eq(bm.end_reason, "wiped", "사유: 모두 쓰러짐")


func test_raid_ai_focus_when_ready() -> void:
	var b := _open(_config("raid"))
	await frames(2)
	var am: AIManager = b.ai_manager
	var mm: MonsterManager = b.monster_manager
	var boss := _spawn_raid_boss(b)
	check(boss != null, "보스를 부름")
	am._update_plan(Enums.Team.BLUE)
	eq(am.plan_for(Enums.Team.BLUE).get("kind", ""), "none", "8레벨·처음에는 사냥부터")
	check(not am.raid_ready(Enums.Team.BLUE), "아직 준비가 안 됨")
	mm.elapsed = 121.0
	am._update_plan(Enums.Team.BLUE)
	var p := am.plan_for(Enums.Team.BLUE)
	eq(p.get("kind", ""), "boss", "2분이 지나면 보스에 도전")
	check(p.get("target") == boss, "대상은 레이드 보스")
	# 레벨 9 이상이면 2분 전에도 도전
	mm.elapsed = 30.0
	am.plans.clear()
	for h in b.hero_manager.team_heroes(Enums.Team.BLUE):
		h.level = 9
	check(am.raid_ready(Enums.Team.BLUE), "평균 9레벨이면 준비됨")


func test_new_game_screen_game_types() -> void:
	var ng: Control = NEW_GAME.instantiate()
	add_child(ng)
	await frames(1)
	check(ng.find_child("Type_raid", true, false) != null, "게임 방식 버튼")
	ng.set_game_type("quick")
	var c: MatchConfig = ng.build_config()
	eq(c.game_type, "quick", "짧은 판 설정")
	eq(c.kill_target, 5, "목표 킬 5")
	check(ng.rule_label.visible and not ng.kill_stepper.visible, "목표 킬 대신 규칙 설명")
	ng._set_mode("practice")
	ng.set_game_type("raid")
	eq(ng.mode, "team", "보스 레이드를 고르면 1대1 연습은 3대3 으로 바뀜")
	c = ng.build_config()
	eq(c.game_type, "raid", "보스 레이드 설정")
	eq(c.red_heroes.size(), 0, "적 영웅 없음")
	eq(c.blue_heroes.size(), 3, "아군 셋")
	ng._set_team_mode("manual")
	check(not ng.slot_buttons[3].visible, "직접 구성에서 적 칸을 숨김")
	ng.set_game_type("normal")
	ng._set_team_mode("random")
	check(ng.kill_stepper.visible, "일반이면 목표 킬을 고를 수 있음")
	ng.queue_free()


# ---- 자동 진행 (스크립트 오류가 없는지) ----

func test_raid_autoplay_sim() -> void:
	var b := _open(_config("raid"), 11)
	var bm: BattleManager = b.battle_manager
	var t := 0
	while t < 60 * 75 and not bm.match_over:
		await frames(60)
		t += 60
	check(b.monster_manager.final_boss() != null or bm.match_over, "75초 안에 레이드 보스가 나옴")
	var killed := 0
	for camp in b.monster_manager.camps:
		killed += camp.spawned
	check(killed > 0, "캠프가 나타남")


func test_quick_autoplay_sim() -> void:
	var b := _open(_config("quick"), 13)
	var bm: BattleManager = b.battle_manager
	var t := 0
	while t < 60 * 60 and not bm.match_over:
		await frames(60)
		t += 60
	check(bm.elapsed > 1.0, "경기가 진행됨")


func _label_texts(n: Node) -> Array:
	var out: Array = []
	if n is Label:
		out.append(n.text)
	for c in n.get_children():
		out += _label_texts(c)
	return out
