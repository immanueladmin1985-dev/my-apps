class_name Projectile
extends Node2D
## 투사체. 대상을 따라가는 방식(기본 공격)과 직선으로 날아가는 방식(스킬)이 있다.
## 맞으면 on_hit(대상)을 부른다. 관통하면 한 대상에게 한 번씩만 맞는다.

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
var color := Color(1, 1, 0.8)

var _traveled := 0.0
var _hit_units: Dictionary = {}


func setup_homing(from_unit, target, spd: float, hit: Callable) -> void:
	owner_unit = from_unit
	team = from_unit.team
	homing_target = target
	speed = spd
	max_distance = 3000.0
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
	var step := speed * delta
	if homing_target != null:
		if not is_instance_valid(homing_target) or homing_target.is_dead:
			queue_free()
			return
		var to: Vector2 = homing_target.global_position - global_position
		direction = to.normalized()
		if to.length() <= step + homing_target.radius:
			on_hit.call(homing_target)
			queue_free()
			return
		global_position += direction * step
	else:
		var from := global_position
		global_position += direction * step
		for u in Targeting.on_segment(get_tree(), from, global_position, width, team, affects):
			if _hit_units.has(u):
				continue
			_hit_units[u] = true
			on_hit.call(u)
			if not pierce:
				queue_free()
				return
	_traveled += step
	rotation = direction.angle()
	queue_redraw()
	if _traveled >= max_distance:
		queue_free()


func _draw() -> void:
	var len := 26.0 if homing_target == null else 16.0
	draw_line(Vector2(-len, 0), Vector2.ZERO, Color(color, 0.5), maxf(3.0, width * 0.35))
	draw_circle(Vector2.ZERO, maxf(4.0, width * 0.25), color)
