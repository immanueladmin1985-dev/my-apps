class_name ManaComponent
extends Node
## 마나. 스킬을 쓸 때 spend 로 차감한다.

signal changed(mp: float, max_mp: float)

var mp: float = 0.0

@onready var unit = get_parent()


func max_mp() -> float:
	return unit.stats.get_stat("max_mp")


func reset_full() -> void:
	mp = max_mp()
	changed.emit(mp, max_mp())


func has(cost: float) -> bool:
	return mp + 0.0001 >= cost


func spend(cost: float) -> bool:
	if not has(cost):
		return false
	mp = maxf(0.0, mp - cost)
	changed.emit(mp, max_mp())
	return true


func restore(amount: float) -> void:
	mp = minf(max_mp(), mp + amount)
	changed.emit(mp, max_mp())


func _physics_process(delta: float) -> void:
	if unit.is_dead:
		return
	var regen: float = unit.stats.get_stat("mp_regen")
	if regen > 0.0 and mp < max_mp():
		mp = minf(max_mp(), mp + regen * delta)
		changed.emit(mp, max_mp())
