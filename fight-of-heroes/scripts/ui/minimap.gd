class_name Minimap
extends Control
## 미니맵: 지형, 우물, 영웅 위치(팀 색), 현재 카메라가 보는 범위.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var map: MapData
var hero_manager: HeroManager
var player = null
var camera: Camera2D


func setup(map_data: MapData, hm: HeroManager, player_hero, cam: Camera2D) -> void:
	map = map_data
	hero_manager = hm
	player = player_hero
	camera = cam
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_delta: float) -> void:
	queue_redraw()


func _to_mini(p: Vector2) -> Vector2:
	return p / map.size * size


func _draw() -> void:
	if map == null:
		return
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.55))
	draw_rect(Rect2(Vector2.ZERO, size), Color(map.ground_color, 0.7))
	for r in map.obstacles:
		draw_rect(Rect2(_to_mini(r.position), r.size / map.size * size), Color(map.obstacle_color.lightened(0.2), 0.9))
	var fr: float = DataRegistry.combat_config().fountain_radius / map.size.x * size.x
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		draw_circle(_to_mini(map.spawn_of(team)), fr, Color(Enums.team_color(team), 0.25))
	if camera != null:
		var vp := camera.get_viewport_rect().size / camera.zoom
		var r := Rect2(camera.get_screen_center_position() - vp * 0.5, vp)
		draw_rect(Rect2(_to_mini(r.position), r.size / map.size * size), Color(1, 1, 1, 0.6), false, 1.5)
	_draw_fog()
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.is_dead or not FogOfWar.can_see(m):
			continue
		var mp := _to_mini(m.global_position)
		if m.is_boss():
			draw_circle(mp, 7.0, Color(0, 0, 0, 0.6))
			draw_circle(mp, 5.5, Color(0.8, 0.45, 1.0))
		else:
			draw_circle(mp, 2.5, Color(0.9, 0.85, 0.6, 0.9))
	if hero_manager != null:
		for h: Hero in hero_manager.heroes:
			var p := _to_mini(h.global_position)
			var c := Enums.team_color(h.team)
			if h.is_dead:
				if h.team == UnitVisual.viewer_team:
					draw_circle(p, 3.0, Color(c, 0.3))
				continue
			if not FogOfWar.can_see(h):
				continue
			if h == player:
				draw_circle(p, 6.5, Color(1, 0.95, 0.4))
			draw_circle(p, 5.0, c)
	draw_rect(Rect2(Vector2.ZERO, size), Color(1, 1, 1, 0.35), false, 1.5)


## 미니맵에도 안개를 어둡게 칠한다 (칸을 몇 개씩 묶어 그린다).
func _draw_fog() -> void:
	var fog: FogOfWar = FogOfWar.current
	if fog == null or fog.viewer_team < 0:
		return
	var step := 2
	var cw: float = size.x / fog.cols * step
	var ch: float = size.y / fog.rows * step
	for y in range(0, fog.rows, step):
		for x in range(0, fog.cols, step):
			var b: float = fog.reveal[y * fog.cols + x]
			if b < 1.0:
				draw_rect(Rect2(x * size.x / fog.cols, y * size.y / fog.rows, cw + 0.5, ch + 0.5), Color(0, 0, 0, 0.6 * (1.0 - b)))
