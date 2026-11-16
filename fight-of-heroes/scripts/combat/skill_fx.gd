class_name SkillFx
extends Node2D
## 스킬 효과 그림. 스킬마다 정한 효과 종류(SkillData.vfx)에 따라 색과 입자 움직임을 바꾼다.
## 그림 파일(assets/effects/<종류>_ground.png, _burst.png, _projectile.png)이 있으면 그 그림을 쓰고,
## 없으면 코드로 만든 부드러운 입자 그림으로 그린다.
##
## 종류: fire(불) ice(얼음) holy(빛) heal(치유) poison(독) dark(어둠) nature(자연·화살) steel(칼날) impact(충격) arcane(기본)

const STYLES := {
	"fire": {"a": Color(1.0, 0.85, 0.35), "b": Color(1.0, 0.35, 0.1), "c": Color(0.35, 0.08, 0.05), "rise": -90.0, "tex": "flame"},
	"ice": {"a": Color(0.9, 0.98, 1.0), "b": Color(0.45, 0.8, 1.0), "c": Color(0.15, 0.35, 0.8), "rise": 30.0, "tex": "shard"},
	"holy": {"a": Color(1.0, 1.0, 0.85), "b": Color(1.0, 0.85, 0.35), "c": Color(0.9, 0.6, 0.15), "rise": -60.0, "tex": "star"},
	"heal": {"a": Color(0.9, 1.0, 0.8), "b": Color(0.45, 0.95, 0.45), "c": Color(0.95, 0.85, 0.3), "rise": -70.0, "tex": "star"},
	"poison": {"a": Color(0.8, 1.0, 0.4), "b": Color(0.45, 0.85, 0.15), "c": Color(0.35, 0.15, 0.45), "rise": -40.0, "tex": "dot"},
	"dark": {"a": Color(0.85, 0.6, 1.0), "b": Color(0.55, 0.25, 0.9), "c": Color(0.12, 0.05, 0.2), "rise": -30.0, "tex": "dot"},
	"nature": {"a": Color(0.9, 1.0, 0.6), "b": Color(0.5, 0.85, 0.3), "c": Color(0.25, 0.45, 0.15), "rise": 0.0, "tex": "streak"},
	"steel": {"a": Color(1.0, 1.0, 1.0), "b": Color(1.0, 0.9, 0.55), "c": Color(0.7, 0.6, 0.4), "rise": 0.0, "tex": "streak"},
	"impact": {"a": Color(1.0, 0.95, 0.8), "b": Color(0.9, 0.7, 0.45), "c": Color(0.45, 0.35, 0.25), "rise": -10.0, "tex": "dot"},
	"arcane": {"a": Color(1.0, 1.0, 1.0), "b": Color(0.7, 0.8, 1.0), "c": Color(0.4, 0.4, 0.8), "rise": -20.0, "tex": "dot"},
}

static var _tex: Dictionary = {}


static func style_of(skill) -> String:
	if skill != null and skill.get("vfx") != null and STYLES.has(skill.vfx):
		return skill.vfx
	return "arcane"


static func colors(style: String) -> Dictionary:
	return STYLES.get(style, STYLES.arcane)


## 효과 그림 파일 (없으면 null)
static func art(style: String, part: String) -> Texture2D:
	return Art.texture("effects", "%s_%s" % [style, part])


# ---- 코드로 만드는 입자 그림 ----

static func tex(name: String) -> Texture2D:
	if _tex.has(name):
		return _tex[name]
	var s := 64
	var img := Image.create(s, s, false, Image.FORMAT_RGBA8)
	for y in s:
		for x in s:
			var p := (Vector2(x, y) + Vector2(0.5, 0.5)) / s * 2.0 - Vector2.ONE
			var a := 0.0
			match name:
				"dot":
					a = clampf(1.0 - p.length(), 0.0, 1.0)
					a = a * a
				"flame":
					var q := Vector2(p.x * 1.4, (p.y + 0.2) * (0.8 if p.y < -0.2 else 1.2))
					a = clampf(1.0 - q.length(), 0.0, 1.0)
					a = pow(a, 1.5)
				"shard":
					a = clampf(1.0 - (absf(p.x) * 2.2 + absf(p.y)), 0.0, 1.0)
					a = clampf(a * 2.5, 0.0, 1.0)
				"streak":
					a = clampf(1.0 - absf(p.y) * 6.0, 0.0, 1.0) * clampf(1.0 - absf(p.x), 0.0, 1.0)
				"star":
					var ax := absf(p.x)
					var ay := absf(p.y)
					a = maxf(clampf(1.0 - (ax * 6.0 + ay * 1.1), 0.0, 1.0), clampf(1.0 - (ay * 6.0 + ax * 1.1), 0.0, 1.0))
					a = maxf(a, pow(clampf(1.0 - p.length() * 2.2, 0.0, 1.0), 2.0))
				"ring":
					a = clampf(1.0 - absf(p.length() - 0.8) * 8.0, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a))
	var t := ImageTexture.create_from_image(img)
	_tex[name] = t
	return t


