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


func _wall(r: Rect2) -> void:
	var body := StaticBody2D.new()
	body.collision_layer = 1
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = r.size
	shape.shape = rect
	shape.position = r.get_center()
	body.add_child(shape)
	world.add_child(body)


func test_wall_blocks_attacks() -> void:
	_wall(Rect2(480, 300, 40, 400))
	await frames(2)
	var a := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var t := spawn_dummy(Enums.Team.RED, Vector2(650, 500), {"max_hp": 5000.0})
	check(not a.attack.in_range(t), "벽 너머는 사거리 밖")
	t.status.apply(load("res://data/status/stun.tres"), 10.0, 0.0)
	a.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT))
	await frames(40)
	near(t.health.hp, 5000.0, 0.01, "직선 투사체가 벽에 막힘")
	# 시험용 월드에는 길찾기 영역이 없어 돌아가지는 못한다. 벽 너머로는 공격하지 않는지만 본다.
	a.attack_order = t
	await frames(120)
	near(t.health.hp, 5000.0, 0.01, "벽 너머로는 기본 공격하지 않음")


func test_dash_dodges_homing_attack() -> void:
	var a := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(200, 500))
	var t := spawn_hero("blade_master", Enums.Team.RED, Vector2(560, 500))
	a.attack_order = t
	var fx := get_tree().get_first_node_in_group("effects_layer")
	var flying: Array = []
	for i in 40:
		await frames(1)
		flying = fx.get_children().filter(func(n): return n is Projectile)
		if not flying.is_empty():
			break
	eq(flying.size(), 1, "기본 공격 투사체 발사")
	a.attack_order = null
	var hp := t.health.hp
	t.skill_caster.cast(0, CastAim.toward(Vector2.DOWN))
	await frames(40)
	near(t.health.hp, hp, 0.01, "돌진하면 따라오던 투사체를 피함")
