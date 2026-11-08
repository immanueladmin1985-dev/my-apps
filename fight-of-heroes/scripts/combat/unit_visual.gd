class_name UnitVisual
extends Node2D
## 유닛 그림. 실제 스프라이트(SpriteFrames)가 있으면 그것을 쓰고, 그다음으로 그림 한 장(assets/heroes·monsters/<id>.png)을,
## 둘 다 없으면 도형으로 임시 그림을 그린다.
## 머리 위 체력·마나 막대, 보호막, 기절·둔화 표시도 여기서 그린다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var unit = null
var body_color := Color.WHITE
var glyph := "?"
var weapon := "sword"
var is_player := false
var sprite: AnimatedSprite2D = null
var _swing := 0.0
var _hit_flash := 0.0
## 그림 한 장 방식: 기본 그림과 변신했을 때 그림 (없으면 null)
var art: Texture2D = null
var art_alt: Texture2D = null
var art_alt_status := ""
var _flip := false
## 머리 위치 (체력 막대·상태 표시 기준). 도형이면 -radius, 그림이면 그림 위쪽.
var _head_y := 0.0
## 그림 높이 = 반지름 × 이 값
const HERO_ART_SCALE := 4.2
const MONSTER_ART_SCALE := 3.4


func setup(u) -> void:
	unit = u
	if u.get("data") != null:
		var d = u.data
		body_color = d.color
		glyph = d.glyph
		weapon = d.weapon
		if d.sprite_frames != null:
			sprite = AnimatedSprite2D.new()
			sprite.sprite_frames = d.sprite_frames
			add_child(sprite)
		else:
			var kind := "heroes" if u is Hero else "monsters"
			art = Art.texture(kind, d.id)
			if u is Hero:
				art_alt = Art.texture(kind, d.id + "_dragon")
				art_alt_status = "dragon_form"
	u.attack.attack_started.connect(func(_t): _swing = 1.0)
	u.health.changed.connect(_on_health_changed)


var _last_hp := -1.0


func _on_health_changed(hp: float, _max: float) -> void:
	if _last_hp >= 0.0 and hp < _last_hp - 0.5:
		_hit_flash = 1.0
	_last_hp = hp


func _process(delta: float) -> void:
	_swing = maxf(0.0, _swing - delta * 4.0)
	_hit_flash = maxf(0.0, _hit_flash - delta * 5.0)
	if sprite != null:
		_update_sprite()
	queue_redraw()


func _update_sprite() -> void:
	var anim := "idle"
	if unit.is_dead:
		anim = "death"
	elif _swing > 0.0:
		anim = "attack"
	elif unit.velocity.length() > 5.0:
		anim = "move"
	if sprite.sprite_frames.has_animation(anim) and sprite.animation != anim:
		sprite.play(anim)
	sprite.flip_h = unit.facing.x < 0.0


## 화면을 보는 플레이어의 팀 (은신한 적은 보이지 않게 그린다)
static var viewer_team := Enums.Team.BLUE


func _draw() -> void:
	if unit == null:
		return
	var vs: float = unit.status.visual_scale()
	scale = Vector2(vs, vs)
	var r: float = unit.radius
	var team_c := Enums.team_color(unit.team)
	var alpha := 0.35 if unit.is_dead else 1.0
	if unit.status.is_stealthed():
		if Enums.is_enemy(viewer_team, unit.team):
			return
		alpha = 0.4
	draw_set_transform(Vector2(0, r * 0.75), 0.0, Vector2(1.0, 0.4))
	draw_circle(Vector2.ZERO, r * 1.1, Color(0, 0, 0, 0.35 * alpha))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_head_y = -r
	var tex := _current_art()
	if tex != null and sprite == null:
		_draw_art(tex, r, team_c, alpha)
	else:
		if is_player:
			draw_arc(Vector2.ZERO, r + 7.0, 0, TAU, 40, Color(1, 0.95, 0.4, 0.9 * alpha), 2.0)
		if sprite == null:
			_draw_placeholder(r, team_c, alpha)
	if unit.is_dead:
		_draw_dead_label(r)
		return
	_draw_status(r)
	_draw_bars(r, team_c)


