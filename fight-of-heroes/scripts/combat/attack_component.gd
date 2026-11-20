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
## 기본 공격 투사체의 효과 종류 ("" 이면 단순한 점)
var projectile_style := ""

var cooldown_left := 0.0
## 탄창 (magazine 이 0 이면 없음)
var magazine := 0
var ammo := 0
var reload_time := 1.2
var last_shot_mult := 2.0
var reloading := false
## 멀리서 맞힐수록 피해 증가, 가까운 적은 주먹
var far_bonus := 0.0
var close_melee_range := 0.0
var close_mult := 1.2
var windup_left := -1.0
var windup_target = null

@onready var unit = get_parent()


func setup_hero(d) -> void:
	magazine = d.magazine_size
	ammo = magazine
	reload_time = d.reload_time
	last_shot_mult = d.last_shot_mult
	far_bonus = d.far_bonus
	close_melee_range = d.close_melee_range
	close_mult = d.close_mult


## 탄창을 가득 채운다 (구르기 등)
func reload_now() -> void:
	if magazine > 0:
		ammo = magazine
		if reloading:
			reloading = false
			cooldown_left = 0.0


func interval() -> float:
	return 1.0 / maxf(0.1, unit.stats.get_stat("attack_speed"))


## 기본 사거리 + 능력치 보너스(변신 등)
func total_range() -> float:
	return attack_range + unit.stats.get_stat("attack_range")


## 몸 가장자리 사이 거리로 사거리를 잰다. 벽에 가려 보이지 않으면 사거리 밖으로 본다.
func in_range(target, extra := 0.0) -> bool:
	if unit.global_position.distance_to(target.global_position) > total_range() + target.radius + extra:
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
	unit.status.remove_kind(Enums.StatusKind.STEALTH)
	unit.revealed_until = Unit.now() + Bushes.REVEAL
	windup_left = interval() * DataRegistry.combat_config().attack_windup_ratio
	cooldown_left = interval()
	unit.face_towards(target.global_position)
	attack_started.emit(target)
	EventBus.attack_started.emit(unit, target)
	return true


func cancel_windup() -> void:
	if is_winding_up():
		windup_left = -1.0
		windup_target = null
		cooldown_left = 0.0


func _physics_process(delta: float) -> void:
	cooldown_left = maxf(0.0, cooldown_left - delta)
	if reloading and cooldown_left <= 0.0:
		reloading = false
	if windup_left >= 0.0:
		windup_left -= delta
		if windup_left < 0.0:
			_release()


func _release() -> void:
	var t = windup_target
	windup_target = null
	if t == null or not is_instance_valid(t) or t.is_dead or unit.is_dead:
		return
	var power := 1.0
	if magazine > 0:
		ammo -= 1
		if ammo <= 0:
			# 마지막 탄: 세게 맞히고 재장전에 들어간다.
			power = last_shot_mult
			ammo = magazine
			reloading = true
			cooldown_left = maxf(cooldown_left, reload_time)
	if close_melee_range > 0.0 and unit.global_position.distance_to(t.global_position) <= close_melee_range + t.radius:
		# 가까운 적은 주먹으로 바로 친다.
		SkillFx.burst(unit, t.global_position, 28.0, projectile_style if projectile_style != "" else "impact")
		_hit(t, power * close_mult)
		return
	if is_ranged or unit.stats.get_stat("attack_range") > 100.0:
		var p := Projectile.new()
		p.power = power
		p.setup_basic_attack(unit, t, projectile_speed, total_range() * 1.35 + 60.0)
		p.color = projectile_color
		p.style = projectile_style
		Targeting.effects_parent(unit).add_child(p)
		p.global_position = unit.global_position
	elif in_range(t, DataRegistry.combat_config().melee_leeway):
		_hit(t, power)


func _hit(target, power := 1.0) -> void:
	if not is_instance_valid(unit):
		return
	if far_bonus > 0.0 and is_instance_valid(target):
		power *= 1.0 + far_bonus * clampf(unit.global_position.distance_to(target.global_position) / maxf(1.0, total_range()), 0.0, 1.0)
	var info := DamageInfo.new(unit, unit.stats.get_stat("attack") * power, Enums.DamageType.PHYSICAL)
	info.can_crit = true
	info.is_basic_attack = true
	var dealt := CombatManager.apply_damage(target, info)
	var ls: float = unit.stats.get_stat("life_steal")
	if ls > 0.0 and dealt > 0.0:
		CombatManager.heal(unit, dealt * ls, unit)
	attack_landed.emit(target)
