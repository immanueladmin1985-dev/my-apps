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
	skill_caster.setup(hero_data.skills, 1)
	health.reset_full()
	mana.reset_full()
	$Visual.setup(self)


func set_controller(c: Node) -> void:
	if controller != null:
		controller.queue_free()
	controller = c
	add_child(c)
