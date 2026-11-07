class_name HeroManager
extends Node
## 영웅을 만들고, 사망하면 부활 시간을 세고, 우물(시작 지점)에서 회복시킨다.

const HERO_SCENE := preload("res://scenes/heroes/hero.tscn")

var heroes: Array = []
var world: Node2D
var map: MapData


func setup(world_node: Node2D, map_data: MapData) -> void:
	world = world_node
	map = map_data


func spawn(data: HeroData, team: int, index: int) -> Hero:
	var h: Hero = HERO_SCENE.instantiate()
	h.name = "%s_%s" % [Enums.team_name(team), data.id]
	world.add_child(h)
	var offset := Vector2(0, (index - 1) * 70.0) if index > 0 else Vector2.ZERO
	h.spawn_point = map.spawn_of(team) + offset
	h.global_position = h.spawn_point
	h.setup(data, team)
	h.died.connect(_on_hero_died.bind(h))
	heroes.append(h)
	return h


func _on_hero_died(_killer, h: Hero) -> void:
	h.respawn_left = DataRegistry.combat_config().respawn_time(h.level)


func team_heroes(team: int) -> Array:
	return heroes.filter(func(h): return h.team == team)


func _physics_process(delta: float) -> void:
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
