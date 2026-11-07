class_name HealthComponent
extends Node
## 체력과 보호막. 피해는 보호막이 먼저 받고, 남은 피해만 체력에서 깎는다.

signal changed(hp: float, max_hp: float)

var hp: float = 1.0
var shields: Array = []  # [{amount, remaining}]

@onready var unit = get_parent()


func max_hp() -> float:
	return unit.stats.get_stat("max_hp")


func ratio() -> float:
	return clampf(hp / max_hp(), 0.0, 1.0)


func reset_full() -> void:
	hp = max_hp()
	shields.clear()
	changed.emit(hp, max_hp())


func shield_total() -> float:
	var t := 0.0
	for s in shields:
		t += s.amount
	return t


func add_shield(amount: float, duration: float) -> void:
	if amount <= 0.0:
		return
	shields.append({"amount": amount, "remaining": duration})
	changed.emit(hp, max_hp())


## 보호막으로 막고 남은 피해를 돌려준다. 먼저 끝나는 보호막부터 쓴다.
func absorb(amount: float) -> float:
	if shields.is_empty():
		return amount
	shields.sort_custom(func(a, b): return a.remaining < b.remaining)
	var rest := amount
	for s in shields:
		var used: float = minf(s.amount, rest)
		s.amount -= used
		rest -= used
		if rest <= 0.0:
			break
	shields = shields.filter(func(s): return s.amount > 0.001)
	return rest


func take(amount: float) -> float:
	var before := hp
	hp = maxf(0.0, hp - amount)
	changed.emit(hp, max_hp())
	return before - hp


func heal(amount: float) -> float:
	if unit.is_dead or amount <= 0.0:
		return 0.0
	var before := hp
	hp = minf(max_hp(), hp + amount)
	if hp != before:
		changed.emit(hp, max_hp())
	return hp - before


func _physics_process(delta: float) -> void:
	if unit.is_dead:
		return
	var regen: float = unit.stats.get_stat("hp_regen")
	if regen > 0.0 and hp < max_hp():
		hp = minf(max_hp(), hp + regen * delta)
		changed.emit(hp, max_hp())
	elif hp > max_hp():
		hp = max_hp()
	if not shields.is_empty():
		for s in shields:
			s.remaining -= delta
		var before := shields.size()
		shields = shields.filter(func(s): return s.remaining > 0.0)
		if shields.size() != before:
			changed.emit(hp, max_hp())
