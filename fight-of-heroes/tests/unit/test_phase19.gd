extends TestCase
## PHASE 19: AI 가 영웅 스킬을 일부만 피함, 사람 아군 돕기, 몬스터 골드 나눠 받기, 풀숲, 룬 제단, 처치 알림

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Bushes.list = PackedVector3Array()
	await super.after_each()


func test_ai_dodges_only_some_hero_skills() -> void:
	var p := DataRegistry.ai_profile("normal")
	check(p.hero_dodge_chance > 0.0 and p.hero_dodge_chance < 1.0, "영웅 스킬은 확률로만 피함 (%.2f)" % p.hero_dodge_chance)
	check(DataRegistry.ai_profile("hard").hero_dodge_chance > DataRegistry.ai_profile("easy").hero_dodge_chance, "어려움일수록 더 잘 피함")
	var ai := AIController.new()
	ai.profile = p
	ai.rng.seed = 7
	var n := 0
	for i in 200:
		var z := Node.new()
		if ai._will_dodge(z):
			n += 1
		z.free()
	check(n > 30 and n < 100, "200번 중 %d번만 피함 (보통 30%%)" % n)
	ai.free()


func test_monster_gold_shared_with_nearby_ally() -> void:
	var cfg := GameManager.default_config("blade_master")
	cfg.autoplay = true
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var blues: Array = battle.hero_manager.team_heroes(Enums.Team.BLUE)
	var a: Hero = blues[0]
	var b: Hero = blues[1]
	for h in blues:
		h.controller.set_physics_process(false)
	a.global_position = Vector2(1500, 1700)
	b.global_position = Vector2(1600, 1700)
	var g_a := a.gold
	var g_b := b.gold
	var m: Monster = load("res://scenes/monsters/monster.tscn").instantiate()
	battle.world.add_child(m)
	m.setup(DataRegistry.monster("wolf"), Vector2(1550, 1750))
	m.die(a)
	await frames(1)
	var gold: int = DataRegistry.monster("wolf").gold
	eq(a.gold - g_a, gold, "처치한 영웅은 골드를 다 받음")
	eq(b.gold - g_b, roundi(gold * 0.4), "근처 아군은 40% 를 받음")
	battle.queue_free()


func test_bush_hides_units() -> void:
	Bushes.list = PackedVector3Array([Vector3(300, 300, 100)])
	var hider := spawn_dummy(Enums.Team.RED, Vector2(300, 300), {})
	var seeker := spawn_dummy(Enums.Team.BLUE, Vector2(600, 300), {})
	check(Bushes.hidden_from(hider, Enums.Team.BLUE), "풀숲 안의 적은 보이지 않음")
	check(not FogOfWar.team_can_see(Enums.Team.BLUE, hider), "AI 도 못 봄")
	hider.revealed_until = Unit.now() + 1.0
	check(not Bushes.hidden_from(hider, Enums.Team.BLUE), "공격하면 잠깐 드러남")
	hider.revealed_until = -100.0
	seeker.global_position = Vector2(330, 300)
	check(not Bushes.hidden_from(hider, Enums.Team.BLUE), "같은 풀숲에 들어오면 보임")


func test_runes_spawn_and_pick() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var rm: RuneManager = get_tree().get_first_node_in_group("runes")
	check(rm != null and rm.spots.size() >= 2, "룬 제단")
	eq(rm.active().size(), 0, "처음에는 룬이 없음")
	for s in rm.spots:
		s.left = 0.0
	await frames(2)
	eq(rm.active().size(), rm.spots.size(), "시간이 되면 룬이 나타남")
	var h: Hero = battle.player_hero
	var s0: Dictionary = rm.spots[0]
	s0.kind = "power"
	var atk0 := h.stats.get_stat("attack")
	h.global_position = s0.pos
	await frames(2)
	eq(s0.kind, "", "밟으면 먹음")
	check(h.stats.get_stat("attack") > atk0 * 1.15, "힘의 룬: 공격력 +20%")
	battle.queue_free()


