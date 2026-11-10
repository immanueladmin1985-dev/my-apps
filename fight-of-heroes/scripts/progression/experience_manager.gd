class_name ExperienceManager
extends Node
## 경험치와 골드 분배. 처치 보상과 시간당 골드를 준다. AI 와 플레이어에게 같은 규칙을 쓴다.

var hero_manager: HeroManager
var battle: BattleManager = null
var _gold_carry := {}


func setup(hm: HeroManager, bm: BattleManager = null) -> void:
	hero_manager = hm
	battle = bm
	EventBus.unit_died.connect(_on_unit_died)
	EventBus.hero_killed.connect(_on_hero_killed)


func _exit_tree() -> void:
	if EventBus.unit_died.is_connected(_on_unit_died):
		EventBus.unit_died.disconnect(_on_unit_died)
	if EventBus.hero_killed.is_connected(_on_hero_killed):
		EventBus.hero_killed.disconnect(_on_hero_killed)


## 처치를 인정받는 영웅: 마지막 일격이 적 영웅이면 그 영웅, 아니면 최근 10초 안에 때린 적 영웅.
## 소환수가 처치하면 주인 영웅이 인정받는다.
static func credit_hero(victim, killer):
	var k = Targeting.hero_of(killer)
	if k != null and Enums.is_enemy(k.team, victim.team):
		return k
	var best = null
	var best_t := Unit.now() - 10.0
	for pair in victim.valid_attackers():
		var u = Targeting.hero_of(pair[0])
		if u != null and Enums.is_enemy(u.team, victim.team) and pair[1] > best_t:
			best = u
			best_t = pair[1]
	return best


func _physics_process(delta: float) -> void:
	if hero_manager == null:
		return
	# 시간당 골드. 킬 점수가 뒤진 팀은 더 받는다.
	var cfg := DataRegistry.progression()
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		var carry: float = _gold_carry.get(team, 0.0) + cfg.passive_gold_per_sec * cfg.comeback_gold(_deficit(team)) * delta
		if carry >= 1.0:
			var g := int(carry)
			carry -= g
			for h in hero_manager.heroes:
				if h.team == team:
					h.add_gold(g)
		_gold_carry[team] = carry


func _deficit(team: int) -> int:
	return battle.deficit(team) if battle != null else 0


func give(h: Hero, xp: float, gold: int) -> void:
	h.add_xp(xp)
	h.add_gold(gold)
	EventBus.reward.emit(h, xp, gold)


func _alive_near(team: int, pos: Vector2, radius: float) -> Array:
	return hero_manager.team_heroes(team).filter(func(h): return not h.is_dead and h.global_position.distance_to(pos) <= radius)


func _on_unit_died(victim, killer) -> void:
	if not (victim is Monster) or hero_manager == null:
		return
	if victim.expired:
		return
	var credit = credit_hero(victim, killer)
	if credit == null:
		return
	var cfg := DataRegistry.progression()
	var d: MonsterData = victim.data
	if victim.is_boss():
		for h in hero_manager.team_heroes(credit.team):
			if not h.is_dead:
				give(h, d.xp, d.gold)
		return
	var group := _alive_near(credit.team, victim.global_position, cfg.monster_xp_radius)
	if not group.has(credit):
		group.append(credit)
	var mult: float = victim.reward_mult
	var total: float = d.xp * mult * (1.0 + cfg.group_bonus * (group.size() - 1))
	var gold := roundi(d.gold * mult)
	for h in group:
		give(h, total / group.size(), gold if h == credit else 0)


func _on_hero_killed(victim, killer, helpers: Array) -> void:
	if hero_manager == null or killer == null or not (killer is Hero):
		return
	var cfg := DataRegistry.progression()
	var team: int = killer.team
	var group := _alive_near(team, victim.global_position, cfg.hero_xp_radius)
	for h in [killer] + helpers:
		if not group.has(h):
			group.append(h)
	var total: float = cfg.hero_xp_base + cfg.hero_xp_per_level * victim.level
	# 레벨이 낮은 팀이 처치하면 경험치를 더 준다 (평균 레벨 1 차이마다 15%, 최대 60%).
	var gap := _avg_level(victim.team) - _avg_level(team)
	if gap > 0.0:
		total *= 1.0 + minf(gap * 0.15, 0.6)
	var kill_gold: int = cfg.hero_kill_gold + cfg.hero_kill_gold_per_level * victim.level
	kill_gold = int(kill_gold * cfg.comeback_gold(_deficit(team)))
	var assist_gold := int(kill_gold * cfg.assist_gold_ratio / maxf(1, helpers.size())) if not helpers.is_empty() else 0
	for h in group:
		var g: int = kill_gold if h == killer else (assist_gold if helpers.has(h) else 0)
		give(h, total / group.size(), g)


func _avg_level(team: int) -> float:
	var n := 0
	var sum := 0.0
	for h in hero_manager.heroes:
		if h.team == team:
			n += 1
			sum += h.level
	return sum / maxf(1, n)
