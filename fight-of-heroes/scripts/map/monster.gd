class_name Monster
extends Unit
## 중립 몬스터와 보스. 공격받으면 가장 위협적인(피해를 많이 준) 대상을 공격하고,
## 캠프에서 leash_radius 보다 멀어지거나 대상이 없으면 돌아가서 체력을 회복한다.
## 보스는 MonsterData.skills 의 패턴을 위험 지역 예고와 함께 쓰고, 체력이 줄면 분노한다.

const THINK := 0.25
const RETURN_HEAL := 0.35

var data: MonsterData
var home := Vector2.ZERO
var camp_mates: Array = []
var threat: Dictionary = {}  # Unit -> 누적 피해
var target = null
var phase := 0
var returning := false
## 소환수: 주인을 따라다니며 주인 근처의 적을 공격하고, life_left 초 뒤 사라진다.
var owner_unit = null
var life_left := 0.0
var expired := false

const SUMMON_GUARD := 520.0
const SUMMON_FOLLOW := 140.0

var _think_left := 0.0
var _skill_left := 1.5
var _rng := RandomNumberGenerator.new()

@onready var skill_caster: SkillCaster = $SkillCaster


func setup(d: MonsterData, pos: Vector2) -> void:
	data = d
	display_name = d.display_name
	team = Enums.Team.NEUTRAL
	radius = d.radius
	var shape := ($Collision.shape as CircleShape2D).duplicate() as CircleShape2D
	shape.radius = d.radius
	$Collision.shape = shape
	nav.radius = d.radius
	stats.setup(d.base_stats)
	attack.attack_range = d.attack_range
	attack.is_ranged = d.is_ranged
	attack.projectile_speed = d.projectile_speed
	attack.projectile_color = d.color.lightened(0.3)
	skill_caster.setup(d.skills, 1)
	home = pos
	global_position = pos
	health.reset_full()
	mana.reset_full()
	_rng.seed = hash(d.id) ^ int(pos.x * 7 + pos.y * 13)
	add_to_group("monsters")
	if is_boss():
		add_to_group("bosses")
	$Visual.setup(self)


func setup_summon(d: MonsterData, owner, pos: Vector2, seconds: float) -> void:
	setup(d, pos)
	remove_from_group("monsters")
	add_to_group("summons")
	owner_unit = owner
	team = owner.team
	life_left = seconds


func is_summon() -> bool:
	return owner_unit != null


func is_boss() -> bool:
	return data != null and (data.tier == "boss" or data.tier == "final_boss")


func is_final_boss() -> bool:
	return data != null and data.tier == "final_boss"


func on_damaged(src, amount: float) -> void:
	if is_summon():
		return
	if src == null or not (src is Unit) or src.team == team or returning:
		return
	threat[src] = threat.get(src, 0.0) + amount
	# 같은 캠프의 몬스터도 함께 반격한다.
	for m in camp_mates:
		if m != self and is_instance_valid(m) and not m.is_dead and not m.threat.has(src):
			m.threat[src] = 1.0


func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if is_dead or data == null:
		return
	if is_summon():
		life_left -= delta
		if life_left <= 0.0 or not is_instance_valid(owner_unit) or owner_unit.is_dead:
			expired = true
			die(null)
			get_tree().create_timer(0.6, false).timeout.connect(queue_free)
			return
	if returning:
		health.heal(health.max_hp() * RETURN_HEAL * delta)
	_skill_left -= delta
	_think_left -= delta
	if _think_left <= 0.0:
		_think_left = THINK
		_think()


func _think_summon() -> void:
	var o = owner_unit
	# 주인이 공격 중인 대상, 아니면 주인 근처의 가장 가까운 적
	var t = o.attack_order if o.attack_order != null and Targeting.is_valid(o.attack_order, team, Enums.TargetTeam.ENEMY) else null
	if t == null:
		t = Targeting.nearest(get_tree(), global_position, 420.0, team, Enums.TargetTeam.ENEMY)
	if t != null and t.global_position.distance_to(o.global_position) > SUMMON_GUARD:
		t = null
	target = t
	if t != null:
		attack_order = t
		nav_goal = null
		_use_skill()
	else:
		attack_order = null
		nav_goal = o.global_position + Vector2.from_angle(float(get_instance_id() % 628) / 100.0) * 70.0 if global_position.distance_to(o.global_position) > SUMMON_FOLLOW else null


func _think() -> void:
	if is_summon():
		_think_summon()
		return
	if returning:
		attack_order = null
		nav_goal = home
		# 큰 몬스터가 장애물 사이에 끼면 캠프 자리로 옮긴다.
		if stuck_time > 1.0:
			global_position = home
			stuck_time = 0.0
		if global_position.distance_to(home) < 24.0:
			returning = false
			nav_goal = null
			threat.clear()
			health.reset_full()
		return
	_check_enrage()
	var leash: float = data.leash_radius
	var far := global_position.distance_to(home)
	if far > leash * 1.6:
		_start_return()
		return
	for u in threat.keys():
		if not is_instance_valid(u) or not Targeting.is_valid(u, team, Enums.TargetTeam.ENEMY) or u.global_position.distance_to(home) > leash * 1.3:
			threat.erase(u)
	if threat.is_empty():
		target = null
		attack_order = null
		if far > 30.0:
			_start_return()
		return
	# 캠프 구역 안에 있는 대상 중 위협이 가장 큰 대상을 노린다.
	target = null
	var best := -1.0
	for u in threat:
		if u.global_position.distance_to(home) <= leash and threat[u] > best:
			best = threat[u]
			target = u
	# 구역 밖으로 밀려났거나 구역 안에 대상이 없으면 위협은 남긴 채 캠프 쪽으로 걸어 돌아온다.
	if far > leash or target == null:
		attack_order = null
		nav_goal = home
		return
	nav_goal = null
	attack_order = target
	_use_skill()


func _start_return() -> void:
	returning = true
	target = null
	threat.clear()
	attack_order = null
	nav_goal = home
	status.clear_all()


func _check_enrage() -> void:
	if phase == 0 and data.enrage_hp_ratio > 0.0 and health.ratio() < data.enrage_hp_ratio:
		phase = 1
		stats.add_modifiers("enrage", data.enrage_modifiers)
		EventBus.notice.emit("%s 이(가) 분노했습니다!" % display_name)


func _use_skill() -> void:
	if _skill_left > 0.0 or target == null or not can_act():
		return
	var options: Array = []
	for slot in 4:
		var s := skill_caster.get_skill(slot)
		if s == null:
			continue
		var min_phase := data.skill_min_phase[slot] if slot < data.skill_min_phase.size() else 0
		if phase < min_phase or skill_caster.cooldowns[slot] > 0.0:
			continue
		if global_position.distance_to(target.global_position) > s.reach() + target.radius:
			continue
		options.append(slot)
	if options.is_empty():
		return
	var slot: int = options[_rng.randi() % options.size()]
	var s := skill_caster.get_skill(slot)
	var aim := CastAim.new()
	match s.target_mode:
		Enums.TargetMode.UNIT:
			aim = CastAim.at_unit(target)
		Enums.TargetMode.DIRECTION:
			aim = CastAim.toward(target.global_position - global_position)
		Enums.TargetMode.POINT:
			aim = CastAim.at_point(target.global_position)
	if skill_caster.cast(slot, aim) == Enums.CastResult.OK:
		_skill_left = data.skill_interval
