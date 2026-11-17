extends TestCase
## PHASE 17: 영웅마다 고유 장치 (게이지·재사용·처치 초기화·넉백·도발·수호·부활·얼음벽·덫·분신·탄창 등)


func _hero(id: String, pos: Vector2, team := Enums.Team.BLUE, rank := 1) -> Hero:
	var h := spawn_hero(id, team, pos)
	h.skill_caster.setup(h.data.skills, rank)
	h.mana.mp = h.mana.max_mp()
	return h


func _summons(owner, id: String) -> Array:
	return SummonEffect.alive_of(owner, id)


func test_ninja_single_clone_mirrors_and_swaps() -> void:
	var n := _hero("ninja", Vector2(400, 400), Enums.Team.BLUE, 4)
	spawn_dummy(Enums.Team.RED, Vector2(900, 400), {"max_hp": 50000.0})
	eq(n.skill_caster.cast(1, CastAim.new()), Enums.CastResult.OK, "분신술")
	await frames(2)
	var clones := _summons(n, "shadow_clone")
	eq(clones.size(), 1, "분신 하나")
	var c: Monster = clones[0]
	near(c.health.max_hp(), n.health.max_hp() * 0.48, 1.0, "4단계: 본체 체력의 48%")
	near(c.stats.get_stat("attack"), n.stats.get_stat("attack") * 0.48, 0.5, "공격력도 48%")
	# 수리검 부채: 분신도 따라 던진다
	c.global_position = Vector2(400, 600)
	var before := get_tree().get_nodes_in_group("effects_layer")[0].get_children().filter(func(p): return p is Projectile and p.owner_unit == c).size()
	n.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT))
	await frames(2)
	var mine := get_tree().get_nodes_in_group("effects_layer")[0].get_children().filter(func(p): return p is Projectile and p.owner_unit == c)
	check(mine.size() > before, "분신이 수리검을 따라 던짐 (%d)" % mine.size())
	# 다시 누르면 자리를 바꾼다
	await frames(20)
	check(n.skill_caster.is_recasting(1), "분신술 재사용 대기")
	var np := n.global_position
	var cp := c.global_position
	eq(n.skill_caster.cast(1, CastAim.new()), Enums.CastResult.OK, "자리 바꾸기")
	check(n.global_position.distance_to(cp) < 2.0 and c.global_position.distance_to(np) < 2.0, "분신과 자리를 바꿈")


func test_summoner_army_cap_and_raise_dead() -> void:
	var s := _hero("summoner", Vector2(400, 800), Enums.Team.BLUE, 4)
	for i in 3:
		s.skill_caster.cooldowns[0] = 0.0
		s.mana.mp = s.mana.max_mp()
		s.skill_caster.cast(0, CastAim.new())
		await frames(2)
	eq(_summons(s, "skeleton").size(), 6, "해골은 최대 6마리")
	var e := spawn_dummy(Enums.Team.RED, Vector2(600, 800), {"max_hp": 10.0})
	for m in _summons(s, "skeleton"):
		m.die(null)
	await frames(3)
	e.die(s)
	await frames(2)
	eq(_summons(s, "skeleton").size(), 1, "쓰러진 적 자리에서 해골을 일으킴")
	check(_summons(s, "skeleton")[0].global_position.distance_to(Vector2(600, 800)) < 40.0, "쓰러진 자리")


func test_blade_master_sword_qi_and_reset() -> void:
	var b := _hero("blade_master", Vector2(400, 1200))
	var e := spawn_dummy(Enums.Team.RED, Vector2(460, 1200), {"max_hp": 50000.0})
	b.attack_order = e
	await frames(400)
	check(b.gauge >= 4.0, "기본 공격으로 검기가 쌓임 (%.0f)" % b.gauge)
	b.attack_order = null
	b.skill_caster.ranks[3] = 1
	var hp0 := e.health.hp
	b.set_gauge(5.0)
	b.skill_caster.cast(3, CastAim.toward(Vector2.RIGHT))
	await frames(40)
	var with_qi := hp0 - e.health.hp
	eq(b.gauge, 0.0, "일섬이 검기를 모두 씀")
	check(with_qi > 0.0, "일섬 피해")
	# 돌진 베기로 처치하면 바로 다시 쓸 수 있다
	b.global_position = Vector2(400, 1400)
	var weak := spawn_dummy(Enums.Team.RED, Vector2(520, 1400), {"max_hp": 10.0})
	b.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT))
	await frames(30)
	check(weak.is_dead, "약한 적 처치")
	eq(b.skill_caster.cooldowns[0], 0.0, "처치하면 돌진 베기 재사용 대기시간이 끝남")


