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
	draw_rect(Rect2(Vector2(-WALL, -WALL), map.size + Vector2(WALL, WALL) * 2), Color(0.07, 0.08, 0.08))
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
	for c: CampData in map.camps:
		_draw_camp(c)
	_draw_decorations()
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var c := Enums.team_color(team)
		var pos := map.spawn_of(team)
		var dirt := Art.texture("map", "ground_dirt")
		if dirt != null:
			_draw_textured_circle(pos, cfg.fountain_radius * 1.35, dirt)
		draw_circle(pos, cfg.fountain_radius, Color(c, 0.1))
		_draw_object("base_fountain", pos, cfg.fountain_radius * 2.0)
		draw_arc(pos, cfg.fountain_radius, 0, TAU, 64, Color(c, 0.6), 4.0)
		var toward_edge := -1.0 if pos.x < map.size.x * 0.5 else 1.0
		_draw_object("shop", pos + Vector2(toward_edge * cfg.fountain_radius * 0.15, -cfg.fountain_radius * 0.95), 150.0)
	var wall := Art.texture("map", "wall_rock")
	for r in map.obstacles:
		draw_rect(r.grow(4), Color(0, 0, 0, 0.3))
		if wall != null:
			draw_texture_rect(wall, r, true)
			draw_rect(r, Color(0, 0, 0, 0.35), false, 3.0)
		else:
			draw_rect(r, map.obstacle_color)
			draw_rect(r, map.obstacle_color.lightened(0.25), false, 3.0)
	draw_rect(Rect2(Vector2.ZERO, map.size), Color(0.5, 0.45, 0.35), false, 6.0)


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
		_draw_textured_circle(c.position, cr * 1.25, floor_tex)
	if obj_tex != null:
		draw_texture_rect(obj_tex, Rect2(c.position - Vector2(cr, cr) * 1.15, Vector2(cr, cr) * 2.3), false)
	if floor_tex == null and obj_tex == null:
		draw_circle(c.position, cr, Color(0, 0, 0, 0.14))
		draw_arc(c.position, cr, 0, TAU, 48, Color(0.8, 0.5, 1.0, 0.35) if big else Color(1, 1, 1, 0.12), 2.0)


func _draw_object(id: String, center: Vector2, size: float) -> void:
	var tex := Art.texture("map", id)
	if tex != null:
		draw_texture_rect(tex, Rect2(center - Vector2(size, size) * 0.5, Vector2(size, size)), false)


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
	for id in ["tree_1", "tree_2", "bush", "rock_1", "rock_2", "crystal", "torch"]:
		if Art.has("map", id):
			ids.append(id)
	var out: Array = []
	if ids.is_empty():
		return out
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(map.id)
	var cfg := DataRegistry.combat_config()
	var tries := 0
	while out.size() < 46 and tries < 2000:
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
