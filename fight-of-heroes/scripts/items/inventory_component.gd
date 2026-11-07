class_name InventoryComponent
extends Node
## 영웅의 아이템 칸 6개. 칸마다 {item, count}. 사용 아이템은 한 칸에 max_stack 개까지 쌓인다.
## 칸이 바뀔 때마다 아이템 능력치를 "inv:칸번호" 출처로 다시 붙인다.

signal changed

const SIZE := 6

var slots: Array = [null, null, null, null, null, null]

@onready var unit = get_parent()


func item_at(i: int) -> ItemData:
	return slots[i].item if slots[i] != null else null


func count_at(i: int) -> int:
	return slots[i].count if slots[i] != null else 0


func count_of(id: String) -> int:
	var n := 0
	for s in slots:
		if s != null and s.item.id == id:
			n += s.count
	return n


func free_slots() -> int:
	var n := 0
	for s in slots:
		if s == null:
			n += 1
	return n


## 쌓을 수 있는 칸이 있으면 그 칸, 없으면 빈칸 (없으면 -1)
func slot_for(item: ItemData) -> int:
	if item.consumable:
		for i in SIZE:
			if slots[i] != null and slots[i].item.id == item.id and slots[i].count < item.max_stack:
				return i
	for i in SIZE:
		if slots[i] == null:
			return i
	return -1


## exclude 에 없는 칸 중 id 아이템이 있는 칸 (없으면 -1)
func find(id: String, exclude: Dictionary = {}) -> int:
	for i in SIZE:
		if slots[i] != null and slots[i].item.id == id and not exclude.has(i):
			return i
	return -1


func add(item: ItemData) -> bool:
	var i := slot_for(item)
	if i < 0:
		return false
	if slots[i] == null:
		slots[i] = {"item": item, "count": 1}
	else:
		slots[i].count += 1
	_apply()
	return true


## i 칸에서 하나를 뺀다.
func take_one(i: int) -> ItemData:
	if slots[i] == null:
		return null
	var item: ItemData = slots[i].item
	slots[i].count -= 1
	if slots[i].count <= 0:
		slots[i] = null
	_apply()
	return item


func clear_slot(i: int) -> void:
	slots[i] = null
	_apply()


func _apply() -> void:
	for i in SIZE:
		unit.stats.remove_modifiers("inv:%d" % i)
	for i in SIZE:
		var s = slots[i]
		if s != null and not s.item.consumable and not s.item.modifiers.is_empty():
			unit.stats.add_modifiers("inv:%d" % i, s.item.modifiers)
	# 최대 체력·마나가 늘거나 줄면 현재 값이 최대를 넘지 않게 한다.
	unit.health.hp = minf(unit.health.hp, unit.health.max_hp())
	unit.mana.mp = minf(unit.mana.mp, unit.mana.max_mp())
	changed.emit()
