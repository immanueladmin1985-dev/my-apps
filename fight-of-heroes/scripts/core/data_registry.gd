extends Node
## data/ 폴더의 Resource 를 종류별로 읽어 id 로 찾아 준다.
## 영웅이나 스킬을 추가할 때는 파일만 넣으면 되고 이 코드는 바꾸지 않는다.

const DIRS := {
	"heroes": "res://data/heroes",
	"skills": "res://data/skills",
	"status": "res://data/status",
	"config": "res://data/config",
	"ai": "res://data/ai",
	"maps": "res://data/maps",
	"monsters": "res://data/monsters",
	"items": "res://data/items",
}

var load_errors: PackedStringArray = []
var _tables: Dictionary = {}


func _ready() -> void:
	reload()


func reload() -> void:
	_tables.clear()
	load_errors.clear()
	for kind in DIRS:
		_tables[kind] = {}
		_scan(kind, DIRS[kind])
	for e in load_errors:
		push_error("[DataRegistry] " + e)


func _scan(kind: String, dir_path: String) -> void:
	var dir := DirAccess.open(dir_path)
	if dir == null:
		load_errors.append("폴더가 없습니다: " + dir_path)
		return
	var names: Array = []
	for f in dir.get_files():
		# 내보낸 APK 안에서는 .tres 가 .tres.remap 으로 바뀌어 보인다.
		var file_name: String = f.trim_suffix(".remap")
		if file_name.ends_with(".tres") or file_name.ends_with(".res"):
			if not names.has(file_name):
				names.append(file_name)
	names.sort()
	for file_name in names:
		var path: String = dir_path.path_join(file_name)
		var res: Resource = load(path)
		if res == null:
			load_errors.append("불러오지 못했습니다: " + path)
			continue
		var id = res.get("id")
		if id == null or str(id) == "":
			load_errors.append("id 가 없습니다: " + path)
			continue
		if _tables[kind].has(str(id)):
			load_errors.append("id 가 중복됩니다: %s (%s)" % [id, path])
			continue
		_tables[kind][str(id)] = res


