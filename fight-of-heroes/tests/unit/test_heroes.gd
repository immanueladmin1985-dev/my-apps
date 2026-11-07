extends TestCase
## 영웅 10명: 모든 스킬을 실제로 써 보고, 패시브·순간이동·소환·은신·아군 지원·변신이 동작하는지.


func _learned(id: String, team: int, pos: Vector2, level := 1) -> Hero:
	var h := spawn_hero(id, team, pos)
	if level > 1:
		var cfg := DataRegistry.progression()
		var need := 0.0
		for l in range(1, level):
			need += cfg.xp_to_next(l)
		h.add_xp(need)
	h.skill_caster.setup(h.data.skills, 1)
	h.mana.mp = h.mana.max_mp()
	return h


func test_ten_heroes() -> void:
	var heroes := DataRegistry.get_all("heroes")
	eq(heroes.size(), 10, "영웅 10명")
	var roles := {}
	for h: HeroData in heroes:
		roles[h.preferred_role] = roles.get(h.preferred_role, 0) + 1
		check(h.passive is PassiveData, h.id + ": 패시브")
	check(roles.get("fighter", 0) >= 2 and roles.get("hunter", 0) >= 2 and roles.get("support", 0) >= 2, "역할이 고르게 있음 %s" % str(roles))


func test_every_hero_casts_every_skill() -> void:
	for data: HeroData in DataRegistry.get_all("heroes"):
		var h := _learned(data.id, Enums.Team.BLUE, Vector2(400, 500))
		var ally := spawn_dummy(Enums.Team.BLUE, Vector2(450, 560), {"max_hp": 3000.0})
		ally.health.hp = 1000.0
		var e := spawn_dummy(Enums.Team.RED, Vector2(560, 500), {"max_hp": 20000.0})
		var pc := PlayerController.new()
		h.set_controller(pc)
		for slot in 4:
			var r := h.skill_caster.cast(slot, pc.auto_aim(slot))
			eq(r, Enums.CastResult.OK, "%s %s 스킬" % [data.display_name, Enums.SLOT_KEYS[slot]])
			await frames(70)
			h.mana.mp = h.mana.max_mp()
		check(e.health.hp < 20000.0 or data.id == "saint" or data.id == "paladin", "%s 의 스킬이 적에게 피해를 줌" % data.display_name)
		for n in world.get_children():
			if n != world.get_child(0):
				n.queue_free()
		await frames(2)


func test_passives_trigger() -> void:
	for id in ["blade_master", "elf_archer", "fire_mage", "frost_mage", "monk", "assassin"]:
		var h := _learned(id, Enums.Team.BLUE, Vector2(400, 500))
		var e := spawn_dummy(Enums.Team.RED, h.global_position + Vector2(h.attack.attack_range * 0.8, 0), {"max_hp": 20000.0})
		e.health.hp = 8000.0  # 암살자 패시브: 체력 절반 아래
		h.attack_order = e
		await frames(400)
		check(h.get_node("Passive").procs >= 1, "%s 패시브 발동 (%d)" % [h.display_name, h.get_node("Passive").procs])
		h.queue_free()
		e.queue_free()
		await frames(2)


func test_paladin_aura_and_saint_blessing() -> void:
	var pal := _learned("paladin", Enums.Team.BLUE, Vector2(400, 500))
	var ally := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {"armor": 10.0})
	var saint := _learned("saint", Enums.Team.BLUE, Vector2(420, 600))
	ally.health.hp = 300.0
	await frames(70)
	near(ally.stats.get_stat("armor"), 22.0, 0.01, "성기사 근처 아군 방어력 +12")
	await frames(250)
	check(ally.health.hp > 300.0, "성녀의 축복으로 아군 회복 (%.0f)" % ally.health.hp)
	ally.global_position = Vector2(1500, 500)
	await frames(120)
	near(ally.stats.get_stat("armor"), 10.0, 0.01, "멀어지면 오라 사라짐")


