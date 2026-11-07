class_name StatsComponent
extends Node
## 최종 능력치 = (기본값 + 레벨당 증가 × (레벨 − 1) + 고정 보너스 합) × (1 + 비율 보너스 합)
## 보너스는 출처(source) 단위로 붙이고 떼므로, 아이템을 팔거나 버프가 끝나도 값이 꼬이지 않는다.

signal changed

const KEYS := [
	"max_hp", "max_mp", "attack", "ability_power", "armor", "magic_resist",
	"attack_speed", "move_speed", "crit_chance", "crit_damage", "hp_regen", "mp_regen",
	"armor_pen", "magic_pen",
]
const DEFAULTS := {"attack_speed": 1.0, "move_speed": 220.0, "crit_damage": 1.75}

var level: int = 1
var base: Dictionary = {}
var growth: Dictionary = {}
var _mods: Dictionary = {}  # source -> Array[StatModifier]
var _cache: Dictionary = {}
var _dirty := true


func setup(base_stats: Dictionary, growth_stats: Dictionary = {}) -> void:
	base = base_stats.duplicate()
	growth = growth_stats.duplicate()
	_mark_dirty()


func set_level(value: int) -> void:
	level = maxi(1, value)
	_mark_dirty()


func add_modifiers(source: String, mods: Array) -> void:
	var list: Array = []
	for m in mods:
		if m is StatModifier:
			list.append(m)
	_mods[source] = list
	_mark_dirty()


func remove_modifiers(source: String) -> void:
	if _mods.erase(source):
		_mark_dirty()


func has_source(source: String) -> bool:
	return _mods.has(source)


func get_stat(key: String) -> float:
	if _dirty:
		_recompute()
	return _cache.get(key, 0.0)


func _mark_dirty() -> void:
	_dirty = true
	changed.emit()


func _recompute() -> void:
	_dirty = false
	var flat := {}
	var pct := {}
	for source in _mods:
		for m: StatModifier in _mods[source]:
			flat[m.stat] = flat.get(m.stat, 0.0) + m.flat
			pct[m.stat] = pct.get(m.stat, 0.0) + m.percent
	for k in KEYS:
		var b: float = float(base.get(k, DEFAULTS.get(k, 0.0))) + float(growth.get(k, 0.0)) * (level - 1)
		_cache[k] = (b + flat.get(k, 0.0)) * (1.0 + pct.get(k, 0.0))
	_cache["crit_chance"] = clampf(_cache["crit_chance"], 0.0, 1.0)
	_cache["attack_speed"] = maxf(_cache["attack_speed"], 0.1)
	_cache["max_hp"] = maxf(_cache["max_hp"], 1.0)
