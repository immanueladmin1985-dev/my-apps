class_name AttackComponent
extends Node
## 기본 공격. 공격 간격 = 1 / 공격 속도. 선딜레이가 끝나는 순간 근접은 바로 피해를 주고,
## 원거리는 대상을 따라가는 투사체를 쏜다.

signal attack_started(target)
signal attack_landed(target)

var attack_range: float = 70.0
var is_ranged := false
var projectile_speed: float = 900.0
var projectile_color := Color(1, 1, 0.8)

var cooldown_left := 0.0
var windup_left := -1.0
var windup_target = null

@onready var unit = get_parent()


func interval() -> float:
	return 1.0 / maxf(0.1, unit.stats.get_stat("attack_speed"))


## 몸 가장자리 사이 거리로 사거리를 잰다. 벽에 가려 보이지 않으면 사거리 밖으로 본다.
func in_range(target, extra := 0.0) -> bool:
	if unit.global_position.distance_to(target.global_position) > attack_range + target.radius + extra:
		return false
	return Targeting.has_line_of_sight(unit, unit.global_position, target.global_position)


func is_winding_up() -> bool:
	return windup_left >= 0.0


func can_attack() -> bool:
	return cooldown_left <= 0.0 and not is_winding_up() and unit.can_act()


func try_attack(target) -> bool:
	if not can_attack():
		return false
	windup_target = target
	windup_left = interval() * DataRegistry.combat_config().attack_windup_ratio
	cooldown_left = interval()
	unit.face_towards(target.global_position)
	attack_started.emit(target)
	return true


func cancel_windup() -> void:
	if is_winding_up():
		windup_left = -1.0
		windup_target = null
		cooldown_left = 0.0


func _physics_process(delta: float) -> void:
	cooldown_left = maxf(0.0, cooldown_left - delta)
	if windup_left >= 0.0:
		windup_left -= delta
		if windup_left < 0.0:
			_release()


func _release() -> void:
	var t = windup_target
	windup_target = null
	if t == null or not is_instance_valid(t) or t.is_dead or unit.is_dead:
		return
	if is_ranged:
		var p := Projectile.new()
		p.setup_homing(unit, t, projectile_speed, func(target): _hit(target))
		p.color = projectile_color
		Targeting.effects_parent(unit).add_child(p)
		p.global_position = unit.global_position
	elif in_range(t, DataRegistry.combat_config().melee_leeway):
		_hit(t)


func _hit(target) -> void:
	if not is_instance_valid(unit):
		return
	var info := DamageInfo.new(unit, unit.stats.get_stat("attack"), Enums.DamageType.PHYSICAL)
	info.can_crit = true
	info.is_basic_attack = true
	var dealt := CombatManager.apply_damage(target, info)
	var ls: float = unit.stats.get_stat("life_steal")
	if ls > 0.0 and dealt > 0.0:
		CombatManager.heal(unit, dealt * ls, unit)
	attack_landed.emit(target)
