class_name AIManager
extends Node
## AI 조작기를 만들고 난이도를 적용한다. 팀 단위 판단(역할 배정, 집중 공격 대상, 보스 도전, "모여")도 여기서 한다.
## 각 AI 는 자기 판단을 하되, 팀 정보와 팀 계획은 이 매니저에게 묻는다.

const FOCUS_REFRESH := 0.5
const PLAN_REFRESH := 1.0
const ROLES := ["fighter", "hunter", "support"]
const GATHER_SECONDS := 15.0

var profile: AIProfile
var controllers: Array = []
var hero_manager: HeroManager
var monster_manager: MonsterManager
var shop: ShopManager
## 팀마다 플레이어가 조작하는 영웅 (없으면 null)
var player_heroes: Dictionary = {}

var _focus: Dictionary = {}  # team -> Unit
var _focus_left := 0.0
var _plan_left := 0.0
## 팀 계획: team -> {kind: "none" | "boss" | "gather", target, pos, until}
var plans: Dictionary = {}


func setup(difficulty: String, hm: HeroManager = null) -> void:
	profile = DataRegistry.ai_profile(difficulty)
	hero_manager = hm


func attach(hero, home: Vector2, rally: Vector2, seed_value := 0) -> AIController:
	var c := AIController.new()
	c.name = "AIController"
	hero.set_controller(c)
	c.setup(profile, home, rally, seed_value)
	c.manager = self
	controllers.append(c)
	return c


func set_player(team: int, hero) -> void:
	player_heroes[team] = hero


func allies_of(hero) -> Array:
	if hero_manager == null:
		return []
	return hero_manager.heroes.filter(func(h): return h != hero and h.team == hero.team and not h.is_dead)


func alive_count(team: int) -> int:
	if hero_manager == null:
		return 0
	return hero_manager.heroes.filter(func(h): return h.team == team and not h.is_dead).size()


## 팀의 집중 공격 대상: 아군 근처에서 처치하기 쉬운 적 영웅.
func focus_target(team: int):
	var t = _focus.get(team)
	if t != null and Targeting.is_valid(t, team, Enums.TargetTeam.ENEMY):
		return t
	return null


## 팀 안의 AI 에게 역할을 나눠 준다. 플레이어가 있으면 플레이어 영웅의 선호 역할을 먼저 뺀다.
func assign_roles(team: int) -> void:
	var free: Array = ROLES.duplicate()
	var player = player_heroes.get(team)
	if player != null and free.has(player.data.preferred_role):
		free.erase(player.data.preferred_role)
	var ais: Array = controllers.filter(func(c): return c.hero.team == team)
	var unassigned: Array = []
	for c in ais:
		var pref: String = c.hero.data.preferred_role
		if free.has(pref):
			c.role = pref
			free.erase(pref)
		else:
			unassigned.append(c)
	for c in unassigned:
		c.role = free.pop_front() if not free.is_empty() else c.hero.data.preferred_role


func plan_for(team: int) -> Dictionary:
	var p: Dictionary = plans.get(team, {})
	if p.get("kind", "") == "gather" and Unit.now() > p.until:
		plans[team] = {"kind": "none"}
		return plans[team]
	if p.get("kind", "") == "boss" and (not is_instance_valid(p.target) or p.target.is_dead):
		plans[team] = {"kind": "none"}
		return plans[team]
	return p


## "모여!": 팀 AI 가 GATHER_SECONDS 동안 pos 로 모인다.
func request_gather(team: int, pos: Vector2) -> void:
	plans[team] = {"kind": "gather", "pos": pos, "until": Unit.now() + GATHER_SECONDS}


## 팀이 보스에 도전할 준비가 됐는지: 2명 이상 살아 있고 평균 체력 50% 이상.
## 중립 보스는 평균 6레벨, 최종 보스는 평균 8레벨 이상. 상대 팀이 1명 이하만 살아 있으면 레벨과 상관없이 도전한다.
func team_boss_ready(team: int, boss) -> bool:
	if hero_manager == null:
		return false
	var mates: Array = []
	for h in hero_manager.heroes:
		if h.team == team and not h.is_dead:
			mates.append(h)
	if mates.size() < 2:
		return false
	var hp := 0.0
	var lv := 0.0
	for m in mates:
		hp += m.health.ratio()
		lv += m.level
	hp /= mates.size()
	lv /= mates.size()
	if hp < 0.5:
		return false
	var enemy_team: int = Enums.Team.RED if team == Enums.Team.BLUE else Enums.Team.BLUE
	if alive_count(enemy_team) <= 1:
		return true
	return lv >= (8.0 if boss.is_final_boss() else 6.0)


func _update_plan(team: int) -> void:
	var p := plan_for(team)
	if p.get("kind", "") == "gather":
		return
	if monster_manager == null:
		plans[team] = {"kind": "none"}
		return
	# 플레이어 팀은 플레이어가 보스를 공격하기 시작하면 함께 도전한다.
	var player = player_heroes.get(team)
	if player != null and is_instance_valid(player) and not player.is_dead:
		var t = player.attack_order
		if t is Monster and t.is_boss() and not t.is_dead:
			plans[team] = {"kind": "boss", "target": t}
		elif p.get("kind", "") == "boss" and player.global_position.distance_to(p.target.global_position) < 900.0:
			pass
		else:
			plans[team] = {"kind": "none"}
		return
	if p.get("kind", "") == "boss" and team_boss_ready_keep(team):
		return
	var fb = monster_manager.final_boss()
	if fb != null and team_boss_ready(team, fb):
		plans[team] = {"kind": "boss", "target": fb}
		return
	for b in monster_manager.bosses():
		if not b.is_final_boss() and team_boss_ready(team, b):
			plans[team] = {"kind": "boss", "target": b}
			return
	plans[team] = {"kind": "none"}


## 이미 도전 중이면 2명 이상 살아 있는 동안 계속한다.
func team_boss_ready_keep(team: int) -> bool:
	return alive_count(team) >= 2


func _physics_process(delta: float) -> void:
	_plan_left -= delta
	if _plan_left <= 0.0:
		_plan_left = PLAN_REFRESH
		for team in [Enums.Team.BLUE, Enums.Team.RED]:
			_update_plan(team)
	_focus_left -= delta
	if _focus_left > 0.0 or hero_manager == null:
		return
	_focus_left = FOCUS_REFRESH
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		_focus[team] = _pick_focus(team)


func _pick_focus(team: int):
	var best = null
	var best_score := INF
	var mates: Array = hero_manager.heroes.filter(func(h): return h.team == team and not h.is_dead)
	if mates.is_empty():
		return null
	for e in hero_manager.heroes:
		if not Targeting.is_valid(e, team, Enums.TargetTeam.ENEMY):
			continue
		var near := INF
		for m in mates:
			near = minf(near, m.global_position.distance_to(e.global_position))
		if near > 700.0:
			continue
		# 체력이 적고 아군과 가까운 적일수록 점수가 낮다(우선).
		var score: float = e.health.hp + near * 0.8
		if score < best_score:
			best_score = score
			best = e
	return best


## 최근에 아군 영웅을 때린 적. 아군 지원에 쓴다.
func attacker_of_allies(hero, window := 2.0):
	var now := Unit.now()
	var best = null
	var best_t := now - window
	for a in allies_of(hero):
		for pair in a.valid_attackers():
			var u = pair[0]
			var t: float = pair[1]
			if t > best_t and Targeting.is_valid(u, hero.team, Enums.TargetTeam.ENEMY):
				best_t = t
				best = u
	return best