static func _ramp(style: String) -> Gradient:
	var c := colors(style)
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.35, 1.0])
	g.colors = PackedColorArray([Color(c.a, 1.0), Color(c.b, 0.9), Color(c.c, 0.0)])
	return g


static func _particles(style: String, amount: int, life: float) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	var c := colors(style)
	p.amount = maxi(1, amount)
	p.lifetime = life
	p.texture = tex(c.tex)
	p.color_ramp = _ramp(style)
	p.local_coords = false
	p.gravity = Vector2(0, c.rise)
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD if style != "dark" and style != "poison" else CanvasItemMaterial.BLEND_MODE_MIX
	p.material = mat
	return p


# ---- 터지는 효과 (범위 공격이 맞을 때) ----

var _kind := ""
var _radius := 50.0
var _style := "arcane"
var _life := 0.5
var _age := 0.0
var _to := Vector2.ZERO
var _width := 20.0
var _follow = null


## 원형 범위가 터질 때: 바닥 섬광 + 퍼지는 고리 + 입자
static func burst(parent_of: Node, pos: Vector2, radius: float, style: String) -> SkillFx:
	var fx := SkillFx.new()
	fx._kind = "burst"
	fx._radius = radius
	fx._style = style
	fx._life = 0.55
	Targeting.effects_parent(parent_of).add_child(fx)
	fx.global_position = pos
	var p := _particles(style, clampi(int(radius / 5.0), 12, 48), 0.6)
	p.one_shot = true
	p.explosiveness = 0.9
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = radius * 0.5
	p.direction = Vector2.UP
	p.spread = 180.0
	p.initial_velocity_min = radius * 0.6
	p.initial_velocity_max = radius * 1.6
	p.damping_min = radius * 1.2
	p.damping_max = radius * 2.0
	p.scale_amount_min = 0.25 + radius / 900.0
	p.scale_amount_max = 0.55 + radius / 500.0
	p.angle_min = 0.0
	p.angle_max = 360.0
	fx.add_child(p)
	p.emitting = true
	return fx


## 직선 범위가 터질 때: 밝은 띠 + 길을 따라 흩어지는 입자
static func line(parent_of: Node, a: Vector2, b: Vector2, width: float, style: String) -> SkillFx:
	var fx := SkillFx.new()
	fx._kind = "line"
	fx._to = b - a
	fx._width = width
	fx._style = style
	fx._life = 0.4
	Targeting.effects_parent(parent_of).add_child(fx)
	fx.global_position = a
	var len := fx._to.length()
	var p := _particles(style, clampi(int(len / 12.0), 10, 50), 0.5)
	p.one_shot = true
	p.explosiveness = 0.85
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(len * 0.5, width * 0.3)
	p.position = fx._to * 0.5
	p.rotation = fx._to.angle()
	p.direction = Vector2.RIGHT.rotated(fx._to.angle())
	p.spread = 35.0
	p.initial_velocity_min = 60.0
	p.initial_velocity_max = 180.0
	p.damping_min = 150.0
	p.damping_max = 250.0
	p.scale_amount_min = 0.3
	p.scale_amount_max = 0.6
	fx.add_child(p)
	p.emitting = true
	return fx


## 순간이동·소환 자리에서 잠깐 피어오르는 입자
static func puff(parent_of: Node, pos: Vector2, radius: float, style: String) -> SkillFx:
	var fx := burst(parent_of, pos, radius, style)
	fx._kind = "puff"
	return fx


## 유닛 위로 반짝이며 올라가는 입자 (치유·보호막·강화). 유닛 노드에 붙이지 않고 효과 층에서 유닛을 따라간다.
static func sparkle(unit: Node2D, style: String, amount := 14) -> void:
	if unit == null or not is_instance_valid(unit) or not unit.is_inside_tree():
		return
	var fx := SkillFx.new()
	fx._kind = "follow"
	fx._style = style
	fx._life = 0.9
	fx._follow = unit
	Targeting.effects_parent(unit).add_child(fx)
	fx.global_position = unit.global_position
	var p := _particles(style, amount, 0.9)
	p.one_shot = true
	p.explosiveness = 0.5
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 22.0
	p.direction = Vector2.UP
	p.spread = 25.0
	p.initial_velocity_min = 40.0
	p.initial_velocity_max = 90.0
	p.gravity = Vector2(0, -40)
	p.scale_amount_min = 0.25
	p.scale_amount_max = 0.45
	p.local_coords = true
	fx.add_child(p)
	p.emitting = true


