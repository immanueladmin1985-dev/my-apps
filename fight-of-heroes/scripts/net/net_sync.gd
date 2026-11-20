class_name NetSync
extends Node
## 와이파이 대전 전투 동기화 (전투 화면에 붙는다).
## 방장: 0.05초마다 모든 유닛 상태(스냅숏)를 보내고, 스킬·공격·피해·처치·알림 같은 일(이벤트)을 바로 보낸다.
##       참가자가 보낸 입력(이동·공격 대상)과 요청(스킬·배우기·사기·팔기·쓰기·신호)을 실행한다.
## 참가자: 받은 스냅숏대로 유닛을 맞추고, 이벤트로 효과를 그린다. 내 입력과 요청을 방장에게 보낸다.

const SNAP_INTERVAL := 0.05
const ME_INTERVAL := 0.2
const INPUT_INTERVAL := 1.0 / 30.0

static var current: NetSync = null

var battle: Node
var units: Dictionary = {}  # net_id -> Unit
var _next_id := 100
var _snap_left := 0.0
var _me_left := 0.0
var _input_left := 0.0
var _dmg_queue: Array = []
var _skill_cache: Dictionary = {}
var _got_snapshot := false


func setup(b: Node) -> void:
	battle = b
	name = "NetSync"
	current = self
	var heroes: Array = battle.hero_manager.heroes
	for i in heroes.size():
		heroes[i].net_id = i
		units[i] = heroes[i]
	if Net.is_host():
		battle.world.child_entered_tree.connect(_on_world_child)
		EventBus.skill_cast.connect(_on_skill_cast)
		EventBus.attack_started.connect(_on_attack_started)
		EventBus.unit_damaged.connect(_on_damaged)
		EventBus.unit_healed.connect(_on_healed)
		EventBus.hero_killed.connect(_on_hero_killed)
		EventBus.notice.connect(_on_notice)
		EventBus.hero_level_up.connect(_on_level_up)
		EventBus.reward.connect(_on_reward)
		battle.battle_manager.ended.connect(_on_ended)
		Net.peer_left.connect(_on_peer_left)
	else:
		Net.battle_ready()


## 참가자이면 요청을 방장에게 보내고 true (그러면 부른 쪽은 직접 실행하지 않는다)
static func client_request(kind: String, args: Array) -> bool:
	if not Net.is_client() or current == null or not is_instance_valid(current):
		return false
	current.request(kind, args)
	return true


## 방장이 신호를 찍으면 참가자에게도 보낸다.
static func host_ping(team: int, kind: String, pos: Vector2) -> void:
	if Net.is_host() and current != null and is_instance_valid(current):
		for peer in current._ready_peers_list():
			current._ping_event.rpc_id(peer, team, kind, pos.x, pos.y)


func _exit_tree() -> void:
	if current == self:
		current = null
	for pair in [[EventBus.skill_cast, _on_skill_cast], [EventBus.attack_started, _on_attack_started], [EventBus.unit_damaged, _on_damaged],
			[EventBus.unit_healed, _on_healed], [EventBus.hero_killed, _on_hero_killed], [EventBus.notice, _on_notice],
			[EventBus.hero_level_up, _on_level_up], [EventBus.reward, _on_reward]]:
		if pair[0].is_connected(pair[1]):
			pair[0].disconnect(pair[1])
	if Net.peer_left.is_connected(_on_peer_left):
		Net.peer_left.disconnect(_on_peer_left)


func unit_by_id(id: int):
	var u = units.get(id)
	return u if u != null and is_instance_valid(u) else null


func _on_world_child(n: Node) -> void:
	if n is Unit and n.net_id < 0:
		n.net_id = _next_id
		_next_id += 1
		units[n.net_id] = n


