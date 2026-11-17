class_name AttackIcon
## 공격 버튼 가운데 그림을 영웅마다 코드로 그린다 (그림 파일 없음).
## 총잡이는 리볼버 탄창: 쏠 때마다 총알이 하나씩 비고, 재장전하면 탄창이 돌며 채워진다.
## 고유 게이지가 있는 영웅은 버튼 둘레에 게이지(점 또는 고리)를 보여 준다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const OUTLINE := Color(0.08, 0.06, 0.06, 0.95)


## 영웅 id → 그림 종류
static func kind_of(h) -> String:
	if h.attack.magazine > 0:
		return "revolver"
	match h.data.id:
		"reaper": return "scythe"
		"mechanic": return "wrench"
		"ninja": return "shuriken"
		"assassin": return "daggers"
		"star_girl": return "star_wand"
		"summoner": return "book"
		"paladin": return "mace"
		"ki_master": return "ki_fist"
	match h.data.weapon:
		"sword": return "sword"
		"spear": return "spear"
		"bow": return "bow"
		"staff": return "staff"
		"fist": return "fist"
		"dagger": return "daggers"
	return "sword"


## 그림 파일(assets/attack/<영웅 id>.png)이 있으면 그 그림을, 없으면 코드로 그린 모양을 쓴다.
static func draw(ci: CanvasItem, h, c: Vector2, r: float) -> void:
	var col: Color = h.data.color
	var k := kind_of(h)
	if k == "revolver" and Art.has("attack", "revolver_cylinder") and Art.has("attack", "revolver_bullet"):
		_revolver_art(ci, h, c, r)
		if h.has_gauge():
			_gauge_ring(ci, h, c, r)
		return
	var tex := Art.texture("attack", h.data.id) if k != "revolver" else null
	if tex != null:
		var s := r * 1.55
		ci.draw_texture_rect(tex, Rect2(c - Vector2(s, s) * 0.5, Vector2(s, s)), false)
		if h.has_gauge():
			_gauge_ring(ci, h, c, r)
		return
	match k:
		"revolver": _revolver(ci, h, c, r)
		"sword": _sword(ci, c, r, Color(0.85, 0.9, 1.0), Color(1, 0.8, 0.3))
		"spear": _spear(ci, c, r, col)
		"scythe": _scythe(ci, c, r)
		"bow": _bow(ci, c, r)
		"staff": _staff(ci, c, r, _orb_color(h))
		"star_wand": _star_wand(ci, c, r)
		"fist": _fist(ci, c, r, Color(1, 0.8, 0.6), false)
		"ki_fist": _fist(ci, c, r, Color(1, 0.85, 0.55), true)
		"daggers": _daggers(ci, c, r)
		"shuriken": _shuriken(ci, c, r)
		"mace": _mace(ci, c, r)
		"book": _book(ci, c, r)
		"wrench": _wrench(ci, c, r)
	if h.has_gauge():
		_gauge_ring(ci, h, c, r)


static func _orb_color(h) -> Color:
	match h.data.id:
		"fire_mage": return Color(1, 0.5, 0.15)
		"frost_mage": return Color(0.6, 0.9, 1)
		"saint": return Color(1, 0.95, 0.6)
	return h.data.color.lightened(0.3)


# ---- 게이지 ----

static func _gauge_ring(ci: CanvasItem, h, c: Vector2, r: float) -> void:
	var gc: Color = h.data.gauge_color
	var rr := r + 6.0
	if h.data.gauge_pips:
		var n := int(h.data.gauge_max)
		for i in n:
			var a := -PI / 2.0 + (float(i) - (n - 1) / 2.0) * 0.42
			var p := c + Vector2.from_angle(a) * rr
			var on := i < int(floorf(h.gauge))
			ci.draw_circle(p, 7.0, OUTLINE)
			ci.draw_circle(p, 5.5, gc if on else Color(0.25, 0.25, 0.25))
			if on:
				ci.draw_circle(p - Vector2(1.5, 1.5), 2.0, Color(1, 1, 1, 0.7))
	else:
		var ratio: float = h.gauge_ratio()
		ci.draw_arc(c, rr, 0, TAU, 56, Color(0, 0, 0, 0.6), 7.0)
		if ratio > 0.0:
			var glow := 0.7 + 0.3 * sin(Time.get_ticks_msec() / 120.0) if ratio >= 0.999 else 1.0
			ci.draw_arc(c, rr, -PI / 2.0, -PI / 2.0 + TAU * ratio, 56, Color(gc, glow), 5.0)
		# 영혼처럼 쌓이는 수는 숫자로
		if h.data.gauge_decay <= 0.0:
			var t := str(int(h.gauge))
			var w := FONT.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
			var p2 := c + Vector2(r * 0.62, -r * 0.62)
			ci.draw_circle(p2, 13.0, OUTLINE)
			ci.draw_circle(p2, 11.0, gc.darkened(0.3))
			ci.draw_string(FONT, p2 + Vector2(-w * 0.5, 6), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.WHITE)


