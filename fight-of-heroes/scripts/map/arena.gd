class_name Arena
extends Node2D
## MapData 로 맵을 만든다: 바깥 벽, 장애물 충돌체, 길찾기 영역(실행 중에 굽는다), 바닥 그림.

const WALL := 120.0

var map: MapData
var nav_region: NavigationRegion2D


func build(map_data: MapData) -> void:
	map = map_data
	var bounds := Rect2(Vector2.ZERO, map.size)
	_add_block(Rect2(-WALL, -WALL, map.size.x + WALL * 2, WALL))
	_add_block(Rect2(-WALL, map.size.y, map.size.x + WALL * 2, WALL))
	_add_block(Rect2(-WALL, 0, WALL, map.size.y))
	_add_block(Rect2(map.size.x, 0, WALL, map.size.y))
	for r in map.obstacles:
		_add_block(r)
	_bake_navigation(bounds)
	queue_redraw()


func _add_block(r: Rect2) -> void:
	var body := StaticBody2D.new()
	body.collision_layer = 1
	body.collision_mask = 0
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = r.size
	shape.shape = rect
	shape.position = r.get_center()
	body.add_child(shape)
	add_child(body)


func _bake_navigation(bounds: Rect2) -> void:
	nav_region = NavigationRegion2D.new()
	add_child(nav_region)
	var poly := NavigationPolygon.new()
	poly.agent_radius = 18.0
	var src := NavigationMeshSourceGeometryData2D.new()
	src.add_traversable_outline(_rect_points(bounds))
	for r in map.obstacles:
		src.add_obstruction_outline(_rect_points(r))
	NavigationServer2D.bake_from_source_geometry_data(poly, src)
	nav_region.navigation_polygon = poly


static func _rect_points(r: Rect2) -> PackedVector2Array:
	return PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y)])


func _draw() -> void:
	if map == null:
		return
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	draw_rect(Rect2(Vector2(-WALL, -WALL), map.size + Vector2(WALL, WALL) * 2), Color(0.04, 0.05, 0.04))
	var ground := Art.texture("map", "ground_grass")
	if ground != null:
		draw_texture_rect(ground, Rect2(Vector2.ZERO, map.size), true)
	else:
		draw_rect(Rect2(Vector2.ZERO, map.size), map.ground_color)
		var grid := Color(1, 1, 1, 0.04)
		var x := 0.0
		while x <= map.size.x:
			draw_line(Vector2(x, 0), Vector2(x, map.size.y), grid, 1.0)
			x += 100.0
		var y := 0.0
		while y <= map.size.y:
			draw_line(Vector2(0, y), Vector2(map.size.x, y), grid, 1.0)
			y += 100.0
	var cfg := DataRegistry.combat_config()
	var lava := Art.texture("map", "ground_lava")
	for r in map.lava_areas:
		# 가장자리는 풀밭과 섞이도록 고르지 않게 흐려진다.
		_draw_soft_rect(r, 70.0, lava, Color.WHITE if lava != null else Color(0.3, 0.12, 0.08))
	for c: CampData in map.camps:
		_draw_camp(c)
	_draw_decorations()
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var c := Enums.team_color(team)
		var pos := map.spawn_of(team)
		var dirt := Art.texture("map", "ground_dirt")
		if dirt != null:
			_draw_soft_circle(pos, cfg.fountain_radius * 1.35, 60.0, dirt, Color.WHITE)
		if not _draw_object("base_fountain", pos, cfg.fountain_radius * 1.6):
			_draw_plain_fountain(pos, cfg.fountain_radius, c)
		draw_arc(pos, cfg.fountain_radius, 0, TAU, 64, Color(c, 0.6), 4.0)
		var toward_edge := -1.0 if pos.x < map.size.x * 0.5 else 1.0
		var shop_pos := pos + Vector2(toward_edge * cfg.fountain_radius * 0.15, -cfg.fountain_radius * 0.95)
		if not _draw_object("shop", shop_pos, 150.0):
			_draw_plain_shop(shop_pos)
	var wall := Art.texture("map", "wall_rock")
	for r in map.obstacles:
		# 벽 둘레에 부드러운 그림자를 깔아 바닥과 자연스럽게 이어지게 한다.
		_draw_soft_rect(r.grow(6), 34.0, null, Color(0.05, 0.05, 0.03, 0.35))
		if wall != null:
			draw_texture_rect(wall, r, true)
			draw_rect(r, Color(0, 0, 0, 0.35), false, 3.0)
		else:
			_draw_plain_rock(r)
	_draw_edge_shade()


