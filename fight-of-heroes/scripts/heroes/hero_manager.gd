class_name HeroManager
extends Node
## 영웅을 만들고, 사망하면 부활 시간을 세고, 우물(시작 지점)에서 회복시킨다.

const HERO_SCENE := preload("res://scenes/heroes/hero.tscn")

var heroes: Array = []
var battle: BattleManager = null
var world: Node2D
var map: MapData
## 경기 설정 (시작 레벨·골드, 부활 시간 배율). 없으면 기본 규칙.
var config: MatchConfig = null


func setup(world_node: Node2D, map_data: MapData, cfg: MatchConfig = null) -> void:
	world = world_node
	map = map_data
	config = cfg


func spawn(data: HeroData, team: int, index: int) -> Hero:
	var h: Hero = HERO_SCENE.instantiate()
	h.name = "%s_%s" % [Enums.team_name(team), data.id]
	world.add_child(h)
	var offsets := [Vector2.ZERO, Vector2(-40, -80), Vector2(-40, 80), Vector2(-80, 0), Vector2(-80, -160)]
	var offset: Vector2 = offsets[index % offsets.size()]
	if team == Enums.Team.RED:
		offset.x = -offset.x
	h.spawn_point = map.spawn_of(team) + offset
	h.global_position = h.spawn_point
	h.setup(data, team)
	h.died.connect(_on_hero_died.bind(h))
	heroes.append(h)
	apply_start(h)
	return h


## 게임 방식의 시작 상태: 시작 레벨까지 올리고 스킬 포인트를 자동으로 배운 뒤, 체력·마나를 채우고 시작 골드를 준다.
func apply_start(h: Hero) -> void:
	if config == null:
		return
	if config.start_level > 1:
		# 레벨 업 알림·효과 없이 조용히 올린다 (레벨마다 스킬 포인트 1).
		var target := mini(config.start_level, DataRegistry.progression().max_level)
		h.skill_points += maxi(0, target - h.level)
		h.level = maxi(h.level, target)
		h.stats.set_level(h.level)
		h.xp = 0.0
		AIController.learn_all(h)
		h.health.reset_full()
		h.mana.reset_full()
	if config.start_gold >= 0:
		h.gold = config.start_gold
		h.gold_changed.emit(h.gold)


func _on_hero_died(_killer, h: Hero) -> void:
	var t := DataRegistry.combat_config().respawn_time(h.level)
	if config != null:
		t *= config.respawn_scale
	if battle != null:
		t *= DataRegistry.progression().comeback_respawn(battle.deficit(h.team))
	h.respawn_left = t


var _fountain_tick: Dictionary = {}


## pos 가 unit 에게 상대 팀 우물 안인지.
func in_enemy_fountain(unit, pos: Vector2, margin := 0.0) -> bool:
	var r := DataRegistry.combat_config().fountain_radius + margin
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		if Enums.is_enemy(team, unit.team) and pos.distance_to(map.spawn_of(team)) <= r:
			return true
	return false


func team_heroes(team: int) -> Array:
	return heroes.filter(func(h): return h.team == team)


func _physics_process(delta: float) -> void:
	if Net.is_client():
		return
	var cfg := DataRegistry.combat_config()
	for h: Hero in heroes:
		if h.is_dead:
			h.respawn_left -= delta
			if h.respawn_left <= 0.0:
				h.respawn_left = 0.0
				h.respawn_at(h.spawn_point)
				EventBus.hero_respawned.emit(h)
		elif h.global_position.distance_to(map.spawn_of(h.team)) <= cfg.fountain_radius:
			h.health.heal(h.health.max_hp() * cfg.fountain_regen_ratio * delta)
			h.mana.restore(h.mana.max_mp() * cfg.fountain_regen_ratio * delta)
		elif in_enemy_fountain(h, h.global_position):
			_fountain_tick[h] = _fountain_tick.get(h, 0.0) + delta
			if _fountain_tick[h] >= 0.25:
				var dmg: float = h.health.max_hp() * cfg.fountain_damage_ratio * _fountain_tick[h]
				_fountain_tick[h] = 0.0
				CombatManager.apply_damage(h, DamageInfo.new(null, dmg, Enums.DamageType.TRUE))