# ---- 총잡이: 리볼버 탄창 ----

static func _revolver(ci: CanvasItem, h, c: Vector2, r: float) -> void:
	var a = h.attack
	var n: int = a.magazine
	var cr := r * 0.66
	# 쏜 만큼 탄창이 돌아간다 (재장전 중에는 빙글빙글)
	var shots: int = n - a.ammo if not a.reloading else 0
	var spin := TAU / n * shots
	if a.reloading:
		spin = Time.get_ticks_msec() / 90.0
	ci.draw_circle(c + Vector2(2, 3), cr, Color(0, 0, 0, 0.4))
	ci.draw_circle(c, cr, OUTLINE)
	ci.draw_circle(c, cr - 3.0, Color(0.55, 0.57, 0.62))
	ci.draw_circle(c, cr - 9.0, Color(0.42, 0.44, 0.5))
	# 홈
	for i in n:
		var ga := spin + TAU * (i + 0.5) / n
		ci.draw_circle(c + Vector2.from_angle(ga) * (cr - 2.0), cr * 0.12, Color(0.3, 0.31, 0.36))
	# 약실과 총알
	for i in n:
		var ang := -PI / 2.0 + spin + TAU * i / n
		var p := c + Vector2.from_angle(ang) * cr * 0.55
		var loaded: bool = not a.reloading and i >= shots
		ci.draw_circle(p, cr * 0.2, OUTLINE)
		if loaded:
			var last: bool = i == n - 1
			ci.draw_circle(p, cr * 0.17, Color(1, 0.55, 0.2) if last else Color(0.86, 0.66, 0.3))
			ci.draw_circle(p, cr * 0.08, Color(0.65, 0.45, 0.2))
			ci.draw_circle(p - Vector2(cr * 0.05, cr * 0.05), cr * 0.04, Color(1, 0.95, 0.8, 0.9))
		else:
			ci.draw_circle(p, cr * 0.16, Color(0.08, 0.08, 0.1))
	ci.draw_circle(c, cr * 0.16, OUTLINE)
	ci.draw_circle(c, cr * 0.12, Color(0.7, 0.72, 0.78))
	if a.reloading:
		var t := "장전"
		var w := FONT.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
		ci.draw_string_outline(FONT, c + Vector2(-w * 0.5, r * 0.85), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, 4, OUTLINE)
		ci.draw_string(FONT, c + Vector2(-w * 0.5, r * 0.85), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(1, 0.85, 0.4))


# 탄창 그림(revolver_cylinder.png)에서 잰 약실 자리: 그림 반 너비에 대한 비율
const CHAMBER_DIST := 0.57
const CHAMBER_RADIUS := 0.23


## 그림으로 만든 리볼버 탄창: 탄창 그림을 쏜 만큼 돌리고, 남은 총알을 약실마다 그린다.
static func _revolver_art(ci: CanvasItem, h, c: Vector2, r: float) -> void:
	var a = h.attack
	var n: int = a.magazine
	var cyl := Art.texture("attack", "revolver_cylinder")
	var bul := Art.texture("attack", "revolver_bullet")
	var half := r * 0.86
	var shots: int = n - a.ammo if not a.reloading else 0
	var spin := TAU / n * shots
	if a.reloading:
		spin = Time.get_ticks_msec() / 90.0
	ci.draw_set_transform(c, spin, Vector2.ONE)
	ci.draw_texture_rect(cyl, Rect2(-Vector2(half, half), Vector2(half, half) * 2.0), false)
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	var br := half * CHAMBER_RADIUS * 0.98
	for i in n:
		if a.reloading or i < shots:
			continue
		var p := c + Vector2.from_angle(-PI / 2.0 + spin + TAU * i / n) * half * CHAMBER_DIST
		var tint := Color(1, 0.7, 0.45) if i == n - 1 else Color.WHITE  # 마지막 한 발은 붉게
		ci.draw_texture_rect(bul, Rect2(p - Vector2(br, br), Vector2(br, br) * 2.0), false, tint)
	if a.reloading:
		var t := "장전"
		var w := FONT.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
		ci.draw_string_outline(FONT, c + Vector2(-w * 0.5, r * 0.85), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, 4, OUTLINE)
		ci.draw_string(FONT, c + Vector2(-w * 0.5, r * 0.85), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(1, 0.85, 0.4))


