class_name AIManager
extends Node
## AI 조작기를 만들고 난이도를 적용한다. PHASE 2 에서 팀 단위 판단(집중 공격 대상 공유)을 더한다.

var profile: AIProfile
var controllers: Array = []


func setup(difficulty: String) -> void:
	profile = DataRegistry.ai_profile(difficulty)


func attach(hero, home: Vector2, rally: Vector2, seed_value := 0) -> AIController:
	var c := AIController.new()
	c.name = "AIController"
	hero.set_controller(c)
	c.setup(profile, home, rally, seed_value)
	controllers.append(c)
	return c
