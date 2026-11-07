extends Control
## 처음 화면 (PHASE 1 시험판). PHASE 6 에서 정식 메인 메뉴로 바꾼다.

const DIFFICULTIES := [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"]]
const KILL_TARGETS := [10, 15, 20, 30]

var difficulty_buttons: Array = []
var kill_buttons: Array = []


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color(0.08, 0.1, 0.12)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	box.grow_vertical = Control.GROW_DIRECTION_BOTH
	box.add_theme_constant_override("separation", 10)
	add_child(box)
	box.add_child(_label("FIGHT OF HEROES", 54, Color(1, 0.85, 0.4)))
	box.add_child(_label("시험판 0.4.0 · 영웅의 계곡 3대3 · 아이템·상점 (아군·적군은 무작위로 구성)", 20, Color(0.8, 0.85, 0.9)))
	box.add_child(_spacer(4))
	for h in DataRegistry.get_all("heroes"):
		var hd: HeroData = h
		var b := _button("%s으로 시작  (%s)" % [hd.display_name, hd.role])
		b.pressed.connect(_start.bind(hd.id))
		box.add_child(b)
	var watch := _button("AI끼리 관전하기", Vector2(420, 56))
	watch.pressed.connect(_watch)
	box.add_child(watch)
	box.add_child(_spacer(6))
	box.add_child(_label("AI 난이도", 18, Color(0.8, 0.85, 0.9)))
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	box.add_child(row)
	for d in DIFFICULTIES:
		var b := _button(d[1], Vector2(130, 56))
		b.toggle_mode = true
		b.pressed.connect(_set_difficulty.bind(d[0]))
		b.set_meta("id", d[0])
		row.add_child(b)
		difficulty_buttons.append(b)
	box.add_child(_label("목표 킬 (먼저 달성한 팀이 승리)", 18, Color(0.8, 0.85, 0.9)))
	var row2 := HBoxContainer.new()
	row2.alignment = BoxContainer.ALIGNMENT_CENTER
	row2.add_theme_constant_override("separation", 10)
	box.add_child(row2)
	for k in KILL_TARGETS:
		var b := _button("%d킬" % k, Vector2(96, 56))
		b.toggle_mode = true
		b.pressed.connect(_set_kill_target.bind(k))
		b.set_meta("k", k)
		row2.add_child(b)
		kill_buttons.append(b)
	_refresh_difficulty()


func _set_kill_target(k: int) -> void:
	SaveManager.set_setting("kill_target", k)
	_refresh_difficulty()


func _watch() -> void:
	var c := GameManager.default_config(DataRegistry.ids("heroes").pick_random())
	c.autoplay = true
	GameManager.start_match(c)


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _spacer(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	return c


func _button(text: String, min_size := Vector2(420, 66)) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", 22)
	return b


func _set_difficulty(id: String) -> void:
	SaveManager.set_setting("difficulty", id)
	_refresh_difficulty()


func _refresh_difficulty() -> void:
	var cur: String = SaveManager.get_setting("difficulty", "normal")
	for b in difficulty_buttons:
		b.button_pressed = b.get_meta("id") == cur
	var kt := int(SaveManager.get_setting("kill_target", 15))
	for b in kill_buttons:
		b.button_pressed = b.get_meta("k") == kt


func _start(hero_id: String) -> void:
	GameManager.start_match(GameManager.default_config(hero_id))
