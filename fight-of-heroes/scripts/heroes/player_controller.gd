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
	# 조이스틱은 화면 방향이므로 기울어진 시점에서는 맵 방향으로 바꾼다 (손가락 방향과 화면 속 이동 방향이 같게).
	var mv := View.screen_to_world(joystick if joystick.length() > 0.05 else kb.limit_length(1.0))
	var moving := mv.length() > 0.05
	if attack_held or Input.is_physical_key_pressed(KEY_SPACE):
		var t = pick_attack_target()
		if t != null and moving:
			# 움직이는 중에는 이동이 먼저다. 사거리 안의 적에게 바로 쏠 수 있을 때만 한 번 쏘고 다시 움직인다
			# (사거리 밖 적을 쫓아가느라 도망가다 멈추지 않는다).
			if not (hero.attack.in_range(t) and hero.attack.can_attack()) and not hero.attack.is_winding_up():
				t = null
		if t != null:
			_select(t)
			hero.attack_order = t
			hero.move_input = Vector2.ZERO
			return
	if moving:
		hero.attack_order = null
	hero.move_input = mv


## 공격 버튼의 대상: 사거리 안에 적이 있으면 그중에서 고르고(영웅 우선), 사거리 안에 아무도 없을 때만
## 조금 떨어진 적에게 다가간다. 가까운 적을 두고 멀리 있는 적을 고르지 않는다.
func pick_attack_target():
	var near: float = hero.attack.total_range() + 250.0
	var in_range: Array = []
	for u in Targeting.in_radius(get_tree(), hero.global_position, near, hero.team, Enums.TargetTeam.ENEMY):
		if FogOfWar.can_see(u) and hero.attack.in_range(u):
			in_range.append(u)
	if not in_range.is_empty():
		if selected != null and in_range.has(selected):
			return selected
		return _best_of(in_range)
	return _best_target(near)


## 거리 점수가 가장 낮은 적. 영웅은 150, 내가 고른 적은 100 만큼 가깝게 친다.
func _best_of(list: Array):
	var best = null
	var best_s := INF
	for u in list:
		var sc: float = hero.global_position.distance_to(u.global_position) - (150.0 if u is Hero else 0.0) - (100.0 if u == selected else 0.0)
		if sc < best_s:
			best_s = sc
			best = u
	return best


func _best_target(dist: float):
	var list: Array = []
	for u in Targeting.in_radius(get_tree(), hero.global_position, dist, hero.team, Enums.TargetTeam.ENEMY):
		if FogOfWar.can_see(u):
			list.append(u)
	return _best_of(list)


## 거리 안에서 가장 알맞은 적 (가까울수록, 영웅일수록 우선. 멀리 있는 영웅보다 바로 앞의 몬스터를 고를 수 있다)
func _nearest_prefer_hero(dist: float):
	return _best_target(dist)


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
	if Net.is_client():
		return _net_cast(slot, aim)
	var r: int = hero.skill_caster.cast(slot, aim)
	if r == Enums.CastResult.NOT_READY and hero.has_gauge():
		cast_failed.emit("%s이(가) 부족합니다 (%d/%d)" % [hero.data.gauge_name, int(hero.gauge), int(_skill(slot).requires_gauge)])
	elif r != Enums.CastResult.OK and r != Enums.CastResult.DEAD:
		cast_failed.emit(Enums.CAST_RESULT_TEXT.get(r, ""))
	return r


## 참가자: 쓸 수 있는지 여기서 먼저 보고, 실제 시전은 방장에게 부탁한다.
func _net_cast(slot: int, aim: CastAim) -> int:
	var sc: SkillCaster = hero.skill_caster
	var s := _skill(slot)
	var r := Enums.CastResult.OK
	if hero.is_dead:
		r = Enums.CastResult.DEAD
	elif s == null or sc.ranks[slot] <= 0:
		r = Enums.CastResult.NOT_LEARNED
	elif sc.cooldowns[slot] > 0.0 and sc.recast_left[slot] <= 0.0:
		r = Enums.CastResult.COOLDOWN
	elif sc.recast_left[slot] <= 0.0 and not hero.mana.has(sc.mana_cost(slot)):
		r = Enums.CastResult.NO_MANA
	if r != Enums.CastResult.OK:
		if r != Enums.CastResult.DEAD:
			cast_failed.emit(Enums.CAST_RESULT_TEXT.get(r, ""))
		return r
	if aim == null:
		aim = CastAim.toward(hero.facing)
	var uid: int = aim.unit.net_id if aim.unit != null and is_instance_valid(aim.unit) else -1
	NetSync.client_request("cast", [slot, aim.direction.x, aim.direction.y, aim.point.x, aim.point.y, aim.has_point, uid])
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
			return CastAim.at_unit(_best_target(reach + 20.0))
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
	return _best_target(dist)


func manual_aim(slot: int, vec: Vector2) -> CastAim:
	var s := _skill(slot)
	if s == null:
		return null
	vec = View.screen_to_world(vec)
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
		if hud != null and hud.ping_mode != "":
			hud.place_ping(world_pos)
			get_viewport().set_input_as_handled()
			return
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
		if event.physical_keycode == KEY_TAB and hud != null:
			hud.toggle_scoreboard()
		var num := [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6].find(event.physical_keycode)
		if num >= 0 and hud != null:
			hud._on_inventory_slot(num)
		if idx >= 0 and event.ctrl_pressed:
			hero.learn(idx)
		elif idx >= 0 and not Input.is_physical_key_pressed(KEY_SHIFT):
			try_cast(idx, auto_aim(idx))
