class_name Projectile
extends Node2D
## 투사체. 대상을 따라가는 방식(기본 공격)과 직선으로 날아가는 방식(스킬)이 있다.
## 맞으면 on_hit(대상)을 부른다. 관통하면 한 대상에게 한 번씩만 맞는다.
## 벽에 닿으면 사라진다. 따라가던 대상이 돌진·도약하면 대상을 놓치고 마지막 위치로 날아가 사라진다.

var owner_unit = null
var team: int = 0
var affects: int = Enums.TargetTeam.ENEMY
var direction := Vector2.RIGHT
var speed := 900.0
var max_distance := 800.0
var width := 24.0
var pierce := false
var homing_target = null
var on_hit: Callable
var basic_attack := false
var color := Color(1, 1, 0.8)

var _traveled := 0.0
var _target_dash := 0
var _lost_at = null  # 대상을 놓친 뒤 날아갈 지점
var _leash := 0.0
var _origin := Vector2.ZERO
var _started := false
var _hit_units: Dictionary = {}


## 기본 공격 투사체: 맞으면 쏜 유닛의 AttackComponent 가 피해를 준다.
## 함수(람다)를 넘기지 않고 쏜 유닛을 기억해, 쏜 유닛이 사라졌으면 피해 없이 사라진다.
func setup_basic_attack(from_unit, target, spd: float, leash := 600.0) -> void:
	setup_homing(from_unit, target, spd, Callable(), leash)
	basic_attack = true


## leash: 쏜 자리에서 이 거리보다 멀리 따라가지 않는다 (사거리 밖으로 달아나면 피할 수 있다).
func setup_homing(from_unit, target, spd: float, hit: Callable, leash := 600.0) -> void:
	owner_unit = from_unit
	team = from_unit.team
	homing_target = target
	_target_dash = target.dash_count
	speed = spd
	max_distance = 3000.0
	_leash = leash
	on_hit = hit


func setup_line(from_unit, dir: Vector2, spd: float, dist: float, w: float, pierce_units: bool, hit: Callable) -> void:
	owner_unit = from_unit
	team = from_unit.team
	direction = dir.normalized()
	speed = spd
	max_distance = dist
	width = w
	pierce = pierce_units
	on_hit = hit


func _physics_process(delta: float) -> void:
	if not _started:
		_started = true
		_origin = global_position
	var step := speed * delta
	if _lost_at != null:
		var to_lost: Vector2 = _lost_at - global_position
		if to_lost.length() <= step:
			queue_free()
			return
		_move(to_lost.normalized() * step)
		return
	if homing_target != null:
		if not is_instance_valid(homing_target) or homing_target.is_dead:
			queue_free()
			return
		if homing_target.dash_count != _target_dash:
			_lost_at = homing_target.global_position
			homing_target = null
			return
		# 사거리 밖으로 멀리 달아나면 따라가지 않고 떨어진다.
		if _leash > 0.0 and homing_target.global_position.distance_to(_origin) > _leash:
			_lost_at = global_position + direction * 60.0
			homing_target = null
			return
		var to: Vector2 = homing_target.global_position - global_position
		direction = to.normalized()
		if to.length() <= step + homing_target.radius:
			_deliver(homing_target)
			queue_free()
			return
		if not _move(direction * step):
			return
	else:
		var from := global_position
		if not _move(direction * step):
			return
		for u in Targeting.on_segment(get_tree(), from, global_position, width, team, affects):
			if _hit_units.has(u):
				continue
			_hit_units[u] = true
			if not _deliver(u):
				queue_free()
				return
			if not pierce:
				queue_free()
				return
	_traveled += step
	rotation = direction.angle()
	queue_redraw()
	if _traveled >= max_distance:
		queue_free()


## 맞은 대상에게 효과를 준다. 쏜 쪽이 사라졌으면 false.
func _deliver(u) -> bool:
	if basic_attack:
		if owner_unit == null or not is_instance_valid(owner_unit) or owner_unit.is_queued_for_deletion():
			return false
		owner_unit.attack._hit(u)
		return true
	if not on_hit.is_valid():
		return false
	on_hit.call(u)
	return true


## 벽에 막히면 사라지고 false 를 돌려준다.
func _move(v: Vector2) -> bool:
	var to := global_position + v
	if not Targeting.has_line_of_sight(self, global_position, to):
		queue_free()
		return false
	global_position = to
	direction = v.normalized() if v.length() > 0.001 else direction
	rotation = direction.angle()
	queue_redraw()
	return true


func _draw() -> void:
	var len := 26.0 if homing_target == null else 16.0
	draw_line(Vector2(-len, 0), Vector2.ZERO, Color(color, 0.5), maxf(3.0, width * 0.35))
	draw_circle(Vector2.ZERO, maxf(4.0, width * 0.25), color)
