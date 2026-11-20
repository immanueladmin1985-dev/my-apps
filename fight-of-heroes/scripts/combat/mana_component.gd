class_name ManaComponent
extends Node
## 마나. 스킬을 쓸 때 spend 로 차감한다.

signal changed(mp: float, max_mp: float)

var mp: float = 0.0
var net_max := 0.0  # 와이파이 대전 참가자: 방장이 보낸 최대 마나

@onready var unit = get_parent()


func max_mp() -> float:
	if net_max > 0.0:
		return net_max
	return unit.stats.get_stat("max_mp")


func net_set(new_mp: float, new_max: float) -> void:
	var changed_now := absf(new_mp - mp) > 0.5 or absf(new_max - net_max) > 0.5
	net_max = new_max
	mp = new_mp
	if changed_now:
		changed.emit(mp, max_mp())


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
	if net_max > 0.0 or unit.is_dead:
		return
	var regen: float = unit.stats.get_stat("mp_regen")
	if regen > 0.0 and mp < max_mp():
		mp = minf(max_mp(), mp + regen * delta)
		changed.emit(mp, max_mp())
