class_name AIController
extends HeroController
## AI 조작. 상태 머신으로 행동을 고르고, 판단은 난이도의 반응 간격마다 한 번씩 한다.
## IDLE: 대기, FOLLOW: 리더 따라가기, MOVE: 적을 찾아 이동(리더), CHASE/ATTACK: 추격·공격,
## RETREAT: 우물로 후퇴, DEAD/RESPAWN: 사망·부활. FARM, BUY_ITEM, BOSS_FIGHT 는 PHASE 3~4 에서 채운다.

enum State { IDLE, FOLLOW, MOVE, ATTACK, CHASE, RETREAT, FARM, BUY_ITEM, BOSS_FIGHT, DEAD, RESPAWN }

var profile: AIProfile
var state: int = State.IDLE
var target = null
var home := Vector2.ZERO
var rally_point := Vector2.ZERO
var rng := RandomNumberGenerator.new()
var state_log: Dictionary = {}  # 시험용: 상태별 진입 횟수
var manager = null  # AIManager (팀 정보)

const FOLLOW_DISTANCE := 200.0
const REGROUP_DISTANCE := 450.0
## 플레이어 팀의 AI 는 플레이어에게서 이 거리보다 먼 적은 쫓지 않는다 (아군을 공격 중인 적은 예외).
const PLAYER_LEASH := 800.0

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
	var help_target = manager.attacker_of_allies(hero) if manager != null else null
	if help_target != null and pos.distance_to(help_target.global_position) > profile.sight_range * 1.3:
		help_target = null
	if state == State.RETREAT:
		# 회복했거나, 쫓아온 적을 잡을 수 있으면 다시 싸운다.
		if hp >= profile.retreat_recover or _can_finish(enemies, hp):
			_set_state(State.IDLE)
	elif profile.can_retreat and not enemies.is_empty():
		var threshold: float = profile.retreat_hp * (1.2 - hero.data.ai_aggression * 0.4)
		# 근처 아군이 적보다 많으면 조금 더 버틴다.
		if _nearby_allies(500.0) >= enemies.size():
			threshold *= 0.75
		if hp < threshold and not _can_finish(enemies, hp):
			_set_state(State.RETREAT)
	if state != State.RETREAT:
		if help_target != null and not enemies.has(help_target):
			enemies.append(help_target)
		target = _choose_target(enemies, help_target)
		if target != null:
			_set_state(State.ATTACK if hero.attack.in_range(target) else State.CHASE)
		else:
			var lead = manager.leader(hero.team) if manager != null else null
			if lead != null and lead != hero:
				_set_state(State.FOLLOW if pos.distance_to(lead.global_position) > FOLLOW_DISTANCE else State.IDLE)
			elif _allies_far():
				_set_state(State.IDLE)
			else:
				_set_state(State.MOVE)
	_use_skills(enemies)
	_apply_orders()


func _nearby_allies(dist: float) -> int:
	if manager == null:
		return 0
	return manager.allies_of(hero).filter(func(a): return a.global_position.distance_to(hero.global_position) <= dist).size()


## 리더가 혼자 너무 앞서 나가지 않도록, 살아 있는 아군이 멀리 있으면 기다린다.
func _allies_far() -> bool:
	if manager == null:
		return false
	for a in manager.allies_of(hero):
		if a.global_position.distance_to(hero.global_position) > REGROUP_DISTANCE and a.global_position.distance_to(a.spawn_point) > 300.0:
			return true
	return false


## 가까운 적이 나보다 체력 비율이 낮으면(이기고 있으면) 물러나지 않는다.
func _can_finish(enemies: Array, my_hp: float) -> bool:
	for e in enemies:
		if e.health.ratio() < my_hp * 0.85 and hero.global_position.distance_to(e.global_position) < hero.attack.attack_range + 200.0:
			return true
	return false


func _choose_target(enemies: Array, help_target = null):
	var best = null
	var best_score := INF
	var focus = manager.focus_target(hero.team) if manager != null and profile.focus_fire else null
	var hm = manager.hero_manager if manager != null else null
	var player = manager.player_heroes.get(hero.team) if manager != null else null
	if player != null and (not is_instance_valid(player) or player.is_dead):
		player = null
	for e in enemies:
		if player != null and e != help_target and player.global_position.distance_to(e.global_position) > PLAYER_LEASH:
			continue
		# 상대 우물 안의 적은 쫓지 않는다.
		if hm != null and hm.in_enemy_fountain(hero, e.global_position, 40.0):
			continue
		var score: float = hero.global_position.distance_to(e.global_position) + e.health.ratio() * 300.0
		if e == target:
			score -= 120.0
		if e == help_target:
			score -= 150.0
		if e == focus:
			score -= 250.0
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
				hero.nav_goal = _roam_point()
		State.FOLLOW:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			var lead = manager.leader(hero.team)
			if lead != null:
				var goal: Vector2 = _reachable(lead.global_position + _formation_offset(lead))
				if hero.nav_goal == null or hero.nav_goal.distance_to(goal) > 60.0:
					hero.nav_goal = goal
		State.IDLE:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			hero.nav_goal = null


## 리더 뒤쪽 양옆에 선다.
func _formation_offset(lead) -> Vector2:
	var mates: Array = manager.allies_of(lead)
	var idx := maxi(0, mates.find(hero))
	var back: Vector2 = (home - lead.global_position).normalized() * 90.0
	var side: Vector2 = back.orthogonal().normalized() * (90.0 if idx % 2 == 0 else -90.0)
	return back + side


## 리더는 맵 중앙을 거쳐 상대 진영 쪽을 돌아다니며 적을 찾는다.
func _roam_point() -> Vector2:
	if hero.global_position.distance_to(rally_point) > 300.0:
		return _reachable(rally_point + Vector2(rng.randf_range(-150, 150), rng.randf_range(-150, 150)))
	var toward_enemy: Vector2 = (rally_point - home).normalized()
	return _reachable(rally_point + toward_enemy * rng.randf_range(100, 500) + Vector2(0, rng.randf_range(-450, 450)))


## 장애물 안이나 맵 밖의 지점은 걸어갈 수 있는 가장 가까운 곳으로 옮긴다.
func _reachable(p: Vector2) -> Vector2:
	var nav: NavigationAgent2D = hero.nav
	if nav == null or NavigationServer2D.map_get_iteration_id(nav.get_navigation_map()) == 0:
		return p
	return NavigationServer2D.map_get_closest_point(nav.get_navigation_map(), p)


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
