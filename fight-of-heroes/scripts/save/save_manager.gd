extends Node
## 설정과 기록을 user://save.json 에 저장한다.
## user:// 의 Resource 파일은 열 때 코드가 실행될 수 있으므로 JSON 만 쓴다.
## 저장 형식이 바뀌면 SAVE_VERSION 을 올리고 _migrate 에서 옮긴다.

signal settings_changed

const SAVE_VERSION := 2
const HISTORY_MAX := 30

var save_path := "user://save.json"
var data: Dictionary = {}


func _ready() -> void:
	# 시험·개발용: --save_path=경로 (GameManager 보다 먼저 준비되므로 명령줄을 직접 읽는다)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--save_path="):
			save_path = a.trim_prefix("--save_path=")
	load_data()


func _defaults() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"settings": {
			"difficulty": "normal", "kill_target": 15, "show_fps": false, "sfx_volume": 0.8,
			"damage_numbers": true, "battery_saver": false, "last_hero": "blade_master", "team_mode": "random",
		},
		"records": {"games": 0, "wins": 0, "losses": 0, "best_kills": 0, "heroes": {}, "history": []},
	}


func load_data() -> void:
	data = _defaults()
	if not FileAccess.file_exists(save_path):
		return
	var f := FileAccess.open(save_path, FileAccess.READ)
	if f == null:
		return
	var parsed = JSON.parse_string(f.get_as_text())
	if parsed is Dictionary:
		data = _migrate(parsed)


## 예전 저장 파일을 지금 형식으로 옮긴다. 없는 항목은 기본값으로 채운다.
func _migrate(d: Dictionary) -> Dictionary:
	var base := _defaults()
	var old_version := int(d.get("version", 1))
	for k in base:
		if d.has(k) and d[k] is Dictionary and base[k] is Dictionary:
			base[k].merge(d[k], true)
	if old_version < 2:
		# 버전 1 에는 전체 경기 수가 없었다.
		var r: Dictionary = base.records
		r["games"] = int(r.get("wins", 0)) + int(r.get("losses", 0))
	base["version"] = SAVE_VERSION
	return base


func save_data() -> bool:
	var f := FileAccess.open(save_path, FileAccess.WRITE)
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
	settings_changed.emit()


func records() -> Dictionary:
	return data["records"]


## 경기 결과를 기록한다. summary 는 BattleManager.summary() 형식.
func record_match(summary: Dictionary) -> void:
	var me = null
	for h in summary.heroes:
		if h.is_player:
			me = h
	if me == null:
		return
	var r: Dictionary = data["records"]
	var won: bool = summary.winner == me.team
	r.games = int(r.games) + 1
	if won:
		r.wins = int(r.wins) + 1
	else:
		r.losses = int(r.losses) + 1
	r.best_kills = maxi(int(r.best_kills), int(me.kills))
	var hr: Dictionary = r.heroes.get(me.id, {"games": 0, "wins": 0, "kills": 0, "deaths": 0, "assists": 0})
	hr.games = int(hr.games) + 1
	hr.wins = int(hr.wins) + (1 if won else 0)
	hr.kills = int(hr.kills) + int(me.kills)
	hr.deaths = int(hr.deaths) + int(me.deaths)
	hr.assists = int(hr.assists) + int(me.assists)
	r.heroes[me.id] = hr
	var hist: Array = r.history
	hist.push_front({
		"date": Time.get_datetime_string_from_system(false, true),
		"hero": me.id, "won": won, "reason": summary.reason, "time": int(summary.time),
		"kills": me.kills, "deaths": me.deaths, "assists": me.assists, "level": me.level,
		"score": "%d:%d" % [summary.blue_kills, summary.red_kills], "difficulty": summary.difficulty, "mode": summary.mode,
	})
	while hist.size() > HISTORY_MAX:
		hist.pop_back()
	save_data()


func reset_records() -> void:
	data["records"] = _defaults().records
	save_data()
