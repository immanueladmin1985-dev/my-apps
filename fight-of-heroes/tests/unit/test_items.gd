extends TestCase
## 아이템과 상점: 구매·능력치 반영, 상점 위치, 골드, 조합, 칸, 판매, 신발 하나만, 물약, 쿨타임 감소, 흡혈, 귀환, AI 구매.

var shop: ShopManager


func before_each() -> void:
	super.before_each()
	shop = ShopManager.new()
	world.add_child(shop)
	shop.setup(DataRegistry.map_data("arena_01"))


func _hero(gold := 10000, at_base := true) -> Hero:
	var map := DataRegistry.map_data("arena_01")
	var h := spawn_hero("blade_master", Enums.Team.BLUE, map.blue_spawn if at_base else Vector2(1200, 700))
	h.spawn_point = map.blue_spawn
	h.gold = gold
	return h


func test_all_items_valid() -> void:
	check(DataRegistry.get_all("items").size() >= 30, "아이템 30종 이상 (%d)" % DataRegistry.get_all("items").size())
	for cat in ["weapon", "armor", "boots", "ring", "necklace", "potion", "special"]:
		check(DataRegistry.get_all("items").any(func(it): return it.category == cat), "분류 %s 아이템 있음" % cat)


func test_buy_applies_stats() -> void:
	var h := _hero()
	var atk := h.stats.get_stat("attack")
	eq(shop.buy(h, "dagger"), ShopManager.Result.OK, "단검 구매")
	eq(h.gold, 10000 - 300, "골드 차감")
	near(h.stats.get_stat("attack"), atk + 10.0, 0.01, "공격력 +10")
	eq(shop.buy(h, "quick_gloves"), ShopManager.Result.OK, "장갑 구매")
	near(h.stats.get_stat("attack_speed"), 0.85 * 1.15, 0.001, "공격 속도 +15%")


func test_shop_only_at_base() -> void:
	var h := _hero(10000, false)
	eq(shop.buy(h, "dagger"), ShopManager.Result.NOT_IN_SHOP, "기지 밖에서는 살 수 없음")
	h.die(null)
	eq(shop.buy(h, "dagger"), ShopManager.Result.OK, "죽어 있을 때는 살 수 있음")


func test_not_enough_gold() -> void:
	var h := _hero(100)
	eq(shop.buy(h, "dagger"), ShopManager.Result.NO_GOLD, "골드 부족")
	eq(h.gold, 100, "골드 그대로")
	eq(h.inventory.free_slots(), 6, "칸 그대로")


func test_combine_pays_difference() -> void:
	var h := _hero(10000)
	shop.buy(h, "dagger")
	shop.buy(h, "dagger")
	var gold := h.gold
	eq(shop.check_buy(h, ItemManager.get_item("steel_sword")).price, 200, "재료가 있으면 조합 비용만")
	eq(shop.buy(h, "steel_sword"), ShopManager.Result.OK, "강철 장검 조합")
	eq(h.gold, gold - 200, "200 골드만 냄")
	eq(h.inventory.count_of("dagger"), 0, "재료 사라짐")
	eq(h.inventory.count_of("steel_sword"), 1, "완성")
	eq(h.inventory.free_slots(), 5, "칸 하나만 차지")
	near(h.stats.get_stat("attack"), h.stats.base["attack"] + 25.0, 0.01, "재료 능력치는 빠지고 장검 능력치만")


func test_deep_combine() -> void:
	var h := _hero(10000)
	for id in ["dagger", "dagger", "dagger", "lucky_coin"]:
		shop.buy(h, id)
	var plan := shop.check_buy(h, ItemManager.get_item("hero_sword"))
	eq(plan.price, 2500 - 300 * 3 - 400, "재료의 재료까지 계산")
	eq(shop.buy(h, "hero_sword"), ShopManager.Result.OK, "영웅의 검")
	eq(h.inventory.free_slots(), 5, "재료 4개가 완성품 1개로")


func test_full_inventory() -> void:
	var h := _hero(100000)
	for i in 6:
		shop.buy(h, "life_gem")
	eq(shop.buy(h, "dagger"), ShopManager.Result.NO_SPACE, "칸이 가득 참")
	eq(shop.buy(h, "giant_belt"), ShopManager.Result.OK, "재료를 쓰는 조합은 가능")


func test_sell_returns_gold_and_removes_stats() -> void:
	var h := _hero(1000)
	shop.buy(h, "life_gem")
	var max_hp := h.health.max_hp()
	eq(shop.sell(h, 0), ShopManager.Result.OK, "판매")
	eq(h.gold, 1000 - 350 + 245, "70% 돌려받음")
	near(h.health.max_hp(), max_hp - 150.0, 0.01, "능력치 빠짐")


func test_one_boots_only() -> void:
	var h := _hero(10000)
	eq(shop.buy(h, "old_boots"), ShopManager.Result.OK, "낡은 장화")
	eq(shop.buy(h, "old_boots"), ShopManager.Result.LIMIT, "신발은 하나만")
	eq(shop.buy(h, "swift_boots"), ShopManager.Result.OK, "신발 업그레이드는 가능")
	eq(shop.buy(h, "plated_boots"), ShopManager.Result.LIMIT, "다른 신발은 더 살 수 없음")


