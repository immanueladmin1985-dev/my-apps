class_name TestCase
extends Node
## 시험의 기반. test_ 로 시작하는 함수를 차례로 실행한다. 함수 안에서 await 를 써도 된다.

const HERO_SCENE := preload("res://scenes/heroes/hero.tscn")

var failures: Array = []
var current := ""
var world: Node2D = null


func check(cond: bool, msg: String) -> void:
	if not cond:
		failures.append("%s: %s" % [current, msg])


func eq(actual, expected, msg := "") -> void:
	check(actual == expected, "%s (기대 %s, 실제 %s)" % [msg, str(expected), str(actual)])


func near(actual: float, expected: float, eps := 0.01, msg := "") -> void:
	check(absf(actual - expected) <= eps, "%s (기대 %.3f, 실제 %.3f)" % [msg, expected, actual])


func frames(n := 1) -> void:
	for i in n:
		await get_tree().physics_frame


func before_each() -> void:
	world = Node2D.new()
	world.name = "TestWorld"
	add_child(world)
	var fx := Node2D.new()
	fx.add_to_group("effects_layer")
	world.add_child(fx)
	CombatManager.rng.seed = 12345


func after_each() -> void:
	if world != null:
		world.queue_free()
		world = null
	await get_tree().process_frame


func spawn_hero(id: String, team: int, pos: Vector2) -> Hero:
	var h: Hero = HERO_SCENE.instantiate()
	world.add_child(h)
	h.global_position = pos
	h.setup(DataRegistry.hero(id), team)
	h.skill_caster.setup(h.data.skills, 1)
	return h


## 시험용으로 능력치를 직접 정한 영웅
func spawn_dummy(team: int, pos: Vector2, stats: Dictionary) -> Hero:
	var h := spawn_hero("blade_master", team, pos)
	var base := {"max_hp": 1000.0, "max_mp": 500.0, "attack": 100.0, "attack_speed": 1.0, "move_speed": 200.0, "crit_chance": 0.0}
	base.merge(stats, true)
	h.stats.setup(base, {})
	h.health.reset_full()
	h.mana.reset_full()
	return h
