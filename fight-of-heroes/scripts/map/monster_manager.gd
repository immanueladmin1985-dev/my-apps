class_name MonsterManager
extends Node
## 맵의 캠프마다 몬스터를 만들고, 모두 처치되면 리스폰 시간을 센다.
## 보스 자리도 같은 방식으로 관리하고, 보스 알림·보상은 BossManager 가 맡는다.

const SCENE := preload("res://scenes/monsters/monster.tscn")
const CORPSE_TIME := 1.0

var world: Node2D
var map: MapData
var camps: Array = []  # [{data, units, left, alive, spawned, warned}]
var final_boss_time := 600.0
## 경기 시작 뒤 지난 시간 (주기 소환 성장 단계 계산)
var elapsed := 0.0


func setup(world_node: Node2D, map_data: MapData, cfg: MatchConfig) -> void:
	world = world_node
	map = map_data
	if cfg != null and cfg.final_boss_time > 0.0:
		final_boss_time = cfg.final_boss_time
	for c: CampData in map.camps:
		var first := final_boss_time if c.is_final_boss else c.first_spawn
		camps.append({"data": c, "units": [], "left": first, "alive": false, "spawned": 0, "warned": false, "tier": 1})


func is_boss_camp(camp: Dictionary) -> bool:
	var c: CampData = camp.data
	if c.monsters.is_empty():
		return false
	var d := DataRegistry.monster(c.monsters[0])
	return d != null and (d.tier == "boss" or d.tier == "final_boss")


func _physics_process(delta: float) -> void:
	elapsed += delta
	for camp in camps:
		if camp.data.wave_interval > 0.0:
			_tick_wave(camp, delta)
			continue
		if camp.alive:
			var units: Array = camp.units
			if units.all(func(m): return not is_instance_valid(m) or m.is_dead):
				camp.alive = false
				camp.left = camp.data.respawn
				for m in units:
					if is_instance_valid(m):
						get_tree().create_timer(CORPSE_TIME, false).timeout.connect(m.queue_free)
				camp.units = []
			continue
		if camp.spawned > 0 and camp.data.respawn <= 0.0:
			continue
		camp.left -= delta
		if is_boss_camp(camp) and not camp.warned and camp.left <= 60.0 and camp.left > 0.0:
			camp.warned = true
			var d := DataRegistry.monster(camp.data.monsters[0])
			EventBus.boss_warning.emit(d.display_name, ceili(camp.left))
		if camp.left <= 0.0:
			spawn_camp(camp)


## 주기 소환 캠프: 처음 first_spawn 뒤부터 wave_interval 마다 한 무리씩, wave_max 까지 쌓인다.
func _tick_wave(camp: Dictionary, delta: float) -> void:
	var c: CampData = camp.data
	var alive: Array = []
	for m in camp.units:
		if is_instance_valid(m) and not m.is_dead:
			alive.append(m)
		elif is_instance_valid(m) and m.is_dead and not m.has_meta("corpse"):
			m.set_meta("corpse", true)
			get_tree().create_timer(CORPSE_TIME, false).timeout.connect(m.queue_free)
	camp.units = alive + camp.units.filter(func(m): return is_instance_valid(m) and m.is_dead)
	camp.alive = not alive.is_empty()
	camp.left -= delta
	if camp.left > 0.0:
		return
	camp.left = c.wave_interval
	var tier := c.wave_tier(elapsed - c.first_spawn)
	if tier > int(camp.get("tier", 1)):
		camp.tier = tier
		EventBus.notice.emit("중앙 미니언이 강해졌습니다 (%d단계): 수 증가, 체력·공격력 +%d%%, 보상 +%d%%" % [tier, roundi(c.wave_stat_growth * (tier - 1) * 100.0), roundi(c.wave_reward_growth * (tier - 1) * 100.0)])
	var names := c.wave_group(tier)
	var room := c.wave_max + c.wave_max_growth * (tier - 1) - alive.size()
	var group: Array = []
	for i in mini(room, names.size()):
		var d := DataRegistry.monster(names[i])
		if d == null:
			continue
		var m: Monster = SCENE.instantiate()
		m.name = "%s_%s_%d_%d" % [c.id, d.id, camp.spawned, i]
		world.add_child(m)
		var pos := c.position + Vector2.from_angle(randf() * TAU) * randf_range(60.0, 220.0)
		m.setup(d, pos)
		m.empower(tier, c.wave_stat_growth, c.wave_reward_growth)
		group.append(m)
	for m in group:
		m.camp_mates = group
	camp.units += group
	camp.spawned += 1
	camp.alive = camp.alive or not group.is_empty()


func spawn_camp(camp: Dictionary) -> void:
	var c: CampData = camp.data
	var units: Array = []
	for i in c.monsters.size():
		var d := DataRegistry.monster(c.monsters[i])
		if d == null:
			push_error("몬스터 데이터가 없습니다: " + c.monsters[i])
			continue
		var m: Monster = SCENE.instantiate()
		m.name = "%s_%s_%d" % [c.id, d.id, camp.spawned]
		world.add_child(m)
		var offset := Vector2.ZERO if i == 0 else Vector2.from_angle(TAU * i / maxf(1, c.monsters.size() - 1)) * 55.0
		m.setup(d, c.position + offset)
		units.append(m)
		if m.is_boss():
			EventBus.boss_spawned.emit(m)
	for m in units:
		m.camp_mates = units
	camp.units = units
	camp.alive = not units.is_empty()
	camp.spawned += 1
	camp.warned = false


func alive_monsters() -> Array:
	var out: Array = []
	for camp in camps:
		for m in camp.units:
			if is_instance_valid(m) and not m.is_dead:
				out.append(m)
	return out


## 보스가 아닌 캠프 중 몬스터가 살아 있는 캠프의 위치 목록
func farm_spots() -> Array:
	var out: Array = []
	for camp in camps:
		if camp.alive and not is_boss_camp(camp):
			out.append(camp.data.position)
	return out


## 캠프 정보 목록: [{position, id, wave}] (살아 있는 몬스터가 있는 것만)
func farm_camps() -> Array:
	var out: Array = []
	for camp in camps:
		if camp.alive and not is_boss_camp(camp):
			out.append({"position": camp.data.position, "id": camp.data.id, "wave": camp.data.wave_interval > 0.0})
	return out


func bosses() -> Array:
	return alive_monsters().filter(func(m): return m.is_boss())


func final_boss():
	for m in bosses():
		if m.is_final_boss():
			return m
	return null


## 최종 보스가 나올 때까지 남은 초 (이미 나왔거나 없으면 -1)
func time_to_final_boss() -> float:
	for camp in camps:
		if camp.data.is_final_boss and not camp.alive and camp.spawned == 0:
			return camp.left
	return -1.0
