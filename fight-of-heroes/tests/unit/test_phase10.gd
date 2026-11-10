extends TestCase
## PHASE 10: 스킬 설명(꾹 누르기), 추천 아이템 재료, 중앙 미니언 성장, 전장의 안개, 상점 버튼

const BATTLE := preload("res://scenes/battlefield/battle.tscn")

var battle: Node
var hud
var hero: Hero
var enemy: Hero


func _open(autoplay := false) -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	cfg.kill_target = 999
	cfg.autoplay = autoplay
	GameManager.match_config = cfg
	battle = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	hud = battle.hud
	hero = battle.player_hero
	enemy = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	enemy.controller.set_physics_process(false)
	enemy.clear_orders()


func after_each() -> void:
	if battle != null:
		battle.queue_free()
		battle = null
	SaveManager.data.settings.fog_of_war = true
	await get_tree().process_frame


func _touch(index: int, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = index
	e.position = get_viewport().get_final_transform() * pos
	e.pressed = pressed
	Input.parse_input_event(e)


func test_hold_skill_shows_info_without_casting() -> void:
	await _open()
	hero.skill_caster.setup(hero.data.skills, 1)
	var q: SkillButton = hud.skill_buttons[0]
	var casts: int = hero.skill_caster.cast_counts[0]
	_touch(0, q.center_global(), true)
	await frames(10)
	check(not hud.skill_info.visible, "짧게 누르는 동안에는 설명이 없음")
	await frames(30)
	check(hud.skill_info.visible, "꾹 누르면 설명이 나옴")
	var s: SkillData = hero.skill_caster.get_skill(0)
	check(hud.skill_info_label.text.contains(s.display_name), "설명에 스킬 이름")
	check(hud.skill_info_label.text.contains("쿨타임"), "설명에 쿨타임")
	_touch(0, q.center_global(), false)
	await frames(3)
	check(not hud.skill_info.visible, "떼면 설명이 사라짐")
	eq(hero.skill_caster.cast_counts[0], casts, "설명만 보고 떼면 스킬을 쓰지 않음")
	eq(hero.skill_caster.cooldowns[0], 0.0, "쿨타임도 돌지 않음")


func test_learn_shows_info_briefly() -> void:
	await _open()
	hud._show_skill_info(1, 2.5)
	check(hud.skill_info.visible, "스킬을 배우면 설명을 잠깐 보여 줌")
	await frames(170)
	check(not hud.skill_info.visible, "잠시 뒤 사라짐")


func test_shop_button_shows_gold_and_is_apart_from_gather() -> void:
	await _open()
	await frames(2)
	check(hud.shop_button.sub_text.contains(str(hero.gold)), "상점 버튼에 골드 (%s)" % hud.shop_button.sub_text)
	check(hud.shop_button.highlight, "기지에 있으면 상점 버튼 강조")
	var gap: float = hud.shop_button.get_global_rect().get_center().distance_to(hud.gather_button.get_global_rect().get_center())
	check(gap > 300.0, "상점·모여 버튼이 떨어져 있음 (%.0f)" % gap)
	hero.global_position = Vector2(2100, 1300)
	await frames(2)
	check(not hud.shop_button.highlight, "기지 밖에서는 강조하지 않음")


func test_recommended_lists_components_first() -> void:
	await _open()
	hud.toggle_shop()
	await frames(2)
	var panel = hud.shop_panel
	var items: Array = panel._items_for("recommend")
	var checked := 0
	for fid in hero.data.ai_build:
		var f := ItemManager.get_item(fid)
		var fi := items.find(f)
		check(fi >= 0, "추천 완성품: " + fid)
		for cid in f.components:
			var ci := items.find(ItemManager.get_item(cid))
			check(ci >= 0 and ci < fi, "%s 의 재료 %s 가 먼저 나옴" % [fid, cid])
			checked += 1
	check(checked > 0, "재료가 있는 추천 아이템이 있음")
	panel._select_item(ItemManager.get_item("hero_sword"))
	await frames(2)
	eq(panel.parts_row.get_child_count(), ItemManager.get_item("hero_sword").components.size(), "재료 칸")
	var first: ItemTile = panel.parts_row.get_child(0)
	var part: ItemData = first.item
	first.pressed.emit()
	await frames(1)
	eq(panel.selected, part, "재료 칸을 누르면 그 재료를 고름")
	hud.toggle_shop()


func test_center_wave_grows() -> void:
	var c: CampData = null
	for camp in DataRegistry.map_data("valley_01").camps:
		if camp.id == "center_wave":
			c = camp
	check(c != null, "중앙 소환 캠프")
	eq(c.wave_tier(0.0), 1, "처음은 1단계")
	eq(c.wave_tier(250.0), 3, "250초 뒤 3단계")
	eq(c.wave_tier(99999.0), c.wave_max_tier, "최대 단계")
	check(c.wave_group(4).size() > c.wave_group(1).size(), "단계가 오르면 한 무리가 커짐")
	await _open(true)
	var mm: MonsterManager = battle.monster_manager
	for camp in mm.camps:
		if camp.data.id == "center_wave":
			mm.elapsed = c.first_spawn + 320.0
			camp.left = 0.0
	await frames(2)
	var tier4: Array = mm.alive_monsters().filter(func(m): return m.tier == 4)
	check(tier4.size() >= c.wave_group(4).size(), "4단계 미니언이 한 무리 나옴 (%d)" % tier4.size())
	var gob = tier4.filter(func(m): return m.data.id == "goblin")[0]
	var base_hp: float = DataRegistry.monster("goblin").base_stats.max_hp
	near(gob.health.max_hp(), base_hp * (1.0 + c.wave_stat_growth * 3), 0.5, "체력이 세짐")
	near(gob.reward_mult, 1.0 + c.wave_reward_growth * 3, 0.001, "보상 배율")
	var g0 := hero.gold
	hero.global_position = gob.global_position + Vector2(40, 0)
	CombatManager.apply_damage(gob, DamageInfo.new(hero, 99999.0, Enums.DamageType.TRUE))
	var gain := hero.gold - g0
	check(gain >= roundi(DataRegistry.monster("goblin").gold * gob.reward_mult) - 1, "처치 골드가 커짐 (%d)" % gain)


func test_fog_of_war() -> void:
	await _open()
	check(battle.fog != null, "사람이 하는 경기에는 안개가 있음")
	# 기지 시야에서 벗어난 맵 가운데에서 시험한다.
	hero.global_position = Vector2(2100, 900)
	enemy.global_position = hero.global_position + Vector2(1500, 0)
	await frames(8)
	check(not FogOfWar.can_see(enemy), "멀리 있는 적은 보이지 않음")
	check(FogOfWar.can_see(hero), "우리 팀은 늘 보임")
	enemy.global_position = hero.global_position + Vector2(300, 0)
	await frames(8)
	check(FogOfWar.can_see(enemy), "시야 안의 적은 보임")
	# 영웅이 떠나도 잠시 동안은 보이고, 시간이 지나면 다시 가려진다.
	var spot := enemy.global_position
	hero.global_position = spot + Vector2(0, 1100)
	await frames(60)
	check(battle.fog.is_visible_pos(spot), "비춘 곳은 잠시 동안 보임")
	await frames(60 * 6)
	check(not battle.fog.is_visible_pos(spot), "시간이 지나면 다시 안 보임")
	check(not battle.player_controller._nearest_prefer_hero(3000.0) == enemy, "보이지 않는 적은 자동으로 노리지 않음")


func test_fog_off_for_watch_and_setting() -> void:
	await _open(true)
	check(battle.fog == null and FogOfWar.current == null, "관전·자동 진행에는 안개가 없음")
	battle.queue_free()
	await frames(2)
	SaveManager.data.settings.fog_of_war = false
	await _open()
	check(battle.fog == null, "설정에서 끄면 안개가 없음")
