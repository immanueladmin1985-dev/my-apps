extends TestCase
## PHASE 15: 카메라(미니맵·얼굴로 보기), 총잡이 난사, 원거리 기공사, 강화·대상 스킬 효과

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func test_gunslinger_barrage() -> void:
	var g := spawn_hero("gunslinger", Enums.Team.BLUE, Vector2(400, 400))
	var e := spawn_dummy(Enums.Team.RED, Vector2(700, 400), {"max_hp": 50000.0})
	eq(g.skill_caster.cast(3, CastAim.toward(Vector2.RIGHT)), Enums.CastResult.OK, "난사 시전")
	await frames(6)
	var shots := _count_projectiles(g)
	check(shots >= 1 and shots < 16, "한 번에 다 쏘지 않고 나눠 쏨 (%d)" % shots)
	check(_barrage_running(), "난사 중")
	check(g.status.is_slowed(), "쏘는 동안 느려짐")
	var hp0 := e.health.hp
	await frames(160)
	check(e.health.hp < hp0, "총알이 맞음")
	var hits := 50000.0 - e.health.hp
	check(hits > 150.0, "여러 발이 맞음 (피해 %d)" % int(hits))
	check(not _barrage_running(), "다 쏘면 멈춤")


func test_barrage_stops_when_stunned() -> void:
	var g := spawn_hero("gunslinger", Enums.Team.BLUE, Vector2(400, 700))
	g.skill_caster.cast(3, CastAim.toward(Vector2.RIGHT))
	await frames(4)
	g.status.apply(load("res://data/status/stun.tres"), 3.0, 0.0, null)
	await frames(30)
	check(not _barrage_running(), "기절하면 난사가 멈춤")


func test_ki_master_is_ranged() -> void:
	var ki := spawn_hero("ki_master", Enums.Team.BLUE, Vector2(400, 1000))
	check(ki.data.is_ranged and ki.data.attack_range >= 300.0, "기공사는 원거리 기본 공격")
	eq(ki.data.attack_vfx, "ki", "기탄 효과")
	var e := spawn_dummy(Enums.Team.RED, Vector2(680, 1000), {"max_hp": 50000.0})
	ki.attack_order = e
	await frames(150)
	check(e.health.hp < 50000.0, "떨어진 적을 기본 공격으로 맞힘")


func test_self_buff_shows_effect() -> void:
	var ki := spawn_hero("ki_master", Enums.Team.BLUE, Vector2(400, 1300))
	var before := _fx_count()
	eq(ki.skill_caster.cast(2, CastAim.new()), Enums.CastResult.OK, "기 모으기")
	await frames(1)
	check(_fx_count() > before, "기 모으기 효과가 보임")
	check(ki.status.has("ki_charge"), "강화 상태")


func test_unit_target_skill_shows_beam() -> void:
	var sg := spawn_hero("star_girl", Enums.Team.BLUE, Vector2(400, 1600))
	var e := spawn_dummy(Enums.Team.RED, Vector2(600, 1600), {"max_hp": 50000.0})
	var before := _fx_count()
	eq(sg.skill_caster.cast(1, CastAim.at_unit(e)), Enums.CastResult.OK, "리본 속박")
	await frames(1)
	check(_fx_count() >= before + 2, "빛줄기와 터짐 효과")


func test_camera_look_and_focus() -> void:
	var cfg := GameManager.default_config("blade_master")
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var cam: Camera2D = battle.camera
	var me: Hero = battle.player_hero
	check(not battle.camera_away(), "처음에는 내 영웅을 봄")
	var spot := Vector2(2800, 1700)
	battle.hud.minimap.look_requested.emit(spot)
	await frames(2)
	check(cam.global_position.distance_to(spot) < 5.0, "미니맵을 누른 곳을 봄")
	check(battle.camera_away() and battle.hud.focus_button.visible, "내 영웅 보기 버튼")
	var ally: Hero = battle.hero_manager.team_heroes(Enums.Team.BLUE)[1]
	battle.hud.blue_status.hero_selected.emit(ally)
	await frames(2)
	check(cam.global_position.distance_to(ally.global_position) < 5.0, "얼굴을 누른 아군을 비춤")
	battle.player_controller.joystick = Vector2.RIGHT
	await frames(2)
	battle.player_controller.joystick = Vector2.ZERO
	check(not battle.camera_away(), "움직이면 내 영웅으로 돌아옴")
	check(cam.global_position.distance_to(me.global_position) < 40.0, "카메라가 내 영웅에게")
	# 미니맵 터치 좌표 → 맵 좌표
	var mm: Minimap = battle.hud.minimap
	var r := mm.get_global_rect()
	var w := mm.to_world(r.position + r.size * 0.5)
	check(w.distance_to(battle.map.size * 0.5) < 2.0, "미니맵 가운데 = 맵 가운데")
	battle.queue_free()


func test_spectator_free_camera() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	cfg.autoplay = true
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var red: Hero = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	battle.hud.red_status.hero_selected.emit(red)
	await frames(2)
	check(battle.camera.global_position.distance_to(red.global_position) < 5.0, "관전: 상대 영웅도 비출 수 있음")
	var ev := InputEventScreenDrag.new()
	ev.relative = Vector2(300, 0)
	battle._unhandled_input(ev)
	await frames(2)
	check(battle.free_look, "관전: 화면을 끌면 자유 시점")
	check(battle.camera.global_position.x < red.global_position.x - 100.0, "끈 만큼 움직임")
	battle.queue_free()


func _count_projectiles(owner) -> int:
	var n := 0
	for c in Targeting.effects_parent(owner).get_children():
		if c is Projectile and c.owner_unit == owner and not c.is_queued_for_deletion():
			n += 1
	return n


func _barrage_running() -> bool:
	for c in Targeting.effects_parent(self).get_children():
		if c is BarrageEffect.BarrageRunner and not c.is_queued_for_deletion():
			return true
	return false


func _fx_count() -> int:
	var n := 0
	for c in Targeting.effects_parent(self).get_children():
		if c is SkillFx:
			n += 1
	return n
