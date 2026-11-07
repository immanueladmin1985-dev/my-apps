extends Node
## 화면 흐름과 경기 설정을 맡는다. 명령줄 인자로 화면 캡처 같은 개발용 기능도 켠다.

const BATTLE_SCENE := "res://scenes/battlefield/battle.tscn"
const MAIN_SCENE := "res://scenes/menu/main_menu.tscn"
const NEW_GAME_SCENE := "res://scenes/selection/new_game.tscn"
const HERO_CODEX_SCENE := "res://scenes/menu/hero_codex.tscn"
const ITEM_CODEX_SCENE := "res://scenes/menu/item_codex.tscn"
const RECORDS_SCENE := "res://scenes/menu/records.tscn"
const SETTINGS_SCENE := "res://scenes/menu/settings.tscn"
const RESULTS_SCENE := "res://scenes/results/results.tscn"
const RESULTS_DELAY := 2.0

signal match_finished(summary: Dictionary)

var match_config: MatchConfig
var dev_args: Dictionary = {}
## 마지막 경기 요약 (결과 화면이 읽는다)
var last_summary: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=", true, 1)
		dev_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	get_tree().root.theme = UiKit.make_theme()
	SaveManager.settings_changed.connect(apply_settings)
	apply_settings()
	if dev_args.has("selfcheck"):
		_selfcheck.call_deferred()
		return
	if dev_args.has("flow_test"):
		_flow_test.call_deferred()
		return
	if dev_args.has("screenshot"):
		_screenshot_later.call_deferred()


## 기본 경기: 플레이어 영웅 + 나머지는 무작위로 채운 3대3. 영웅이 모자라지 않으면 같은 영웅은 한 번만 나온다.
func default_config(player_hero := "blade_master", team_size := 3) -> MatchConfig:
	var c := MatchConfig.new()
	var pool: Array = DataRegistry.ids("heroes")
	pool.shuffle()
	pool.erase(player_hero)
	var blue := [player_hero]
	var red := []
	for i in team_size - 1:
		blue.append(pool.pop_back() if not pool.is_empty() else DataRegistry.ids("heroes").pick_random())
	for i in team_size:
		red.append(pool.pop_back() if not pool.is_empty() else DataRegistry.ids("heroes").pick_random())
	c.blue_heroes = PackedStringArray(blue)
	c.red_heroes = PackedStringArray(red)
	c.player_index = 0
	c.difficulty = SaveManager.get_setting("difficulty", "normal")
	c.kill_target = int(SaveManager.get_setting("kill_target", 15))
	return c


func start_match(config: MatchConfig) -> void:
	match_config = config
	get_tree().paused = false
	get_tree().change_scene_to_file(BATTLE_SCENE)


func restart_match() -> void:
	start_match(match_config if match_config != null else default_config())


func go_main() -> void:
	goto(MAIN_SCENE)


func goto(path: String) -> void:
	get_tree().paused = false
	get_tree().change_scene_to_file(path)


## 설정을 엔진에 반영한다. 배터리 절약이면 30fps.
func apply_settings() -> void:
	if DisplayServer.get_name() != "headless":
		Engine.max_fps = 30 if SaveManager.get_setting("battery_saver", false) else 60


## 전투가 끝나면 부른다. 기록을 저장하고, 전투 화면이 지금 화면이면 잠시 뒤 결과 화면으로 간다.
func on_match_finished(summary: Dictionary, battle: Node) -> void:
	last_summary = summary
	if summary.get("mode", "team") != "watch":
		SaveManager.record_match(summary)
	match_finished.emit(summary)
	if get_tree().current_scene == battle:
		await get_tree().create_timer(RESULTS_DELAY, true, false, true).timeout
		if get_tree().current_scene == battle:
			goto(RESULTS_SCENE)


## 안드로이드 뒤로 가기 버튼과 ESC 키: 지금 화면의 on_back() 을 부른다.
func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		_back()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		_back()


func _back() -> void:
	var s := get_tree().current_scene
	if s != null and s.has_method("on_back"):
		s.on_back()


