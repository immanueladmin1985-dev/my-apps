class_name RuneManager
extends Node2D
## 룬 제단: 맵의 정해진 자리(MapData.rune_spots)에 FIRST 초부터, 먹힌 뒤 RESPAWN 초마다 룬이 나타난다.
## 영웅이 밟으면 먹는다. 힘(공격력·주문력 +20%), 신속(이동 속도 +25%), 재생(체력·마나 회복), 황금(300 골드).

const FIRST := 90.0
const RESPAWN := 120.0
const DURATION := 60.0
const PICK_RADIUS := 60.0
const KINDS := ["power", "haste", "regen", "gold"]
const NAMES := {"power": "힘의 룬", "haste": "신속의 룬", "regen": "재생의 룬", "gold": "황금의 룬"}
const COLORS := {"power": Color(1, 0.35, 0.25), "haste": Color(0.4, 0.9, 1), "regen": Color(0.4, 1, 0.5), "gold": Color(1, 0.85, 0.3)}
const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")

## 자리마다 {pos, kind ("" 이면 비어 있음), left (다음 룬까지 남은 초)}
var spots: Array = []
var hero_manager: HeroManager
var _rng := RandomNumberGenerator.new()
var _t := 0.0


func setup(map: MapData, hm: HeroManager, seed_value := 0) -> void:
	hero_manager = hm
	_rng.seed = seed_value if seed_value != 0 else hash(map.id)
	spots.clear()
	for p in map.rune_spots:
		spots.append({"pos": p, "kind": "", "left": FIRST})
	add_to_group("runes")
	z_index = 2


## 지금 나와 있는 룬들 [{pos, kind}]
func active() -> Array:
	return spots.filter(func(s): return s.kind != "")


func _physics_process(delta: float) -> void:
	if Net.is_client():
		return
	_t += delta
	var spawned := false
	for s in spots:
		if s.kind == "":
			s.left -= delta
			if s.left <= 0.0:
				s.kind = KINDS[_rng.randi() % KINDS.size()]
				spawned = true
			continue
		if hero_manager == null:
			continue
		for h in hero_manager.heroes:
			if not h.is_dead and h.global_position.distance_to(s.pos) <= PICK_RADIUS + h.radius:
				pick(h, s)
				break
	if spawned:
		EventBus.notice.emit("룬이 나타났습니다! (미니맵의 빛나는 점)")


func pick(h: Hero, s: Dictionary) -> void:
	var kind: String = s.kind
	s.kind = ""
	s.left = RESPAWN
	match kind:
		"power":
			h.status.apply(load("res://data/status/rune_power.tres"), DURATION, 0.0, h)
		"haste":
			h.status.apply(load("res://data/status/rune_haste.tres"), DURATION, 0.25, h)
		"regen":
			h.status.apply(load("res://data/status/rune_regen.tres"), DURATION, 0.0, h)
		"gold":
			h.add_gold(300)
	SkillFx.power_up(h, "holy")
	if h.controller is PlayerController:
		EventBus.notice.emit("%s 을(를) 먹었습니다!" % NAMES[kind] + (" (60초)" if kind != "gold" else " (+300 골드)"))


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	for s in spots:
		var p: Vector2 = s.pos
		# 제단 받침
		draw_circle(p + Vector2(0, 6), 40.0, Color(0, 0, 0, 0.25))
		draw_circle(p, 38.0, Color(0.45, 0.42, 0.4))
		draw_arc(p, 38.0, 0, TAU, 40, Color(0.2, 0.18, 0.16), 3.0)
		draw_arc(p, 28.0, 0, TAU, 40, Color(0.65, 0.6, 0.55), 2.0)
		if s.kind == "":
			continue
		var c: Color = COLORS[s.kind]
		var bob := sin(t * 3.0) * 5.0
		# 세워서 그리는 빛나는 수정
		draw_set_transform(p + Vector2(0, -26 + bob), 0.0, Vector2(1.0, View.upright()))
		draw_texture_rect(SkillFx.tex("dot"), Rect2(Vector2(-46, -46), Vector2(92, 92)), false, Color(c, 0.7))
		var pts := PackedVector2Array([Vector2(0, -26), Vector2(14, 0), Vector2(0, 26), Vector2(-14, 0)])
		draw_colored_polygon(pts, c)
		pts.append(pts[0])
		draw_polyline(pts, Color(0.1, 0.08, 0.08), 3.0)
		draw_line(Vector2(0, -26), Vector2(0, 26), Color(1, 1, 1, 0.5), 2.0)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		draw_arc(p, 30.0 + fmod(t * 20.0, 14.0), 0, TAU, 40, Color(c, 0.6), 2.0)
