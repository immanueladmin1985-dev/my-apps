class_name ShopManager
extends Node
## 상점 규칙: 기지(우물) 안이나 사망 중에만 사고판다. 플레이어와 AI 가 같은 규칙을 쓴다.

enum Result { OK, NO_GOLD, NO_SPACE, NOT_IN_SHOP, LIMIT, UNKNOWN, NOT_USABLE }

const RESULT_TEXT := {
	Result.OK: "",
	Result.NO_GOLD: "골드가 부족합니다",
	Result.NO_SPACE: "아이템 칸이 가득 찼습니다",
	Result.NOT_IN_SHOP: "기지(우물)에서만 사고팔 수 있습니다",
	Result.LIMIT: "더 가질 수 없는 아이템입니다",
	Result.UNKNOWN: "알 수 없는 아이템입니다",
	Result.NOT_USABLE: "사용할 수 없는 아이템입니다",
}

var map: MapData


func setup(map_data: MapData) -> void:
	map = map_data


func can_shop(hero) -> bool:
	if hero.is_dead:
		return true
	if map == null:
		return true
	return hero.global_position.distance_to(map.spawn_of(hero.team)) <= DataRegistry.combat_config().fountain_radius + 40.0


func check_buy(hero, item: ItemData) -> Dictionary:
	if item == null:
		return {"result": Result.UNKNOWN, "price": 0, "consume": []}
	var plan := ItemManager.purchase_plan(item, hero.inventory)
	plan["result"] = Result.OK
	if not can_shop(hero):
		plan.result = Result.NOT_IN_SHOP
	elif item.max_owned > 0 and _owned_family(hero, item) >= item.max_owned:
		plan.result = Result.LIMIT
	elif hero.gold < plan.price:
		plan.result = Result.NO_GOLD
	elif not _has_room(hero, item, plan.consume):
		plan.result = Result.NO_SPACE
	return plan


## 같은 아이템과, 그 아이템을 재료로 만든 아이템(같은 분류의 신발 등)을 함께 센다.
func _owned_family(hero, item: ItemData) -> int:
	var n: int = hero.inventory.count_of(item.id)
	if item.category == "boots":
		n = 0
		for i in InventoryComponent.SIZE:
			var it: ItemData = hero.inventory.item_at(i)
			if it != null and it.category == "boots":
				n += 1
		# 신발을 업그레이드하는 경우(재료로 신발을 쓰는 경우)는 허용한다.
		for comp_id in item.components:
			var comp := ItemManager.get_item(comp_id)
			if comp != null and comp.category == "boots" and hero.inventory.count_of(comp_id) > 0:
				n -= 1
	return n


func _has_room(hero, item: ItemData, consume: Array) -> bool:
	if hero.inventory.slot_for(item) >= 0:
		return true
	return not consume.is_empty()


func buy(hero, id: String) -> int:
	var item := ItemManager.get_item(id)
	var plan := check_buy(hero, item)
	if plan.result != Result.OK:
		return plan.result
	hero.add_gold(-plan.price)
	var consume: Array = plan.consume
	consume.sort()
	consume.reverse()
	for slot in consume:
		hero.inventory.take_one(slot)
	hero.inventory.add(item)
	EventBus.item_bought.emit(hero, item)
	return Result.OK


func sell(hero, slot: int) -> int:
	var item: ItemData = hero.inventory.item_at(slot)
	if item == null:
		return Result.UNKNOWN
	if not can_shop(hero):
		return Result.NOT_IN_SHOP
	var gold := ItemManager.sell_price(item)
	hero.inventory.take_one(slot)
	hero.add_gold(gold)
	EventBus.item_sold.emit(hero, item, gold)
	return Result.OK


## 사용 아이템(물약 등)은 어디서나 쓸 수 있다.
func use_item(hero, slot: int) -> int:
	var item: ItemData = hero.inventory.item_at(slot)
	if item == null:
		return Result.UNKNOWN
	if not item.consumable or item.use_kind == "none" or hero.is_dead:
		return Result.NOT_USABLE
	match item.use_kind:
		"status":
			if item.use_status != null:
				hero.status.apply(item.use_status, item.use_duration, item.use_magnitude, hero)
		"recall":
			hero.start_recall(item.use_duration)
	hero.inventory.take_one(slot)
	EventBus.item_used.emit(hero, item)
	return Result.OK
