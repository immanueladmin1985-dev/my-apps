class_name Unit
extends CharacterBody2D
## 영웅·몬스터·보스·소환수가 함께 쓰는 기반.
## 조작(플레이어 또는 AI)은 move_input, attack_order, nav_goal 만 정하고, 실제 행동은 여기서 한다.

signal died(killer)
signal respawned

@export var team: int = Enums.Team.NEUTRAL
@export var radius: float = 16.0

var display_name := ""
var is_dead := false
var targetable := true
var facing := Vector2.RIGHT

## 조작 명령
var move_input := Vector2.ZERO  # 길이 0~1
var attack_order = null  # 공격할 유닛
var nav_goal = null  # Vector2 또는 null

## 상태 기록 (AI 판단과 시험에 쓴다)
var last_damaged_time := -100.0
var recent_attackers: Dictionary = {}  # Unit -> 마지막으로 때린 시각
var stuck_time := 0.0
var max_stuck_time := 0.0
var wants_move := false

var _dash: Dictionary = {}

@onready var stats: StatsComponent = $Stats
@onready var health: HealthComponent = $Health
@onready var mana: ManaComponent = $Mana
@onready var status: StatusEffectContainer = $Status
@onready var attack: AttackComponent = $Attack
@onready var nav: NavigationAgent2D = get_node_or_null("NavAgent")


func _ready() -> void:
	add_to_group("units")
	collision_layer = 2
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING


## 게임 시간(초). 물리 프레임 수로 세므로 시험을 빠르게 돌려도 게임 안의 시간과 맞는다.
static func now() -> float:
	return float(Engine.get_physics_frames()) / Engine.physics_ticks_per_second


func can_move() -> bool:
	return not is_dead and _dash.is_empty() and not status.is_stunned()


func can_act() -> bool:
	return not is_dead and _dash.is_empty() and not status.is_stunned()


func is_dashing() -> bool:
	return not _dash.is_empty()


func get_move_speed() -> float:
	return stats.get_stat("move_speed") * status.speed_multiplier()


func face_towards(pos: Vector2) -> void:
	var d := pos - global_position
	if d.length() > 1.0:
		facing = d.normalized()


func on_stunned() -> void:
	attack.cancel_windup()


func register_attacker(src) -> void:
	last_damaged_time = now()
	if src != null and is_instance_valid(src) and src != self:
		recent_attackers[src] = now()


func clear_orders() -> void:
	move_input = Vector2.ZERO
	attack_order = null
	nav_goal = null


func _physics_process(delta: float) -> void:
	if is_dead:
		velocity = Vector2.ZERO
		wants_move = false
		return
	if not _dash.is_empty():
		_process_dash(delta)
		return
	var want := Vector2.ZERO
	if attack_order != null and not Targeting.is_valid(attack_order, team, Enums.TargetTeam.ENEMY):
		attack_order = null
	if can_move():
		if attack_order != null:
			if attack.in_range(attack_order):
				attack.try_attack(attack_order)
			elif not attack.is_winding_up():
				want = _path_dir(attack_order.global_position)
		elif move_input.length() > 0.05:
			want = move_input.limit_length(1.0)
		elif nav_goal != null:
			if global_position.distance_to(nav_goal) <= 12.0:
				nav_goal = null
			else:
				want = _path_dir(nav_goal)
	if want != Vector2.ZERO:
		attack.cancel_windup()
		facing = want.normalized()
	wants_move = want.length() > 0.05
	velocity = want * get_move_speed()
	if can_move():
		velocity += _separation() * 90.0
	var before := global_position
	move_and_slide()
	_track_stuck(before, delta)


## 같은 팀 유닛끼리 겹치지 않도록 서로 살짝 밀어낸다.
func _separation() -> Vector2:
	var push := Vector2.ZERO
	for u in get_tree().get_nodes_in_group("units"):
		if u == self or u.is_dead or u.team != team:
			continue
		var d: Vector2 = global_position - u.global_position
		var min_d: float = (radius + u.radius) * 1.1
		var len := d.length()
		if len < min_d:
			if len < 0.01:
				d = Vector2.from_angle(float(get_instance_id() % 628) / 100.0)
				len = 0.01
			push += d / len * (1.0 - len / min_d)
	return push.limit_length(1.0)


func _track_stuck(before: Vector2, delta: float) -> void:
	if wants_move and global_position.distance_to(before) < get_move_speed() * delta * 0.15:
		stuck_time += delta
		max_stuck_time = maxf(max_stuck_time, stuck_time)
	else:
		stuck_time = 0.0


## 길찾기로 다음에 갈 방향을 구한다. 길찾기가 아직 준비되지 않았으면 곧장 간다.
func _path_dir(target: Vector2) -> Vector2:
	var direct := (target - global_position).normalized()
	if nav == null or NavigationServer2D.map_get_iteration_id(nav.get_navigation_map()) == 0:
		return direct
	if nav.target_position.distance_to(target) > 8.0:
		nav.target_position = target
	if nav.is_navigation_finished():
		return direct
	var next := nav.get_next_path_position()
	var d := next - global_position
	if d.length() < 1.0:
		return direct
	return d.normalized()


## 돌진: distance 만큼 빠르게 이동하며, 지나간 길 위의 유닛마다 on_pass 를 한 번 부른다.
func start_dash(dir: Vector2, distance: float, speed: float, width: float, on_pass: Callable, on_end: Callable) -> void:
	if is_dead:
		return
	attack.cancel_windup()
	facing = dir.normalized()
	_dash = {
		"dir": dir.normalized(), "left": distance, "speed": speed, "width": width,
		"on_pass": on_pass, "on_end": on_end, "hit": {},
	}


func _process_dash(delta: float) -> void:
	var step: float = minf(_dash.speed * delta, _dash.left)
	var from := global_position
	velocity = _dash.dir * step / delta
	move_and_slide()
	var moved := global_position.distance_to(from)
	_dash.left -= step
	if _dash.on_pass.is_valid():
		for u in Targeting.on_segment(get_tree(), from, global_position, _dash.width, team, Enums.TargetTeam.ENEMY):
			if not _dash.hit.has(u):
				_dash.hit[u] = true
				_dash.on_pass.call(u)
	# 벽에 막혀 거의 움직이지 못하면 돌진을 끝낸다.
	if _dash.left <= 0.5 or moved < step * 0.2:
		var end: Callable = _dash.on_end
		_dash = {}
		velocity = Vector2.ZERO
		if end.is_valid():
			end.call()


func die(killer = null) -> void:
	if is_dead:
		return
	is_dead = true
	health.hp = 0.0
	_dash = {}
	clear_orders()
	attack.cancel_windup()
	status.clear_all()
	health.shields.clear()
	collision_layer = 0
	died.emit(killer)
	EventBus.unit_died.emit(self, killer)


func respawn_at(pos: Vector2) -> void:
	global_position = pos
	is_dead = false
	collision_layer = 2
	recent_attackers.clear()
	stuck_time = 0.0
	health.reset_full()
	mana.reset_full()
	respawned.emit()