func _physics_process(delta: float) -> void:
	if not Net.is_online():
		return
	if Net.is_host():
		_snap_left -= delta
		if _snap_left <= 0.0:
			_snap_left = SNAP_INTERVAL
			_send_snapshot()
		_me_left -= delta
		if _me_left <= 0.0:
			_me_left = ME_INTERVAL
			_send_me_all()
	elif Net.is_client() and _got_snapshot:
		_input_left -= delta
		if _input_left <= 0.0:
			_input_left = INPUT_INTERVAL
			_send_input()


# ======================= 방장 =======================

func _status_ids(u) -> PackedStringArray:
	var out := PackedStringArray()
	for id in u.status.active.keys():
		out.append(id)
	return out


func _send_snapshot() -> void:
	var bm: BattleManager = battle.battle_manager
	var hs: Array = []
	for h: Hero in battle.hero_manager.heroes:
		hs.append([roundi(h.global_position.x), roundi(h.global_position.y), snappedf(h.facing.x, 0.01), snappedf(h.facing.y, 0.01),
			roundi(h.health.hp), roundi(h.health.max_hp()), roundi(h.mana.mp), roundi(h.mana.max_mp()), roundi(h.health.shield_total()),
			h.is_dead, snappedf(h.respawn_left, 0.1), h.level, snappedf(h.gauge, 0.1), h.attack.ammo, h.attack.reloading,
			_status_ids(h), h.kills, h.deaths, h.assists, snappedf(h.revealed_until - Unit.now(), 0.1), h.wants_move])
	var ms: Array = []
	var ids := PackedInt32Array()
	for m in get_tree().get_nodes_in_group("units"):
		if not (m is Monster) or m.net_id < 0 or m.is_queued_for_deletion():
			continue
		var owner_id: int = m.owner_unit.net_id if m.owner_unit != null and is_instance_valid(m.owner_unit) else -1
		var st = _status_ids(m)
		ids.append(m.net_id)
		ms.append([m.net_id, m.data.id, m.team, roundi(m.global_position.x), roundi(m.global_position.y), int(signf(m.facing.x)),
			roundi(m.health.hp), roundi(m.health.max_hp()), m.is_dead, owner_id, st if not st.is_empty() else null, m.tier, m.flee])
	var runes: Array = []
	var rm = get_tree().get_first_node_in_group("runes")
	if rm != null:
		for s in rm.spots:
			runes.append(s.kind)
	var coins: Array = []
	for c in get_tree().get_nodes_in_group("coins"):
		coins.append([roundi(c.global_position.x), roundi(c.global_position.y)])
	var wards: Array = []
	for w in get_tree().get_nodes_in_group("wards"):
		wards.append([w.team, roundi(w.global_position.x), roundi(w.global_position.y), snappedf(w.life - w._age, 0.5)])
	var snap := [snappedf(bm.elapsed, 0.05), bm.kills[Enums.Team.BLUE], bm.kills[Enums.Team.RED], ids, runes, coins, wards]
	var evs := _dmg_queue
	_dmg_queue = []
	for peer in _ready_peers_list():
		# 한 덩어리가 너무 크면 잃어버리기 쉬우므로 몬스터는 8마리씩 나눠 보낸다.
		_snapshot.rpc_id(peer, snap)
		_heroes.rpc_id(peer, 0, hs.slice(0, 3))
		_heroes.rpc_id(peer, 3, hs.slice(3))
		for i in range(0, ms.size(), 8):
			_monsters.rpc_id(peer, ms.slice(i, i + 8))
		if not evs.is_empty():
			_events.rpc_id(peer, evs)


## 참가자마다 자기 영웅의 골드·경험치·스킬·아이템
func _send_me_all() -> void:
	for slot in battle.config.net_humans:
		var peer: int = battle.config.net_humans[slot]
		if not Net.ready_peers.has(peer) or not multiplayer.get_peers().has(peer):
			continue
		var h: Hero = battle.hero_manager.heroes[int(slot)]
		var inv: Array = []
		for i in InventoryComponent.SIZE:
			var it: ItemData = h.inventory.item_at(i)
			inv.append([it.id if it != null else "", h.inventory.count_at(i)])
		_me.rpc_id(peer, [h.gold, h.xp, h.skill_points, h.skill_caster.ranks, h.skill_caster.cooldowns, h.skill_caster.max_cooldowns,
			h.skill_caster.recast_left, inv, h.elixirs, h.data.id])


