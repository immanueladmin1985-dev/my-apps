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


func map_data(id: String) -> MapData:
	return get_item("maps", id) as MapData