## 전체 흐름 시험: 메인 메뉴 → 새 게임 → 경기(AI 조작, 목표 3킬) → 결과 → 다시 하기 → 경기 → 결과 → 메인 메뉴.
## 실행: godot --headless --path . --fixed-fps 60 -- --flow_test --save_path=user://flow_test.json
func _flow_test() -> void:
	var ok := true
	var step := func(name: String, expected: String, timeout_s: float) -> bool:
		var t := 0.0
		while (get_tree().current_scene == null or get_tree().current_scene.scene_file_path != expected) and t < timeout_s:
			await get_tree().process_frame
			t += 1.0 / 60.0
		var cur: String = get_tree().current_scene.scene_file_path if get_tree().current_scene != null else "-"
		var good := cur == expected
		print("FLOW %s %s (%s)" % ["[통과]" if good else "[실패]", name, cur])
		return good
	SaveManager.reset_records()
	ok = await step.call("메인 메뉴", MAIN_SCENE, 5.0) and ok
	get_tree().current_scene.open(NEW_GAME_SCENE)
	ok = await step.call("새 게임 화면", NEW_GAME_SCENE, 5.0) and ok
	var ng = get_tree().current_scene
	ng.select_hero("saint")
	ng.kill_target_override = 3
	ng.flow_autoplay = true
	ng.start()
	ok = await step.call("전투 1", BATTLE_SCENE, 5.0) and ok
	ok = await step.call("결과 1", RESULTS_SCENE, 600.0) and ok
	var games1: int = SaveManager.records().games
	print("FLOW %s 기록 저장 (경기 %d)" % ["[통과]" if games1 == 1 else "[실패]", games1])
	ok = ok and games1 == 1
	get_tree().current_scene.replay()
	ok = await step.call("전투 2 (다시 하기)", BATTLE_SCENE, 5.0) and ok
	ok = await step.call("결과 2", RESULTS_SCENE, 600.0) and ok
	ok = ok and SaveManager.records().games == 2
	get_tree().current_scene.on_back()
	ok = await step.call("메인 메뉴로", MAIN_SCENE, 5.0) and ok
	for path in [HERO_CODEX_SCENE, ITEM_CODEX_SCENE, RECORDS_SCENE, SETTINGS_SCENE]:
		get_tree().current_scene.open(path)
		ok = await step.call("열기 " + path.get_file(), path, 5.0) and ok
		await get_tree().process_frame
		get_tree().current_scene.on_back()
		ok = await step.call("뒤로", MAIN_SCENE, 5.0) and ok
	print("FLOW 결과: %s" % ("성공" if ok else "실패"))
	get_tree().quit(0 if ok else 1)


## 내보낸 패키지 점검: 데이터 검사 결과를 출력하고 오류가 있으면 1 로 끝낸다.
func _selfcheck() -> void:
	var errors := DataRegistry.validate()
	for e in errors:
		printerr("SELFCHECK 오류: " + e)
	print("SELFCHECK 영웅 %d, 스킬 %d, 몬스터 %d, 오류 %d" % [DataRegistry.ids("heroes").size(), DataRegistry.ids("skills").size(), DataRegistry.ids("monsters").size(), errors.size()])
	get_tree().quit(1 if not errors.is_empty() else 0)


## 개발용: --screenshot=경로 --wait=초 [--battle=영웅id] [--autoplay] [--boss_time=초] [--follow_boss]
func _screenshot_later() -> void:
	if dev_args.has("battle"):
		var c := default_config(dev_args["battle"], int(dev_args.get("size", "3")))
		if dev_args.has("kills"):
			c.kill_target = int(dev_args["kills"])
		c.autoplay = dev_args.has("autoplay")
		if dev_args.has("boss_time"):
			c.final_boss_time = float(dev_args["boss_time"])
		start_match(c)
	if dev_args.has("scene"):
		goto(dev_args["scene"])
	var wait := float(dev_args.get("wait", "3"))
	await get_tree().create_timer(wait, true, false, true).timeout
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var err := img.save_png(dev_args["screenshot"])
	print("화면 캡처 %s (%dx%d) 결과=%d" % [dev_args["screenshot"], img.get_width(), img.get_height(), err])
	get_tree().quit()