func _current_art() -> Texture2D:
	if art_alt != null and unit.status.has(art_alt_status):
		return art_alt
	return art


## 그림 한 장 방식: 발밑에 팀 고리, 그 위에 그림. 바라보는 방향에 따라 좌우를 뒤집고, 움직이면 살짝 튀고, 공격하면 기울인다.
func _draw_art(tex: Texture2D, r: float, team_c: Color, alpha: float) -> void:
	var feet := r * 0.75
	draw_set_transform(Vector2(0, feet), 0.0, Vector2(1.0, 0.42))
	if unit.team != Enums.Team.NEUTRAL:
		draw_arc(Vector2.ZERO, r * 1.25, 0, TAU, 40, Color(team_c, 0.95 * alpha), 4.0)
	if is_player:
		draw_arc(Vector2.ZERO, r * 1.25 + 7.0, 0, TAU, 40, Color(1, 0.95, 0.4, 0.9 * alpha), 3.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if unit.facing.x < -0.15:
		_flip = true
	elif unit.facing.x > 0.15:
		_flip = false
	var h := r * (HERO_ART_SCALE if unit is Hero else MONSTER_ART_SCALE)
	var w := h * tex.get_width() / maxf(1.0, tex.get_height())
	var bob := 0.0
	if not unit.is_dead and unit.velocity.length() > 5.0:
		bob = absf(sin(Time.get_ticks_msec() / 1000.0 * 11.0)) * h * 0.04
	var lean := (_swing * 0.22) * (-1.0 if _flip else 1.0)
	if unit.is_dead:
		lean = PI * 0.5 * (-1.0 if _flip else 1.0)
	var m := Color(1, 1, 1, alpha)
	var tint: Color = unit.status.visual_tint()
	if tint.a > 0.0:
		m = Color(m.lerp(Color(tint, 1.0), tint.a * 0.6), alpha)
	if _hit_flash > 0.0:
		m = Color(1.0, 1.0 - _hit_flash * 0.55, 1.0 - _hit_flash * 0.55, alpha)
	draw_set_transform(Vector2(0, feet - bob), lean, Vector2(-1.0 if _flip else 1.0, 1.0))
	draw_texture_rect(tex, Rect2(-w * 0.5, -h, w, h), false, m)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_head_y = feet - h * 0.92


func _draw_placeholder(r: float, team_c: Color, alpha: float) -> void:
	var f: Vector2 = unit.facing
	var swing_angle := f.angle() + (_swing - 0.5) * 1.6 if _swing > 0.0 else f.angle()
	var wdir := Vector2.from_angle(swing_angle)
	# 무기
	match weapon:
		"bow":
			var c := wdir * (r + 4.0)
			draw_arc(c, r * 0.9, wdir.angle() - 1.2, wdir.angle() + 1.2, 16, Color(0.75, 0.55, 0.3, alpha), 3.0)
		"staff":
			draw_line(wdir * r * 0.4, wdir * (r + 16.0), Color(0.6, 0.45, 0.3, alpha), 3.0)
			draw_circle(wdir * (r + 16.0), 4.5, Color(body_color.lightened(0.5), alpha))
		"dagger":
			for side in [-1.0, 1.0]:
				var o: Vector2 = wdir.orthogonal() * side * 9.0
				draw_line(o + wdir * r * 0.6, o + wdir * (r + 11.0), Color(0.85, 0.85, 0.95, alpha), 3.0)
		"shield":
			draw_line(wdir * r * 0.5, wdir * (r + 18.0), Color(0.9, 0.92, 1.0, alpha), 4.0)
			var sp := wdir.orthogonal() * -(r * 0.9)
			draw_circle(sp, r * 0.55, Color(0.85, 0.75, 0.35, alpha))
			draw_arc(sp, r * 0.55, 0, TAU, 20, Color(1, 1, 1, alpha * 0.7), 2.0)
		"fist":
			for side in [-1.0, 1.0]:
				draw_circle(wdir * (r + 4.0) + wdir.orthogonal() * side * 8.0, 5.0, Color(0.95, 0.8, 0.6, alpha))
		"spear":
			draw_line(-wdir * r * 0.6, wdir * (r + 30.0), Color(0.7, 0.55, 0.35, alpha), 3.0)
			draw_colored_polygon(PackedVector2Array([wdir * (r + 38.0), wdir * (r + 28.0) + wdir.orthogonal() * 5.0, wdir * (r + 28.0) - wdir.orthogonal() * 5.0]), Color(0.9, 0.9, 1.0, alpha))
		"book":
			var bp := wdir * (r + 8.0)
			draw_rect(Rect2(bp - Vector2(7, 9), Vector2(14, 18)), Color(0.55, 0.3, 0.6, alpha))
			draw_rect(Rect2(bp - Vector2(7, 9), Vector2(14, 18)), Color(1, 0.9, 0.5, alpha), false, 1.5)
		_:
			draw_line(wdir * r * 0.5, wdir * (r + 22.0), Color(0.9, 0.92, 1.0, alpha), 4.0)
			draw_line(wdir.orthogonal() * 6.0 + wdir * r * 0.8, -wdir.orthogonal() * 6.0 + wdir * r * 0.8, Color(0.7, 0.6, 0.3, alpha), 3.0)
	# 몸
	var bc := body_color.lerp(Color.WHITE, _hit_flash * 0.7)
	var tint: Color = unit.status.visual_tint()
	if tint.a > 0.0:
		bc = bc.lerp(Color(tint, 1.0), tint.a)
	draw_circle(Vector2.ZERO, r, Color(bc, alpha))
	draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(team_c, alpha), 3.0)
	var fs := int(r * 1.05)
	var size := FONT.get_string_size(glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
	draw_string(FONT, Vector2(-size.x * 0.5, fs * 0.36), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.8 * alpha))


