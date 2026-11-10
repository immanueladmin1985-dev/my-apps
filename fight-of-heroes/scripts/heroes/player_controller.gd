class_name PlayerController
extends HeroController
## 플레이어 조작: 가상 조이스틱, 공격 버튼, 스킬 버튼(누르기 = 자동 조준, 끌기 = 직접 조준), 적 누르기.
## 컴퓨터에서 시험할 때는 WASD·방향키, 스페이스(공격), Q/W/E/R 키도 쓸 수 있다.

signal cast_failed(text: String)
signal target_changed(target)

const TAP_PICK_RADIUS := 60.0

var joystick := Vector2.ZERO
var attack_held := false
var selected = null
## 지금 조준 중인 스킬 칸(-1 이면 없음)과 조준 벡터(길이 0~1)
var aiming_slot := -1
var aim_vec := Vector2.ZERO
var aim_dragged := false


func _physics_process(_delta: float) -> void:
	if hero == null or hero.is_dead:
		return
	if selected != null and not Targeting.is_valid(selected, hero.team, Enums.TargetTeam.ENEMY):
		_select(null)
	var kb := Vector2(
		float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT)) - float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),
		float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN)) - float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
	var mv := joystick if joystick.length() > 0.05 else kb.limit_length(1.0)
	if attack_held or Input.is_physical_key_pressed(KEY_SPACE):
		var t = selected
		if t == null or hero.global_position.distance_to(t.global_position) > hero.attack.attack_range + 350.0:
			t = _nearest_prefer_hero(hero.attack.attack_range + 250.0)
		if t != null:
			_select(t)
			hero.attack_order = t
			hero.move_input = Vector2.ZERO
			return
	if mv.length() > 0.05:
		hero.attack_order = null
	hero.move_input = mv


## 사거리 근처에 적 영웅이 있으면 영웅을, 없으면 가장 가까운 몬스터를 고른다.
func _nearest_prefer_hero(dist: float):
	var best = null
	var best_d := dist
	for u in Targeting.in_radius(get_tree(), hero.global_position, dist, hero.team, Enums.TargetTeam.ENEMY):
		if not FogOfWar.can_see(u):
			continue
		var d: float = hero.global_position.distance_to(u.global_position) - (10000.0 if u is Hero else 0.0)
		if best == null or d < best_d:
			best_d = d
			best = u
	return best


func _select(t) -> void:
	if selected != t:
		selected = t
		target_changed.emit(t)


# ---- 스킬 버튼 ----

func begin_aim(slot: int) -> void:
	aiming_slot = slot
	aim_vec = Vector2.ZERO
	aim_dragged = false


func update_aim(slot: int, vec: Vector2) -> void:
	if slot == aiming_slot:
		aim_vec = vec
		aim_dragged = true


func end_aim(slot: int, vec: Vector2, dragged: bool, cancelled: bool) -> int:
	if slot == aiming_slot:
		aiming_slot = -1
	if cancelled:
		return -1
	var aim := manual_aim(slot, vec) if dragged else auto_aim(slot)
	return try_cast(slot, aim)


func try_cast(slot: int, aim: CastAim) -> int:
	var r: int = hero.skill_caster.cast(slot, aim)
	if r != Enums.CastResult.OK and r != Enums.CastResult.DEAD:
		cast_failed.emit(Enums.CAST_RESULT_TEXT.get(r, ""))
	return r


func _skill(slot: int) -> SkillData:
	return hero.skill_caster.get_skill(slot)


func auto_aim(slot: int) -> CastAim:
	var s := _skill(slot)
	if s == null:
		return null
	var pos: Vector2 = hero.global_position
	var reach := s.cast_range + s.radius
	var tree := get_tree()
	match s.target_mode:
		Enums.TargetMode.UNIT:
			if s.target_team == Enums.TargetTeam.ALLY:
				return CastAim.at_unit(_weakest_ally(reach))
			var t = selected if selected != null and pos.distance_to(selected.global_position) <= reach + selected.radius else null
			if t == null:
				t = _nearest_prefer_hero(reach)
			return CastAim.at_unit(t)
		Enums.TargetMode.DIRECTION:
			if s.auto_aim_away:
				var e = Targeting.nearest(tree, pos, 600.0, hero.team, Enums.TargetTeam.ENEMY)
				return CastAim.toward(pos - e.global_position if e != null else hero.facing)
			var t = _target_within(maxf(reach, 400.0) * 1.2)
			return CastAim.toward(t.global_position - pos if t != null else hero.facing)
		Enums.TargetMode.POINT:
			var t = _target_within(reach + 100.0)
			return CastAim.at_point(t.global_position if t != null else pos + hero.facing * s.cast_range * 0.6)
	return CastAim.new()


## 사거리 안에서 체력 비율이 가장 낮은 아군 영웅(자신 포함)
func _weakest_ally(reach: float):
	var best = hero
	for u in Targeting.in_radius(get_tree(), hero.global_position, reach, hero.team, Enums.TargetTeam.ALLY):
		if u is Hero and u.health.ratio() < best.health.ratio():
			best = u
	return best


func _target_within(dist: float):
	if selected != null and hero.global_position.distance_to(selected.global_position) <= dist:
		return selected
	return _nearest_prefer_hero(dist)


func manual_aim(slot: int, vec: Vector2) -> CastAim:
	var s := _skill(slot)
	if s == null:
		return null
	var pos: Vector2 = hero.global_position
	match s.target_mode:
		Enums.TargetMode.DIRECTION:
			return CastAim.toward(vec if vec.length() > 0.05 else hero.facing)
		Enums.TargetMode.POINT:
			return CastAim.at_point(pos + vec * s.cast_range)
		Enums.TargetMode.UNIT:
			if s.target_team == Enums.TargetTeam.ALLY and vec.length() < 0.25:
				return CastAim.at_unit(hero)
			var t = Targeting.nearest(get_tree(), pos + vec * s.cast_range, 140.0, hero.team, s.target_team)
			return CastAim.at_unit(t)
	return CastAim.new()


# ---- 화면 누르기 (적 선택), 키보드 스킬 ----

func _unhandled_input(event: InputEvent) -> void:
	if hero == null or hero.is_dead:
		return
	var hud = get_tree().get_first_node_in_group("hud")
	if hud != null and hud.shop_open:
		return
	if event is InputEventScreenTouch and event.pressed:
		var world_pos: Vector2 = hero.get_canvas_transform().affine_inverse() * event.position
		var t = Targeting.nearest(get_tree(), world_pos, TAP_PICK_RADIUS, hero.team, Enums.TargetTeam.ENEMY)
		if t != null and FogOfWar.can_see(t):
			_select(t)
			hero.attack_order = t
	elif event is InputEventKey and event.pressed and not event.echo:
		var idx := [KEY_Q, KEY_W, KEY_E, KEY_R].find(event.physical_keycode)
		if event.physical_keycode == KEY_G and hud != null:
			hud.call_gather()
		if event.physical_keycode == KEY_B and hud != null:
			hud.toggle_shop()
		var num := [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6].find(event.physical_keycode)
		if num >= 0 and hud != null:
			hud._on_inventory_slot(num)
		if idx >= 0 and event.ctrl_pressed:
			hero.learn(idx)
		elif idx >= 0 and not Input.is_physical_key_pressed(KEY_SHIFT):
			try_cast(idx, auto_aim(idx))
