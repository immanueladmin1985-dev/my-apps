extends Node
## 화면 흐름과 경기 설정을 맡는다. 명령줄 인자로 화면 캡처 같은 개발용 기능도 켠다.

const BATTLE_SCENE := "res://scenes/battlefield/battle.tscn"
const MAIN_SCENE := "res://scenes/main/main.tscn"

var match_config: MatchConfig
var dev_args: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=", true, 1)
		dev_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	if dev_args.has("selfcheck"):
		_selfcheck.call_deferred()
		return
	if dev_args.has("screenshot"):
		_screenshot_later.call_deferred()


## 기본 경기: 플레이어 영웅 + 나머지는 무작위로 채운 3대3. 같은 영웅이 여러 명 나올 수 있다.
func default_config(player_hero := "blade_master", team_size := 3) -> MatchConfig:
	var c := MatchConfig.new()
	var pool: Array = DataRegistry.ids("heroes")
	var blue := [player_hero]
	var red := []
	for i in team_size - 1:
		blue.append(pool.pick_random())
	for i in team_size:
		red.append(pool.pick_random())
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
	get_tree().paused = false
	get_tree().change_scene_to_file(MAIN_SCENE)


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
		c.autoplay = dev_args.has("autoplay")
		if dev_args.has("boss_time"):
			c.final_boss_time = float(dev_args["boss_time"])
		start_match(c)
	var wait := float(dev_args.get("wait", "3"))
	await get_tree().create_timer(wait, true, false, true).timeout
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var err := img.save_png(dev_args["screenshot"])
	print("화면 캡처 %s (%dx%d) 결과=%d" % [dev_args["screenshot"], img.get_width(), img.get_height(), err])
	get_tree().quit()