## 캠프 자리: 종류에 따라 바닥 무늬와 장식을 고른다. 그림이 없으면 반투명 원.
func _draw_camp(c: CampData) -> void:
	var big := c.is_final_boss or c.first_spawn >= 120.0
	var cr := 150.0 if c.is_final_boss else (110.0 if big else 70.0)
	var first: String = c.monsters[0] if not c.monsters.is_empty() else ""
	var floor_id := "ground_dungeon"
	var obj := "camp_ring"
	if c.wave_interval > 0.0:
		floor_id = "ground_stone"
		obj = "center_stage"
		cr = 190.0
	elif first == "lava_giant":
		floor_id = "ground_lava"
		obj = "boss_altar"
	elif first == "forest_guardian":
		floor_id = "ground_forest"
		obj = "boss_altar"
	elif c.is_final_boss:
		obj = "boss_altar"
	var floor_tex := Art.texture("map", floor_id)
	var obj_tex := Art.texture("map", obj)
	if floor_tex != null:
		_draw_soft_circle(c.position, cr * 1.25, cr * 0.45, floor_tex, Color.WHITE)
	if obj_tex != null:
		draw_texture_rect(obj_tex, Rect2(c.position - Vector2(cr, cr) * 1.15, Vector2(cr, cr) * 2.3), false)
	if floor_tex == null and obj_tex == null:
		draw_circle(c.position, cr, Color(0, 0, 0, 0.14))
		draw_arc(c.position, cr, 0, TAU, 48, Color(0.8, 0.5, 1.0, 0.35) if big else Color(1, 1, 1, 0.12), 2.0)


func _draw_object(id: String, center: Vector2, size: float) -> bool:
	var tex := Art.texture("map", id)
	if tex != null:
		draw_texture_rect(tex, Rect2(center - Vector2(size, size) * 0.5, Vector2(size, size)), false)
		return true
	return false


# ---- 그림이 없을 때 쓰는 모양 (그림과 비슷한 밝은 색감, 굵은 외곽선) ----

const OUTLINE := Color(0.16, 0.13, 0.12)


## 바위 벽: 그림자, 옆면(어두움), 윗면(밝음), 돌 조각, 이끼. 벽마다 정해진 무늬.
func _draw_plain_rock(r: Rect2) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector4(r.position.x, r.position.y, r.size.x, r.size.y))
	var side := minf(14.0, r.size.y * 0.25)
	_round_box(Rect2(r.position + Vector2(6, 10), r.size), Color(0, 0, 0, 0.28), Color(0, 0, 0, 0), 0.0)
	_round_box(r, Color(0.36, 0.32, 0.29), OUTLINE, 3.0)
	var top := Rect2(r.position + Vector2(3, 3), r.size - Vector2(6, 6 + side))
	_round_box(top, Color(0.56, 0.52, 0.46), Color(0, 0, 0, 0), 0.0)
	# 돌 조각
	var n := int(clampf(r.get_area() / 2600.0, 3.0, 60.0))
	for i in n:
		var p := Vector2(rng.randf_range(top.position.x + 10.0, top.end.x - 10.0), rng.randf_range(top.position.y + 8.0, top.end.y - 8.0))
		var rad := rng.randf_range(5.0, minf(16.0, minf(top.size.x, top.size.y) * 0.3))
		var tone := rng.randf_range(-0.08, 0.06)
		draw_set_transform(p, rng.randf_range(0.0, PI), Vector2(1.0, rng.randf_range(0.55, 0.85)))
		draw_circle(Vector2.ZERO, rad, Color(0.6 + tone, 0.56 + tone, 0.5 + tone))
		draw_arc(Vector2.ZERO, rad, PI * 0.1, PI * 1.1, 10, Color(0.3, 0.27, 0.25, 0.8), 1.5)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# 이끼
	for i in int(clampf(r.size.x / 90.0, 1.0, 8.0)):
		var mp := Vector2(rng.randf_range(r.position.x + 8.0, r.end.x - 8.0), top.position.y + rng.randf_range(0.0, 6.0))
		draw_set_transform(mp, 0.0, Vector2(1.0, 0.5))
		draw_circle(Vector2.ZERO, rng.randf_range(6.0, 13.0), Color(0.38, 0.55, 0.25, 0.9))
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _round_box(r: Rect2, fill: Color, border: Color, width: float) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(int(width))
	sb.set_corner_radius_all(int(clampf(minf(r.size.x, r.size.y) * 0.3, 2.0, 14.0)))
	sb.anti_aliasing = true
	draw_style_box(sb, r)