# ---- 무기 그림 ----

static func _poly(ci: CanvasItem, pts: Array, fill: Color, width := 3.0) -> void:
	var p := PackedVector2Array(pts)
	ci.draw_colored_polygon(p, fill)
	p.append(p[0])
	ci.draw_polyline(p, OUTLINE, width)


static func _rot(c: Vector2, ang: float, pts: Array) -> Array:
	var out: Array = []
	for q in pts:
		out.append(c + (q as Vector2).rotated(ang))
	return out


static func _sword(ci: CanvasItem, c: Vector2, r: float, blade: Color, hilt: Color, ang := -PI / 4.0, s := 1.0) -> void:
	var L := r * 0.8 * s
	var W := r * 0.13 * s
	_poly(ci, _rot(c, ang, [Vector2(-L * 0.35, -W), Vector2(L * 0.75, -W), Vector2(L, 0), Vector2(L * 0.75, W), Vector2(-L * 0.35, W)]), blade)
	ci.draw_line(c + Vector2(-L * 0.3, 0).rotated(ang), c + Vector2(L * 0.85, 0).rotated(ang), Color(1, 1, 1, 0.6), 2.0)
	_poly(ci, _rot(c, ang, [Vector2(-L * 0.4, -W * 3), Vector2(-L * 0.32, -W * 3), Vector2(-L * 0.32, W * 3), Vector2(-L * 0.4, W * 3)]), hilt)
	_poly(ci, _rot(c, ang, [Vector2(-L * 0.75, -W * 0.7), Vector2(-L * 0.4, -W * 0.7), Vector2(-L * 0.4, W * 0.7), Vector2(-L * 0.75, W * 0.7)]), Color(0.45, 0.28, 0.15))
	ci.draw_circle(c + Vector2(-L * 0.8, 0).rotated(ang), W * 1.1, hilt)


static func _spear(ci: CanvasItem, c: Vector2, r: float, col: Color) -> void:
	var ang := -PI / 4.0
	var L := r * 0.85
	ci.draw_line(c + Vector2(-L, 0).rotated(ang), c + Vector2(L * 0.55, 0).rotated(ang), OUTLINE, 9.0)
	ci.draw_line(c + Vector2(-L, 0).rotated(ang), c + Vector2(L * 0.55, 0).rotated(ang), Color(0.55, 0.35, 0.2), 5.0)
	_poly(ci, _rot(c, ang, [Vector2(L * 0.45, -r * 0.16), Vector2(L, 0), Vector2(L * 0.45, r * 0.16), Vector2(L * 0.55, 0)]), Color(0.85, 0.88, 0.95))
	_poly(ci, _rot(c, ang, [Vector2(L * 0.38, -r * 0.1), Vector2(L * 0.48, 0), Vector2(L * 0.38, r * 0.1)]), col)


static func _scythe(ci: CanvasItem, c: Vector2, r: float) -> void:
	var top := c + Vector2(r * 0.3, -r * 0.62)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.72), top, OUTLINE, 10.0)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.72), top, Color(0.35, 0.22, 0.35), 6.0)
	# 초승달 모양 날: 바깥 호와 안쪽 호 사이
	var pts: Array = []
	var center := top + Vector2(-r * 0.42, r * 0.38)
	for i in 17:
		var a := -PI * 0.15 - PI * 0.75 * i / 16.0
		pts.append(center + Vector2.from_angle(a) * r * 0.62)
	for i in range(16, -1, -1):
		var a := -PI * 0.15 - PI * 0.75 * i / 16.0
		var t := float(i) / 16.0
		pts.append(center + Vector2(r * 0.12, r * 0.06) + Vector2.from_angle(a) * r * (0.62 - 0.28 * sin(t * PI) - 0.06))
	_poly(ci, pts, Color(0.78, 0.6, 1.0))
	ci.draw_circle(top, r * 0.09, Color(0.6, 0.3, 0.85))