func test_assassin_backstab_and_execute() -> void:
	var a := _hero("assassin", Vector2(400, 1700))
	var e := spawn_dummy(Enums.Team.RED, Vector2(460, 1700), {"max_hp": 50000.0, "armor": 0.0})
	near(a.stats.get_stat("backstab"), 0.4, 0.001, "뒤치기 +40%")
	e.facing = Vector2.LEFT  # 암살자를 보고 있음
	var info := DamageInfo.new(a, 100.0, Enums.DamageType.PHYSICAL)
	var front := CombatManager.compute(e, info)
	e.facing = Vector2.RIGHT  # 등을 보임
	var info2 := DamageInfo.new(a, 100.0, Enums.DamageType.PHYSICAL)
	var back := CombatManager.compute(e, info2)
	near(back, front * 1.4, 0.5, "뒤에서 치면 40% 더 셈")
	check(info2.is_backstab, "뒤치기 표시")
	# 처형: 잃은 체력만큼 세지고, 처치하면 바로 다시
	a.skill_caster.ranks[3] = 1
	var weak := spawn_dummy(Enums.Team.RED, Vector2(600, 1700), {"max_hp": 1000.0, "armor": 0.0})
	weak.health.hp = 150.0
	a.skill_caster.cast(3, CastAim.at_unit(weak))
	check(weak.is_dead, "처형")
	eq(a.skill_caster.cooldowns[3], 0.0, "처치하면 처형 재사용 대기시간이 끝남")


func test_dragon_tail_knocks_into_wall() -> void:
	var wall := StaticBody2D.new()
	var cs := CollisionShape2D.new()
	var rs := RectangleShape2D.new()
	rs.size = Vector2(40, 400)
	cs.shape = rs
	wall.add_child(cs)
	world.add_child(wall)
	wall.global_position = Vector2(700, 2100)
	await frames(2)
	var d := _hero("dragon_knight", Vector2(500, 2100))
	var e := spawn_dummy(Enums.Team.RED, Vector2(580, 2100), {"max_hp": 50000.0})
	d.set_gauge(100.0)
	d.skill_caster.ranks[3] = 1
	eq(d.skill_caster.cast(3, CastAim.new()), Enums.CastResult.OK, "용 변신")
	eq(d.skill_caster.cast(0, CastAim.new()), Enums.CastResult.OK, "꼬리치기")
	await frames(30)
	check(e.global_position.x > 600.0, "밀려남 (%.0f)" % e.global_position.x)
	check(e.status.is_stunned(), "벽에 부딪혀 기절")


func test_elf_far_bonus_and_traps() -> void:
	var el := _hero("elf_archer", Vector2(400, 2500))
	near(el.attack.far_bonus, 0.2, 0.001, "거리 보너스")
	var t := _hero("elf_archer", Vector2(1400, 2500))
	t.skill_caster.setup(t.data.skills, 1)
	for i in 4:
		el.skill_caster.cooldowns[1] = 0.0
		el.mana.mp = el.mana.max_mp()
		el.skill_caster.cast(1, CastAim.at_point(Vector2(500 + i * 60, 2700)))
	await frames(2)
	eq(get_tree().get_nodes_in_group("traps").filter(func(x): return not x.is_queued_for_deletion()).size(), 3, "덫은 최대 3개")
	var victim := spawn_dummy(Enums.Team.RED, Vector2(1000, 2700), {"max_hp": 5000.0})
	await frames(45)
	victim.global_position = Vector2(680, 2700)
	await frames(3)
	check(victim.health.hp < 5000.0 and victim.status.is_stunned(), "적이 밟으면 터져 기절")
	check(t != null, "끝")


