class_name StatsComponent
extends Node
## 최종 능력치 = (기본값 + 레벨당 증가 × (레벨 − 1) + 고정 보너스 합) × (1 + 비율 보너스 합)
## 보너스는 출처(source) 단위로 붙이고 떼므로, 아이템을 팔거나 버프가 끝나도 값이 꼬이지 않는다.

signal changed

const KEYS := [
	"max_hp", "max_mp", "attack", "ability_power", "armor", "magic_resist",
	"attack_speed", "move_speed", "crit_chance", "crit_damage", "hp_regen", "mp_regen",
	"armor_pen", "magic_pen", "cooldown_reduction", "life_steal",
]
## 화면에 보여 줄 이름. 비율 능력치(PERCENT_STATS)는 % 로 보여 준다.
const NAMES := {
	"max_hp": "최대 체력", "max_mp": "최대 마나", "attack": "공격력", "ability_power": "주문력",
	"armor": "방어력", "magic_resist": "마법 저항력", "attack_speed": "공격 속도", "move_speed": "이동 속도",
	"crit_chance": "치명타 확률", "crit_damage": "치명타 피해", "hp_regen": "체력 회복", "mp_regen": "마나 회복",
	"armor_pen": "방어 관통", "magic_pen": "마법 관통", "cooldown_reduction": "쿨타임 감소", "life_steal": "흡혈",
}
const PERCENT_STATS := ["crit_chance", "crit_damage", "cooldown_reduction", "life_steal"]
const MAX_COOLDOWN_REDUCTION := 0.4
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
	_cache["cooldown_reduction"] = clampf(_cache["cooldown_reduction"], 0.0, MAX_COOLDOWN_REDUCTION)
	_cache["life_steal"] = clampf(_cache["life_steal"], 0.0, 1.0)
	_cache["attack_speed"] = maxf(_cache["attack_speed"], 0.1)
	_cache["max_hp"] = maxf(_cache["max_hp"], 1.0)


## 능력치 보너스를 사람이 읽는 글로 바꾼다. 예: "공격력 +10", "공격 속도 +15%"
static func modifier_text(m: StatModifier) -> String:
	var name: String = NAMES.get(m.stat, m.stat)
	var parts: Array = []
	if m.flat != 0.0:
		if PERCENT_STATS.has(m.stat):
			parts.append("%+d%%" % roundi(m.flat * 100.0))
		else:
			parts.append(("%+d" % roundi(m.flat)) if absf(m.flat - roundf(m.flat)) < 0.01 else ("%+.1f" % m.flat))
	if m.percent != 0.0:
		parts.append("%+d%%" % roundi(m.percent * 100.0))
	return "%s %s" % [name, " ".join(parts)]