## 데이터 내용 검사. 시험과, 내보낸 패키지 점검(--selfcheck)에서 함께 쓴다.
## 내보낼 때 값이 빠지는 문제(기본값을 [] 로 적은 Packed 배열)도 여기서 잡는다.
func validate() -> PackedStringArray:
	var errors := PackedStringArray(load_errors)
	for s: SkillData in get_all("skills"):
		if s.mana_cost.is_empty() or s.mana_cost.size() > s.max_rank:
			errors.append("%s: 마나 배열 (%d개)" % [s.id, s.mana_cost.size()])
		if s.cooldown.is_empty() or s.cooldown.size() > s.max_rank:
			errors.append("%s: 쿨타임 배열 (%d개)" % [s.id, s.cooldown.size()])
		if s.cooldown.size() > 0 and s.cooldown[0] <= 0.0:
			errors.append("%s: 쿨타임이 0" % s.id)
		if s.effects.is_empty() and s.custom_script == null:
			errors.append("%s: 효과 없음" % s.id)
		if s.display_name == "" or s.description == "":
			errors.append("%s: 이름·설명 없음" % s.id)
		_validate_effects(s.id, s.effects, errors)
	for h: HeroData in get_all("heroes"):
		if h.skills.size() != 4:
			errors.append("%s: 스킬 %d개" % [h.id, h.skills.size()])
		if float(h.base_stats.get("max_hp", 0.0)) <= 0.0:
			errors.append("%s: 최대 체력" % h.id)
		for k in h.base_stats:
			if not StatsComponent.KEYS.has(k):
				errors.append("%s: 알 수 없는 능력치 %s" % [h.id, k])
		for sk in h.skills:
			if not (sk is SkillData):
				errors.append("%s: SkillData 가 아닌 스킬" % h.id)
		if not (h.passive is PassiveData):
			errors.append("%s: 패시브 없음" % h.id)
		else:
			_validate_effects(h.id + " 패시브", h.passive.effects, errors)
		if not ["fighter", "hunter", "support"].has(h.preferred_role):
			errors.append("%s: 역할 %s" % [h.id, h.preferred_role])
	for m: MonsterData in get_all("monsters"):
		if float(m.base_stats.get("max_hp", 0.0)) <= 0.0:
			errors.append("%s: 최대 체력" % m.id)
		for i in m.skills.size():
			if not (m.skills[i] is SkillData):
				errors.append("%s: 패턴 %d" % [m.id, i])
	for it: ItemData in get_all("items"):
		var parts := 0
		for cid in it.components:
			var c = get_item("items", cid)
			if c == null:
				errors.append("%s: 재료 %s 없음" % [it.id, cid])
			else:
				parts += c.cost
		if it.cost < parts:
			errors.append("%s: 가격(%d)이 재료 합(%d)보다 작음" % [it.id, it.cost, parts])
		for m in it.modifiers:
			if not (m is StatModifier) or not StatsComponent.KEYS.has(m.stat):
				errors.append("%s: 알 수 없는 능력치" % it.id)
		if it.consumable and (it.use_kind == "none" or it.max_stack < 1):
			errors.append("%s: 사용 아이템 설정" % it.id)
		if it.use_kind == "status" and it.use_status == null:
			errors.append("%s: 사용 효과 없음" % it.id)
		if not it.consumable and it.modifiers.is_empty():
			errors.append("%s: 능력치 없음" % it.id)
	for h: HeroData in get_all("heroes"):
		for bid in h.ai_build:
			if get_item("items", bid) == null:
				errors.append("%s: AI 아이템 순서에 없는 아이템 %s" % [h.id, bid])
	var prog := progression()
	if prog.ultimate_levels.is_empty():
		errors.append("progression: 궁극기 레벨 배열이 비어 있음")
	for mp: MapData in get_all("maps"):
		if mp.obstacles.is_empty() or mp.camps.is_empty():
			errors.append("%s: 장애물·캠프 배열이 비어 있음" % mp.id)
		var bounds := Rect2(Vector2.ZERO, mp.size)
		for c: CampData in mp.camps:
			for mid in c.monsters:
				if monster(mid) == null:
					errors.append("%s/%s: 몬스터 %s 없음" % [mp.id, c.id, mid])
			if not bounds.grow(-40).has_point(c.position):
				errors.append("%s/%s: 맵 밖" % [mp.id, c.id])
			for r in mp.obstacles:
				if r.grow(30).has_point(c.position):
					errors.append("%s/%s: 장애물 안 %s" % [mp.id, c.id, str(r)])
		for sp in [mp.blue_spawn, mp.red_spawn]:
			for r in mp.obstacles:
				if r.grow(40).has_point(sp):
					errors.append("%s: 시작 지점이 장애물 안" % mp.id)
	return errors


func _validate_effects(owner: String, effects: Array, errors: PackedStringArray) -> void:
	for e in effects:
		if not (e is SkillEffect):
			errors.append(owner + ": SkillEffect 가 아닌 효과")
			continue
		if e is SummonEffect and monster(e.monster_id) == null:
			errors.append("%s: 소환수 %s 없음" % [owner, e.monster_id])
		for key in ["base", "duration", "magnitude"]:
			var v = e.get(key)
			if v is PackedFloat32Array and v.is_empty():
				errors.append("%s: %s 배열이 비어 있음 (%s)" % [owner, key, e.get_script().get_global_name()])
		if e is ApplyStatusEffect and e.status == null:
			errors.append(owner + ": 상태 효과 데이터 없음")
		for key in ["effects", "path_effects", "end_effects", "arrive_effects"]:
			var sub = e.get(key)
			if sub is Array:
				_validate_effects(owner, sub, errors)


func get_item(kind: String, id: String) -> Resource:
	var table: Dictionary = _tables.get(kind, {})
	return table.get(id)


func get_all(kind: String) -> Array:
	var table: Dictionary = _tables.get(kind, {})
	return table.values()


func ids(kind: String) -> Array:
	var table: Dictionary = _tables.get(kind, {})
	return table.keys()


func hero(id: String) -> HeroData:
	return get_item("heroes", id) as HeroData


func combat_config() -> CombatConfig:
	var c := get_item("config", "combat") as CombatConfig
	return c if c != null else CombatConfig.new()


func ai_profile(id: String) -> AIProfile:
	var p := get_item("ai", id) as AIProfile
	return p if p != null else AIProfile.new()


func progression() -> ProgressionConfig:
	var c := get_item("config", "progression") as ProgressionConfig
	return c if c != null else ProgressionConfig.new()


func monster(id: String) -> MonsterData:
	return get_item("monsters", id) as MonsterData


func map_data(id: String) -> MapData:
	return get_item("maps", id) as MapData
