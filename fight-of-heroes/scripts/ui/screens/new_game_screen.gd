extends Control
## 새 게임: 게임 모드 → 영웅 선택 → 팀 구성(무작위 / 직접) → 난이도·목표 킬 → 시작.
## 직접 구성: 아래 칸을 누른 뒤 영웅을 누르면 그 칸에 들어간다. 같은 영웅은 한 번만 쓸 수 있다.

const MODES := [["team", "3대3 대전"], ["practice", "1대1 연습"], ["watch", "AI끼리 관전"]]
const DIFFICULTIES := [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"]]
const KILL_TARGETS := [10, 15, 20, 30]
const ROLE_NAMES := {"fighter": "돌격", "hunter": "사냥꾼", "support": "지원"}

var mode := "team"
var team_mode := "random"
## 직접 구성 칸: 0 = 나, 1~2 = 아군, 3~5 = 적군 ("" = 무작위)
var slots: Array = ["", "", "", "", "", ""]
var selected_slot := 0
## 흐름 시험용
var kill_target_override := 0
var flow_autoplay := false

var hero_buttons: Array = []
var mode_buttons: Array = []
var team_buttons: Array = []
var slot_buttons: Array = []
var diff_buttons: Array = []
var kill_buttons: Array = []
var info: Label
var slot_row: HBoxContainer


func _ready() -> void:
	team_mode = SaveManager.get_setting("team_mode", "random")
	var box := UiKit.page(self, 8)
	UiKit.header(box, "새 게임", on_back)
	var mrow := HBoxContainer.new()
	mrow.add_theme_constant_override("separation", 8)
	box.add_child(mrow)
	mrow.add_child(UiKit.label("게임 모드", 18, UiKit.MUTED))
	for m in MODES:
		var b := UiKit.toggle(m[1], Vector2(150, 48))
		b.set_meta("id", m[0])
		b.pressed.connect(_set_mode.bind(m[0]))
		mrow.add_child(b)
		mode_buttons.append(b)

	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	box.add_child(grid)
	var heroes: Array = DataRegistry.get_all("heroes")
	heroes.sort_custom(func(a, b): return a.display_name < b.display_name)
	for h: HeroData in heroes:
		var b := UiKit.toggle("", Vector2(236, 64), 17)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.set_meta("id", h.id)
		b.pressed.connect(_on_hero.bind(h.id))
		var badge := UiKit.hero_badge(h, 40.0)
		badge.position = Vector2(8, 12)
		b.add_child(badge)
		b.text = h.display_name + "\n" + h.role
		grid.add_child(b)
		UiKit.indent_button(b, 56.0)
		hero_buttons.append(b)

	info = UiKit.wrap_label("", 16, UiKit.TEXT)
	info.custom_minimum_size = Vector2(0, 48)
	box.add_child(info)

	var trow := HBoxContainer.new()
	trow.add_theme_constant_override("separation", 8)
	box.add_child(trow)
	trow.add_child(UiKit.label("팀 구성", 18, UiKit.MUTED))
	for t in [["random", "무작위"], ["manual", "직접 구성"]]:
		var b := UiKit.toggle(t[1], Vector2(120, 48))
		b.set_meta("id", t[0])
		b.pressed.connect(_set_team_mode.bind(t[0]))
		trow.add_child(b)
		team_buttons.append(b)
	slot_row = HBoxContainer.new()
	slot_row.add_theme_constant_override("separation", 6)
	trow.add_child(slot_row)
	for i in 6:
		if i == 3:
			slot_row.add_child(UiKit.label(" 대 ", 18, UiKit.MUTED))
		var b := UiKit.toggle("", Vector2(112, 48), 15)
		b.pressed.connect(_select_slot.bind(i))
		slot_row.add_child(b)
		slot_buttons.append(b)

	box.add_child(UiKit.spacer(false))
	var brow := HBoxContainer.new()
	brow.add_theme_constant_override("separation", 8)
	box.add_child(brow)
	brow.add_child(UiKit.label("AI 난이도", 18, UiKit.MUTED))
	for d in DIFFICULTIES:
		var b := UiKit.toggle(d[1], Vector2(100, 54))
		b.set_meta("id", d[0])
		b.pressed.connect(func(): SaveManager.set_setting("difficulty", d[0]); _refresh())
		brow.add_child(b)
		diff_buttons.append(b)
	brow.add_child(UiKit.label("  목표 킬", 18, UiKit.MUTED))
	for k in KILL_TARGETS:
		var b := UiKit.toggle(str(k), Vector2(66, 54))
		b.set_meta("k", k)
		b.pressed.connect(func(): SaveManager.set_setting("kill_target", k); _refresh())
		brow.add_child(b)
		kill_buttons.append(b)
	brow.add_child(UiKit.spacer())
	var go := UiKit.button("시작", Vector2(200, 60), 26)
	go.name = "StartButton"
	go.pressed.connect(start_pressed)
	brow.add_child(go)

	var last: String = SaveManager.get_setting("last_hero", "blade_master")
	slots[0] = last if DataRegistry.hero(last) != null else heroes[0].id
	_refresh()


func select_hero(id: String) -> void:
	slots[0] = id
	_refresh()


func _on_hero(id: String) -> void:
	if team_mode == "random" or mode == "watch":
		selected_slot = 0
	var idx := slots.find(id)
	if idx >= 0 and idx != selected_slot:
		slots[idx] = slots[selected_slot] if selected_slot != 0 or idx != 0 else ""
	slots[selected_slot] = id
	if team_mode == "manual" and selected_slot < 5:
		for i in range(selected_slot + 1, _used_slots()):
			if slots[i] == "":
				selected_slot = i
				break
	_refresh()


func _used_slots() -> int:
	return 6 if mode != "practice" else 4


func _select_slot(i: int) -> void:
	selected_slot = i
	_refresh()


func _set_mode(m: String) -> void:
	mode = m
	selected_slot = 0
	_refresh()


func _set_team_mode(t: String) -> void:
	team_mode = t
	SaveManager.set_setting("team_mode", t)
	selected_slot = 0
	_refresh()


func _visible_slot(i: int) -> bool:
	if mode == "practice":
		return i == 0 or i == 3
	return true


func _refresh() -> void:
	for b in mode_buttons:
		b.button_pressed = b.get_meta("id") == mode
	for b in team_buttons:
		b.button_pressed = b.get_meta("id") == team_mode
	var shown_slot := selected_slot
	for b in hero_buttons:
		var id: String = b.get_meta("id")
		b.button_pressed = slots[shown_slot] == id
		b.disabled = team_mode == "manual" and slots.has(id) and slots[shown_slot] != id and mode != "watch"
	slot_row.visible = team_mode == "manual"
	for i in 6:
		var b: Button = slot_buttons[i]
		b.visible = _visible_slot(i)
		var h := DataRegistry.hero(slots[i]) if slots[i] != "" else null
		var who := "나" if i == 0 else ("아군" if i < 3 else "적")
		b.text = "%s\n%s" % [who, h.display_name if h != null else "무작위"]
		b.button_pressed = i == selected_slot
	var cur: String = SaveManager.get_setting("difficulty", "normal")
	for b in diff_buttons:
		b.button_pressed = b.get_meta("id") == cur
	var kt := int(SaveManager.get_setting("kill_target", 15))
	for b in kill_buttons:
		b.button_pressed = b.get_meta("k") == kt
	var h := DataRegistry.hero(slots[shown_slot]) if slots[shown_slot] != "" else null
	if h == null:
		info.text = "이 칸은 무작위 영웅으로 채웁니다. 영웅을 누르면 이 칸에 넣습니다."
	else:
		info.text = "%s · %s · 난이도 %s · 기본 역할 %s\n패시브 %s" % [h.display_name, h.role, "★".repeat(h.difficulty), ROLE_NAMES.get(h.preferred_role, ""), h.passive_description]


func build_config() -> MatchConfig:
	var size := 1 if mode == "practice" else 3
	var c := GameManager.default_config(slots[0], size)
	if team_mode == "manual":
		var pool: Array = DataRegistry.ids("heroes")
		for id in slots:
			pool.erase(id)
		pool.shuffle()
		var blue := [slots[0]]
		var red := []
		for i in range(1, size):
			blue.append(slots[i] if slots[i] != "" else pool.pop_back())
		for i in range(3, 3 + size):
			red.append(slots[i] if slots[i] != "" else pool.pop_back())
		c.blue_heroes = PackedStringArray(blue)
		c.red_heroes = PackedStringArray(red)
	c.mode = mode
	c.autoplay = mode == "watch" or flow_autoplay
	if kill_target_override > 0:
		c.kill_target = kill_target_override
	elif mode == "practice":
		c.kill_target = mini(c.kill_target, 10)
	return c


## 시작 버튼. 이어 할 전투가 저장돼 있으면 사라진다고 먼저 묻는다.
func start_pressed() -> void:
	if SaveManager.has_battle():
		UiKit.confirm(self, "저장해 둔 전투가 있습니다. 새 게임을 시작하면 저장한 전투는 사라집니다.", "새 게임 시작", start)
	else:
		start()


func start() -> void:
	SaveManager.set_setting("last_hero", slots[0])
	GameManager.start_match(build_config())


func on_back() -> void:
	GameManager.go_main()
