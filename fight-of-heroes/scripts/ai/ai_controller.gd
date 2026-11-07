class_name AIController
extends HeroController
## AI 조작. 상태 머신으로 행동을 고르고, 판단은 난이도의 반응 간격마다 한 번씩 한다.
## PHASE 1 에서는 IDLE, MOVE, CHASE, ATTACK, RETREAT, DEAD, RESPAWN 을 쓴다.
## FOLLOW, FARM, BUY_ITEM, BOSS_FIGHT 는 PHASE 2~4 에서 채운다.

enum State { IDLE, FOLLOW, MOVE, ATTACK, CHASE, RETREAT, FARM, BUY_ITEM, BOSS_FIGHT, DEAD, RESPAWN }

var profile: AIProfile
var state: int = State.IDLE
var target = null
var home := Vector2.ZERO
var rally_point := Vector2.ZERO
var rng := RandomNumberGenerator.new()
var state_log: Dictionary = {}  # 시험용: 상태별 진입 횟수

var _think_left := 0.0
var _unstick_left := 0.0
var _unstick_dir := Vector2.ZERO


func setup(p: AIProfile, home_pos: Vector2, rally: Vector2, seed_value := 0) -> void:
	profile = p
	home = home_pos
	rally_point = rally
	if seed_value != 0:
		rng.seed = seed_value
	else:
		rng.randomize()


func _set_state(s: int) -> void:
	if state != s:
		state = s
		state_log[s] = state_log.get(s, 0) + 1


func _physics_process(delta: float) -> void:
	if hero == null or profile == null:
		return
	if hero.is_dead:
		if state != State.DEAD:
			_set_state(State.DEAD)
			target = null
		return
	if state == State.DEAD:
		_set_state(State.RESPAWN)
		_think_left = 0.0
	# 벽에 끼면 옆으로 비켜 선다.
	if _unstick_left > 0.0:
		_unstick_left -= delta
		hero.move_input = _unstick_dir
		if _unstick_left <= 0.0:
			hero.move_input = Vector2.ZERO
			_think_left = 0.0
		return
	if hero.stuck_time > 0.5:
		_unstick_left = 0.45
		var side := 1.0 if rng.randf() < 0.5 else -1.0
		_unstick_dir = (hero.facing.orthogonal() * side - hero.facing * 0.3).normalized()
		hero.attack_order = null
		hero.nav_goal = null
		hero.move_input = _unstick_dir
		return
	_think_left -= delta
	if _think_left <= 0.0:
		_think_left = profile.reaction_time * rng.randf_range(0.8, 1.25)
		think()


func think() -> void:
	var pos: Vector2 = hero.global_position
	var hp: float = hero.health.ratio()
	var enemies := Targeting.in_radius(get_tree(), pos, profile.sight_range, hero.team, Enums.TargetTeam.ENEMY)
	if state == State.RETREAT:
		if hp >= profile.retreat_recover:
			_set_state(State.IDLE)
	elif profile.can_retreat and not enemies.is_empty():
		var threshold: float = profile.retreat_hp * (1.2 - hero.data.ai_aggression * 0.4)
		if hp < threshold and not _can_finish(enemies, hp):
			_set_state(State.RETREAT)
	if state != State.RETREAT:
		target = _choose_target(enemies)
		if target == null:
			_set_state(State.MOVE)
		elif hero.attack.in_range(target):
			_set_state(State.ATTACK)
		else:
			_set_state(State.CHASE)
	_use_skills(enemies)
	_apply_orders()


func _can_finish(enemies: Array, my_hp: float) -> bool:
	for e in enemies:
		if e.health.ratio() < my_hp * 0.6 and hero.global_position.distance_to(e.global_position) < hero.attack.attack_range + 150.0:
			return true
	return false


func _choose_target(enemies: Array):
	var best = null
	var best_score := INF
	for e in enemies:
		var score: float = hero.global_position.distance_to(e.global_position) + e.health.ratio() * 300.0
		if e == target:
			score -= 120.0
		if score < best_score:
			best_score = score
			best = e
	return best


func _apply_orders() -> void:
	match state:
		State.RETREAT:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			hero.nav_goal = home
		State.CHASE, State.ATTACK:
			hero.nav_goal = null
			hero.move_input = Vector2.ZERO
			hero.attack_order = target
		State.MOVE:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			if hero.nav_goal == null:
				hero.nav_goal = rally_point + Vector2(rng.randf_range(-200, 200), rng.randf_range(-200, 200))


func _use_skills(enemies: Array) -> void:
	var caster: SkillCaster = hero.skill_caster
	for slot in 4:
		var s := caster.get_skill(slot)
		if s == null or caster.cooldowns[slot] > 0.0 or not hero.mana.has(caster.mana_cost(slot)):
			continue
		var aim := _aim_for(s, enemies)
		if aim == null:
			continue
		if rng.randf() > profile.skill_use_chance:
			continue
		if caster.cast(slot, aim) == Enums.CastResult.OK:
			return


func _aim_for(s: SkillData, enemies: Array) -> CastAim:
	var pos: Vector2 = hero.global_position
	var hp: float = hero.health.ratio()
	var nearest = Targeting.nearest(get_tree(), pos, 2000.0, hero.team, Enums.TargetTeam.ENEMY)
	var nd: float = pos.distance_to(nearest.global_position) if nearest != null else INF
	match s.ai_use:
		Enums.AIUse.ESCAPE:
			var danger := state == State.RETREAT and nd < 450.0
			var too_close: bool = hero.attack.is_ranged and nd < 170.0
			if not (danger or too_close):
				return null
			var away: Vector2 = (pos - nearest.global_position).normalized()
			var to_home := (home - pos).normalized()
			return CastAim.toward((away * 0.7 + to_home * 0.3).normalized())
		Enums.AIUse.DEFENSE:
			var hurt_now: bool = Unit.now() - hero.last_damaged_time < 1.0
			if (hp < 0.75 and nd < 450.0) or (hurt_now and hp < 0.9 and nd < 300.0):
				return CastAim.new()
			return null
	if target == null or not is_instance_valid(target) or target.is_dead:
		return null
	var d: float = pos.distance_to(target.global_position)
	if d > s.reach() + target.radius:
		return null
	if s.ai_use == Enums.AIUse.ENGAGE and d < hero.attack.attack_range * 0.8:
		return null
	if s.max_rank <= 3 and profile.smart_ultimate:
		# 궁극기: 상대 체력이 줄었거나 내가 위험할 때 쓴다.
		if target.health.ratio() > 0.65 and hp > 0.4:
			return null
	return _aim_at(s, target)


func _aim_at(s: SkillData, t) -> CastAim:
	var pos: Vector2 = hero.global_position
	var err := deg_to_rad(rng.randf_range(-profile.aim_error_deg, profile.aim_error_deg))
	match s.target_mode:
		Enums.TargetMode.UNIT:
			return CastAim.at_unit(t)
		Enums.TargetMode.DIRECTION:
			return CastAim.toward((t.global_position - pos).rotated(err))
		Enums.TargetMode.POINT:
			var lead: Vector2 = t.velocity * 0.35
			var p: Vector2 = t.global_position + lead
			return CastAim.at_point(pos + (p - pos).rotated(err))
	return CastAim.new()