func test_potion_stacks_and_heals() -> void:
	var h := _hero(1000)
	for i in 3:
		shop.buy(h, "health_potion")
	eq(h.inventory.free_slots(), 5, "물약은 한 칸에 쌓임")
	eq(h.inventory.count_at(0), 3, "3개")
	h.health.hp = 100.0
	eq(shop.use_item(h, 0), ShopManager.Result.OK, "물약 사용")
	eq(h.inventory.count_at(0), 2, "하나 줄어듦")
	await frames(120)
	check(h.health.hp > 100.0 + 35.0, "2초 동안 회복 (%.0f)" % h.health.hp)
	eq(shop.use_item(h, 3), ShopManager.Result.UNKNOWN, "빈칸은 사용 불가")


func test_cooldown_reduction() -> void:
	var h := _hero(100000)
	shop.buy(h, "time_ring")
	shop.buy(h, "mage_boots")
	near(h.stats.get_stat("cooldown_reduction"), 0.2, 0.001, "쿨타임 감소 20%")
	h.skill_caster.cast(1, CastAim.new())
	near(h.skill_caster.cooldowns[1], 10.0 * 0.8, 0.01, "회전베기 쿨타임 10 → 8초")
	check(h.skill_caster.cooldown_ratio(1) > 0.99, "버튼 표시는 줄어든 쿨타임 기준")
	h.stats.add_modifiers("test", [StatModifier.make("cooldown_reduction", 0.9)])
	near(h.stats.get_stat("cooldown_reduction"), 0.4, 0.001, "쿨타임 감소는 최대 40%")


func test_life_steal() -> void:
	var h := _hero(100000)
	shop.buy(h, "vampire_fang")
	h.health.hp = 300.0
	var t := spawn_dummy(Enums.Team.RED, h.global_position + Vector2(50, 0), {"max_hp": 9000.0})
	h.attack_order = t
	await frames(90)
	check(h.health.hp > 300.0 + 5.0, "기본 공격 피해의 10%% 회복 (%.1f)" % h.health.hp)


func test_recall() -> void:
	var h := _hero(1000, false)
	shop.buy(h, "recall_scroll")
	eq(h.inventory.count_of("recall_scroll"), 0, "기지 밖에서는 살 수 없음")
	h.inventory.add(ItemManager.get_item("recall_scroll"))
	h.inventory.add(ItemManager.get_item("recall_scroll"))
	shop.use_item(h, 0)
	check(h.is_recalling(), "귀환 시작")
	await frames(60)
	CombatManager.apply_damage(h, DamageInfo.new(null, 5.0, Enums.DamageType.TRUE))
	check(not h.is_recalling(), "피해를 받으면 취소")
	shop.use_item(h, 0)
	await frames(190)
	near(h.global_position.distance_to(h.spawn_point), 0.0, 1.0, "3초 뒤 기지로 이동")


func test_items_make_hero_stronger() -> void:
	var plain := _hero(0)
	var geared := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(400, 1100))
	geared.spawn_point = plain.spawn_point
	geared.gold = 100000
	geared.global_position = plain.global_position + Vector2(0, 120)
	for id in ["hero_sword", "blood_blade"]:
		eq(shop.buy(geared, id), ShopManager.Result.OK, id)
	var a := spawn_dummy(Enums.Team.RED, plain.global_position + Vector2(50, 0), {"max_hp": 3000.0, "armor": 30.0})
	var b := spawn_dummy(Enums.Team.RED, geared.global_position + Vector2(50, 0), {"max_hp": 3000.0, "armor": 30.0})
	plain.attack_order = a
	geared.attack_order = b
	await frames(600)
	var d1 := 3000.0 - a.health.hp
	var d2 := 3000.0 - b.health.hp
	check(d2 > d1 * 1.8, "아이템이 있으면 10초 동안 준 피해가 크게 늘어남 (%.0f → %.0f)" % [d1, d2])


func test_ai_buys_its_build() -> void:
	var h := _hero(0)
	var ai := AIController.new()
	h.set_controller(ai)
	ai.setup(DataRegistry.ai_profile("normal"), h.spawn_point, Vector2(1200, 700))
	var mgr := AIManager.new()
	world.add_child(mgr)
	mgr.shop = shop
	ai.manager = mgr
	h.gold = 300
	ai.think()
	eq(h.inventory.count_of("old_boots"), 1, "첫 아이템(판금 장화)의 재료부터 삼")
	h.gold = 4000
	ai.think()
	eq(h.inventory.count_of("plated_boots"), 1, "판금 장화 완성")
	check(ai.bought.size() >= 3, "여러 개를 차례로 삼 (%s)" % str(ai.bought))
	check(h.inventory.count_of("health_potion") >= 1, "물약도 챙김")