func test_fire_detonate_and_frost_freeze() -> void:
	var f := _hero("fire_mage", Vector2(400, 2900))
	var e := spawn_dummy(Enums.Team.RED, Vector2(600, 2900), {"max_hp": 50000.0, "magic_resist": 0.0})
	var q: SkillData = f.skill_caster.get_skill(0)
	var dmg_eff: DamageEffect = null
	for x in q.effects[0].effects:
		if x is DamageEffect:
			dmg_eff = x
	var ctx := SkillContext.new()
	ctx.caster = f
	ctx.skill = q
	ctx.rank = 1
	ctx.target_unit = e
	var hp0 := e.health.hp
	dmg_eff.apply(ctx)
	var plain := hp0 - e.health.hp
	e.status.apply(load("res://data/status/burn.tres"), 3.0, 10.0, f)
	hp0 = e.health.hp
	dmg_eff.apply(ctx)
	var boom := hp0 - e.health.hp
	check(boom > plain * 1.5, "불타는 적은 화상이 터져 더 큰 피해 (%.0f > %.0f)" % [boom, plain])
	check(not e.status.has("burn"), "화상을 터뜨림")
	# 빙결술사: 냉기 3번이면 얼어붙음
	var fr := _hero("frost_mage", Vector2(400, 3100))
	var e2 := spawn_dummy(Enums.Team.RED, Vector2(600, 3100), {"max_hp": 50000.0})
	fr.attack_order = e2
	var frozen := false
	for i in 300:
		await frames(1)
		if e2.status.has("freeze"):
			frozen = true
			break
	check(frozen, "냉기 3번 쌓이면 빙결")


func test_ice_wall_blocks() -> void:
	var fr := _hero("frost_mage", Vector2(400, 3400))
	fr.skill_caster.cast(2, CastAim.at_point(Vector2(600, 3400)))
	await frames(2)
	var walls := get_tree().get_nodes_in_group("temp_walls")
	eq(walls.size(), 1, "얼음벽")
	var runner := spawn_dummy(Enums.Team.RED, Vector2(800, 3400), {"move_speed": 300.0})
	runner.move_input = Vector2.LEFT
	await frames(60)
	check(runner.global_position.x > 610.0, "얼음벽을 지나가지 못함 (%.0f)" % runner.global_position.x)
	await frames(200)
	eq(get_tree().get_nodes_in_group("temp_walls").filter(func(w): return not w.is_queued_for_deletion()).size(), 0, "시간이 지나면 녹음")


func test_gunslinger_magazine() -> void:
	var g := _hero("gunslinger", Vector2(400, 3800))
	eq(g.attack.magazine, 6, "탄창 6발")
	var e := spawn_dummy(Enums.Team.RED, Vector2(700, 3800), {"max_hp": 50000.0})
	g.attack_order = e
	var reloaded := false
	for i in 600:
		await frames(1)
		if g.attack.reloading:
			reloaded = true
			break
	check(reloaded, "6발을 쏘면 재장전")
	g.attack_order = null
	g.attack.reload_now()
	check(not g.attack.reloading and g.attack.ammo == 6, "구르기(재장전 효과)로 바로 채움")


func test_ki_gauge_and_close_punch() -> void:
	var k := _hero("ki_master", Vector2(400, 4200))
	var e := spawn_dummy(Enums.Team.RED, Vector2(480, 4200), {"max_hp": 50000.0})
	k.attack_order = e
	await frames(200)
	check(k.gauge >= 20.0, "공격하면 기가 참 (%.0f)" % k.gauge)
	var shots := get_tree().get_nodes_in_group("effects_layer")[0].get_children().filter(func(p): return p is Projectile and p.owner_unit == k)
	eq(shots.size(), 0, "가까운 적은 기탄 대신 주먹")
	check(e.health.hp < 50000.0, "주먹 피해")


func test_mechanic_turrets_and_repair() -> void:
	var m := _hero("mechanic", Vector2(400, 4600))
	for i in 4:
		m.skill_caster.cooldowns[0] = 0.0
		m.mana.mp = m.mana.max_mp()
		m.skill_caster.cast(0, CastAim.at_point(Vector2(450 + i * 50, 4600)))
		await frames(2)
	eq(_summons(m, "turret").size(), 3, "포탑은 최대 3개")
	var t: Monster = _summons(m, "turret")[0]
	t.health.hp = 50.0
	m.skill_caster.cast(2, CastAim.new())
	check(t.health.hp > 50.0, "정비 드론이 포탑을 수리")
	check(t.status.has("overdrive"), "포탑 과부하")


func test_monk_combo_and_shoulder_bash() -> void:
	var mk := _hero("monk", Vector2(400, 5000))
	var e := spawn_dummy(Enums.Team.RED, Vector2(470, 5000), {"max_hp": 50000.0})
	mk.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT))
	await frames(20)
	check(mk.gauge >= 1.0, "스킬을 쓰면 연계가 쌓임")
	mk.global_position = Vector2(400, 5000)
	e.global_position = Vector2(470, 5000)
	var x0 := e.global_position.x
	mk.skill_caster.cast(2, CastAim.toward(Vector2.RIGHT))
	await frames(40)
	check(e.global_position.x > x0 + 120.0, "철산고로 밀려남 (%.0f)" % (e.global_position.x - x0))


