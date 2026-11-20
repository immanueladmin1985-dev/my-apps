class_name MenuBackdrop
extends Control
## 메뉴 화면 바탕: 맵 바닥 그림을 어둡게 깔고, 위·아래와 가장자리를 짙게 흐려 글자가 잘 보이게 한다.
## 아주 천천히 흘러가 화면이 살아 보인다. 그림이 없으면 단색.

var _t := 0.0


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	draw_rect(r, UiKit.BG)
	var tex := Art.texture("map", "ground_grass")
	if tex != null:
		# 바닥 그림을 되풀이해 깔고 (texture_repeat), 보는 자리를 천천히 옮긴다.
		var ts := Vector2(tex.get_width(), tex.get_height()) * 0.8
		var off := Vector2(fmod(_t * 6.0, ts.x), fmod(_t * 3.0, ts.y))
		draw_set_transform(-off, 0.0, Vector2(0.8, 0.8))
		draw_texture_rect(tex, Rect2(Vector2.ZERO, (size + ts) / 0.8), true, Color(0.32, 0.36, 0.34))
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# 위·아래를 어둡게
	draw_rect(r, Color(UiKit.BG, 0.25))
	var dark := Color(UiKit.BG, 0.9)
	var clear := Color(UiKit.BG, 0.0)
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(size.x, 0), Vector2(size.x, size.y * 0.35), Vector2(0, size.y * 0.35)]),
		PackedColorArray([dark, dark, clear, clear]))
	draw_polygon(PackedVector2Array([Vector2(0, size.y * 0.65), Vector2(size.x, size.y * 0.65), Vector2(size.x, size.y), Vector2(0, size.y)]),
		PackedColorArray([clear, clear, dark, dark]))
	# 은은한 빛
	draw_texture_rect(SkillFx.tex("dot"), Rect2(Vector2(size.x * 0.1, size.y * 0.05), size * Vector2(0.6, 0.9)), false, Color(1, 0.85, 0.45, 0.08))
