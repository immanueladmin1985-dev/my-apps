class_name AIController
extends HeroController
## AI 조작. 상태 머신으로 행동을 고르고, 판단은 난이도의 반응 간격마다 한 번씩 한다.
## IDLE: 대기, FOLLOW: 아군 곁으로 이동(지원 역할, "모여"), MOVE: 적을 찾아 이동, CHASE/ATTACK: 추격·공격,
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
## 역할: "hunter"(사냥꾼), "fighter"(돌격), "support"(지원)
var role := "hunter"

const FOLLOW_DISTANCE := 200.0
## 플레이어 팀의 AI 는 플레이어에게서 이 거리보다 먼 적은 쫓지 않는다 (아군을 공격 중인 적은 예외).
## 지원 역할은 이 거리 안에서 공격받는 아군에게 달려간다.
const SUPPORT_HELP_RANGE := 2000.0
const DODGE_MARGIN := 40.0
const COMMIT_RANGE := 450.0
## 이만큼 골드가 모이면 싸움이 없을 때 기지로 쇼핑하러 간다.
const SHOP_GOLD_TRIGGER := 1100
## 체력 비율이 이보다 낮으면 물약을 마신다.
const POTION_HP := 0.45
const POTION_LEVEL_LIMIT := 9

var _think_left := 0.0
var _unstick_left := 0.0
var _unstick_dir := Vector2.ZERO
var _dodging := false
var objective = null  # 지금 노리는 몬스터·보스 (FARM / BOSS_FIGHT)
var dodge_count := 0  # 시험용
var bought: Array = []  # 시험용: 산 아이템 id


func setup(p: AIProfile, home_pos: Vector2, rally: Vector2, seed_value := 0) -> void:
	profile = p
	home = home_pos
	rally_point = rally
	if seed_value != 0:
		rng.seed = seed_value
	else:
		rng.randomize()


func _ready() -> void:
	if hero != null:
		hero.skill_points_changed.connect(func(_p): auto_learn())
		auto_learn()


## 스킬 포인트를 모두 쓴다: R 이 열리면 R, 아니면 데이터의 우선순위대로.
func auto_learn() -> void:
	var order: Array = [Enums.Slot.R]
	for i in hero.data.ai_skill_priority:
		order.append(i)
	for i in [0, 1, 2]:
		if not order.has(i):
			order.append(i)
	var guard := 0
	while hero.skill_points > 0 and guard < 20:
		guard += 1
		var learned := false
		# 아직 배우지 않은 기본 스킬이 있으면 먼저 하나씩 배운다.
		for slot in order:
			if slot != Enums.Slot.R and hero.skill_caster.ranks[slot] == 0 and hero.learn(slot):
				learned = true
				break
		if not learned:
			for slot in order:
				if hero.learn(slot):
					learned = true
					break
		if not learned:
			break


## 위험 지역 안에 있으면 경계보다 조금 더 멀리 피하고, 발동할 때까지 근처에서 기다린다.
## 반응 간격만큼 늦게 알아챈다.
func _dodge() -> bool:
	if not profile.dodge_telegraphs:
		return false
	var hold := false
	for z in get_tree().get_nodes_in_group("telegraphs"):
		if z.elapsed() < profile.reaction_time:
			continue
		if z.threatens(hero, DODGE_MARGIN):
			if not _dodging:
				dodge_count += 1
			_dodging = true
			hero.attack_order = null
			hero.nav_goal = null
			hero.move_input = z.escape_dir(hero)
			return true
		if z.threatens(hero, DODGE_MARGIN * 3.0):
			hold = true
	if hold:
		# 다시 걸어 들어가지 않도록 멈춰 기다린다. 원거리라면 그 자리에서 공격은 한다.
		_dodging = true
		hero.nav_goal = null
		hero.move_input = Vector2.ZERO
		if hero.attack_order != null and not hero.attack.in_range(hero.attack_order):
			hero.attack_order = null
		return true
	if _dodging:
		_dodging = false
		hero.move_input = Vector2.ZERO
		_think_left = 0.0
	return false


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
	if _dodge():
		return
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
	_shop_if_possible()
	_drink_if_needed(hp)
	var enemies := Targeting.in_radius(get_tree(), pos, profile.sight_range, hero.team, Enums.TargetTeam.ENEMY)
	var help_target = manager.attacker_of_allies(hero) if manager != null else null
	if help_target != null and pos.distance_to(help_target.global_position) > _help_range():
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
		var plan: Dictionary = manager.plan_for(hero.team) if manager != null else {}
		# 팀이 보스에 도전 중이면 가까이 온 적 영웅이나 우리를 공격 중인 적에게만 대응한다.
		var committed: bool = plan.get("kind", "") == "boss"
		var hero_enemies: Array = []
		for e in enemies:
			if e is Hero and (not committed or e == help_target or pos.distance_to(e.global_position) < COMMIT_RANGE):
				hero_enemies.append(e)
		objective = null
		target = _choose_target(hero_enemies, help_target)
		if target == null:
			target = _monster_target(enemies, help_target, plan)
		if target is Monster and target.is_boss():
			objective = target
			_set_state(State.BOSS_FIGHT)
		elif target != null:
			_set_state(State.ATTACK if hero.attack.in_range(target) else State.CHASE)
		elif committed:
			objective = plan.target
			_set_state(State.BOSS_FIGHT)
		elif _wants_to_shop():
			_set_state(State.BUY_ITEM)
		elif plan.get("kind", "") == "gather":
			objective = plan.pos
			_set_state(State.FOLLOW if pos.distance_to(plan.pos) > FOLLOW_DISTANCE else State.IDLE)
		else:
			_role_think()
	_use_skills(enemies)
	_apply_orders()


