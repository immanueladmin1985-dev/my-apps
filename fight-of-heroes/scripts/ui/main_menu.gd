extends Control
## 처음 화면 (시험판). 영웅 10명 중 하나를 고르고 난이도·목표 킬을 정해 시작한다.
## PHASE 6 에서 정식 메인 메뉴·영웅 선택·도감으로 나눈다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const DIFFICULTIES := [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"]]
const KILL_TARGETS := [10, 15, 20, 30]
const ROLE_NAMES := {"fighter": "돌격", "hunter": "사냥꾼", "support": "지원"}

var difficulty_buttons: Array = []
var kill_buttons: Array = []
var hero_buttons: Array = []
var selected_id := ""
var detail: Label
var start_button: Button


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color(0.08, 0.1, 0.12)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	margin.add_child(box)
	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 18)
	box.add_child(title_row)
	title_row.add_child(_label("FIGHT OF HEROES", 40, Color(1, 0.85, 0.4)))
	title_row.add_child(_label("시험판 0.5.0 · 영웅 10명 · 3대3", 18, Color(0.75, 0.8, 0.85)))

	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	box.add_child(grid)
	var heroes: Array = DataRegistry.get_all("heroes")
	heroes.sort_custom(func(a, b): return a.display_name < b.display_name)
	for h: HeroData in heroes:
		var b := _button("%s\n%s" % [h.display_name, h.role], Vector2(236, 74), 18)
		b.toggle_mode = true
		b.pressed.connect(_select.bind(h.id))
		b.set_meta("id", h.id)
		grid.add_child(b)
		hero_buttons.append(b)

	detail = _label("", 16, Color(0.85, 0.88, 0.92))
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail.custom_minimum_size = Vector2(0, 150)
	detail.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(detail)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	box.add_child(row)
	row.add_child(_label("AI 난이도", 18, Color(0.8, 0.85, 0.9)))
	for d in DIFFICULTIES:
		var b := _button(d[1], Vector2(100, 54))
		b.toggle_mode = true
		b.pressed.connect(_set_difficulty.bind(d[0]))
		b.set_meta("id", d[0])
		row.add_child(b)
		difficulty_buttons.append(b)
	row.add_child(_label("  목표 킬", 18, Color(0.8, 0.85, 0.9)))
	for k in KILL_TARGETS:
		var b := _button("%d" % k, Vector2(70, 54))
		b.toggle_mode = true
		b.pressed.connect(_set_kill_target.bind(k))
		b.set_meta("k", k)
		row.add_child(b)
		kill_buttons.append(b)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(spacer)
	var watch := _button("AI끼리 관전", Vector2(150, 54))
	watch.pressed.connect(_watch)
	row.add_child(watch)
	start_button = _button("시작", Vector2(150, 54), 22)
	start_button.pressed.connect(_start)
	row.add_child(start_button)
	_refresh_settings()
	var last: String = SaveManager.get_setting("last_hero", "blade_master")
	_select(last if DataRegistry.hero(last) != null else heroes[0].id)


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _button(text: String, min_size: Vector2, size := 20) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", size)
	return b


func _select(id: String) -> void:
	selected_id = id
	for b in hero_buttons:
		b.button_pressed = b.get_meta("id") == id
	var h := DataRegistry.hero(id)
	var lines := PackedStringArray()
	lines.append("%s · %s · 난이도 %s · 기본 역할 %s" % [h.display_name, h.role, "★".repeat(h.difficulty), ROLE_NAMES.get(h.preferred_role, "")])
	lines.append(h.lore)
	lines.append("패시브 " + h.passive_description)
	for i in h.skills.size():
		var s: SkillData = h.skills[i]
		lines.append("%s %s: %s" % [Enums.SLOT_KEYS[i], s.display_name, s.description])
	detail.text = "\n".join(lines)


func _set_difficulty(id: String) -> void:
	SaveManager.set_setting("difficulty", id)
	_refresh_settings()


func _set_kill_target(k: int) -> void:
	SaveManager.set_setting("kill_target", k)
	_refresh_settings()


func _refresh_settings() -> void:
	var cur: String = SaveManager.get_setting("difficulty", "normal")
	for b in difficulty_buttons:
		b.button_pressed = b.get_meta("id") == cur
	var kt := int(SaveManager.get_setting("kill_target", 15))
	for b in kill_buttons:
		b.button_pressed = b.get_meta("k") == kt


func _start() -> void:
	SaveManager.set_setting("last_hero", selected_id)
	GameManager.start_match(GameManager.default_config(selected_id))


func _watch() -> void:
	var c := GameManager.default_config(DataRegistry.ids("heroes").pick_random())
	c.autoplay = true
	GameManager.start_match(c)
