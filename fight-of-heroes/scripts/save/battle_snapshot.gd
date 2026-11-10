class_name BattleSnapshot
extends RefCounted
## 진행 중인 전투를 JSON 으로 바꿀 수 있는 사전으로 저장하고, 새로 만든 전투 화면에 되돌린다.
## 저장하는 것: 경기 설정, 경기 시간·킬 점수·연속 처치·피해 기록, 영웅(위치·체력·마나·레벨·경험치·골드·
## 스킬 단계·쿨타임·아이템·상태 효과·부활 남은 시간), 캠프(남은 시간·살아 있는 몬스터 체력·보스 단계).
## 저장하지 않는 것: 투사체·위험 지역·소환수처럼 몇 초 안에 끝나는 것, AI 의 순간 판단.

const VERSION := 1


static func capture(battle) -> Dictionary:
	var bm: BattleManager = battle.battle_manager
	var heroes: Array = battle.hero_manager.heroes
	var cfg: MatchConfig = battle.config
	var out := {
		"version": VERSION,
		"saved_at": Time.get_datetime_string_from_system(false, true),
		"config": {
			"blue": Array(cfg.blue_heroes), "red": Array(cfg.red_heroes), "player_index": cfg.player_index,
			"difficulty": cfg.difficulty, "kill_target": cfg.kill_target, "map_id": cfg.map_id,
			"final_boss_time": cfg.final_boss_time, "mode": cfg.mode,
		},
		"elapsed": bm.elapsed,
		"kills": [bm.kills[Enums.Team.BLUE], bm.kills[Enums.Team.RED]],
		"heroes": [],
		"camps": [],
	}
	for h: Hero in heroes:
		var slots: Array = []
		for i in InventoryComponent.SIZE:
			var it: ItemData = h.inventory.item_at(i)
			slots.append([it.id, h.inventory.count_at(i)] if it != null else null)
		var statuses: Array = []
		for id in h.status.active:
			var e: Dictionary = h.status.active[id]
			# 데이터 폴더에 있는 상태 효과만 저장한다 (다른 파일 안에 들어 있는 것은 되돌릴 수 없다).
			if DataRegistry.get_item("status", id) != null:
				statuses.append([id, e.remaining, e.magnitude])
		out.heroes.append({
			"id": h.data.id, "team": h.team,
			"x": h.global_position.x, "y": h.global_position.y,
			"level": h.level, "xp": h.xp, "gold": h.gold, "skill_points": h.skill_points,
			"kills": h.kills, "deaths": h.deaths, "assists": h.assists,
			"hp": h.health.hp, "mp": h.mana.mp,
			"dead": h.is_dead, "respawn_left": h.respawn_left,
			"ranks": h.skill_caster.ranks.duplicate(), "cooldowns": h.skill_caster.cooldowns.duplicate(),
			"max_cooldowns": h.skill_caster.max_cooldowns.duplicate(),
			"items": slots, "status": statuses,
			"streak": bm.streaks.get(h, 0),
			"damage": bm.damage_to_heroes.get(h, 0.0), "damage_total": bm.damage_total.get(h, 0.0),
		})
	for camp in battle.monster_manager.camps:
		var units: Array = []
		for m in camp.units:
			if is_instance_valid(m) and not m.is_dead:
				units.append({"id": m.data.id, "x": m.global_position.x, "y": m.global_position.y,
					"hx": m.home.x, "hy": m.home.y, "hp": m.health.hp, "phase": m.phase, "tier": m.tier})
		out.camps.append({"id": camp.data.id, "left": camp.left, "spawned": camp.spawned, "warned": camp.warned, "tier": camp.get("tier", 1), "units": units})
	return out


## 저장된 경기 설정으로 MatchConfig 를 만든다. 영웅이나 맵 데이터가 없으면 null.
static func make_config(snap: Dictionary) -> MatchConfig:
	if int(snap.get("version", 0)) != VERSION or not (snap.get("config") is Dictionary):
		return null
	var c: Dictionary = snap.config
	var cfg := MatchConfig.new()
	cfg.blue_heroes = PackedStringArray(c.get("blue", []))
	cfg.red_heroes = PackedStringArray(c.get("red", []))
	for id in Array(cfg.blue_heroes) + Array(cfg.red_heroes):
		if DataRegistry.hero(id) == null:
			return null
	cfg.player_index = int(c.get("player_index", 0))
	cfg.difficulty = str(c.get("difficulty", "normal"))
	cfg.kill_target = int(c.get("kill_target", 15))
	cfg.map_id = str(c.get("map_id", "valley_01"))
	if DataRegistry.map_data(cfg.map_id) == null:
		return null
	cfg.final_boss_time = float(c.get("final_boss_time", 600.0))
	cfg.mode = str(c.get("mode", "team"))
	return cfg


