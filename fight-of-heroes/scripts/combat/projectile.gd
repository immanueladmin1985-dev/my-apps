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
## 기본 공격 피해 배율 (마지막 탄 등)
var power := 1.0
## 부메랑: 끝까지 날아간 뒤 쏜 유닛에게 돌아오며 다시 맞힌다
var returns := false
var returning := false
var color := Color(1, 1, 0.8)
## 스킬 투사체의 효과 종류 (기본 공격은 "")
var style := ""
var _trail: CPUParticles2D = null

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
			_finish()
			return
		_move(to_lost.normalized() * step)
		return
	if homing_target != null:
		if not is_instance_valid(homing_target) or homing_target.is_dead:
			_finish()
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
			_finish()
			return
		if not _move(direction * step):
			return
	else:
		if returning:
			if owner_unit == null or not is_instance_valid(owner_unit) or owner_unit.is_dead or _traveled > max_distance * 3.0:
				_finish()
				return
			var back: Vector2 = owner_unit.global_position - global_position
			if back.length() <= step + 20.0:
				_finish()
				return
			direction = back.normalized()
		var from := global_position
		if not _move(direction * step):
			return
		for u in Targeting.on_segment(get_tree(), from, global_position, width, team, affects):
			if _hit_units.has(u):
				continue
			_hit_units[u] = true
			if not _deliver(u):
				_finish()
				return
			if not pierce:
				_finish()
				return
	_traveled += step
	rotation = direction.angle()
	queue_redraw()
	if _traveled >= max_distance and not returning:
		if returns:
			returning = true
			_hit_units.clear()
		else:
			_finish()


## 맞은 대상에게 효과를 준다. 쏜 쪽이 사라졌으면 false.
func _deliver(u) -> bool:
	if basic_attack:
		if owner_unit == null or not is_instance_valid(owner_unit) or owner_unit.is_queued_for_deletion():
			return false
		owner_unit.attack._hit(u, power)
		return true
	if not on_hit.is_valid():
		return false
	on_hit.call(u)
	return true


## 벽에 막히면 사라지고 false 를 돌려준다.
func _move(v: Vector2) -> bool:
	var to := global_position + v
	if not Targeting.has_line_of_sight(self, global_position, to):
		_finish()
		return false
	global_position = to
	direction = v.normalized() if v.length() > 0.001 else direction
	rotation = direction.angle()
	queue_redraw()
	return true


func _ready() -> void:
	if style == "":
		return
	# 스킬 투사체: 지나간 자리에 입자 꼬리
	_trail = SkillFx._particles(style, 8 if basic_attack else 18, 0.35)
	_trail.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_trail.emission_sphere_radius = width * 0.25
	_trail.direction = Vector2.LEFT
	_trail.spread = 25.0
	_trail.initial_velocity_min = 10.0
	_trail.initial_velocity_max = 40.0
	_trail.scale_amount_min = 0.25 + width / 200.0
	_trail.scale_amount_max = 0.45 + width / 120.0
	add_child(_trail)
	_trail.emitting = true


## 사라진다. 스킬 투사체는 그 자리에서 작게 터진다.
func _finish() -> void:
	if style != "" and _started and is_inside_tree():
		SkillFx.burst(self, global_position, 26.0 if basic_attack else maxf(30.0, width * 1.2), style)
	queue_free()


func _draw() -> void:
	var len := 26.0 if homing_target == null else 16.0
	if style != "":
		var img := SkillFx.art(style, "projectile")
		var s := 30.0 if basic_attack else maxf(36.0, width * 1.8)
		if img != null:
			draw_texture_rect(img, Rect2(Vector2(-s * 0.7, -s * 0.5), Vector2(s * 1.4, s)), false)
			return
		var sc := SkillFx.colors(style)
		draw_texture_rect(SkillFx.tex("dot"), Rect2(-Vector2(s, s) * 0.6, Vector2(s, s) * 1.2), false, Color(sc.b, 0.9))
		draw_line(Vector2(-s * 0.9, 0), Vector2.ZERO, Color(sc.b, 0.6), maxf(4.0, width * 0.4))
		draw_circle(Vector2.ZERO, maxf(5.0, width * 0.22), sc.a)
		return
	draw_line(Vector2(-len, 0), Vector2.ZERO, Color(color, 0.5), maxf(3.0, width * 0.35))
	draw_circle(Vector2.ZERO, maxf(4.0, width * 0.25), color)
