class_name UiKit
## 메뉴 화면들이 함께 쓰는 UI 도구: 테마, 배경, 제목 줄, 글자, 버튼, 확인 창.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const BG := Color(0.07, 0.09, 0.11)
const PANEL := Color(0.11, 0.13, 0.16)
const ACCENT := Color(1, 0.84, 0.42)
const TEXT := Color(0.9, 0.92, 0.95)
const MUTED := Color(0.65, 0.7, 0.76)
const GOOD := Color(0.45, 0.9, 0.55)
const BAD := Color(1, 0.45, 0.4)


## 게임 전체에 쓰는 테마. 버튼을 둥글고 큼직하게 만든다.
static func make_theme() -> Theme:
	var t := Theme.new()
	t.default_font = FONT
	t.default_font_size = 20
	var states := {
		"normal": Color(0.17, 0.2, 0.25), "hover": Color(0.22, 0.26, 0.32), "pressed": Color(0.42, 0.34, 0.14),
		"disabled": Color(0.13, 0.14, 0.16), "focus": Color(0, 0, 0, 0),
	}
	for st in states:
		var sb := StyleBoxFlat.new()
		sb.bg_color = states[st]
		sb.set_corner_radius_all(12)
		sb.set_content_margin_all(10)
		if st == "pressed":
			sb.border_color = ACCENT
			sb.set_border_width_all(2)
		elif st == "focus":
			sb.draw_center = false
		else:
			sb.border_color = Color(1, 1, 1, 0.08)
			sb.set_border_width_all(1)
		t.set_stylebox(st, "Button", sb)
	t.set_stylebox("hover_pressed", "Button", t.get_stylebox("pressed", "Button"))
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_pressed_color", "Button", ACCENT)
	t.set_color("font_hover_pressed_color", "Button", ACCENT)
	t.set_color("font_disabled_color", "Button", Color(0.5, 0.52, 0.55))
	t.set_color("font_color", "Label", TEXT)
	return t


static func background(parent: Control) -> void:
	var bg := MenuBackdrop.new()
	bg.name = "Backdrop"
	parent.add_child(bg)


## 화면 전체를 덮는 여백 + 세로 상자. 반환한 상자에 내용을 넣는다.
static func page(parent: Control, gap := 10) -> VBoxContainer:
	background(parent)
	var m := MarginContainer.new()
	m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		m.add_theme_constant_override("margin_" + side, 28)
	for side in ["top", "bottom"]:
		m.add_theme_constant_override("margin_" + side, 18)
	parent.add_child(m)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", gap)
	m.add_child(box)
	return box


## 제목 줄: "◀ 뒤로" 버튼과 제목
static func header(box: Control, title: String, on_back: Callable) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	box.add_child(row)
	var back := button("◀ 뒤로", Vector2(120, 52))
	back.pressed.connect(on_back)
	row.add_child(back)
	row.add_child(label(title, 30, ACCENT))
	return row


static func label(text: String, size := 20, color := TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l


static func wrap_label(text: String, size := 18, color := TEXT) -> Label:
	var l := label(text, size, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l


static func button(text: String, min_size := Vector2(160, 56), size := 20) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", size)
	return b


static func toggle(text: String, min_size := Vector2(110, 52), size := 19) -> Button:
	var b := button(text, min_size, size)
	b.toggle_mode = true
	return b


static func spacer(horizontal := true) -> Control:
	var c := Control.new()
	if horizontal:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	else:
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return c


static func panel(min_size := Vector2.ZERO) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = PANEL
	sb.set_corner_radius_all(14)
	sb.set_content_margin_all(14)
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = min_size
	return p


static func scroll(min_size := Vector2.ZERO) -> ScrollContainer:
	var s := ScrollContainer.new()
	s.custom_minimum_size = min_size
	s.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	s.size_flags_vertical = Control.SIZE_EXPAND_FILL
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return s


## 화면 안의 확인 창 (alert/confirm 대신). 예를 누르면 on_yes 를 부른다.
static func confirm(parent: Control, text: String, yes_text: String, on_yes: Callable) -> Control:
	var shade := ColorRect.new()
	shade.color = Color(0, 0, 0, 0.6)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	parent.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.add_child(center)
	var p := panel(Vector2(520, 0))
	center.add_child(p)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 18)
	p.add_child(box)
	var l := wrap_label(text, 22)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(l)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 16)
	box.add_child(row)
	var no := button("취소", Vector2(180, 58))
	no.pressed.connect(shade.queue_free)
	row.add_child(no)
	var yes := button(yes_text, Vector2(180, 58))
	yes.pressed.connect(func():
		shade.queue_free()
		on_yes.call())
	row.add_child(yes)
	return shade


