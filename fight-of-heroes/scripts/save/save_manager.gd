extends Node
## 설정과 기록을 user://save.json 에 저장한다.
## user:// 의 Resource 파일은 열 때 코드가 실행될 수 있으므로 JSON 만 쓴다.

const SAVE_PATH := "user://save.json"
const SAVE_VERSION := 1

var data: Dictionary = {}


func _ready() -> void:
	load_data()


func _defaults() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"settings": {"difficulty": "normal", "kill_target": 15, "show_fps": false},
		"records": {"wins": 0, "losses": 0, "best_kills": 0, "heroes": {}, "history": []},
	}


func load_data() -> void:
	data = _defaults()
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed = JSON.parse_string(f.get_as_text())
	if parsed is Dictionary:
		data = _migrate(parsed)


func _migrate(d: Dictionary) -> Dictionary:
	# 저장 형식이 바뀌면 여기서 이전 버전을 새 버전으로 옮긴다.
	var base := _defaults()
	for k in base:
		if d.has(k) and d[k] is Dictionary and base[k] is Dictionary:
			base[k].merge(d[k], true)
	base["version"] = SAVE_VERSION
	return base


func save_data() -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_warning("저장하지 못했습니다: %s" % FileAccess.get_open_error())
		return false
	f.store_string(JSON.stringify(data, "\t"))
	return true


func get_setting(key: String, default_value = null):
	return data.get("settings", {}).get(key, default_value)


func set_setting(key: String, value) -> void:
	data["settings"][key] = value
	save_data()
