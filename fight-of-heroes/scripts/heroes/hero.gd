class_name Hero
extends Unit
## 영웅. 모든 영웅이 이 스크립트와 hero.tscn 하나를 함께 쓰고, 차이는 HeroData 로만 만든다.

var data: HeroData
var level: int = 1
var controller: Node = null
var spawn_point := Vector2.ZERO
var respawn_left := 0.0
var kills := 0
var deaths := 0
var assists := 0
var xp := 0.0
var gold := 0
var skill_points := 0

signal leveled_up(level: int)
signal gold_changed(gold: int)
signal skill_points_changed(points: int)

@onready var skill_caster: SkillCaster = $SkillCaster


func setup(hero_data: HeroData, hero_team: int) -> void:
	data = hero_data
	team = hero_team
	display_name = hero_data.display_name
	stats.setup(hero_data.base_stats, hero_data.growth_stats)
	stats.set_level(level)
	attack.attack_range = hero_data.attack_range
	attack.is_ranged = hero_data.is_ranged
	attack.projectile_speed = hero_data.projectile_speed
	attack.projectile_color = hero_data.color.lightened(0.4)
	skill_caster.setup(hero_data.skills, 0)
	skill_points = 1
	gold = DataRegistry.progression().start_gold
	health.reset_full()
	mana.reset_full()
	$Visual.setup(self)


func set_controller(c: Node) -> void:
	if controller != null:
		controller.queue_free()
	controller = c
	add_child(c)


## 다음 레벨까지 필요한 경험치에 대한 현재 비율 (최대 레벨이면 1)
func xp_ratio() -> float:
	var cfg := DataRegistry.progression()
	if level >= cfg.max_level:
		return 1.0
	return clampf(xp / cfg.xp_to_next(level), 0.0, 1.0)


func add_xp(amount: float) -> void:
	var cfg := DataRegistry.progression()
	if level >= cfg.max_level or amount <= 0.0:
		return
	xp += amount
	while level < cfg.max_level and xp >= cfg.xp_to_next(level):
		xp -= cfg.xp_to_next(level)
		_level_up()
	if level >= cfg.max_level:
		xp = 0.0


func _level_up() -> void:
	var old_max := health.max_hp()
	var old_mp := mana.max_mp()
	level += 1
	stats.set_level(level)
	if not is_dead:
		health.heal(health.max_hp() - old_max)
		mana.restore(mana.max_mp() - old_mp)
	skill_points += 1
	skill_points_changed.emit(skill_points)
	leveled_up.emit(level)
	EventBus.hero_level_up.emit(self, level)


func can_learn(slot: int) -> bool:
	return skill_points > 0 and skill_caster.can_level(slot, level)


func learn(slot: int) -> bool:
	if not can_learn(slot):
		return false
	skill_points -= 1
	skill_caster.level_up(slot)
	skill_points_changed.emit(skill_points)
	return true


func add_gold(amount: int) -> void:
	if amount == 0:
		return
	gold = maxi(0, gold + amount)
	gold_changed.emit(gold)