## 기지: 돌 광장, 계단 고리, 가운데 팀 색 수정
func _draw_plain_fountain(pos: Vector2, radius: float, team_c: Color) -> void:
	draw_circle(pos + Vector2(0, 8), radius * 0.62, Color(0, 0, 0, 0.2))
	draw_circle(pos, radius * 0.62, Color(0.72, 0.69, 0.63))
	draw_arc(pos, radius * 0.62, 0, TAU, 48, OUTLINE, 3.0)
	draw_arc(pos, radius * 0.5, 0, TAU, 48, Color(0.55, 0.52, 0.47), 3.0)
	draw_circle(pos, radius * 0.3, Color(0.45, 0.65, 0.85))
	draw_arc(pos, radius * 0.3, 0, TAU, 40, OUTLINE, 3.0)
	var h := radius * 0.22
	var pts := PackedVector2Array([pos + Vector2(0, -h * 1.6), pos + Vector2(h * 0.6, -h * 0.2), pos + Vector2(0, h * 0.5), pos + Vector2(-h * 0.6, -h * 0.2)])
	draw_colored_polygon(pts, team_c.lightened(0.3))
	pts.append(pts[0])
	draw_polyline(pts, OUTLINE, 2.5)
	draw_line(pos + Vector2(0, -h * 1.6), pos + Vector2(0, h * 0.5), Color(1, 1, 1, 0.5), 2.0)


## 상점: 줄무늬 천막과 상자
func _draw_plain_shop(pos: Vector2) -> void:
	var w := 92.0
	var h := 40.0
	_round_box(Rect2(pos + Vector2(-w * 0.5 + 6, -4 + 8), Vector2(w, h)), Color(0, 0, 0, 0.25), Color(0, 0, 0, 0), 0.0)
	_round_box(Rect2(pos + Vector2(-w * 0.5, -4), Vector2(w, h)), Color(0.55, 0.38, 0.22), OUTLINE, 3.0)
	var top := pos.y - 34.0
	for i in 4:
		var x0 := pos.x - w * 0.5 - 6.0 + i * (w + 12.0) / 4.0
		var x1 := x0 + (w + 12.0) / 4.0
		var poly := PackedVector2Array([Vector2(x0, top), Vector2(x1, top), Vector2(x1, pos.y), Vector2(x0, pos.y)])
		draw_colored_polygon(poly, Color(0.9, 0.3, 0.25) if i % 2 == 0 else Color(0.96, 0.92, 0.82))
	draw_rect(Rect2(pos.x - w * 0.5 - 6.0, top, w + 12.0, 34.0), OUTLINE, false, 3.0)
	for i in 2:
		var cx := pos.x - 22.0 + i * 30.0
		_round_box(Rect2(cx, pos.y + 6.0, 18.0, 16.0), Color(0.7, 0.5, 0.3), OUTLINE, 2.0)
	draw_circle(pos + Vector2(34, 16), 7.0, Color(0.85, 0.25, 0.25))
	draw_arc(pos + Vector2(34, 16), 7.0, 0, TAU, 16, OUTLINE, 2.0)


# ---- 부드러운 경계 (디졸브) ----
# 안쪽은 그대로 칠하고, 바깥 띠는 점마다 투명도가 1 → 0 으로 줄어든다.
# 띠의 바깥 끝은 위치에 따라 들쭉날쭉해서 반듯한 선으로 보이지 않는다.

## 위치마다 정해진 0.45~1.0 사이 값 (가장자리를 들쭉날쭉하게)
static func _wobble(p: Vector2) -> float:
	var v := sin(p.x * 0.021 + p.y * 0.013) * 0.5 + sin(p.x * 0.047 - p.y * 0.031 + 1.7) * 0.3 + sin(p.y * 0.083 + p.x * 0.011 + 4.1) * 0.2
	return 0.72 + 0.28 * v


