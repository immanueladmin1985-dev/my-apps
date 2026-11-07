extends Node
## 시험 실행기. tests/unit, tests/sim 의 test_*.gd 를 모두 실행하고 결과에 따라 종료 코드를 정한다.
## 실행: godot --headless --path . --fixed-fps 60 res://tests/test_runner.tscn [-- --only=이름]

const DIRS := ["res://tests/unit", "res://tests/sim"]
## 이 시간(초) 동안 프레임이 진행되지 않으면 멈춘 것으로 보고 실패로 끝낸다.
const STALL_SECONDS := 20

var _frames := 0
var _watching := true
var _current := ""
var _watchdog := Thread.new()


func _physics_process(_delta: float) -> void:
	_frames += 1


func _watch() -> void:
	var last := -1
	var still := 0
	while _watching:
		OS.delay_msec(1000)
		if _frames == last:
			still += 1
			if still >= STALL_SECONDS:
				printerr("ERROR: 시험이 %d초 동안 멈췄습니다 (%s). 무한 반복을 의심하세요." % [STALL_SECONDS, _current])
				OS.kill(OS.get_process_id())
				return
		else:
			still = 0
		last = _frames


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_watchdog.start(_watch)
	await get_tree().process_frame
	var only: String = GameManager.dev_args.get("only", "")
	var skip_sim := GameManager.dev_args.has("fast")
	var total := 0
	var failed: Array = []
	var started := Time.get_ticks_msec()
	for path in _find_tests():
		if only != "" and not path.contains(only):
			continue
		if skip_sim and path.contains("/sim/"):
			continue
		print("■ ", path.get_file())
		var suite: TestCase = load(path).new()
		add_child(suite)
		for m in suite.get_method_list():
			var name: String = m.name
			if not name.begins_with("test_"):
				continue
			suite.current = name
			_current = "%s.%s" % [path.get_file(), name]
			var before := suite.failures.size()
			var t0 := Time.get_ticks_msec()
			await suite.before_each()
			await suite.call(name)
			await suite.after_each()
			get_tree().paused = false
			total += 1
			var ok := suite.failures.size() == before
			print("  %s %s (%d ms)" % ["[통과]" if ok else "[실패]", name, Time.get_ticks_msec() - t0])
			for i in range(before, suite.failures.size()):
				print("       → ", suite.failures[i])
				failed.append(suite.failures[i])
		suite.queue_free()
		await get_tree().process_frame
	print("")
	print("시험 %d개 중 %d개 통과, 실패 %d건 (%.1f초)" % [total, total - _count_failed_tests(failed), failed.size(), (Time.get_ticks_msec() - started) / 1000.0])
	_watching = false
	_watchdog.wait_to_finish()
	get_tree().quit(0 if failed.is_empty() else 1)


func _count_failed_tests(failed: Array) -> int:
	var names := {}
	for f in failed:
		names[f.split(":")[0]] = true
	return names.size()


func _find_tests() -> Array:
	var out: Array = []
	for d in DIRS:
		var dir := DirAccess.open(d)
		if dir == null:
			continue
		var files := Array(dir.get_files())
		files.sort()
		for f in files:
			if f.begins_with("test_") and f.ends_with(".gd"):
				out.append(d.path_join(f))
	return out
