class_name Minimap
extends Control
## 미니맵: 지형, 우물, 영웅 위치(팀 색), 현재 카메라가 보는 범위.
## 누르거나 끌면 그 자리를 보라고 알린다(look_requested). 손을 떼면 look_released.

signal look_requested(world_pos: Vector2)
signal look_released

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

var map: MapData
var hero_manager: HeroManager
var player = null
var camera: Camera2D
var ai_manager = null
var _finger := -1


func setup(map_data: MapData, hm: HeroManager, player_hero, cam: Camera2D) -> void:
	map = map_data
	hero_manager = hm
	player = player_hero
	camera = cam
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_delta: float) -> void:
	queue_redraw()


## 다른 손가락으로 조이스틱을 잡고 있어도 쓸 수 있게 화면 터치를 직접 받는다.
func _input(event: InputEvent) -> void:
	if map == null or not is_visible_in_tree():
		return
	if event is InputEventScreenTouch and event.pressed:
		var hud_node = get_tree().get_first_node_in_group("hud")
		if get_tree().paused or (hud_node != null and hud_node.shop_open):
			return
	if event is InputEventScreenTouch:
		if event.pressed and _finger < 0 and get_global_rect().has_point(event.position):
			var hud_node = get_tree().get_first_node_in_group("hud")
			if hud_node != null and hud_node.ping_mode != "":
				# 신호를 찍는 중이면 카메라를 옮기지 않고 그 자리에 신호를 찍는다.
				hud_node.place_ping(to_world(event.position))
				get_viewport().set_input_as_handled()
				return
			_finger = event.index
			look_requested.emit(to_world(event.position))
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _finger:
			_finger = -1
			look_released.emit()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == _finger:
		look_requested.emit(to_world(event.position))
		get_viewport().set_input_as_handled()


## 화면 좌표(미니맵 위) → 맵 좌표
func to_world(screen_pos: Vector2) -> Vector2:
	var local := (screen_pos - get_global_rect().position) / get_global_rect().size
	return (local.clamp(Vector2.ZERO, Vector2.ONE)) * map.size


func is_held() -> bool:
	return _finger >= 0


func _to_mini(p: Vector2) -> Vector2:
	return p / map.size * size


func _draw() -> void:
	if map == null:
		return
	draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0.55))
	draw_rect(Rect2(Vector2.ZERO, size), Color(map.ground_color, 0.7))
	for r in map.obstacles:
		draw_rect(Rect2(_to_mini(r.position), r.size / map.size * size), Color(map.obstacle_color.lightened(0.2), 0.9))
	for pl in map.pillars:
		draw_circle(_to_mini(Vector2(pl.x, pl.y)), maxf(1.5, pl.z / map.size.x * size.x), Color(map.obstacle_color.lightened(0.2), 0.9))
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
	_draw_pings()
	draw_rect(Rect2(Vector2.ZERO, size), Color(1, 1, 1, 0.35), false, 1.5)


func _draw_pings() -> void:
	if ai_manager == null or player == null:
		return
	var t := Time.get_ticks_msec() / 1000.0
	for p in ai_manager.pings_for(player.team):
		var mp := _to_mini(p.pos)
		var c := PingMarker.color_of(p.kind)
		draw_arc(mp, 5.0 + fmod(t * 8.0, 6.0), 0, TAU, 20, Color(c, 0.9), 1.5)
		draw_circle(mp, 3.5, c)


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