func _ready_peers_list() -> Array:
	var out: Array = []
	for p in multiplayer.get_peers():
		if Net.ready_peers.has(p):
			out.append(p)
	return out


func _queue(ev: Array) -> void:
	_dmg_queue.append(ev)


func _on_skill_cast(caster, _slot, s) -> void:
	if caster == null or not is_instance_valid(caster) or caster.net_id < 0 or s == null:
		return
	var c: SkillContext = caster.skill_caster.last_ctx
	var t_id: int = c.target_unit.net_id if c != null and c.target_unit != null and is_instance_valid(c.target_unit) else -1
	var data := [caster.net_id, s.resource_path, c.rank if c != null else 1, t_id,
		c.point.x if c != null else 0.0, c.point.y if c != null else 0.0, c.direction.x if c != null else 1.0, c.direction.y if c != null else 0.0,
		caster.skill_caster.last_was_recast]
	for peer in _ready_peers_list():
		_cast_event.rpc_id(peer, data)


func _on_attack_started(u, t) -> void:
	if u == null or t == null or not is_instance_valid(u) or not is_instance_valid(t) or u.net_id < 0 or t.net_id < 0:
		return
	_queue(["a", u.net_id, t.net_id])


func _on_damaged(target, info, amount: float) -> void:
	if target == null or not is_instance_valid(target) or target.net_id < 0:
		return
	var src_id: int = info.source.net_id if info.source != null and is_instance_valid(info.source) else -1
	_queue(["d", target.net_id, roundi(amount), info.is_crit, info.type, src_id, info.is_basic_attack])


func _on_healed(target, amount: float, _source) -> void:
	if target == null or not is_instance_valid(target) or target.net_id < 0:
		return
	_queue(["h", target.net_id, roundi(amount)])


func _on_hero_killed(victim, killer, helpers: Array) -> void:
	var hl: Array = []
	for x in helpers:
		hl.append(x.net_id)
	_queue(["k", victim.net_id, killer.net_id if killer != null else -1, hl])


func _on_notice(text: String) -> void:
	_queue(["n", text])


func _on_level_up(h, lv: int) -> void:
	_queue(["l", h.net_id, lv])


func _on_reward(h, xp: float, gold: int) -> void:
	if h != null and is_instance_valid(h):
		_queue(["r", h.net_id, roundi(xp), gold])


func _on_ended(winner: int, reason: String) -> void:
	_send_snapshot()
	for peer in _ready_peers_list():
		_end_event.rpc_id(peer, winner, reason)


func _on_peer_left(peer: int) -> void:
	for slot in battle.config.net_humans.keys():
		if int(battle.config.net_humans[slot]) == peer:
			battle.config.net_humans.erase(slot)
			var h: Hero = battle.hero_manager.heroes[int(slot)]
			battle.ai_manager.attach(h, battle.map.spawn_of(h.team), battle.map.size * 0.5)
			battle.ai_manager.assign_roles(h.team)


# ---- 참가자가 보낸 입력과 요청 (방장에서 실행) ----

func _hero_of_sender():
	var peer := multiplayer.get_remote_sender_id()
	for slot in battle.config.net_humans:
		if int(battle.config.net_humans[slot]) == peer:
			return battle.hero_manager.heroes[int(slot)]
	return null


@rpc("any_peer", "unreliable_ordered")
func _net_input(mx: float, my: float, target_id: int) -> void:
	var h = _hero_of_sender()
	if h != null and h.controller is RemoteController:
		h.controller.move = Vector2(mx, my)
		h.controller.target_id = target_id