static func _bow(ci: CanvasItem, c: Vector2, r: float) -> void:
	var pts := PackedVector2Array()
	for i in 21:
		var a := -PI * 0.42 + PI * 0.84 * i / 20.0
		pts.append(c + Vector2(-r * 0.2, 0) + Vector2(cos(a) * r * 0.5, sin(a) * r * 0.75))
	ci.draw_polyline(pts, OUTLINE, 9.0)
	ci.draw_polyline(pts, Color(0.55, 0.75, 0.3), 5.0)
	ci.draw_line(pts[0], pts[pts.size() - 1], Color(0.95, 0.95, 0.9), 2.0)
	_sword(ci, c + Vector2(r * 0.05, 0), r * 0.8, Color(0.9, 0.85, 0.7), Color(0.4, 0.8, 0.3), 0.0)


static func _staff(ci: CanvasItem, c: Vector2, r: float, orb: Color) -> void:
	var top := c + Vector2(r * 0.3, -r * 0.45)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.75), top, OUTLINE, 9.0)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.75), top, Color(0.5, 0.33, 0.2), 5.0)
	var pulse := 1.0 + 0.08 * sin(Time.get_ticks_msec() / 180.0)
	ci.draw_texture_rect(SkillFx.tex("dot"), Rect2(top - Vector2(r, r) * 0.55 * pulse, Vector2(r, r) * 1.1 * pulse), false, Color(orb, 0.8))
	ci.draw_circle(top, r * 0.22, OUTLINE)
	ci.draw_circle(top, r * 0.19, orb)
	ci.draw_circle(top - Vector2(r * 0.06, r * 0.06), r * 0.06, Color(1, 1, 1, 0.8))


static func _star_wand(ci: CanvasItem, c: Vector2, r: float) -> void:
	var top := c + Vector2(r * 0.25, -r * 0.4)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.7), top, OUTLINE, 8.0)
	ci.draw_line(c + Vector2(-r * 0.4, r * 0.7), top, Color(1, 0.75, 0.85), 4.0)
	var pts: Array = []
	var spin := Time.get_ticks_msec() / 800.0
	for i in 10:
		var rad := r * (0.36 if i % 2 == 0 else 0.15)
		pts.append(top + Vector2.from_angle(-PI / 2.0 + spin + TAU * i / 10.0) * rad)
	_poly(ci, pts, Color(1, 0.85, 0.35))


static func _fist(ci: CanvasItem, c: Vector2, r: float, skin: Color, glow: bool) -> void:
	if glow:
		var pulse := 1.0 + 0.1 * sin(Time.get_ticks_msec() / 150.0)
		ci.draw_texture_rect(SkillFx.tex("dot"), Rect2(c - Vector2(r, r) * 0.85 * pulse, Vector2(r, r) * 1.7 * pulse), false, Color(1, 0.8, 0.25, 0.85))
	var box := Rect2(c - Vector2(r * 0.42, r * 0.3), Vector2(r * 0.84, r * 0.62))
	var sb := StyleBoxFlat.new()
	sb.bg_color = skin
	sb.border_color = OUTLINE
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(int(r * 0.18))
	ci.draw_style_box(sb, box)
	for i in 3:
		var x := box.position.x + box.size.x * (0.3 + i * 0.22)
		ci.draw_line(Vector2(x, box.position.y + 4), Vector2(x, box.position.y + box.size.y * 0.45), Color(OUTLINE, 0.7), 2.5)
	var thumb := Rect2(box.position + Vector2(-r * 0.08, box.size.y * 0.45), Vector2(r * 0.42, r * 0.24))
	var sb2 := sb.duplicate()
	sb2.set_corner_radius_all(int(r * 0.1))
	ci.draw_style_box(sb2, thumb)
	# 손목 붕대
	ci.draw_rect(Rect2(box.position + Vector2(box.size.x * 0.2, box.size.y), Vector2(box.size.x * 0.6, r * 0.22)), Color(0.95, 0.92, 0.85))
	ci.draw_rect(Rect2(box.position + Vector2(box.size.x * 0.2, box.size.y), Vector2(box.size.x * 0.6, r * 0.22)), OUTLINE, false, 2.5)


