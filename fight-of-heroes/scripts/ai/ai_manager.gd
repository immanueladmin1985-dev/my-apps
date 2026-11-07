class_name AIManager
extends Node
## AI 조작기를 만들고 난이도를 적용한다. 팀 단위 판단(리더, 집중 공격 대상)도 여기서 한다.
## 각 AI 는 자기 판단을 하되, 팀 정보는 이 매니저에게 묻는다.

const FOCUS_REFRESH := 0.5

var profile: AIProfile
var controllers: Array = []
var hero_manager: HeroManager
## 팀마다 플레이어가 조작하는 영웅 (없으면 null)
var player_heroes: Dictionary = {}

var _focus: Dictionary = {}  # team -> Unit
var _focus_left := 0.0


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


## 팀 리더: 플레이어 영웅이 살아 있으면 플레이어, 아니면 살아 있는 첫 번째 영웅.
func leader(team: int):
	var p = player_heroes.get(team)
	if p != null and is_instance_valid(p) and not p.is_dead:
		return p
	if hero_manager == null:
		return null
	for h in hero_manager.heroes:
		if h.team == team and not h.is_dead:
			return h
	return null


## 팀의 집중 공격 대상: 아군 근처에서 처치하기 쉬운 적 영웅.
func focus_target(team: int):
	var t = _focus.get(team)
	if t != null and Targeting.is_valid(t, team, Enums.TargetTeam.ENEMY):
		return t
	return null


func _physics_process(delta: float) -> void:
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
		for u in a.recent_attackers:
			var t: float = a.recent_attackers[u]
			if t > best_t and Targeting.is_valid(u, hero.team, Enums.TargetTeam.ENEMY):
				best_t = t
				best = u
	return best
