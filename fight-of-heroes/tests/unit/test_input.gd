extends TestCase
## 터치 입력: 조이스틱 이동, 조이스틱과 스킬 버튼 동시 누르기, 끌어서 조준, 취소 영역, 공격 버튼, 적 누르기.

const BATTLE := preload("res://scenes/battlefield/battle.tscn")

var battle: Node
var hud
var hero: Hero
var enemy: Hero


func before_each() -> void:
	var cfg := GameManager.default_config("blade_master", 1)
	cfg.kill_target = 999
	GameManager.match_config = cfg
	battle = BATTLE.instantiate()
	add_child(battle)
	await frames(2)
	hud = battle.hud
	hero = battle.player_hero
	hero.skill_caster.setup(hero.data.skills, 1)
	enemy = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	enemy.controller.set_physics_process(false)
	enemy.clear_orders()
	enemy.global_position = hero.global_position + Vector2(900, 300)
	CombatManager.rng.seed = 1


func after_each() -> void:
	battle.queue_free()
	await get_tree().process_frame


## 캔버스 좌표를 창 좌표로 바꿔 입력 이벤트를 넣는다.
func _touch(index: int, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = index
	e.position = get_viewport().get_final_transform() * pos
	e.pressed = pressed
	Input.parse_input_event(e)


func _drag(index: int, pos: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = index
	e.position = get_viewport().get_final_transform() * pos
	Input.parse_input_event(e)


func test_joystick_moves_hero() -> void:
	var start := hero.global_position
	var c: Vector2 = hud.joystick.rest_center()
	_touch(0, c, true)
	await frames(1)
	_drag(0, c + Vector2(80, 0))
	await frames(20)
	check(hero.global_position.x > start.x + 40.0, "오른쪽으로 이동 (%.1f)" % (hero.global_position.x - start.x))
	near(hero.global_position.y, start.y, 3.0, "세로로는 움직이지 않음")
	_touch(0, c + Vector2(80, 0), false)
	await frames(2)
	var x := hero.global_position.x
	await frames(10)
	near(hero.global_position.x, x, 0.5, "손을 떼면 멈춤")


func test_joystick_and_skill_together() -> void:
	var c: Vector2 = hud.joystick.rest_center()
	_touch(0, c, true)
	await frames(1)
	_drag(0, c + Vector2(0, -80))
	await frames(5)
	var w_btn: SkillButton = hud.skill_buttons[1]
	_touch(1, w_btn.center_global(), true)
	await frames(1)
	_touch(1, w_btn.center_global(), false)
	await frames(2)
	check(hero.skill_caster.cooldowns[1] > 0.0, "조이스틱을 누른 채로 W 사용")
	var y := hero.global_position.y
	await frames(10)
	check(hero.global_position.y < y - 15.0, "스킬을 쓴 뒤에도 계속 이동")
	_touch(0, c + Vector2(0, -80), false)
	await frames(1)


func test_drag_aim_and_cancel() -> void:
	var q: SkillButton = hud.skill_buttons[0]
	var start := hero.global_position
	_touch(1, q.center_global(), true)
	await frames(1)
	var cz: Rect2 = hud.cancel_zone.get_global_rect()
	_drag(1, q.center_global() + Vector2(-60, -10))
	await frames(2)
	check(hud.cancel_zone.visible, "끌면 취소 영역이 보임")
	check(battle.player_controller.aiming_slot == 0, "조준 중")
	_drag(1, hud.cancel_zone.get_global_rect().get_center())
	await frames(2)
	_touch(1, hud.cancel_zone.get_global_rect().get_center(), false)
	await frames(2)
	near(hero.skill_caster.cooldowns[0], 0.0, 0.001, "취소 영역에서 떼면 발동하지 않음 (영역 %s)" % str(cz))
	check(not hud.cancel_zone.visible, "취소 후 영역 숨김")
	# 왼쪽으로 끌어서 쓰면 왼쪽으로 돌진한다.
	_touch(1, q.center_global(), true)
	await frames(1)
	_drag(1, q.center_global() + Vector2(-100, 0))
	await frames(2)
	_touch(1, q.center_global() + Vector2(-100, 0), false)
	await frames(30)
	check(hero.skill_caster.cooldowns[0] > 0.0, "돌진 베기 발동")
	check(hero.global_position.x < start.x - 150.0, "끈 방향(왼쪽)으로 돌진 (%.0f)" % (hero.global_position.x - start.x))


func test_attack_button_targets_nearest() -> void:
	enemy.global_position = hero.global_position + Vector2(200, 0)
	var a: SkillButton = hud.attack_button
	_touch(2, a.center_global(), true)
	await frames(3)
	check(battle.player_controller.attack_held, "공격 버튼 누름")
	eq(hero.attack_order, enemy, "가까운 적을 공격 대상으로")
	await frames(60)
	check(enemy.health.hp < enemy.health.max_hp(), "다가가서 공격")
	_touch(2, a.center_global(), false)
	await frames(2)
	check(not battle.player_controller.attack_held, "손을 떼면 공격 버튼 해제")


func test_tap_enemy_selects() -> void:
	enemy.global_position = hero.global_position + Vector2(250, -150)
	await frames(1)
	var screen_pos: Vector2 = enemy.get_global_transform_with_canvas().origin
	_touch(3, screen_pos, true)
	await frames(1)
	_touch(3, screen_pos, false)
	await frames(1)
	eq(battle.player_controller.selected, enemy, "누른 적을 선택")
	eq(hero.attack_order, enemy, "선택한 적을 공격하러 감")
