extends TestCase
## 기본 공격: 공격 간격, 사거리, 접근, 원거리 투사체.


func test_attack_interval() -> void:
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {"attack": 10.0, "attack_speed": 1.0})
	var t := spawn_dummy(Enums.Team.RED, Vector2(560, 500), {"max_hp": 5000.0})
	var hits := [0]
	a.attack.attack_landed.connect(func(_t): hits[0] += 1)
	a.attack_order = t
	await frames(180)
	eq(hits[0], 3, "공격 속도 1.0 이면 3초에 3번 (0.3초, 1.3초, 2.3초)")


func test_moves_into_range() -> void:
	var a := spawn_dummy(Enums.Team.BLUE, Vector2(300, 500), {"attack": 10.0, "move_speed": 300.0})
	var t := spawn_dummy(Enums.Team.RED, Vector2(800, 500), {})
	var hits := [0]
	a.attack.attack_landed.connect(func(_t): hits[0] += 1)
	a.attack_order = t
	await frames(30)
	eq(hits[0], 0, "사거리 밖에서는 공격하지 않음")
	check(a.global_position.x > 380.0, "대상에게 다가감")
	await frames(120)
	check(hits[0] >= 1, "사거리에 들어오면 공격")
	check(a.global_position.distance_to(t.global_position) <= a.attack.attack_range + t.radius + 5.0, "사거리 안에서 멈춤")


func test_ranged_projectile() -> void:
	var a := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var t := spawn_dummy(Enums.Team.RED, Vector2(650, 500), {"max_hp": 5000.0})
	a.attack_order = t
	await frames(30)
	near(t.health.hp, 5000.0, 0.01, "선딜레이(0.33초) + 비행(0.33초) 전에는 피해 없음")
	await frames(20)
	check(t.health.hp < 5000.0, "투사체가 맞아 피해")
	check(absf(a.global_position.x - 300.0) < 1.0, "사거리 안이면 움직이지 않음")


func test_projectile_target_dies() -> void:
	var a := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(100, 500))
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"max_hp": 5000.0})
	a.attack_order = t
	await frames(20)
	t.die(null)
	await frames(30)
	var fx := get_tree().get_first_node_in_group("effects_layer")
	var alive := fx.get_children().filter(func(n): return n is Projectile)
	eq(alive.size(), 0, "대상이 죽으면 투사체도 사라짐")