func test_kill_announcements() -> void:
	var cfg := GameManager.default_config("blade_master")
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var hud = battle.hud
	var me: Hero = battle.player_hero
	var reds: Array = battle.hero_manager.team_heroes(Enums.Team.RED)
	reds[0].die(me)
	await frames(1)
	check(hud.banner_label.visible and hud.banner_label.text.contains("첫 처치"), "첫 처치 알림: %s" % hud.banner_label.text)
	reds[1].die(me)
	await frames(1)
	check(hud.banner_label.text.contains("더블 킬"), "10초 안에 둘: 더블 킬 (%s)" % hud.banner_label.text)
	reds[2].die(me)
	await frames(1)
	check(hud.banner_label.text.contains("트리플 킬"), "셋: 트리플 킬 (%s)" % hud.banner_label.text)
	battle.queue_free()


func test_ai_rescues_player() -> void:
	var cfg := GameManager.default_config("blade_master")
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var me: Hero = battle.player_hero
	var ally: AIController = null
	for c in battle.ai_manager.controllers:
		if c.hero.team == Enums.Team.BLUE:
			ally = c
	var foe: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	me.global_position = Vector2(1500, 1700)
	foe.global_position = Vector2(1560, 1700)
	ally.hero.global_position = Vector2(2900, 1700)
	me.register_attacker(foe)
	ally.think()
	check(ally.state == AIController.State.FOLLOW and ally.objective is Vector2 and ally.objective.distance_to(me.global_position) < 200.0, "플레이어가 적 영웅에게 맞으면 도우러 감")
	battle.queue_free()


func test_golden_goblin_drops_coins() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var ev: GoblinEvent = battle.get_node("GoblinEvent")
	var g: Monster = ev.spawn()
	check(g != null and g.flee, "황금 고블린")
	var h: Hero = battle.player_hero
	g.global_position = h.global_position + Vector2(200, 0)
	var info := DamageInfo.new(h, g.health.max_hp() * 0.35, Enums.DamageType.TRUE)
	CombatManager.apply_damage(g, info)
	await frames(1)
	eq(get_tree().get_nodes_in_group("coins").size(), 3, "체력 35% 를 잃으면 금화 3개")
	var c: GoldCoin = get_tree().get_nodes_in_group("coins")[0]
	var gold0 := h.gold
	await frames(25)
	c.global_position = h.global_position
	c._vel = Vector2.ZERO
	await frames(2)
	eq(h.gold, gold0 + 25, "금화를 밟으면 25 골드")
	await frames(30)
	var p0 := g.global_position
	g.global_position = h.global_position + Vector2(150, 0)
	await frames(60)
	check(g.global_position.distance_to(h.global_position) > 160.0, "가까이 가면 도망감")
	check(p0 != Vector2.ZERO, "끝")
	battle.queue_free()


func test_ward_gives_vision_and_bush_sight() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(400, 400))
	h.inventory.add(ItemManager.get_item("ward"))
	var shop := ShopManager.new()
	add_child(shop)
	var slot := h.inventory.find("ward")
	eq(shop.use_item(h, slot), ShopManager.Result.OK, "와드 꽂기")
	var wards := get_tree().get_nodes_in_group("wards")
	eq(wards.size(), 1, "와드 하나")
	Bushes.list = PackedVector3Array([Vector3(wards[0].global_position.x, wards[0].global_position.y, 120)])
	var hider := spawn_dummy(Enums.Team.RED, wards[0].global_position + Vector2(30, 0), {})
	check(not Bushes.hidden_from(hider, Enums.Team.BLUE), "와드를 꽂은 풀숲 안은 보임")
	for i in 4:
		Ward.place(h, Vector2(600 + i * 50, 400), 90.0)
	await frames(1)
	eq(get_tree().get_nodes_in_group("wards").filter(func(w): return not w.is_queued_for_deletion()).size(), 3, "한 사람이 3개까지")
	shop.queue_free()


func test_scoreboard_toggle() -> void:
	var cfg := GameManager.default_config("blade_master")
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	var hud = battle.hud
	check(not hud.scoreboard.visible, "처음에는 닫혀 있음")
	hud.toggle_scoreboard()
	check(hud.scoreboard.visible, "점수 버튼을 누르면 열림")
	check(not get_tree().paused, "게임은 멈추지 않음")
	await frames(2)
	hud.toggle_scoreboard()
	check(not hud.scoreboard.visible, "다시 누르면 닫힘")
	battle.queue_free()