static func _daggers(ci: CanvasItem, c: Vector2, r: float) -> void:
	_sword(ci, c + Vector2(-r * 0.08, 0), r * 0.75, Color(0.8, 0.82, 0.9), Color(0.55, 0.3, 0.7), -PI / 4.0)
	_sword(ci, c + Vector2(r * 0.08, 0), r * 0.75, Color(0.8, 0.82, 0.9), Color(0.55, 0.3, 0.7), -PI * 3.0 / 4.0)


static func _shuriken(ci: CanvasItem, c: Vector2, r: float) -> void:
	var spin := Time.get_ticks_msec() / 400.0
	var pts: Array = []
	for i in 8:
		var rad := r * (0.62 if i % 2 == 0 else 0.2)
		pts.append(c + Vector2.from_angle(spin + TAU * i / 8.0) * rad)
	_poly(ci, pts, Color(0.72, 0.75, 0.82))
	ci.draw_circle(c, r * 0.1, OUTLINE)
	ci.draw_circle(c, r * 0.06, Color(0.3, 0.3, 0.4))


static func _mace(ci: CanvasItem, c: Vector2, r: float) -> void:
	# 뒤에 둥근 방패, 앞에 철퇴
	ci.draw_circle(c + Vector2(-r * 0.15, r * 0.05), r * 0.5, OUTLINE)
	ci.draw_circle(c + Vector2(-r * 0.15, r * 0.05), r * 0.46, Color(0.9, 0.75, 0.3))
	ci.draw_circle(c + Vector2(-r * 0.15, r * 0.05), r * 0.2, Color(1, 0.9, 0.5))
	var head := c + Vector2(r * 0.35, -r * 0.4)
	ci.draw_line(c + Vector2(-r * 0.1, r * 0.55), head, OUTLINE, 8.0)
	ci.draw_line(c + Vector2(-r * 0.1, r * 0.55), head, Color(0.55, 0.4, 0.25), 4.0)
	for i in 6:
		var p := head + Vector2.from_angle(TAU * i / 6.0) * r * 0.2
		ci.draw_line(head, p, OUTLINE, 5.0)
	ci.draw_circle(head, r * 0.17, OUTLINE)
	ci.draw_circle(head, r * 0.14, Color(0.75, 0.75, 0.8))


static func _book(ci: CanvasItem, c: Vector2, r: float) -> void:
	_poly(ci, [c + Vector2(-r * 0.55, -r * 0.35), c + Vector2(0, -r * 0.25), c + Vector2(0, r * 0.45), c + Vector2(-r * 0.55, r * 0.35)], Color(0.4, 0.25, 0.5))
	_poly(ci, [c + Vector2(r * 0.55, -r * 0.35), c + Vector2(0, -r * 0.25), c + Vector2(0, r * 0.45), c + Vector2(r * 0.55, r * 0.35)], Color(0.48, 0.3, 0.6))
	var pulse := 0.6 + 0.4 * sin(Time.get_ticks_msec() / 200.0)
	ci.draw_texture_rect(SkillFx.tex("dot"), Rect2(c + Vector2(-r * 0.4, -r * 0.75), Vector2(r * 0.8, r * 0.7)), false, Color(0.7, 0.4, 1, 0.8 * pulse))
	ci.draw_circle(c + Vector2(0, -r * 0.42), r * 0.1, Color(0.85, 0.6, 1))


static func _wrench(ci: CanvasItem, c: Vector2, r: float) -> void:
	var ang := -PI / 4.0
	_poly(ci, _rot(c, ang, [Vector2(-r * 0.6, -r * 0.09), Vector2(r * 0.35, -r * 0.09), Vector2(r * 0.35, r * 0.09), Vector2(-r * 0.6, r * 0.09)]), Color(0.7, 0.75, 0.8))
	var head := c + Vector2(r * 0.45, 0).rotated(ang)
	ci.draw_circle(head, r * 0.25, OUTLINE)
	ci.draw_circle(head, r * 0.21, Color(0.72, 0.77, 0.82))
	_poly(ci, _rot(head, ang, [Vector2(0, -r * 0.08), Vector2(r * 0.3, -r * 0.1), Vector2(r * 0.3, r * 0.1), Vector2(0, r * 0.08)]), Color(0.25, 0.2, 0.2))
	ci.draw_circle(c + Vector2(-r * 0.6, 0).rotated(ang), r * 0.13, Color(0.35, 0.8, 0.85))