@rpc("any_peer", "reliable")
func _req(kind: String, args: Array) -> void:
	var h = _hero_of_sender()
	if h == null:
		return
	var shop: ShopManager = battle.shop_manager
	match kind:
		"cast":
			var aim := CastAim.new()
			aim.direction = Vector2(args[1], args[2])
			aim.point = Vector2(args[3], args[4])
			aim.has_point = bool(args[5])
			aim.unit = unit_by_id(int(args[6]))
			h.skill_caster.cast(int(args[0]), aim)
		"learn":
			h.learn(int(args[0]))
		"buy":
			shop.buy(h, str(args[0]))
		"sell":
			shop.sell(h, int(args[0]))
		"use":
			shop.use_item(h, int(args[0]))
		"ping":
			battle.ai_manager.add_ping(h.team, str(args[0]), Vector2(args[1], args[2]))
			for peer in _ready_peers_list():
				_ping_event.rpc_id(peer, h.team, str(args[0]), args[1], args[2])
		"gather":
			battle.ai_manager.request_gather(h.team, h.global_position)


# ======================= 참가자 =======================

func _send_input() -> void:
	var h: Hero = battle.player_hero
	if h == null:
		return
	var t = h.attack_order
	var mv: Vector2 = h.move_input
	if GameManager.dev_args.has("lan_bot"):
		# 개발용: 참가자 영웅을 맵 가운데로 걸어가게 하고, 2초마다 Q 를 쓴다.
		mv = (battle.map.size * 0.5 - h.global_position).limit_length(1.0)
		if mv.length() < 0.3:
			mv = Vector2.ZERO
		if Engine.get_physics_frames() % 120 == 0:
			h.learn(0)
			battle.player_controller.try_cast(0, battle.player_controller.auto_aim(0))
	_net_input.rpc_id(1, mv.x, mv.y, t.net_id if t != null and is_instance_valid(t) else -1)


## 참가자 요청 보내기 (스킬·배우기·사기·팔기·쓰기·신호·모여)
func request(kind: String, args: Array) -> void:
	_req.rpc_id(1, kind, args)


@rpc("authority", "unreliable_ordered")
func _snapshot(snap: Array) -> void:
	if not Net.is_client():
		return
	_got_snapshot = true
	var bm: BattleManager = battle.battle_manager
	bm.elapsed = snap[0]
	bm.kills[Enums.Team.BLUE] = snap[1]
	bm.kills[Enums.Team.RED] = snap[2]
	# 몬스터·소환수: 목록에 없는 것은 지운다 (새로 생긴 것은 _monsters 가 만든다).
	var seen := {}
	for id in snap[3]:
		seen[int(id)] = true
	for id in units.keys():
		if id >= 100 and not seen.has(id):
			var m = units[id]
			units.erase(id)
			if is_instance_valid(m):
				m.queue_free()
	var rm = get_tree().get_first_node_in_group("runes")
	if rm != null:
		for i in mini(rm.spots.size(), snap[4].size()):
			rm.spots[i].kind = snap[4][i]
	_sync_coins(snap[5])
	_sync_wards(snap[6])


@rpc("authority", "unreliable_ordered")
func _heroes(first: int, list: Array) -> void:
	if not Net.is_client():
		return
	var heroes: Array = battle.hero_manager.heroes
	for i in list.size():
		if first + i < heroes.size():
			_apply_hero(heroes[first + i], list[i])


@rpc("authority", "unreliable_ordered")
func _monsters(list: Array) -> void:
	if not Net.is_client():
		return
	for e in list:
		_apply_monster(e)


func _apply_hero(h: Hero, e: Array) -> void:
	h.net_pos = Vector2(e[0], e[1])
	var f := Vector2(e[2], e[3])
	if f.length() > 0.1:
		h.facing = f
	if bool(e[9]) and not h.is_dead:
		h.die(null)
		h.net_pos = Vector2(e[0], e[1])
	elif not bool(e[9]) and h.is_dead:
		h.respawn_at(Vector2(e[0], e[1]))
	h.respawn_left = e[10]
	if int(e[11]) != h.level:
		h.level = int(e[11])
		h.stats.set_level(h.level)
	h.health.net_set(float(e[4]), float(e[5]), float(e[8]))
	h.mana.net_set(float(e[6]), float(e[7]))
	if h.has_gauge():
		h.set_gauge(float(e[12]))
	h.attack.ammo = int(e[13])
	h.attack.reloading = bool(e[14])
	h.status.sync_ids(e[15])
	h.kills = int(e[16])
	h.deaths = int(e[17])
	h.assists = int(e[18])
	h.revealed_until = Unit.now() + float(e[19])


