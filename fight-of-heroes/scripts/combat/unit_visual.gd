class_name UnitVisual
extends Node2D
## 유닛 그림. 실제 스프라이트(SpriteFrames)가 있으면 그것을 쓰고, 없으면 도형으로 임시 그림을 그린다.
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


func _draw() -> void:
	if unit == null:
		return
	var r: float = unit.radius
	var team_c := Enums.team_color(unit.team)
	var alpha := 0.35 if unit.is_dead else 1.0
	draw_set_transform(Vector2(0, r * 0.75), 0.0, Vector2(1.0, 0.4))
	draw_circle(Vector2.ZERO, r * 1.1, Color(0, 0, 0, 0.35 * alpha))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if is_player:
		draw_arc(Vector2.ZERO, r + 7.0, 0, TAU, 40, Color(1, 0.95, 0.4, 0.9 * alpha), 2.0)
	if sprite == null:
		_draw_placeholder(r, team_c, alpha)
	if unit.is_dead:
		_draw_dead_label(r)
		return
	_draw_status(r)
	_draw_bars(r, team_c)


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
		_:
			draw_line(wdir * r * 0.5, wdir * (r + 22.0), Color(0.9, 0.92, 1.0, alpha), 4.0)
			draw_line(wdir.orthogonal() * 6.0 + wdir * r * 0.8, -wdir.orthogonal() * 6.0 + wdir * r * 0.8, Color(0.7, 0.6, 0.3, alpha), 3.0)
	# 몸
	var bc := body_color.lerp(Color.WHITE, _hit_flash * 0.7)
	draw_circle(Vector2.ZERO, r, Color(bc, alpha))
	draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(team_c, alpha), 3.0)
	var fs := int(r * 1.05)
	var size := FONT.get_string_size(glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
	draw_string(FONT, Vector2(-size.x * 0.5, fs * 0.36), glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.8 * alpha))


func _draw_bars(r: float, team_c: Color) -> void:
	var w := maxf(52.0, r * 3.2)
	var y := -r - 20.0
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
			draw_circle(Vector2(cos(a) * 14.0, -r - 30.0 + sin(a) * 4.0), 3.5, Color(1, 0.9, 0.2))
	if unit.status.is_slowed():
		draw_arc(Vector2.ZERO, r + 3.0, 0, TAU, 32, Color(0.4, 0.8, 1.0, 0.8), 2.0)


func _draw_dead_label(r: float) -> void:
	var left = unit.get("respawn_left")
	if left != null and left > 0.0:
		var s := "%d" % ceili(left)
		draw_string(FONT, Vector2(-6, -r - 8), s, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(1, 1, 1, 0.9))