## 버튼 글자를 왼쪽에서 px 만큼 띄운다 (왼쪽에 아이콘을 얹을 때).
static func indent_button(b: Button, px: float) -> void:
	for st in ["normal", "hover", "pressed", "disabled", "hover_pressed"]:
		var sb := b.get_theme_stylebox(st)
		if sb == null:
			continue
		var c := sb.duplicate()
		c.content_margin_left = px
		b.add_theme_stylebox_override(st, c)


## 영웅을 나타내는 작은 원 (색과 글자)
static func hero_badge(h: HeroData, size := 44.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(size, size)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.draw.connect(func():
		var r := size * 0.5
		c.draw_circle(Vector2(r, r), r, Color(0, 0, 0, 0.5))
		c.draw_circle(Vector2(r, r), r - 3.0, h.color)
		if Art.draw_hero_face(c, h.id, Vector2(r, r), r - 3.0):
			return
		var fs := int(size * 0.45)
		var w := FONT.get_string_size(h.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		c.draw_string(FONT, Vector2(r - w * 0.5, r + fs * 0.36), h.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.85)))
	return c


## 목표 킬 정하기: [−] 숫자 [+] (0~100, 0 은 무제한). 누를 때마다 설정에 저장한다.
static func kill_stepper(btn := Vector2(60, 54)) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.name = "KillStepper"
	row.add_theme_constant_override("separation", 4)
	var minus := button("−", btn, 26)
	minus.name = "Minus"
	var value := label("", 24)
	value.name = "Value"
	value.custom_minimum_size = Vector2(80, 0)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var plus := button("+", btn, 26)
	plus.name = "Plus"
	var show := func():
		var k := int(SaveManager.get_setting("kill_target", 15))
		value.text = str(k) if k > 0 else "무제한"
	var change := func(d: int):
		var k := clampi(int(SaveManager.get_setting("kill_target", 15)) + d, 0, 100)
		SaveManager.set_setting("kill_target", k)
		show.call()
	minus.pressed.connect(change.bind(-1))
	plus.pressed.connect(change.bind(1))
	row.add_child(minus)
	row.add_child(value)
	row.add_child(plus)
	show.call()
	return row


## 영웅 숙련도 메달: 단계 숫자를 넣은 작은 원. 색은 단계(동·은·금·보라)에 따라 다르다.
static func mastery_badge(level: int, size := 22.0) -> Control:
	var c := Control.new()
	c.name = "Mastery"
	c.custom_minimum_size = Vector2(size, size)
	c.size = Vector2(size, size)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var col := ProgressMeta.tier_color(level)
	c.draw.connect(func():
		var r := size * 0.5
		c.draw_circle(Vector2(r, r), r, Color(0.08, 0.06, 0.04, 0.9))
		c.draw_circle(Vector2(r, r), r - 2.0, col)
		c.draw_circle(Vector2(r, r), r - 4.0, col.darkened(0.2))
		var fs := int(size * 0.62)
		var t := str(level)
		var w := FONT.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		c.draw_string(FONT, Vector2(r - w * 0.5, r + fs * 0.36), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0.1, 0.07, 0.03)))
	return c


## 가로 진행 막대 (0~1)
static func progress_bar(ratio: float, min_size := Vector2(200, 12), color := ACCENT) -> Control:
	var c := Control.new()
	c.custom_minimum_size = min_size
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var t := clampf(ratio, 0.0, 1.0)
	c.draw.connect(func():
		c.draw_rect(Rect2(Vector2.ZERO, c.size), Color(1, 1, 1, 0.12))
		if t > 0.0:
			c.draw_rect(Rect2(Vector2.ZERO, Vector2(c.size.x * t, c.size.y)), color))
	return c


## 화면 오른쪽 위에 잠깐 떴다 사라지는 알림 (업적 얻음 등). index 로 여러 개를 아래로 쌓는다.
static func toast(parent: Control, text: String, index := 0, color := ACCENT, delay := 0.0) -> PanelContainer:
	var p := PanelContainer.new()
	p.name = "Toast%d" % index
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.12, 0.1, 0.06, 0.95)
	sb.border_color = color
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(12)
	sb.content_margin_left = 18
	sb.content_margin_right = 18
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(label(text, 20, color))
	p.modulate.a = 0.0
	parent.add_child(p)
	p.reset_size()
	var place := func():
		p.position = Vector2(parent.size.x - p.size.x - 24.0, 14.0 + index * 58.0)
	place.call()
	place.call_deferred()
	p.resized.connect(place)
	var tw := p.create_tween()
	tw.tween_interval(delay)
	tw.tween_property(p, "modulate:a", 1.0, 0.25)
	tw.tween_interval(4.0)
	tw.tween_property(p, "modulate:a", 0.0, 0.6)
	tw.tween_callback(p.queue_free)
	return p