## 계속 남는 범위(불바다·서리·화살비 등)에 붙이는 입자. 범위가 사라지면 같이 사라진다.
static func persistent(zone: Node2D, radius: float, style: String) -> CPUParticles2D:
	var c := colors(style)
	var p := _particles(style, clampi(int(radius / 4.0), 16, 60), 0.9)
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = radius * 0.9
	p.scale_amount_min = 0.25 + radius / 1200.0
	p.scale_amount_max = 0.5 + radius / 700.0
	match style:
		"nature", "steel":
			# 하늘에서 비스듬히 떨어지는 화살·칼날
			p.direction = Vector2(0.25, 1).normalized()
			p.spread = 4.0
			p.initial_velocity_min = 700.0
			p.initial_velocity_max = 900.0
			p.lifetime = 0.25
			p.position = Vector2(-60, -180)
			p.angle_min = 70.0
			p.angle_max = 76.0
		"ice":
			p.direction = Vector2.DOWN
			p.spread = 20.0
			p.initial_velocity_min = 20.0
			p.initial_velocity_max = 60.0
			p.angle_min = 0.0
			p.angle_max = 360.0
		_:
			p.direction = Vector2.UP
			p.spread = 30.0
			p.initial_velocity_min = 15.0
			p.initial_velocity_max = 50.0
			p.gravity = Vector2(0, c.rise)
	p.local_coords = false
	zone.add_child(p)
	p.emitting = true
	return p


## 바닥 무늬: 범위 안을 부드럽게 칠하고 테두리를 그린다 (그림 파일이 있으면 그 그림).
static func draw_ground(ci: CanvasItem, radius: float, style: String, alpha: float, t: float) -> void:
	var c := colors(style)
	var g := art(style, "ground")
	if g != null:
		ci.draw_set_transform(Vector2.ZERO, t * 0.4, Vector2.ONE)
		ci.draw_texture_rect(g, Rect2(-Vector2(radius, radius), Vector2(radius, radius) * 2.0), false, Color(1, 1, 1, alpha))
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		return
	ci.draw_texture_rect(tex("dot"), Rect2(-Vector2(radius, radius) * 1.15, Vector2(radius, radius) * 2.3), false, Color(c.b, 0.55 * alpha))
	ci.draw_circle(Vector2.ZERO, radius, Color(c.c, 0.18 * alpha))
	var pulse := 0.5 + 0.5 * sin(t * 6.0)
	ci.draw_arc(Vector2.ZERO, radius, 0, TAU, 56, Color(c.a, (0.55 + 0.3 * pulse) * alpha), 3.0)
	ci.draw_arc(Vector2.ZERO, radius * 0.8, t * 1.5, t * 1.5 + PI * 0.6, 24, Color(c.b, 0.6 * alpha), 2.0)
	ci.draw_arc(Vector2.ZERO, radius * 0.8, t * 1.5 + PI, t * 1.5 + PI * 1.6, 24, Color(c.b, 0.6 * alpha), 2.0)


func _process(delta: float) -> void:
	_age += delta
	if _follow != null:
		if is_instance_valid(_follow):
			global_position = _follow.global_position
		else:
			_follow = null
	queue_redraw()
	if _age >= _life:
		# 입자가 다 사라질 때까지 조금 더 둔다.
		if _age >= _life + 0.7:
			queue_free()


func _draw() -> void:
	var t := clampf(_age / _life, 0.0, 1.0)
	var c := colors(_style)
	if t >= 1.0:
		return
	match _kind:
		"burst", "puff":
			var img := art(_style, "burst")
			if img != null and _kind == "burst":
				var s := _radius * (0.8 + 0.5 * t) * 2.0
				draw_texture_rect(img, Rect2(-Vector2(s, s) * 0.5, Vector2(s, s)), false, Color(1, 1, 1, 1.0 - t * t))
				return
			var flash := 1.0 - t
			draw_texture_rect(tex("dot"), Rect2(-Vector2(_radius, _radius) * 1.3, Vector2(_radius, _radius) * 2.6), false, Color(c.a, 0.85 * flash * flash))
			draw_arc(Vector2.ZERO, _radius * (0.4 + 0.75 * t), 0, TAU, 56, Color(c.b, flash), 6.0 * flash + 1.0)
			draw_arc(Vector2.ZERO, _radius * (0.2 + 0.5 * t), 0, TAU, 40, Color(c.a, flash * 0.7), 3.0 * flash + 1.0)
		"line":
			var flash := 1.0 - t
			var n := _to.normalized().orthogonal()
			draw_line(Vector2.ZERO, _to, Color(c.b, 0.5 * flash), _width * (1.0 + t * 0.4))
			draw_line(Vector2.ZERO, _to, Color(c.a, 0.9 * flash), maxf(3.0, _width * 0.3 * flash))
			draw_line(n * _width * 0.5, _to + n * _width * 0.5, Color(c.a, 0.4 * flash), 2.0)
			draw_line(-n * _width * 0.5, _to - n * _width * 0.5, Color(c.a, 0.4 * flash), 2.0)
