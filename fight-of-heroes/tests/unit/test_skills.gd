extends TestCase
## 스킬: 시전 조건(마나, 쿨타임, 사거리)과 효과 종류(돌진, 범위, 투사체, 지연 범위, 지속 범위, 보호막).


func test_no_mana_changes_nothing() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	h.mana.mp = 10.0
	eq(h.skill_caster.cast(1, CastAim.new()), Enums.CastResult.NO_MANA, "마나 부족")
	near(h.mana.mp, 10.0, 0.001, "마나 그대로")
	near(h.skill_caster.cooldowns[1], 0.0, 0.001, "쿨타임 그대로")


func test_cast_spends_mana_and_starts_cooldown() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	var mp := h.mana.mp
	eq(h.skill_caster.cast(1, CastAim.new()), Enums.CastResult.OK, "회전베기 시전")
	near(h.mana.mp, mp - 50.0, 0.01, "마나 50 차감")
	near(h.skill_caster.cooldowns[1], 10.0, 0.01, "쿨타임 10초")
	eq(h.skill_caster.cast(1, CastAim.new()), Enums.CastResult.COOLDOWN, "쿨타임 중")
	await frames(30)
	near(h.skill_caster.cooldowns[1], 9.5, 0.02, "쿨타임이 줄어듦")


func test_unit_target_range() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	var s := SkillData.new()
	s.id = "test_unit"
	s.target_mode = Enums.TargetMode.UNIT
	s.cast_range = 200.0
	s.mana_cost = PackedFloat32Array([10.0])
	s.cooldown = PackedFloat32Array([5.0])
	var dmg := DamageEffect.new()
	dmg.damage_type = Enums.DamageType.TRUE
	dmg.base = PackedFloat32Array([100.0])
	s.effects = [dmg]
	h.skill_caster.skills[0] = s
	var far := spawn_dummy(Enums.Team.RED, Vector2(900, 500), {})
	var near_t := spawn_dummy(Enums.Team.RED, Vector2(650, 500), {})
	var ally := spawn_dummy(Enums.Team.BLUE, Vector2(600, 500), {})
	eq(h.skill_caster.cast(0, CastAim.at_unit(far)), Enums.CastResult.OUT_OF_RANGE, "사거리 밖")
	eq(h.skill_caster.cast(0, CastAim.at_unit(ally)), Enums.CastResult.NO_TARGET, "아군은 대상 아님")
	eq(h.skill_caster.cast(0, CastAim.at_unit(null)), Enums.CastResult.NO_TARGET, "대상 없음")
	near(h.skill_caster.cooldowns[0], 0.0, 0.001, "실패하면 쿨타임 없음")
	eq(h.skill_caster.cast(0, CastAim.at_unit(near_t)), Enums.CastResult.OK, "사거리 안")
	near(near_t.health.hp, 900.0, 0.01, "피해 적용")


func test_dash_damages_enemies_on_path() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(650, 510), {})
	var off_path := spawn_dummy(Enums.Team.RED, Vector2(650, 700), {})
	eq(h.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT)), Enums.CastResult.OK, "돌진 베기")
	await frames(30)
	near(h.global_position.x, 760.0, 6.0, "260 만큼 돌진")
	check(e.health.hp < 1000.0, "길 위의 적이 피해")
	near(off_path.health.hp, 1000.0, 0.01, "길 밖의 적은 그대로")


func test_area_damage_and_slow() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	var inside := spawn_dummy(Enums.Team.RED, Vector2(600, 500), {})
	var outside := spawn_dummy(Enums.Team.RED, Vector2(700, 500), {})
	h.skill_caster.cast(1, CastAim.new())
	check(inside.health.hp < 1000.0, "범위 안 피해")
	check(inside.status.is_slowed(), "범위 안 둔화")
	near(outside.health.hp, 1000.0, 0.01, "범위 밖은 그대로")


func test_piercing_projectile() -> void:
	var h := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var a := spawn_dummy(Enums.Team.RED, Vector2(500, 500), {})
	var b := spawn_dummy(Enums.Team.RED, Vector2(700, 505), {})
	var ally := spawn_dummy(Enums.Team.BLUE, Vector2(600, 500), {})
	eq(h.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT)), Enums.CastResult.OK, "관통 화살")
	await frames(40)
	check(a.health.hp < 1000.0 and b.health.hp < 1000.0, "일직선의 적 둘 다 맞음")
	near(ally.health.hp, 1000.0, 0.01, "아군은 맞지 않음")


func test_delayed_trap_stuns() -> void:
	var h := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(600, 500), {})
	eq(h.skill_caster.cast(1, CastAim.at_point(e.global_position)), Enums.CastResult.OK, "가시 덫")
	await frames(10)
	near(e.health.hp, 1000.0, 0.01, "예고 시간에는 피해 없음")
	await frames(35)
	check(e.health.hp < 1000.0, "0.6초 뒤 피해")
	check(e.status.is_stunned(), "기절")


func test_point_is_clamped_to_range() -> void:
	var h := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(1300, 500), {})
	h.skill_caster.cast(1, CastAim.at_point(e.global_position))
	await frames(45)
	near(e.health.hp, 1000.0, 0.01, "사거리(550)보다 먼 곳은 사거리 끝에 놓임")


func test_lingering_area_ticks() -> void:
	var h := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(300, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(700, 500), {"max_hp": 5000.0})
	var hits := [0]
	var counter := func(t, _i, _a): if t == e: hits[0] += 1
	EventBus.unit_damaged.connect(counter)
	eq(h.skill_caster.cast(3, CastAim.at_point(e.global_position)), Enums.CastResult.OK, "화살비")
	await frames(220)
	EventBus.unit_damaged.disconnect(counter)
	check(hits[0] >= 6, "0.5초마다 반복 피해 (%d번)" % hits[0])
	check(hits[0] <= 7, "3초 뒤 끝남 (%d번)" % hits[0])


func test_shield_and_haste_on_self() -> void:
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(500, 500))
	var speed := h.get_move_speed()
	eq(h.skill_caster.cast(2, CastAim.new()), Enums.CastResult.OK, "검기 방어")
	check(h.health.shield_total() > 90.0, "보호막")
	check(h.get_move_speed() > speed * 1.15, "가속")


func test_escape_leap() -> void:
	var h := spawn_hero("elf_archer", Enums.Team.BLUE, Vector2(800, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(900, 500), {})
	var pc := PlayerController.new()
	h.set_controller(pc)
	var aim := pc.auto_aim(2)
	check(aim.direction.x < 0.0, "빠르게 누르면 적의 반대쪽으로 조준")
	h.skill_caster.cast(2, aim)
	await frames(30)
	check(h.global_position.x < 560.0, "뒤로 280 도약 (%.0f)" % h.global_position.x)
	check(h.status.has("haste"), "도약 뒤 가속")
	check(e.global_position.x == 900.0, "적은 그대로")
