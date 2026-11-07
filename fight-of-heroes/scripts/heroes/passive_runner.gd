class_name PassiveRunner
extends Node
## 영웅의 패시브를 실행한다. 기본 공격·스킬·처치 신호를 받아 조건을 검사하고 효과를 건다.

var passive: PassiveData
var hits := 0
var procs := 0  # 시험용: 발동 횟수
var _cooldown_left := 0.0
var _period_left := 0.0

@onready var hero = get_parent()


func setup(p: PassiveData) -> void:
	passive = p
	if p == null:
		return
	_period_left = p.interval
	hero.attack.attack_landed.connect(_on_attack_landed)
	hero.skill_caster.cast_done.connect(_on_cast)
	EventBus.unit_died.connect(_on_unit_died)
	if p.trigger == "always" and not p.stat_modifiers.is_empty():
		hero.stats.add_modifiers("passive", p.stat_modifiers)


func _exit_tree() -> void:
	if EventBus.unit_died.is_connected(_on_unit_died):
		EventBus.unit_died.disconnect(_on_unit_died)


func rank() -> int:
	return clampi(1 + (hero.level - 1) / 4, 1, 4)


func _ready_to_fire(target) -> bool:
	if _cooldown_left > 0.0 or hero.is_dead:
		return false
	if passive.self_below_hp > 0.0 and hero.health.ratio() >= passive.self_below_hp:
		return false
	if passive.target_below_hp > 0.0 and (target == null or not is_instance_valid(target) or target.health.ratio() >= passive.target_below_hp):
		return false
	return true


func _fire(target) -> void:
	_cooldown_left = passive.cooldown
	procs += 1
	var ctx := SkillContext.new()
	ctx.caster = hero
	ctx.rank = rank()
	ctx.target_unit = target if target != null else hero
	ctx.point = ctx.target_unit.global_position
	ctx.direction = hero.facing
	SkillEffect.apply_list(passive.effects, ctx)


func _on_attack_landed(target) -> void:
	if passive.trigger != "attack_hit":
		return
	hits += 1
	if hits % maxi(1, passive.every) == 0 and _ready_to_fire(target):
		_fire(target)


func _on_cast(_slot: int, _s) -> void:
	if passive.trigger == "skill_cast" and _ready_to_fire(null):
		_fire(null)


func _on_unit_died(victim, killer) -> void:
	if passive.trigger == "kill" and Targeting.hero_of(killer) == hero and victim != hero and _ready_to_fire(null):
		_fire(null)


func _physics_process(delta: float) -> void:
	if passive == null:
		return
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if passive.trigger == "periodic":
		_period_left -= delta
		if _period_left <= 0.0:
			_period_left = passive.interval
			if _ready_to_fire(null):
				_fire(null)
