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
	var bg := ColorRect.new()
	bg.color = BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
		var face := Art.texture("heroes", h.id)
		if face != null:
			Art.draw_portrait(c, face, Vector2(r, r), r - 3.0)
			return
		var fs := int(size * 0.45)
		var w := FONT.get_string_size(h.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		c.draw_string(FONT, Vector2(r - w * 0.5, r + fs * 0.36), h.glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.85)))
	return c