func _apply_monster(e: Array) -> void:
	var id := int(e[0])
	var m = unit_by_id(id)
	if m == null:
		var d := DataRegistry.monster(str(e[1]))
		if d == null:
			return
		m = load("res://scenes/monsters/monster.tscn").instantiate()
		battle.world.add_child(m)
		m.setup(d, Vector2(e[3], e[4]))
		m.net_id = id
		m.tier = int(e[11])
		m.flee = bool(e[12])
		if bool(e[12]):
			m.add_to_group("goblins")
		var owner_u = unit_by_id(int(e[9]))
		if owner_u != null:
			m.remove_from_group("monsters")
			m.add_to_group("summons")
			m.owner_unit = owner_u
		units[id] = m
	m.team = int(e[2])
	m.net_pos = Vector2(e[3], e[4])
	m.facing = Vector2(e[5], 0.0) if absf(float(e[5])) > 0.1 else m.facing
	m.health.net_set(float(e[6]), float(e[7]), 0.0)
	if bool(e[8]) and not m.is_dead:
		m.die(null)
	elif not bool(e[8]) and m.is_dead:
		m.respawn_at(Vector2(e[3], e[4]))
	m.status.sync_ids(PackedStringArray(e[10]) if e[10] != null else PackedStringArray())


func _sync_coins(list: Array) -> void:
	var have: Array = get_tree().get_nodes_in_group("coins")
	while have.size() > list.size():
		have.pop_back().queue_free()
	for i in list.size():
		var p := Vector2(list[i][0], list[i][1])
		if i < have.size():
			have[i].global_position = p
		else:
			var c := GoldCoin.drop(battle.player_hero, p, 0)
			c._vel = Vector2.ZERO


func _sync_wards(list: Array) -> void:
	var mine: Array = list.filter(func(w): return int(w[0]) == battle.config.net_my_team)
	var have: Array = get_tree().get_nodes_in_group("wards")
	while have.size() > mine.size():
		have.pop_back().queue_free()
	for i in mine.size():
		var w: Ward
		if i < have.size():
			w = have[i]
		else:
			w = Ward.new()
			w.team = int(mine[i][0])
			w.add_to_group("wards")
			Targeting.effects_parent(battle.player_hero).add_child(w)
		w.global_position = Vector2(mine[i][1], mine[i][2])
		w.life = w._age + maxf(0.5, float(mine[i][3]))


@rpc("authority", "reliable")
func _me(d: Array) -> void:
	var h: Hero = battle.player_hero
	if h == null or not Net.is_client():
		return
	if h.gold != int(d[0]):
		h.gold = int(d[0])
		h.gold_changed.emit(h.gold)
	h.xp = float(d[1])
	if h.skill_points != int(d[2]):
		h.skill_points = int(d[2])
		h.skill_points_changed.emit(h.skill_points)
	for i in 4:
		h.skill_caster.ranks[i] = int(d[3][i])
		h.skill_caster.cooldowns[i] = float(d[4][i])
		h.skill_caster.max_cooldowns[i] = float(d[5][i])
		h.skill_caster.recast_left[i] = float(d[6][i])
	var inv: Array = d[7]
	var changed := false
	for i in mini(InventoryComponent.SIZE, inv.size()):
		var want_id: String = inv[i][0]
		var cur: ItemData = h.inventory.item_at(i)
		var cur_id := cur.id if cur != null else ""
		if cur_id != want_id or h.inventory.count_at(i) != int(inv[i][1]):
			h.inventory.set_slot(i, ItemManager.get_item(want_id) if want_id != "" else null, int(inv[i][1]))
			changed = true
	if changed:
		h.inventory.refresh()
	var ex: Dictionary = d[8]
	for iid in ex:
		var it: ItemData = ItemManager.get_item(iid)
		if it != null and int(h.elixirs.get(iid, 0)) != int(ex[iid]):
			h.elixirs[iid] = 0
			h.drink_elixir(it, int(ex[iid]))