func test_paladin_taunt_and_guard() -> void:
	var p := _hero("paladin", Vector2(400, 5400))
	var foe := spawn_dummy(Enums.Team.RED, Vector2(520, 5400), {"max_hp": 50000.0})
	var other := spawn_dummy(Enums.Team.BLUE, Vector2(560, 5480), {"max_hp": 50000.0})
	foe.attack_order = other
	p.skill_caster.cast(0, CastAim.new())
	await frames(2)
	check(foe.status.taunt_source() == p, "도발")
	eq(foe.attack_order, p, "도발당하면 성기사만 공격")
	# 수호: 아군이 받는 피해의 30% 를 대신 받음
	var ally := spawn_dummy(Enums.Team.BLUE, Vector2(400, 5600), {"max_hp": 5000.0, "armor": 0.0})
	p.skill_caster.cast(1, CastAim.at_unit(ally))
	ally.health.shields.clear()
	var php := p.health.hp
	var info := DamageInfo.new(foe, 1000.0, Enums.DamageType.TRUE)
	CombatManager.apply_damage(ally, info)
	near(5000.0 - ally.health.hp, 700.0, 1.0, "아군은 70% 만 받음")
	check(p.health.hp < php, "성기사가 나머지를 받음")


func test_reaper_souls_and_execute() -> void:
	var r := _hero("reaper", Vector2(400, 5900))
	var atk0 := r.stats.get_stat("attack")
	var victim := _hero("blade_master", Vector2(600, 5900), Enums.Team.RED)
	EventBus.hero_killed.emit(victim, r, [])
	eq(r.gauge, 2.0, "처치하면 영혼 2개")
	near(r.stats.get_stat("attack"), atk0 + 8.0, 0.01, "영혼 하나당 공격력 +4")
	r.die(null)
	eq(r.gauge, 1.0, "죽으면 절반을 잃음")
	r.respawn_at(Vector2(400, 5900))
	r.skill_caster.ranks[3] = 1
	r.mana.mp = r.mana.max_mp()
	var low := spawn_dummy(Enums.Team.RED, Vector2(650, 5900), {"max_hp": 100000.0})
	low.health.hp = 12000.0  # 12%
	eq(r.skill_caster.cast(3, CastAim.at_unit(low)), Enums.CastResult.OK, "사형 선고")
	check(low.is_dead, "체력 15% 아래면 그대로 쓰러뜨림")


func test_saint_revive_and_overheal() -> void:
	var s := _hero("saint", Vector2(400, 6300))
	var ally := _hero("blade_master", Vector2(700, 6300))
	ally.die(null)
	ally.respawn_left = 20.0
	s.skill_caster.ranks[3] = 1
	eq(s.skill_caster.cast(3, CastAim.new()), Enums.CastResult.OK, "부활의 기도")
	check(not ally.is_dead, "쓰러진 아군을 되살림")
	check(ally.global_position.distance_to(Vector2(700, 6300)) < 2.0, "쓰러진 자리에서")
	# 넘친 회복은 보호막
	var full := spawn_dummy(Enums.Team.BLUE, Vector2(450, 6300), {"max_hp": 1000.0})
	s.skill_caster.cast(1, CastAim.at_unit(full))
	check(full.health.shield_total() > 0.0, "넘친 회복이 보호막이 됨")


func test_star_girl_boomerang_chain_and_link() -> void:
	var sg := _hero("star_girl", Vector2(400, 6700))
	var e := spawn_dummy(Enums.Team.RED, Vector2(700, 6700), {"max_hp": 50000.0})
	sg.skill_caster.cast(0, CastAim.toward(Vector2.RIGHT))
	var hits := 0
	var last := e.health.hp
	for i in 120:
		await frames(1)
		if e.health.hp < last:
			hits += 1
			last = e.health.hp
	eq(hits, 2, "별 부메랑은 가고 오면서 두 번 맞힘")
	# 리본 속박: 근처의 다른 적을 끌어당겨 함께 기절
	var e2 := spawn_dummy(Enums.Team.RED, Vector2(700, 6950), {"max_hp": 50000.0})
	var d0 := e2.global_position.distance_to(e.global_position)
	sg.skill_caster.cast(1, CastAim.at_unit(e))
	await frames(30)
	check(e.status.is_stunned() and e2.status.is_stunned(), "둘 다 기절")
	check(e2.global_position.distance_to(e.global_position) < d0 - 80.0, "끌어당김")
	# 리본 연결: 다시 누르면 연결된 아군 곁으로
	var ally := spawn_dummy(Enums.Team.BLUE, Vector2(300, 7100), {"max_hp": 5000.0})
	eq(sg.skill_caster.cast(2, CastAim.at_unit(ally)), Enums.CastResult.OK, "리본 연결")
	check(ally.status.has("ribbon_link"), "연결")
	await frames(20)
	eq(sg.skill_caster.cast(2, CastAim.new()), Enums.CastResult.OK, "연결된 아군에게 날아감")
	check(sg.global_position.distance_to(ally.global_position) < 80.0, "아군 곁")


