extends Node
## 시험 실행기. tests/unit, tests/sim 의 test_*.gd 를 모두 실행하고 결과에 따라 종료 코드를 정한다.
## 실행: godot --headless --path . --fixed-fps 60 res://tests/test_runner.tscn [-- --only=이름]

const DIRS := ["res://tests/unit", "res://tests/sim"]


func _ready() -> void:
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