# ---- 아이템 ----

func _shop() -> ShopManager:
	return manager.shop if manager != null else null


## 기지에 있거나 죽어 있으면 정해 둔 순서대로 산다.
func _shop_if_possible() -> void:
	var shop := _shop()
	if shop == null or not shop.can_shop(hero):
		return
	for i in 12:
		var next := next_purchase()
		if next == null:
			break
		var r := shop.buy(hero, next.id)
		if r == ShopManager.Result.NO_SPACE and _sell_a_potion():
			r = shop.buy(hero, next.id)
		if r != ShopManager.Result.OK:
			break
		bought.append(next.id)
	if hero.level < POTION_LEVEL_LIMIT:
		while hero.inventory.count_of("health_potion") < 2 and shop.buy(hero, "health_potion") == ShopManager.Result.OK:
			bought.append("health_potion")


func _sell_a_potion() -> bool:
	for i in InventoryComponent.SIZE:
		var it: ItemData = hero.inventory.item_at(i)
		if it != null and it.consumable:
			return _shop().sell(hero, i) == ShopManager.Result.OK
	return false


## 지금 살 아이템: 순서상 아직 없는 첫 완성품을 바로 살 수 있으면 그것, 아니면 살 수 있는 재료.
func next_purchase() -> ItemData:
	var shop := _shop()
	if shop == null:
		return null
	for fid in hero.data.ai_build:
		var f := ItemManager.get_item(fid)
		if f == null or hero.inventory.count_of(fid) > 0:
			continue
		var step = _step_toward(f, 0)
		if step != null:
			return step
		return null
	return null


func _step_toward(item: ItemData, depth: int):
	if depth > 4:
		return null
	var plan := _shop().check_buy(hero, item)
	if plan.result == ShopManager.Result.OK:
		return item
	if plan.result == ShopManager.Result.LIMIT or plan.result == ShopManager.Result.NOT_IN_SHOP:
		return null
	for cid in item.components:
		if hero.inventory.count_of(cid) >= item.components.count(cid):
			continue
		var c := ItemManager.get_item(cid)
		if c == null:
			continue
		var step = _step_toward(c, depth + 1)
		if step != null:
			return step
	return null


## 싸움이 없고 골드가 충분히 모였으면 기지로 쇼핑하러 간다.
func _wants_to_shop() -> bool:
	if hero.gold < SHOP_GOLD_TRIGGER or _shop() == null:
		return false
	for fid in hero.data.ai_build:
		if hero.inventory.count_of(fid) == 0:
			return true
	return false


func _drink_if_needed(hp: float) -> void:
	var shop := _shop()
	if shop == null or hp >= POTION_HP or hero.status.has("potion_heal") or shop.can_shop(hero):
		return
	var slot: int = hero.inventory.find("health_potion")
	if slot >= 0:
		shop.use_item(hero, slot)


## 역할에 따라 할 일을 정한다 (적 영웅·몬스터가 눈앞에 없을 때).
## 사냥꾼: 자기 진영 던전, 돌격: 중앙 → 강하면 상대 진영 던전, 지원: 돌격(없으면 체력이 낮은 아군) 곁.
func _role_think() -> void:
	match role:
		"support":
			var buddy = _buddy()
			if buddy != null:
				objective = buddy
				_set_state(State.FOLLOW if hero.global_position.distance_to(buddy.global_position) > FOLLOW_DISTANCE else State.IDLE)
				return
		"fighter":
			var spot = _pick_camp(["center", "enemy" if _stronger_than_enemy() else "own", "own"])
			if spot != null:
				objective = spot
				_set_state(State.FARM)
				return
		_:
			var spot = _pick_camp(["own", "center"])
			if spot != null:
				objective = spot
				_set_state(State.FARM)
				return
	objective = null
	_set_state(State.MOVE)