func test_kill_target_stepper() -> void:
	var old: int = int(SaveManager.get_setting("kill_target", 15))
	SaveManager.set_setting("kill_target", 15)
	var row := UiKit.kill_stepper()
	add_child(row)
	row.get_node("Plus").pressed.emit()
	row.get_node("Plus").pressed.emit()
	eq(int(SaveManager.get_setting("kill_target", 0)), 17, "+ 를 누르면 1씩 늘어남")
	eq(row.get_node("Value").text, "17", "숫자 표시")
	SaveManager.set_setting("kill_target", 0)
	row.get_node("Minus").pressed.emit()
	eq(int(SaveManager.get_setting("kill_target", -1)), 0, "무제한(0) 아래로는 내려가지 않음")
	row.queue_free()
	SaveManager.set_setting("kill_target", old)


func test_round_pillars_block() -> void:
	var m := DataRegistry.map_data("valley_02")
	check(m.pillars.size() >= 10, "둥근 기둥 %d개" % m.pillars.size())
	var arena := Arena.new()
	world.add_child(arena)
	arena.build(m)
	await frames(2)
	var pl: Vector3 = m.pillars[0]
	var runner := spawn_dummy(Enums.Team.RED, Vector2(pl.x + pl.z + 60.0, pl.y), {"move_speed": 300.0})
	runner.move_input = Vector2.LEFT
	await frames(40)
	check(runner.global_position.distance_to(Vector2(pl.x, pl.y)) > pl.z, "기둥을 지나가지 못함")
	check(not Targeting.has_line_of_sight(runner, Vector2(pl.x - pl.z - 50.0, pl.y), Vector2(pl.x + pl.z + 50.0, pl.y)), "기둥 너머는 보이지 않음 (투사체가 막힘)")


func test_permanent_elixir() -> void:
	var h := _hero("blade_master", Vector2(400, 7400))
	var shop := ShopManager.new()
	add_child(shop)
	h.gold = 5000
	var atk0 := h.stats.get_stat("attack")
	var e := ItemManager.get_item("strength_elixir")
	check(e != null and e.permanent, "힘의 비약")
	eq(shop.check_buy(h, e).price, 1500, "처음 값")
	eq(shop.buy(h, "strength_elixir"), ShopManager.Result.OK, "사기")
	near(h.stats.get_stat("attack"), atk0 + 10.0, 0.01, "공격력이 영구히 +10")
	eq(h.inventory.count_of("strength_elixir"), 0, "칸을 차지하지 않음")
	eq(shop.check_buy(h, e).price, 1750, "마실 때마다 값이 오름")
	shop.buy(h, "strength_elixir")
	near(h.stats.get_stat("attack"), atk0 + 20.0, 0.01, "두 번 마시면 +20")
	h.die(null)
	h.respawn_at(Vector2(400, 7400))
	near(h.stats.get_stat("attack"), atk0 + 20.0, 0.01, "죽어도 남음")
	shop.queue_free()


func test_unlimited_kills() -> void:
	var old: int = int(SaveManager.get_setting("kill_target", 15))
	SaveManager.set_setting("kill_target", 1)
	var row := UiKit.kill_stepper()
	add_child(row)
	row.get_node("Minus").pressed.emit()
	eq(int(SaveManager.get_setting("kill_target", -1)), 0, "1 에서 − 를 누르면 무제한(0)")
	eq(row.get_node("Value").text, "무제한", "무제한 표시")
	row.queue_free()
	SaveManager.set_setting("kill_target", old)
	var bm := BattleManager.new()
	add_child(bm)
	var cfg := MatchConfig.new()
	cfg.kill_target = 0
	var hm := HeroManager.new()
	add_child(hm)
	bm.setup(cfg, hm)
	bm.kills[Enums.Team.BLUE] = 999
	var a := _hero("blade_master", Vector2(400, 7700))
	var v := _hero("blade_master", Vector2(500, 7700), Enums.Team.RED)
	v.die(a)
	check(not bm.match_over, "무제한이면 킬 수로 끝나지 않음")
	bm.queue_free()
	hm.queue_free()
