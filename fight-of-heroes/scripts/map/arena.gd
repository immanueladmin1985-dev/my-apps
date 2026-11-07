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
	draw_rect(Rect2(Vector2(-WALL, -WALL), map.size + Vector2(WALL, WALL) * 2), Color(0.07, 0.08, 0.08))
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
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var c := Enums.team_color(team)
		draw_circle(map.spawn_of(team), cfg.fountain_radius, Color(c, 0.1))
		draw_arc(map.spawn_of(team), cfg.fountain_radius, 0, TAU, 64, Color(c, 0.5), 3.0)
	for r in map.obstacles:
		draw_rect(r.grow(4), Color(0, 0, 0, 0.3))
		draw_rect(r, map.obstacle_color)
		draw_rect(r, map.obstacle_color.lightened(0.25), false, 3.0)
	draw_rect(Rect2(Vector2.ZERO, map.size), Color(0.5, 0.45, 0.35), false, 6.0)
