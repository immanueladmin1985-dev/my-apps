extends Control
## 설정: 기본 난이도, 목표 킬, 효과음 크기, 피해 숫자 표시, FPS 표시, 배터리 절약(30fps).

const DIFFICULTIES := [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"]]
const KILL_TARGETS := [10, 15, 20, 30]

var diff_buttons: Array = []
var kill_buttons: Array = []
var volume_label: Label


func _ready() -> void:
	var box := UiKit.page(self, 16)
	UiKit.header(box, "설정", on_back)
	var p := UiKit.panel()
	box.add_child(p)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 30)
	grid.add_theme_constant_override("v_separation", 18)
	p.add_child(grid)

	grid.add_child(UiKit.label("AI 난이도", 20))
	var drow := HBoxContainer.new()
	drow.add_theme_constant_override("separation", 8)
	grid.add_child(drow)
	for d in DIFFICULTIES:
		var b := UiKit.toggle(d[1], Vector2(120, 54))
		b.set_meta("id", d[0])
		b.pressed.connect(func(): SaveManager.set_setting("difficulty", d[0]); _refresh())
		drow.add_child(b)
		diff_buttons.append(b)

	grid.add_child(UiKit.label("목표 킬", 20))
	var krow := HBoxContainer.new()
	krow.add_theme_constant_override("separation", 8)
	grid.add_child(krow)
	for k in KILL_TARGETS:
		var b := UiKit.toggle(str(k), Vector2(80, 54))
		b.set_meta("k", k)
		b.pressed.connect(func(): SaveManager.set_setting("kill_target", k); _refresh())
		krow.add_child(b)
		kill_buttons.append(b)

	grid.add_child(UiKit.label("효과음 크기", 20))
	var vrow := HBoxContainer.new()
	vrow.add_theme_constant_override("separation", 12)
	grid.add_child(vrow)
	var slider := HSlider.new()
	slider.name = "Volume"
	slider.min_value = 0.0
	slider.max_value = 1.0
	slider.step = 0.05
	slider.custom_minimum_size = Vector2(360, 48)
	slider.value = float(SaveManager.get_setting("sfx_volume", 0.8))
	slider.value_changed.connect(func(v):
		SaveManager.set_setting("sfx_volume", v)
		volume_label.text = "%d%%" % roundi(v * 100.0)
		AudioManager.play("click"))
	vrow.add_child(slider)
	volume_label = UiKit.label("%d%%" % roundi(slider.value * 100.0), 20)
	vrow.add_child(volume_label)

	for opt in [["damage_numbers", "피해 숫자 표시", true], ["show_fps", "FPS 표시", false], ["battery_saver", "배터리 절약 (30fps)", false]]:
		grid.add_child(UiKit.label(opt[1], 20))
		var c := CheckButton.new()
		c.name = opt[0]
		c.focus_mode = Control.FOCUS_NONE
		c.button_pressed = bool(SaveManager.get_setting(opt[0], opt[2]))
		c.custom_minimum_size = Vector2(90, 48)
		c.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		c.toggled.connect(func(on): SaveManager.set_setting(opt[0], on))
		grid.add_child(c)
	box.add_child(UiKit.wrap_label("설정은 바로 저장됩니다. 게임 기록 초기화는 '게임 기록' 화면에 있습니다.", 16, UiKit.MUTED))
	_refresh()


func _refresh() -> void:
	var cur: String = SaveManager.get_setting("difficulty", "normal")
	for b in diff_buttons:
		b.button_pressed = b.get_meta("id") == cur
	var kt := int(SaveManager.get_setting("kill_target", 15))
	for b in kill_buttons:
		b.button_pressed = b.get_meta("k") == kt


func on_back() -> void:
	GameManager.go_main()
