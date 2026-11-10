class_name FogOfWar
extends Node2D
## 전장의 안개. 팀마다 그 팀의 영웅·소환수·기지가 비추는 곳만 보인다.
## 한 번 비춘 곳은 REVEAL_TIME 초 동안 점점 어두워지고, 그 뒤에는 다시 보이지 않는다.
## 화면에는 viewer_team 의 시야만 그린다 (관전이면 그리지 않음, viewer_team = -1).
## AI 도 자기 팀 시야 안의 적만 노린다 (team_can_see).

const CELL := 50.0
const HERO_SIGHT := 560.0
const SUMMON_SIGHT := 380.0
const BASE_SIGHT := 600.0
## 비춘 뒤 완전히 어두워지기까지(초)
const REVEAL_TIME := 6.0
## 이 밝기보다 밝은 곳의 유닛을 보여 준다 (비춘 뒤 약 4초)
const SHOW_THRESHOLD := 0.35
const MAX_DARK := 0.8
const UPDATE := 0.1

## 지금 화면을 그리는 안개 (없으면 안개 없음)
static var current: FogOfWar = null

var map: MapData
var hero_manager: HeroManager
var viewer_team := Enums.Team.BLUE
var cols := 0
var rows := 0
## 화면에 그리는 팀의 시야 (viewer_team 이 -1 이면 빈 배열)
var reveal := PackedFloat32Array()
## 팀별 시야
var team_reveal := {}
var _bytes := PackedByteArray()
var _image: Image
var _texture: ImageTexture
var _left := 0.0


func setup(map_data: MapData, hm: HeroManager, team: int) -> void:
	map = map_data
	hero_manager = hm
	viewer_team = team
	cols = int(ceil(map.size.x / CELL))
	rows = int(ceil(map.size.y / CELL))
	for t in [Enums.Team.BLUE, Enums.Team.RED]:
		var arr := PackedFloat32Array()
		arr.resize(cols * rows)
		arr.fill(0.0)
		team_reveal[t] = arr
	reveal = team_reveal.get(viewer_team, PackedFloat32Array())
	visible = viewer_team >= 0
	_bytes.resize(cols * rows * 2)
	_image = Image.create_empty(cols, rows, false, Image.FORMAT_LA8)
	_texture = ImageTexture.create_from_image(_image)
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	z_index = 40
	current = self
	refresh(0.0)


func _exit_tree() -> void:
	if current == self:
		current = null


func _physics_process(delta: float) -> void:
	_left -= delta
	if _left <= 0.0:
		refresh(UPDATE - _left)
		_left = UPDATE


## 시야를 다시 계산하고 그림을 새로 만든다. dt 만큼 어두워진다.
func refresh(dt: float) -> void:
	if map == null:
		return
	var fade := dt / REVEAL_TIME
	var cfg := DataRegistry.combat_config()
	for t in team_reveal:
		var arr: PackedFloat32Array = team_reveal[t]
		for i in arr.size():
			arr[i] = maxf(0.0, arr[i] - fade)
		_light(arr, map.spawn_of(t), maxf(BASE_SIGHT, cfg.fountain_radius + 150.0))
		if hero_manager != null:
			for h: Hero in hero_manager.heroes:
				if h.team == t and not h.is_dead:
					_light(arr, h.global_position, HERO_SIGHT)
		for m in get_tree().get_nodes_in_group("summons"):
			if is_instance_valid(m) and not m.is_dead and m.team == t:
				_light(arr, m.global_position, SUMMON_SIGHT)
		team_reveal[t] = arr
	reveal = team_reveal.get(viewer_team, PackedFloat32Array())
	if viewer_team < 0:
		return
	for i in reveal.size():
		_bytes[i * 2] = 0
		_bytes[i * 2 + 1] = int(MAX_DARK * (1.0 - reveal[i]) * 255.0)
	_image.set_data(cols, rows, false, Image.FORMAT_LA8, _bytes)
	_texture.update(_image)
	queue_redraw()


func _light(arr: PackedFloat32Array, pos: Vector2, radius: float) -> void:
	var cx := int(pos.x / CELL)
	var cy := int(pos.y / CELL)
	var rc := int(ceil(radius / CELL))
	var r2 := (radius / CELL) * (radius / CELL)
	for y in range(maxi(0, cy - rc), mini(rows, cy + rc + 1)):
		for x in range(maxi(0, cx - rc), mini(cols, cx + rc + 1)):
			var dx := x + 0.5 - pos.x / CELL
			var dy := y + 0.5 - pos.y / CELL
			if dx * dx + dy * dy <= r2:
				arr[y * cols + x] = 1.0


func brightness_at(pos: Vector2, team := -2) -> float:
	var arr: PackedFloat32Array = reveal if team == -2 else team_reveal.get(team, PackedFloat32Array())
	var x := int(pos.x / CELL)
	var y := int(pos.y / CELL)
	if arr.is_empty() or x < 0 or y < 0 or x >= cols or y >= rows:
		return 0.0
	return arr[y * cols + x]


func is_visible_pos(pos: Vector2, team := -2) -> bool:
	if team == -2 and viewer_team < 0:
		return true
	return brightness_at(pos, team) > SHOW_THRESHOLD


## 화면을 보는 팀에게 이 유닛이 보이는지 (같은 팀은 늘 보인다, 관전이면 모두 보인다)
static func can_see(unit) -> bool:
	if current == null or unit == null or current.viewer_team < 0:
		return true
	if unit.team == current.viewer_team:
		return true
	return current.is_visible_pos(unit.global_position)


## team 의 시야에 이 유닛이 보이는지 (AI 판단용). 같은 팀과 중립 몬스터(캠프 위치는 모두 안다)는 늘 보인다.
static func team_can_see(team: int, unit) -> bool:
	if current == null or unit == null or not is_instance_valid(unit):
		return true
	if unit.team == team or unit.team == Enums.Team.NEUTRAL:
		return true
	return current.is_visible_pos(unit.global_position, team)


func _draw() -> void:
	if _texture == null or viewer_team < 0:
		return
	draw_texture_rect(_texture, Rect2(Vector2.ZERO, Vector2(cols, rows) * CELL), false)
	# 맵 바깥 테두리도 어둡게
	var pad := 400.0
	var dark := Color(0, 0, 0, MAX_DARK)
	draw_rect(Rect2(-pad, -pad, map.size.x + pad * 2, pad), dark)
	draw_rect(Rect2(-pad, map.size.y, map.size.x + pad * 2, pad), dark)
	draw_rect(Rect2(-pad, 0, pad, map.size.y), dark)
	draw_rect(Rect2(map.size.x, 0, pad, map.size.y), dark)