## inner[i] 와 outer[i] 가 짝인 띠를 그린다 (안쪽 불투명, 바깥 투명).
func _draw_feather(inner: PackedVector2Array, outer: PackedVector2Array, tex: Texture2D, tint: Color) -> void:
	var n := inner.size()
	var ts := Vector2(tex.get_width(), tex.get_height()) if tex != null else Vector2.ONE
	var clear := Color(tint, 0.0)
	for i in n:
		var j := (i + 1) % n
		# 삼각형 두 개로 그린다 (모서리에서는 안쪽 점이 겹쳐 사각형이 찌그러지므로).
		_tri(inner[i], inner[j], outer[j], tint, tint, clear, tex, ts)
		_tri(inner[i], outer[j], outer[i], tint, clear, clear, tex, ts)


func _tri(a: Vector2, b: Vector2, c: Vector2, ca: Color, cb: Color, cc: Color, tex: Texture2D, ts: Vector2) -> void:
	if a.is_equal_approx(b) or b.is_equal_approx(c) or a.is_equal_approx(c):
		return
	var pts := PackedVector2Array([a, b, c])
	var cols := PackedColorArray([ca, cb, cc])
	if tex != null:
		draw_primitive(pts, cols, PackedVector2Array([a / ts, b / ts, c / ts]), tex)
	else:
		draw_primitive(pts, cols, PackedVector2Array())


func _fill(pts: PackedVector2Array, tex: Texture2D, tint: Color) -> void:
	if tex != null:
		var ts := Vector2(tex.get_width(), tex.get_height())
		var uvs := PackedVector2Array()
		for p in pts:
			uvs.append(p / ts)
		draw_colored_polygon(pts, tint, uvs, tex)
	else:
		draw_colored_polygon(pts, tint)


## 가장자리가 흐려지는 원. radius 는 흐림 띠의 가운데쯤이다.
func _draw_soft_circle(center: Vector2, radius: float, feather: float, tex: Texture2D, tint: Color) -> void:
	var n := 48
	var inner := PackedVector2Array()
	var outer := PackedVector2Array()
	for i in n:
		var d := Vector2.from_angle(TAU * i / n)
		inner.append(center + d * maxf(4.0, radius - feather * 0.5))
		var p := center + d * radius
		outer.append(center + d * (radius + feather * _wobble(p)))
	_fill(inner, tex, tint)
	_draw_feather(inner, outer, tex, tint)


## 가장자리가 흐려지는 사각형 (모서리는 둥글게 퍼진다).
func _draw_soft_rect(r: Rect2, feather: float, tex: Texture2D, tint: Color) -> void:
	# 맵 끝에 붙은 변은 흐리지 않는다: 그 변을 밖으로 늘린 뒤 맵 안으로 잘라 낸다.
	var m := Rect2(Vector2.ZERO, map.size)
	if r.position.x <= 1.0: r = r.grow_side(SIDE_LEFT, feather * 2.0)
	if r.position.y <= 1.0: r = r.grow_side(SIDE_TOP, feather * 2.0)
	if r.end.x >= m.end.x - 1.0: r = r.grow_side(SIDE_RIGHT, feather * 2.0)
	if r.end.y >= m.end.y - 1.0: r = r.grow_side(SIDE_BOTTOM, feather * 2.0)
	var f := minf(feather * 0.5, minf(r.size.x, r.size.y) * 0.45)
	var core := r.grow(-f)
	var inner := PackedVector2Array()
	var outer := PackedVector2Array()
	var step := 48.0
	var corners := [core.position, Vector2(core.end.x, core.position.y), core.end, Vector2(core.position.x, core.end.y)]
	var normals := [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT]
	for k in 4:
		var a: Vector2 = corners[k]
		var b: Vector2 = corners[(k + 1) % 4]
		var cnt := maxi(1, int(a.distance_to(b) / step))
		for i in cnt:
			var p := a.lerp(b, float(i) / cnt)
			var nrm: Vector2 = normals[k]
			if i == 0:
				# 모서리: 앞 변과 이 변의 바깥 방향 사이를 부채꼴로 채운다.
				var prev: Vector2 = normals[(k + 3) % 4]
				for s in 4:
					var dn := prev.slerp(nrm, s / 4.0).normalized()
					inner.append(p)
					outer.append(p + dn * (f + feather * _wobble(p + dn * 50.0)))
				continue
			inner.append(p)
			outer.append(p + nrm * (f + feather * _wobble(p)))
	core = core.intersection(m)
	for i in inner.size():
		inner[i] = inner[i].clamp(m.position, m.end)
		outer[i] = outer[i].clamp(m.position, m.end)
	if core.has_area():
		_fill(PackedVector2Array([core.position, Vector2(core.end.x, core.position.y), core.end, Vector2(core.position.x, core.end.y)]), tex, tint)
	_draw_feather(inner, outer, tex, tint)