func test_assassin_teleport_and_stealth() -> void:
	var a := _learned("assassin", Enums.Team.BLUE, Vector2(300, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(650, 500), {"max_hp": 5000.0})
	eq(a.skill_caster.cast(0, CastAim.at_unit(e)), Enums.CastResult.OK, "그림자 찌르기")
	check(a.global_position.x > 650.0, "대상 뒤로 순간이동 (%.0f)" % a.global_position.x)
	check(e.health.hp < 5000.0, "피해")
	a.global_position = Vector2(300, 500)
	a.skill_caster.cast(2, CastAim.new())
	check(a.status.is_stealthed(), "은신")
	check(Targeting.nearest(get_tree(), e.global_position, 1000.0, e.team, Enums.TargetTeam.ENEMY) == null, "적은 은신한 대상을 고를 수 없음")
	check(not Targeting.in_radius(get_tree(), a.global_position, 50.0, e.team, Enums.TargetTeam.ENEMY, true).is_empty(), "범위 공격에는 맞음")
	a.attack_order = e
	await frames(120)
	check(not a.status.is_stealthed(), "공격하면 은신이 풀림")


func test_summoner_summons_fight_and_expire() -> void:
	var s := _learned("summoner", Enums.Team.BLUE, Vector2(400, 500))
	var e := spawn_dummy(Enums.Team.RED, Vector2(560, 500), {"max_hp": 300.0})
	eq(s.skill_caster.cast(0, CastAim.new()), Enums.CastResult.OK, "해골 소환")
	await frames(2)
	var summons := get_tree().get_nodes_in_group("summons")
	eq(summons.size(), 2, "해골 2마리")
	for m in summons:
		eq(m.team, Enums.Team.BLUE, "소환수는 아군")
	await frames(600)
	check(e.is_dead, "소환수가 적을 처치")
	await frames(300)
	eq(get_tree().get_nodes_in_group("summons").filter(func(m): return is_instance_valid(m) and not m.is_dead).size(), 0, "14초 뒤 사라짐")


func test_summon_kill_credits_owner() -> void:
	var s := _learned("summoner", Enums.Team.BLUE, Vector2(400, 500))
	s.skill_caster.cast(0, CastAim.new())
	await frames(2)
	var m = get_tree().get_nodes_in_group("summons")[0]
	var victim := spawn_dummy(Enums.Team.RED, Vector2(900, 500), {"max_hp": 50.0})
	eq(ExperienceManager.credit_hero(victim, m), s, "소환수의 처치는 주인에게")


func test_dragon_form() -> void:
	var d := _learned("dragon_knight", Enums.Team.BLUE, Vector2(400, 500), 6)
	var range0 := d.attack.total_range()
	var hp0 := d.health.max_hp()
	eq(d.skill_caster.cast(3, CastAim.new()), Enums.CastResult.OK, "용 변신")
	near(d.attack.total_range(), range0 + 160.0, 0.01, "사거리 +160")
	near(d.health.max_hp(), hp0 + 300.0, 0.01, "최대 체력 +300")
	check(d.status.visual_scale() > 1.3, "몸이 커짐")
	var e := spawn_dummy(Enums.Team.RED, Vector2(600, 500), {"max_hp": 5000.0})
	d.attack_order = e
	await frames(60)
	check(e.health.hp < 5000.0, "변신하면 멀리서 기본 공격")


func test_saint_heals_ally_and_ai_uses_support() -> void:
	var saint := _learned("saint", Enums.Team.BLUE, Vector2(400, 500))
	var ally := _learned("blade_master", Enums.Team.BLUE, Vector2(600, 500))
	ally.health.hp = 200.0
	var pc := PlayerController.new()
	saint.set_controller(pc)
	var aim := pc.auto_aim(1)
	eq(aim.unit, ally, "치유는 체력이 가장 낮은 아군을 자동 조준")
	saint.skill_caster.cast(1, aim)
	check(ally.health.hp > 300.0, "아군 회복 (%.0f)" % ally.health.hp)
	pc.queue_free()
	await frames(2)
	var ai := AIController.new()
	saint.set_controller(ai)
	ai.setup(DataRegistry.ai_profile("normal"), Vector2(200, 500), Vector2(1200, 700))
	ai.profile = ai.profile.duplicate()
	ai.profile.skill_use_chance = 1.0
	saint.skill_caster.cooldowns[1] = 0.0
	ally.health.hp = 150.0
	var before := ally.health.hp
	ai.think()
	check(ally.health.hp > before, "AI 성녀가 다친 아군을 치유")


func test_teams_have_no_duplicates() -> void:
	for i in 5:
		var c := GameManager.default_config("monk")
		var all := Array(c.blue_heroes) + Array(c.red_heroes)
		var uniq := {}
		for id in all:
			uniq[id] = true
		eq(uniq.size(), 6, "6명 모두 다른 영웅 %s" % str(all))
		eq(c.blue_heroes[0], "monk", "플레이어 영웅")