@rpc("authority", "reliable")
func _cast_event(d: Array) -> void:
	if not Net.is_client():
		return
	var c = unit_by_id(int(d[0]))
	if c == null:
		return
	var s: SkillData = _skill_cache.get(d[1])
	if s == null:
		s = load(str(d[1]))
		_skill_cache[d[1]] = s
	if s == null:
		return
	var ctx := SkillContext.new()
	ctx.caster = c
	ctx.skill = s
	ctx.rank = int(d[2])
	ctx.target_unit = unit_by_id(int(d[3]))
	ctx.point = Vector2(d[4], d[5])
	ctx.direction = Vector2(d[6], d[7])
	c.facing = ctx.direction
	SkillEffect.apply_list(s.recast_effects if bool(d[8]) else s.effects, ctx)
	if c.get("skill_caster") != null:
		c.skill_caster._direct_hit_fx(s, ctx)
	EventBus.skill_cast.emit(c, -1, s)


@rpc("authority", "reliable")
func _events(list: Array) -> void:
	if not Net.is_client():
		return
	for ev in list:
		match ev[0]:
			"a":
				var u = unit_by_id(int(ev[1]))
				var t = unit_by_id(int(ev[2]))
				if u != null and t != null:
					u.face_towards(t.global_position)
					u.attack.attack_started.emit(t)
					if u.attack.is_ranged or u.attack.total_range() > 100.0:
						var p := Projectile.new()
						p.setup_basic_attack(u, t, u.attack.projectile_speed, 2000.0)
						p.color = u.attack.projectile_color
						p.style = u.attack.projectile_style
						Targeting.effects_parent(u).add_child(p)
						p.global_position = u.global_position
			"d":
				var t = unit_by_id(int(ev[1]))
				if t != null:
					var info := DamageInfo.new(unit_by_id(int(ev[5])), float(ev[2]), int(ev[4]))
					info.is_crit = bool(ev[3])
					info.is_basic_attack = bool(ev[6])
					info.final_amount = float(ev[2])
					EventBus.unit_damaged.emit(t, info, float(ev[2]))
			"h":
				var t = unit_by_id(int(ev[1]))
				if t != null:
					EventBus.unit_healed.emit(t, float(ev[2]), null)
			"k":
				var v = unit_by_id(int(ev[1]))
				var k = unit_by_id(int(ev[2]))
				var hl: Array = []
				for id in ev[3]:
					var x = unit_by_id(int(id))
					if x != null:
						hl.append(x)
				if v != null:
					EventBus.hero_killed.emit(v, k, hl)
			"n":
				EventBus.notice.emit(str(ev[1]))
			"l":
				var h = unit_by_id(int(ev[1]))
				if h != null:
					EventBus.hero_level_up.emit(h, int(ev[2]))
					if h == battle.player_hero:
						h.leveled_up.emit(int(ev[2]))
			"r":
				var h = unit_by_id(int(ev[1]))
				if h != null:
					EventBus.reward.emit(h, float(ev[2]), int(ev[3]))


@rpc("authority", "reliable")
func _ping_event(team: int, kind: String, x: float, y: float) -> void:
	if Net.is_client() and team == battle.config.net_my_team:
		battle.ai_manager.add_ping(team, kind, Vector2(x, y))
		PingMarker.spawn(battle.player_hero, Vector2(x, y), kind, AIManager.PING_SECONDS)


@rpc("authority", "reliable")
func _end_event(winner: int, reason: String) -> void:
	if Net.is_client():
		battle.battle_manager.finish(winner, reason)
