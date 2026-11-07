class_name ItemManager
## 아이템 조회와 조합 계산. 상태를 갖지 않는다.

const SELL_RATIO := 0.7


static func get_item(id: String) -> ItemData:
	return DataRegistry.get_item("items", id) as ItemData


static func all_items() -> Array:
	var list: Array = DataRegistry.get_all("items")
	list.sort_custom(func(a, b): return a.tier < b.tier or (a.tier == b.tier and a.cost < b.cost))
	return list


## 이 인벤토리로 item 을 살 때 실제로 낼 금액과, 재료로 써 버릴 칸 목록.
## 재료가 없으면 재료의 재료까지 내려가며 가진 것을 찾는다.
static func purchase_plan(item: ItemData, inv: InventoryComponent) -> Dictionary:
	var used := {}
	var price := _cost(item, inv, used, true)
	return {"price": price, "consume": used.keys()}


static func _cost(item: ItemData, inv: InventoryComponent, used: Dictionary, top: bool) -> int:
	if not top and inv != null:
		var slot := inv.find(item.id, used)
		if slot >= 0:
			used[slot] = true
			return 0
	var c := item.cost
	for comp_id in item.components:
		var comp := get_item(comp_id)
		if comp == null:
			continue
		c -= comp.cost
		c += _cost(comp, inv, used, false)
	return c


## 재료를 모두 사서 만들 때의 순수 조합 비용 (cost − 재료 가격 합)
static func combine_fee(item: ItemData) -> int:
	var c := item.cost
	for comp_id in item.components:
		var comp := get_item(comp_id)
		if comp != null:
			c -= comp.cost
	return c


static func sell_price(item: ItemData) -> int:
	return roundi(item.cost * SELL_RATIO)


## id 를 재료로 쓰는 아이템 목록
static func builds_into(id: String) -> Array:
	var out: Array = []
	for it in all_items():
		if it.components.has(id):
			out.append(it)
	return out