func _draw_bars(r: float, team_c: Color) -> void:
	var w := maxf(52.0, r * 3.2)
	var y := _head_y - 20.0
	var hp_ratio: float = unit.health.ratio()
	var shield: float = unit.health.shield_total()
	var max_hp: float = unit.health.max_hp()
	draw_rect(Rect2(-w * 0.5 - 1, y - 1, w + 2, 9), Color(0, 0, 0, 0.75))
	draw_rect(Rect2(-w * 0.5, y, w * hp_ratio, 7), team_c if not is_player else Color(0.35, 0.9, 0.4))
	if shield > 0.0:
		var sw := minf(w * shield / max_hp, w)
		var sx := minf(-w * 0.5 + w * hp_ratio, w * 0.5 - sw)
		draw_rect(Rect2(sx, y, sw, 7), Color(0.95, 0.95, 0.95, 0.85))
	if unit.get("mana") != null and unit.mana.max_mp() > 0.0:
		draw_rect(Rect2(-w * 0.5, y + 8, w * clampf(unit.mana.mp / unit.mana.max_mp(), 0, 1), 3), Color(0.35, 0.55, 1.0))
	if unit.get("level") != null and unit is Hero:
		draw_string(FONT, Vector2(-w * 0.5 - 16, y + 8), str(unit.level), HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(1, 1, 1, 0.9))


func _draw_status(r: float) -> void:
	if unit.status.is_stunned():
		var t := Time.get_ticks_msec() / 1000.0
		for i in 3:
			var a := t * 4.0 + i * TAU / 3.0
			draw_circle(Vector2(cos(a) * 14.0, _head_y - 30.0 + sin(a) * 4.0), 3.5, Color(1, 0.9, 0.2))
	if unit.status.is_slowed():
		draw_arc(Vector2.ZERO, r + 3.0, 0, TAU, 32, Color(0.4, 0.8, 1.0, 0.8), 2.0)


func _draw_dead_label(r: float) -> void:
	var left = unit.get("respawn_left")
	if left != null and left > 0.0:
		var s := "%d" % ceili(left)
		draw_string(FONT, Vector2(-6, _head_y - 8), s, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 1, 1, 0.9))