## 맵 가장자리: 반듯한 테두리 대신 안쪽으로 어둡게 흐려진다.
func _draw_edge_shade() -> void:
	var w := 200.0
	var dark := Color(0.04, 0.05, 0.04, 0.95)
	var clear := Color(dark, 0.0)
	var s := map.size
	var bands := [
		[Vector2(0, 0), Vector2(s.x, 0), Vector2(s.x - w, w), Vector2(w, w)],
		[Vector2(s.x, 0), Vector2(s.x, s.y), Vector2(s.x - w, s.y - w), Vector2(s.x - w, w)],
		[Vector2(s.x, s.y), Vector2(0, s.y), Vector2(w, s.y - w), Vector2(s.x - w, s.y - w)],
		[Vector2(0, s.y), Vector2(0, 0), Vector2(w, w), Vector2(w, s.y - w)],
	]
	for b in bands:
		draw_polygon(PackedVector2Array(b), PackedColorArray([dark, dark, clear, clear]))


## 반복 무늬로 채운 원 (무늬는 맵 좌표에 맞춰 이어진다)
func _draw_textured_circle(center: Vector2, radius: float, tex: Texture2D) -> void:
	var pts := PackedVector2Array()
	var uvs := PackedVector2Array()
	var ts := Vector2(tex.get_width(), tex.get_height())
	for i in 40:
		var p := center + Vector2.from_angle(TAU * i / 40.0) * radius
		pts.append(p)
		uvs.append(p / ts)
	draw_colored_polygon(pts, Color.WHITE, uvs, tex)


## 장식(나무·바위 등): 그림이 있을 때만, 맵 id 로 정한 같은 자리에 흩어 놓는다. 충돌은 없다.
func decoration_spots() -> Array:
	var ids: Array = []
	for id in ["tree_1", "tree_2", "bush", "rock_1", "rock_2", "crystal", "torch", "pillar", "barrel", "crate"]:
		if Art.has("map", id):
			ids.append(id)
	var out: Array = []
	if ids.is_empty():
		return out
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(map.id)
	var cfg := DataRegistry.combat_config()
	var tries := 0
	var want := int(46.0 * map.size.x * map.size.y / (4200.0 * 2600.0))
	while out.size() < want and tries < 4000:
		tries += 1
		var p := Vector2(rng.randf_range(60.0, map.size.x - 60.0), rng.randf_range(60.0, map.size.y - 60.0))
		if not _deco_free(p, cfg, out):
			continue
		var id: String = ids[rng.randi() % ids.size()]
		var size := rng.randf_range(90.0, 140.0) if id.begins_with("tree") else rng.randf_range(50.0, 80.0)
		out.append({"id": id, "pos": p, "size": size})
	return out


func _deco_free(p: Vector2, cfg: CombatConfig, placed: Array) -> bool:
	for r in map.obstacles:
		if r.grow(70.0).has_point(p):
			return false
	for r in map.lava_areas:
		if r.has_point(p):
			return false
	for c: CampData in map.camps:
		if p.distance_to(c.position) < 300.0:
			return false
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		if p.distance_to(map.spawn_of(team)) < cfg.fountain_radius + 220.0:
			return false
	for d in placed:
		if p.distance_to(d.pos) < 160.0:
			return false
	return true


var _decorations = null


func _draw_decorations() -> void:
	if _decorations == null:
		_decorations = decoration_spots()
	for d in _decorations:
		_draw_object(d.id, d.pos, d.size)
