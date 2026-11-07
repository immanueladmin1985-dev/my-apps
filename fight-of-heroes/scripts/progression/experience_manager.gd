class_name ExperienceManager
extends Node
## 경험치와 골드 분배. 처치 보상과 시간당 골드를 준다. AI 와 플레이어에게 같은 규칙을 쓴다.

var hero_manager: HeroManager
var _gold_carry := 0.0


func setup(hm: HeroManager) -> void:
	hero_manager = hm
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
	_gold_carry += DataRegistry.progression().passive_gold_per_sec * delta
	if _gold_carry >= 1.0:
		var g := int(_gold_carry)
		_gold_carry -= g
		for h in hero_manager.heroes:
			h.add_gold(g)


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
	var total := d.xp * (1.0 + cfg.group_bonus * (group.size() - 1))
	for h in group:
		give(h, total / group.size(), d.gold if h == credit else 0)


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
	var kill_gold: int = cfg.hero_kill_gold + cfg.hero_kill_gold_per_level * victim.level
	var assist_gold := int(kill_gold * cfg.assist_gold_ratio / maxf(1, helpers.size())) if not helpers.is_empty() else 0
	for h in group:
		var g: int = kill_gold if h == killer else (assist_gold if helpers.has(h) else 0)
		give(h, total / group.size(), g)
