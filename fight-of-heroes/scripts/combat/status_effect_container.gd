class_name StatusEffectContainer
extends Node
## 유닛에게 걸린 상태 효과. 같은 효과가 다시 걸리면 더 긴 지속시간과 더 큰 세기를 남긴다.

signal changed

var active: Dictionary = {}  # id -> {data, remaining, magnitude, source, tick_left}

@onready var unit = get_parent()


func apply(data: StatusEffectData, duration: float, magnitude: float, source = null) -> void:
	if unit.is_dead or data == null or duration <= 0.0:
		return
	var e = active.get(data.id)
	if e == null:
		e = {"data": data, "remaining": duration, "magnitude": magnitude, "source": source, "tick_left": data.tick_interval}
		active[data.id] = e
		if data.kind == Enums.StatusKind.STAT_BUFF:
			unit.stats.add_modifiers("status:" + data.id, data.stat_modifiers)
	else:
		e.remaining = maxf(e.remaining, duration)
		e.magnitude = maxf(e.magnitude, magnitude)
		e.source = source
	if data.kind == Enums.StatusKind.STUN:
		unit.on_stunned()
	changed.emit()


func has(id: String) -> bool:
	return active.has(id)


func remove(id: String) -> void:
	var e = active.get(id)
	if e == null:
		return
	active.erase(id)
	if e.data.kind == Enums.StatusKind.STAT_BUFF:
		unit.stats.remove_modifiers("status:" + id)
	changed.emit()


func clear_all() -> void:
	for id in active.keys():
		remove(id)


func is_stunned() -> bool:
	for e in active.values():
		if e.data.kind == Enums.StatusKind.STUN:
			return true
	return false


func is_stealthed() -> bool:
	for e in active.values():
		if e.data.kind == Enums.StatusKind.STEALTH:
			return true
	return false


func remove_kind(kind: int) -> void:
	for id in active.keys():
		if active[id].data.kind == kind:
			remove(id)


## 걸려 있는 효과 중 가장 큰 그림 배율과 섞을 색
func visual_scale() -> float:
	var k := 1.0
	for e in active.values():
		k = maxf(k, e.data.visual_scale)
	return k


func visual_tint() -> Color:
	for e in active.values():
		if e.data.visual_tint.a > 0.0:
			return e.data.visual_tint
	return Color(1, 1, 1, 0)


func is_slowed() -> bool:
	return _max_magnitude(Enums.StatusKind.SLOW) > 0.0


## 가장 강한 둔화 하나와 가장 강한 가속 하나만 적용한다.
func speed_multiplier() -> float:
	var slow := _max_magnitude(Enums.StatusKind.SLOW)
	var haste := _max_magnitude(Enums.StatusKind.HASTE)
	return maxf(0.1, (1.0 - clampf(slow, 0.0, 0.9)) * (1.0 + haste))


func _max_magnitude(kind: int) -> float:
	var m := 0.0
	for e in active.values():
		if e.data.kind == kind:
			m = maxf(m, e.magnitude)
	return m


func _physics_process(delta: float) -> void:
	if active.is_empty():
		return
	var expired: Array = []
	for id in active:
		var e = active[id]
		e.remaining -= delta
		if e.data.kind == Enums.StatusKind.HEAL_OVER_TIME:
			unit.health.heal(e.magnitude * delta)
		elif e.data.kind == Enums.StatusKind.MANA_OVER_TIME:
			unit.mana.restore(e.magnitude * delta)
		if e.data.kind == Enums.StatusKind.DOT:
			e.tick_left -= delta
			while e.tick_left <= 0.0 and not unit.is_dead:
				e.tick_left += e.data.tick_interval
				var src = e.source if is_instance_valid(e.source) else null
				var info := DamageInfo.new(src, e.magnitude * e.data.tick_interval, e.data.damage_type)
				CombatManager.apply_damage(unit, info)
		if e.remaining <= 0.0:
			expired.append(id)
	for id in expired:
		remove(id)