## 새로 만든 전투 화면(영웅과 캠프가 막 준비된 상태)에 저장한 상태를 되돌린다.
static func apply(battle, snap: Dictionary) -> bool:
	var bm: BattleManager = battle.battle_manager
	var heroes: Array = battle.hero_manager.heroes
	var saved: Array = snap.get("heroes", [])
	if saved.size() != heroes.size():
		return false
	for i in heroes.size():
		if str(saved[i].get("id", "")) != heroes[i].data.id:
			return false
	bm.elapsed = float(snap.get("elapsed", 0.0))
	var k: Array = snap.get("kills", [0, 0])
	bm.kills[Enums.Team.BLUE] = int(k[0])
	bm.kills[Enums.Team.RED] = int(k[1])
	for i in heroes.size():
		_apply_hero(heroes[i], saved[i], bm)
	battle.monster_manager.elapsed = bm.elapsed
	_apply_camps(battle.monster_manager, snap.get("camps", []))
	EventBus.kill_score_changed.emit(bm.kills[Enums.Team.BLUE], bm.kills[Enums.Team.RED])
	return true


static func _apply_hero(h: Hero, s: Dictionary, bm: BattleManager) -> void:
	h.global_position = Vector2(float(s.x), float(s.y))
	h.level = clampi(int(s.level), 1, DataRegistry.progression().max_level)
	h.stats.set_level(h.level)
	h.xp = float(s.xp)
	h.kills = int(s.kills)
	h.deaths = int(s.deaths)
	h.assists = int(s.assists)
	h.skill_points = int(s.skill_points)
	var ranks: Array = s.get("ranks", [])
	var cds: Array = s.get("cooldowns", [])
	var max_cds: Array = s.get("max_cooldowns", [])
	for slot in 4:
		if h.skill_caster.get_skill(slot) == null:
			continue
		if slot < ranks.size():
			h.skill_caster.ranks[slot] = clampi(int(ranks[slot]), 0, h.skill_caster.get_skill(slot).max_rank)
		if slot < cds.size():
			h.skill_caster.cooldowns[slot] = maxf(0.0, float(cds[slot]))
		if slot < max_cds.size():
			h.skill_caster.max_cooldowns[slot] = maxf(0.01, float(max_cds[slot]))
	h.skill_caster.ranks_changed.emit()
	var items: Array = s.get("items", [])
	for i in InventoryComponent.SIZE:
		var it: ItemData = ItemManager.get_item(str(items[i][0])) if i < items.size() and items[i] is Array else null
		h.inventory.slots[i] = {"item": it, "count": maxi(1, int(items[i][1]))} if it != null else null
	h.inventory._apply()
	h.gold = 0
	h.add_gold(int(s.gold))
	h.skill_points_changed.emit(h.skill_points)
	if bool(s.get("dead", false)):
		h.is_dead = true
		h.health.hp = 0.0
		h.collision_layer = 0
		h.respawn_left = maxf(0.1, float(s.get("respawn_left", 1.0)))
	else:
		h.health.hp = clampf(float(s.hp), 1.0, h.health.max_hp())
		h.mana.mp = clampf(float(s.mp), 0.0, h.mana.max_mp())
		for st in s.get("status", []):
			var d: StatusEffectData = DataRegistry.get_item("status", str(st[0]))
			if d != null:
				h.status.apply(d, float(st[1]), float(st[2]), null)
	bm.streaks[h] = int(s.get("streak", 0))
	bm.damage_to_heroes[h] = float(s.get("damage", 0.0))
	bm.damage_total[h] = float(s.get("damage_total", 0.0))


static func _apply_camps(mm: MonsterManager, saved: Array) -> void:
	var by_id := {}
	for c in saved:
		by_id[str(c.get("id", ""))] = c
	for camp in mm.camps:
		var s = by_id.get(camp.data.id)
		if s == null:
			continue
		camp.left = float(s.get("left", camp.left))
		camp.spawned = int(s.get("spawned", camp.spawned))
		camp.warned = bool(s.get("warned", false))
		camp.tier = int(s.get("tier", 1))
		var units: Array = []
		var n := 0
		for u in s.get("units", []):
			var d := DataRegistry.monster(str(u.get("id", "")))
			if d == null:
				continue
			var m: Monster = MonsterManager.SCENE.instantiate()
			m.name = "%s_%s_r%d" % [camp.data.id, d.id, n]
			n += 1
			mm.world.add_child(m)
			m.setup(d, Vector2(float(u.hx), float(u.hy)))
			var c: CampData = camp.data
			m.empower(int(u.get("tier", 1)), c.wave_stat_growth, c.wave_reward_growth)
			m.global_position = Vector2(float(u.x), float(u.y))
			m.health.hp = clampf(float(u.hp), 1.0, m.health.max_hp())
			# 분노 단계는 체력을 보고 다시 판정한다 (능력치 변화도 그때 붙는다).
			units.append(m)
		for m in units:
			m.camp_mates = units
		camp.units = units
		camp.alive = not units.is_empty()