## 진영별 사냥터 중 가까운 곳. order 는 "own"(자기 진영), "center"(중앙), "enemy"(상대 진영) 순서의 우선순위.
func _pick_camp(order: Array):
	var mm = manager.monster_manager if manager != null else null
	if mm == null:
		return null
	for side in order:
		var best = null
		var best_d := INF
		for c in mm.farm_camps():
			if _camp_side(c) != side:
				continue
			var d: float = hero.global_position.distance_to(c.position)
			if d < best_d:
				best_d = d
				best = c.position
		if best != null:
			return best
	return null


func _camp_side(c: Dictionary) -> String:
	if c.wave:
		return "center"
	var mine: float = c.position.distance_to(home)
	var enemy_home: Vector2 = rally_point * 2.0 - home
	var theirs: float = c.position.distance_to(enemy_home)
	if absf(mine - theirs) < 200.0:
		return "center"
	return "own" if mine < theirs else "enemy"


func _stronger_than_enemy() -> bool:
	if manager == null or manager.hero_manager == null:
		return false
	var mine := 0.0
	var theirs := 0.0
	var n1 := 0
	var n2 := 0
	for h in manager.hero_manager.heroes:
		if h.team == hero.team:
			mine += h.level
			n1 += 1
		else:
			theirs += h.level
			n2 += 1
	# 평균 레벨이 1 이상 높을 때만 상대 진영으로 쳐들어간다.
	return n2 == 0 or mine / maxf(1, n1) >= theirs / maxf(1, n2) + 1.0


## 지원 역할이 곁을 지킬 아군: 체력이 절반 아래인 아군이 있으면 그 아군, 아니면 돌격 역할 AI.
func _buddy():
	if manager == null:
		return null
	var allies: Array = manager.allies_of(hero)
	var weakest = null
	for a in allies:
		if a.health.ratio() < 0.5 and (weakest == null or a.health.ratio() < weakest.health.ratio()):
			weakest = a
	if weakest != null:
		return weakest
	for a in allies:
		if a.controller is AIController and a.controller.role == "fighter":
			return a
	return allies[0] if not allies.is_empty() else null


func _help_range() -> float:
	return SUPPORT_HELP_RANGE if role == "support" else profile.sight_range * 1.3


## 적 영웅이 없을 때 공격할 몬스터: 우리 팀을 공격 중인 몬스터, 팀 계획의 보스,
## 그 밖에 눈에 보이는 보스가 아닌 몬스터. 체력이 적은 것부터.
func _monster_target(enemies: Array, help_target, plan: Dictionary):
	if help_target is Monster:
		return help_target
	var plan_boss = plan.get("target") if plan.get("kind", "") == "boss" else null
	var best = null
	var best_score := INF
	for e in enemies:
		if not (e is Monster):
			continue
		var aggro_on_us: bool = e.target != null and is_instance_valid(e.target) and e.target.team == hero.team
		if e.is_boss() and not aggro_on_us and e != plan_boss:
			continue
		# 지원 역할은 곁을 지키는 아군 근처의 몬스터만 잡는다.
		if role == "support" and not aggro_on_us:
			var buddy = _buddy()
			if buddy != null and buddy.global_position.distance_to(e.global_position) > 500.0:
				continue
		var score: float = e.health.hp + hero.global_position.distance_to(e.global_position)
		if aggro_on_us:
			score -= 5000.0
		if e == plan_boss:
			score -= 10000.0
		if score < best_score:
			best_score = score
			best = e
	return best


func _nearby_allies(dist: float) -> int:
	if manager == null:
		return 0
	var n := 0
	for a in manager.allies_of(hero):
		if a.global_position.distance_to(hero.global_position) <= dist:
			n += 1
	return n


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
	for e in enemies:
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
			var p: Vector2 = objective.global_position + _side_offset(objective) if objective is Node2D else objective
			var goal: Vector2 = _reachable(p)
			if hero.nav_goal == null or hero.nav_goal.distance_to(goal) > 60.0:
				hero.nav_goal = goal
		State.IDLE:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			hero.nav_goal = null
		State.FARM:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			hero.nav_goal = _reachable(objective)
		State.BOSS_FIGHT:
			hero.move_input = Vector2.ZERO
			hero.nav_goal = null
			hero.attack_order = objective
		State.BUY_ITEM:
			hero.attack_order = null
			hero.move_input = Vector2.ZERO
			hero.nav_goal = home


## 따라가는 아군의 뒤쪽 옆에 선다.
func _side_offset(buddy) -> Vector2:
	var back: Vector2 = (home - buddy.global_position).normalized() * 80.0
	return back + back.orthogonal().normalized() * 70.0


## 할 일이 없으면 맵 중앙을 거쳐 상대 진영 쪽을 돌아다니며 적을 찾는다.
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
	var q := NavigationServer2D.map_get_closest_point(nav.get_navigation_map(), p)
	# 길찾기 맵이 덜 준비되면 엉뚱한 곳(원점 근처)이 나올 수 있다.
	if q.distance_to(p) > 600.0:
		return p
	return q


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
