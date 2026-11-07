extends TestCase
## 피해 공식, 치명타, 관통, 보호막, 사망.


func test_mitigation_formula() -> void:
	near(CombatManager.mitigation(0.0), 1.0, 0.0001, "방어력 0")
	near(CombatManager.mitigation(100.0), 0.5, 0.0001, "방어력 100")
	near(CombatManager.mitigation(-50.0), 2.0 - 100.0 / 150.0, 0.0001, "방어력 -50")


func test_physical_and_magic_damage() -> void:
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"armor": 100.0, "magic_resist": 50.0})
	CombatManager.apply_damage(t, DamageInfo.new(null, 100.0, Enums.DamageType.PHYSICAL))
	near(t.health.hp, 950.0, 0.01, "물리 100 → 50")
	CombatManager.apply_damage(t, DamageInfo.new(null, 150.0, Enums.DamageType.MAGIC))
	near(t.health.hp, 850.0, 0.01, "마법 150 → 100")
	CombatManager.apply_damage(t, DamageInfo.new(null, 30.0, Enums.DamageType.TRUE))
	near(t.health.hp, 820.0, 0.01, "고정 피해")


func test_penetration() -> void:
	var src := spawn_dummy(Enums.Team.BLUE, Vector2(100, 100), {"armor_pen": 50.0})
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"armor": 100.0})
	CombatManager.apply_damage(t, DamageInfo.new(src, 150.0, Enums.DamageType.PHYSICAL))
	near(t.health.hp, 900.0, 0.01, "관통 50 → 방어력 50")


func test_critical_hit() -> void:
	var src := spawn_dummy(Enums.Team.BLUE, Vector2(100, 100), {"crit_chance": 1.0, "crit_damage": 2.0})
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {})
	var info := DamageInfo.new(src, 100.0, Enums.DamageType.PHYSICAL)
	info.can_crit = true
	var dealt := CombatManager.apply_damage(t, info)
	check(info.is_crit, "치명타 판정")
	near(dealt, 200.0, 0.01, "치명타 배율 2")
	var info2 := DamageInfo.new(src, 100.0, Enums.DamageType.PHYSICAL)
	CombatManager.apply_damage(t, info2)
	check(not info2.is_crit, "치명타 불가 피해는 치명타가 나지 않음")


func test_shield_absorbs_first() -> void:
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {})
	t.health.add_shield(150.0, 5.0)
	CombatManager.apply_damage(t, DamageInfo.new(null, 100.0, Enums.DamageType.TRUE))
	near(t.health.hp, 1000.0, 0.01, "보호막이 모두 막음")
	near(t.health.shield_total(), 50.0, 0.01, "남은 보호막")
	CombatManager.apply_damage(t, DamageInfo.new(null, 100.0, Enums.DamageType.TRUE))
	near(t.health.hp, 950.0, 0.01, "남은 피해만 체력에")
	near(t.health.shield_total(), 0.0, 0.01, "보호막 소진")


func test_shield_expires() -> void:
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {})
	t.health.add_shield(100.0, 0.5)
	await frames(40)
	near(t.health.shield_total(), 0.0, 0.01, "0.5초 뒤 보호막 사라짐")


func test_death_once() -> void:
	var t := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {"max_hp": 100.0})
	var deaths := [0]
	t.died.connect(func(_k): deaths[0] += 1)
	CombatManager.apply_damage(t, DamageInfo.new(null, 300.0, Enums.DamageType.TRUE))
	check(t.is_dead, "사망")
	near(t.health.hp, 0.0, 0.001, "체력은 0 아래로 내려가지 않음")
	var again := CombatManager.apply_damage(t, DamageInfo.new(null, 50.0, Enums.DamageType.TRUE))
	near(again, 0.0, 0.001, "죽은 유닛은 피해를 받지 않음")
	eq(deaths[0], 1, "사망 신호 한 번")
	check(Targeting.nearest(get_tree(), t.global_position, 100.0, Enums.Team.BLUE, Enums.TargetTeam.ENEMY) == null, "죽은 유닛은 대상이 되지 않음")
