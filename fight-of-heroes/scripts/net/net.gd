extends Node
## 같은 와이파이 대전 (자동 로드 "Net").
## 방장 폰이 서버가 되어 실제 게임을 진행하고(host), 참가자 폰은 조작만 보내고 방장이 보낸 상태를 그린다(client).
## 방 찾기: 방장이 1초마다 같은 와이파이에 UDP 로 방을 알리고, 참가자는 그 알림을 듣는다. 안 보이면 IP 로 직접 들어간다.
##
## 로비 자리: 0~2 블루, 3~5 레드. 사람이 없는 자리는 AI 가 채운다. 자리가 차면 2명까지 관전으로 들어온다.
## 밴 단계(방장이 켬): 시작하기를 누르면 블루·레드·블루·레드 차례로 금지하고 방으로 돌아온다.
## 팀의 금지는 그 팀의 첫 사람(가장 앞 자리)이 하고, 사람이 없는 팀은 AI 가 한다. 요청은 방장이 모두 확인한다.

signal lobby_changed
signal rooms_changed
signal status(text: String)
signal started
signal left

const PORT := 47900
const DISCOVERY_PORT := 47901
const GAME_TAG := "fight-of-heroes"
const MAX_SPECTATORS := 2
const MAX_CLIENTS := 5 + MAX_SPECTATORS

enum Role { OFFLINE, HOST, CLIENT }

var role: int = Role.OFFLINE
var my_name := "플레이어"
## 자리 번호 -> {peer, name, hero}. 비어 있으면 AI.
var slots: Dictionary = {}
## 관전자: 피어 번호 -> {name, hero(자리로 돌아갈 때 고를 영웅)}
var spectators: Dictionary = {}
## 밴 단계: 켰는지(방장 설정), 금지한 영웅(순서대로), 지금 차례(-1 이면 금지 중이 아님), 끝났는지, 지금 차례의 남은 시간
var ban_enabled := true
var bans: Array = []
var ban_turn := -1
var bans_done := false
var ban_left := 0.0
## 방 찾기로 들은 방: ip -> {name, players, time}
var rooms: Dictionary = {}
var room_name := ""

var _udp_send: PacketPeerUDP = null
var _udp_listen: PacketPeerUDP = null
var _announce_left := 0.0


func is_host() -> bool:
	return role == Role.HOST


func is_client() -> bool:
	return role == Role.CLIENT


func is_online() -> bool:
	return role != Role.OFFLINE


func my_id() -> int:
	return multiplayer.get_unique_id() if is_online() else 1


## 내가 관전자인지
func is_spectator() -> bool:
	return is_online() and spectators.has(my_id())


## 내 자리 번호 (-1 이면 없음)
func my_slot() -> int:
	for s in slots:
		if int(slots[s].peer) == my_id():
			return int(s)
	return -1


func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected)
	multiplayer.connection_failed.connect(_on_failed)
	multiplayer.server_disconnected.connect(_on_server_gone)
	var n: String = SaveManager.get_setting("lan_name", "")
	my_name = n if n != "" else "플레이어%d" % (randi() % 90 + 10)
	_dev_auto.call_deferred()


## 개발용: --lan_host=<사람 수> 로 방을 만들고 그만큼 모이면 시작, --lan_join=<ip> 로 들어간다.
## --lan_hero=<영웅>, --lan_quit=<초> (그 시간 뒤 결과를 출력하고 끝냄)
func _dev_auto() -> void:
	var a: Dictionary = GameManager.dev_args
	if a.has("lan_speed"):
		Engine.time_scale = float(a["lan_speed"])
	if a.has("lan_kills"):
		SaveManager.set_setting("kill_target", int(a["lan_kills"]))
	if a.has("lan_hero"):
		SaveManager.set_setting("last_hero", str(a["lan_hero"]))
	if a.has("lan_host"):
		my_name = "방장"
		host()
		var need := int(a["lan_host"])
		while is_host() and slots.size() < need:
			await get_tree().create_timer(0.2).timeout
		await get_tree().create_timer(0.5).timeout
		# 개발용: --lan_bans 를 주면 밴 단계를 거친다 (AI·시간 초과가 대신 금지).
		ban_enabled = a.has("lan_bans")
		start_match()
		while is_host() and ban_turn >= 0:
			await get_tree().create_timer(0.2).timeout
		if is_host() and bans_done:
			start_match()
	elif a.has("lan_join"):
		my_name = "참가자"
		join(str(a["lan_join"]))
	if a.has("lan_quit"):
		await get_tree().create_timer(float(a["lan_quit"]), true, false, true).timeout
		var b := get_tree().current_scene
		var line := "LAN_RESULT role=%s" % ["offline", "host", "client"][role]
		if b != null and b.get("hero_manager") != null:
			for h in b.hero_manager.heroes:
				line += " %s@%d,%d hp=%d lv=%d k=%d" % [h.data.id, roundi(h.global_position.x), roundi(h.global_position.y), roundi(h.health.hp), h.level, h.kills]
			line += " monsters=%d" % get_tree().get_nodes_in_group("monsters").size()
			line += " time=%.1f" % b.battle_manager.elapsed
		line += " scene=%s" % (b.scene_file_path.get_file() if b != null else "")
		print(line)
		get_tree().quit()


# ---- 방 만들기 / 들어가기 / 나가기 ----

func host(name_text := "") -> int:
	leave()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(PORT, MAX_CLIENTS)
	if err != OK:
		status.emit("방을 만들지 못했습니다 (포트 %d 사용 중일 수 있음)" % PORT)
		return err
	multiplayer.multiplayer_peer = peer
	role = Role.HOST
	room_name = name_text if name_text != "" else "%s 의 방" % my_name
	slots = {0: {"peer": 1, "name": my_name, "hero": _default_hero()}}
	_reset_room_extras()
	ban_enabled = bool(SaveManager.get_setting("lan_bans", true))
	_udp_send = PacketPeerUDP.new()
	_udp_send.set_broadcast_enabled(true)
	_udp_send.set_dest_address("255.255.255.255", DISCOVERY_PORT)
	_announce_left = 0.0
	status.emit("방을 만들었습니다. 같은 와이파이의 친구가 들어올 수 있습니다")
	lobby_changed.emit()
	return OK


func join(ip: String) -> int:
	leave()
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(ip.strip_edges(), PORT)
	if err != OK:
		status.emit("들어가지 못했습니다")
		return err
	multiplayer.multiplayer_peer = peer
	role = Role.CLIENT
	slots = {}
	_reset_room_extras()
	status.emit("%s 에 연결하는 중..." % ip)
	return OK


func leave() -> void:
	if multiplayer.multiplayer_peer != null and not (multiplayer.multiplayer_peer is OfflineMultiplayerPeer):
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	var was := role
	role = Role.OFFLINE
	slots = {}
	_reset_room_extras()
	if _udp_send != null:
		_udp_send.close()
		_udp_send = null
	if was != Role.OFFLINE:
		left.emit()


## 방 찾기 시작/멈춤 (참가자 화면에서)
func start_discovery() -> void:
	stop_discovery()
	_udp_listen = PacketPeerUDP.new()
	if _udp_listen.bind(DISCOVERY_PORT) != OK:
		status.emit("방 찾기를 시작하지 못했습니다. IP 로 들어가 주세요")
		_udp_listen = null
	rooms.clear()


func stop_discovery() -> void:
	if _udp_listen != null:
		_udp_listen.close()
		_udp_listen = null


## 이 폰의 같은 와이파이 주소 (방장이 친구에게 알려 줄 IP)
func local_ips() -> PackedStringArray:
	var out := PackedStringArray()
	for a in IP.get_local_addresses():
		if a.count(".") == 3 and not a.begins_with("127.") and not a.begins_with("169.254"):
			out.append(a)
	return out


func _process(delta: float) -> void:
	if ban_turn >= 0 and is_online():
		_ban_tick(delta)
	if is_host() and _udp_send != null and not _in_battle():
		_announce_left -= delta
		if _announce_left <= 0.0:
			_announce_left = 1.0
			var msg := JSON.stringify({"game": GAME_TAG, "name": room_name, "players": _human_count(), "ver": _version()})
			_udp_send.put_packet(msg.to_utf8_buffer())
	if _udp_listen != null:
		var changed := false
		while _udp_listen.get_available_packet_count() > 0:
			var pkt := _udp_listen.get_packet()
			var ip := _udp_listen.get_packet_ip()
			var d = JSON.parse_string(pkt.get_string_from_utf8())
			if d is Dictionary and d.get("game", "") == GAME_TAG:
				rooms[ip] = {"name": str(d.get("name", ip)), "players": int(d.get("players", 1)), "ver": str(d.get("ver", "")), "time": Time.get_ticks_msec()}
				changed = true
		var now := Time.get_ticks_msec()
		for ip in rooms.keys():
			if now - int(rooms[ip].time) > 4000:
				rooms.erase(ip)
				changed = true
		if changed:
			rooms_changed.emit()


func _in_battle() -> bool:
	var s := get_tree().current_scene
	return s != null and s.scene_file_path == GameManager.BATTLE_SCENE


func _version() -> String:
	return str(ProjectSettings.get_setting("application/config/version", ""))


func _human_count() -> int:
	return slots.size() + spectators.size()


func _default_hero() -> String:
	var last: String = SaveManager.get_setting("last_hero", "blade_master")
	return last if DataRegistry.hero(last) != null else "blade_master"


# ---- 연결 신호 ----

func _on_connected() -> void:
	status.emit("연결했습니다. 방장을 기다립니다")
	_hello.rpc_id(1, my_name, _version(), _default_hero())


func _on_failed() -> void:
	status.emit("연결하지 못했습니다. 같은 와이파이인지, IP 가 맞는지 확인해 주세요")
	leave()


func _on_server_gone() -> void:
	status.emit("방장과 연결이 끊어졌습니다")
	leave()
	if _in_battle():
		EventBus.notice.emit("방장과 연결이 끊어졌습니다")
		get_tree().create_timer(2.0, true, false, true).timeout.connect(GameManager.go_main)


func _on_peer_connected(_id: int) -> void:
	pass


func _on_peer_disconnected(id: int) -> void:
	if not is_host():
		return
	ready_peers.erase(id)
	if spectators.has(id):
		status.emit("관전하던 %s 이(가) 나갔습니다" % spectators[id].name)
		spectators.erase(id)
	for s in slots.keys():
		if int(slots[s].peer) == id:
			var nm: String = slots[s].name
			slots.erase(s)
			status.emit("%s 이(가) 나갔습니다" % nm)
			EventBus.notice.emit("%s 이(가) 나갔습니다. 그 자리는 AI 가 맡습니다" % nm)
			peer_left.emit(id)
	_broadcast_lobby()


signal peer_left(id: int)

## 전투 화면을 다 연 참가자 (방장은 이 참가자에게만 상태를 보낸다)
var ready_peers: Dictionary = {}


func battle_ready() -> void:
	if is_client() and multiplayer.get_unique_id() != 1:
		_battle_ready.rpc_id(1)


@rpc("any_peer", "reliable")
func _battle_ready() -> void:
	if is_host():
		ready_peers[multiplayer.get_remote_sender_id()] = true


# ---- 로비 (방장이 자리와 영웅을 정하고 모두에게 알린다) ----

@rpc("any_peer", "reliable")
func _hello(name_text: String, ver: String, hero_id: String) -> void:
	if not is_host():
		return
	var id := multiplayer.get_remote_sender_id()
	if ver != _version():
		_kick.rpc_id(id, "버전이 다릅니다 (방장 %s, 나 %s). 같은 버전으로 맞춰 주세요" % [_version(), ver])
		return
	if _in_battle():
		_kick.rpc_id(id, "이미 경기가 시작된 방입니다")
		return
	add_joiner(id, name_text, hero_id)


## 들어온 사람을 빈자리에 앉힌다. 자리가 없으면 관전으로, 관전 자리도 없으면 내보낸다 (true 면 들어옴).
func add_joiner(id: int, name_text: String, hero_id: String) -> bool:
	var slot := _free_slot()
	if slot < 0:
		if spectators.size() >= MAX_SPECTATORS:
			if multiplayer.get_peers().has(id):
				_kick.rpc_id(id, "방이 꽉 찼습니다. 관전 자리도 남아 있지 않습니다")
			return false
		spectators[id] = {"name": name_text, "hero": hero_id}
		status.emit("%s 이(가) 관전으로 들어왔습니다" % name_text)
		_broadcast_lobby()
		return true
	slots[slot] = {"peer": id, "name": name_text, "hero": _unique_hero(slot, hero_id)}
	status.emit("%s 이(가) 들어왔습니다" % name_text)
	_broadcast_lobby()
	return true


@rpc("authority", "reliable")
func _kick(reason: String) -> void:
	status.emit(reason)
	leave()


## 사람이 적은 팀의 빈자리
func _free_slot() -> int:
	var blue := 0
	var red := 0
	for s in slots:
		if int(s) < 3:
			blue += 1
		else:
			red += 1
	var order := [0, 1, 2, 3, 4, 5] if blue <= red else [3, 4, 5, 0, 1, 2]
	for s in order:
		if not slots.has(s):
			return s
	return -1


func _unique_hero(slot: int, want: String) -> String:
	var team_slots := [0, 1, 2] if slot < 3 else [3, 4, 5]
	var used := []
	for s in team_slots:
		if s != slot and slots.has(s):
			used.append(slots[s].hero)
	if DataRegistry.hero(want) != null and not used.has(want) and not bans.has(want):
		return want
	for id in DataRegistry.ids("heroes"):
		if not used.has(id) and not bans.has(id):
			return id
	return want


## 참가자 요청: 영웅 바꾸기, 자리(팀) 바꾸기
func request_hero(hero_id: String) -> void:
	if is_host():
		_set_hero(1, hero_id)
	elif is_client():
		_req_hero.rpc_id(1, hero_id)


func request_slot(slot: int) -> void:
	if is_host():
		_move_slot(1, slot)
	elif is_client():
		_req_slot.rpc_id(1, slot)


@rpc("any_peer", "reliable")
func _req_hero(hero_id: String) -> void:
	if is_host():
		_set_hero(multiplayer.get_remote_sender_id(), hero_id)


@rpc("any_peer", "reliable")
func _req_slot(slot: int) -> void:
	if is_host():
		_move_slot(multiplayer.get_remote_sender_id(), slot)


func _set_hero(peer: int, hero_id: String) -> void:
	if ban_turn >= 0 or bans.has(hero_id):
		return
	for s in slots:
		if int(slots[s].peer) == peer:
			slots[s].hero = _unique_hero(int(s), hero_id)
	if spectators.has(peer) and DataRegistry.hero(hero_id) != null:
		spectators[peer].hero = hero_id
	_broadcast_lobby()


## 자리 옮기기. 관전자가 빈자리를 고르면 그 자리에 앉는다. 밴 단계 중에는 못 옮긴다.
func _move_slot(peer: int, slot: int) -> void:
	if slot < 0 or slot > 5 or slots.has(slot) or ban_turn >= 0:
		return
	if spectators.has(peer):
		var sp: Dictionary = spectators[peer]
		spectators.erase(peer)
		slots[slot] = {"peer": peer, "name": sp.name, "hero": _unique_hero(slot, str(sp.get("hero", "")))}
		_broadcast_lobby()
		return
	for s in slots.keys():
		if int(slots[s].peer) == peer:
			var e: Dictionary = slots[s]
			slots.erase(s)
			slots[slot] = e
			e.hero = _unique_hero(slot, e.hero)
			break
	_broadcast_lobby()


## 관전으로 옮기기 (방장은 게임을 진행하므로 관전할 수 없다)
func request_spectate() -> void:
	if is_host():
		_to_spectator(1)
	elif is_client():
		_req_spectate.rpc_id(1)


@rpc("any_peer", "reliable")
func _req_spectate() -> void:
	if is_host():
		_to_spectator(multiplayer.get_remote_sender_id())


func _to_spectator(peer: int) -> bool:
	if peer == 1:
		status.emit("방장은 경기를 진행하므로 관전할 수 없습니다")
		return false
	if spectators.has(peer) or ban_turn >= 0:
		return false
	if spectators.size() >= MAX_SPECTATORS:
		status.emit("관전 자리가 꽉 찼습니다")
		return false
	for s in slots.keys():
		if int(slots[s].peer) == peer:
			spectators[peer] = {"name": slots[s].name, "hero": slots[s].hero}
			slots.erase(s)
			_broadcast_lobby()
			return true
	return false


func _broadcast_lobby() -> void:
	lobby_changed.emit()
	if is_host():
		_lobby_state.rpc(_slots_to_array(), room_name, _extras())


## 자리 밖의 로비 상태: 관전자, 밴 단계
func _extras() -> Dictionary:
	var spec: Array = []
	for p in spectators:
		spec.append([int(p), str(spectators[p].name), str(spectators[p].get("hero", ""))])
	return {"spec": spec, "ban_on": ban_enabled, "bans": bans.duplicate(), "turn": ban_turn, "left": ban_left, "done": bans_done}


@rpc("authority", "reliable")
func _lobby_state(arr: Array, rname: String, extras: Dictionary = {}) -> void:
	slots = {}
	for e in arr:
		slots[int(e[0])] = {"peer": int(e[1]), "name": str(e[2]), "hero": str(e[3])}
	room_name = rname
	spectators = {}
	for e in extras.get("spec", []):
		spectators[int(e[0])] = {"name": str(e[1]), "hero": str(e[2])}
	ban_enabled = bool(extras.get("ban_on", ban_enabled))
	bans = Array(extras.get("bans", []))
	ban_turn = int(extras.get("turn", -1))
	ban_left = float(extras.get("left", 0.0))
	bans_done = bool(extras.get("done", false))
	lobby_changed.emit()


func _reset_room_extras() -> void:
	spectators = {}
	bans = []
	ban_turn = -1
	bans_done = false
	ban_left = 0.0


# ---- 밴 단계 ----

## 방장: 밴 단계 켜기/끄기 (끄면 이미 금지한 영웅도 풀린다)
func set_ban_enabled(on: bool) -> void:
	if not is_host() or ban_turn >= 0:
		return
	ban_enabled = on
	SaveManager.set_setting("lan_bans", on)
	bans = []
	bans_done = false
	_broadcast_lobby()


## team 의 금지를 맡는 자리 (그 팀의 가장 앞 사람 자리, 사람이 없으면 -1 = AI)
func banner_slot(team: int) -> int:
	var base := 0 if team == Enums.Team.BLUE else 3
	for s in [base, base + 1, base + 2]:
		if slots.has(s):
			return s
	return -1


## 지금 금지할 피어 번호 (AI 차례이거나 금지 중이 아니면 0)
func current_banner_peer() -> int:
	if ban_turn < 0 or ban_turn >= BanPhase.ORDER.size():
		return 0
	var s := banner_slot(BanPhase.ORDER[ban_turn])
	return int(slots[s].peer) if s >= 0 else 0


## 지금 내가 금지할 차례인지
func my_ban_turn() -> bool:
	return ban_turn >= 0 and current_banner_peer() == my_id()


func _begin_bans() -> void:
	bans = []
	bans_done = false
	ban_turn = 0
	ban_left = BanPhase.TURN_SECONDS
	status.emit("밴 단계를 시작합니다")
	_broadcast_lobby()


## 금지 요청 (내 차례일 때 화면에서)
func request_ban(hero_id: String) -> void:
	if is_host():
		_do_ban(1, hero_id)
	elif is_client():
		_req_ban.rpc_id(1, hero_id)


@rpc("any_peer", "reliable")
func _req_ban(hero_id: String) -> void:
	if is_host():
		_do_ban(multiplayer.get_remote_sender_id(), hero_id)


## 방장이 금지 요청을 확인하고 실행한다. peer 0 은 AI(방장이 대신 고름).
## 보낸 사람이 지금 차례 팀의 금지 담당이 아니거나, 이미 금지한 영웅이면 무시한다.
func _do_ban(peer: int, hero_id: String) -> bool:
	if not is_host() or ban_turn < 0 or ban_turn >= BanPhase.ORDER.size():
		return false
	if peer != current_banner_peer():
		return false
	if not BanPhase.can_ban(bans, hero_id):
		return false
	bans.append(hero_id)
	ban_turn += 1
	ban_left = BanPhase.TURN_SECONDS
	if ban_turn >= BanPhase.ORDER.size():
		_finish_bans()
	else:
		_broadcast_lobby()
	return true


## AI 가(또는 시간이 다 된 차례를 대신) 금지한다. 금지한 영웅 id.
func _ai_ban() -> String:
	if ban_turn < 0 or ban_turn >= BanPhase.ORDER.size():
		return ""
	var team: int = BanPhase.ORDER[ban_turn]
	var protect: Array = []
	for s in slots:
		if (int(s) < 3) == (team == Enums.Team.BLUE):
			protect.append(slots[s].hero)
	var id := BanPhase.choose_ai_ban(bans, protect)
	var peer := current_banner_peer()
	return id if id != "" and _do_ban(peer, id) else ""


func _ban_tick(delta: float) -> void:
	ban_left -= delta
	if not is_host():
		return
	var ai := current_banner_peer() == 0
	if (ai and ban_left <= BanPhase.TURN_SECONDS - BanPhase.AI_DELAY) or ban_left <= 0.0:
		if not ai:
			status.emit("시간이 지나 대신 금지했습니다")
		_ai_ban()


## 밴이 끝나면 방으로 돌아간다. 금지된 영웅을 고른 사람은 고를 수 있는 영웅으로 바꾼다.
func _finish_bans() -> void:
	ban_turn = -1
	bans_done = true
	var changed := false
	for s in slots:
		if bans.has(slots[s].hero):
			slots[s].hero = _unique_hero(int(s), slots[s].hero)
			changed = true
	status.emit("밴이 끝났습니다. %s영웅을 확인한 뒤 방장이 시작하기를 누르세요" % ("금지된 영웅은 다른 영웅으로 바꿨습니다. " if changed else ""))
	_broadcast_lobby()


func _slots_to_array() -> Array:
	var arr: Array = []
	for s in slots:
		arr.append([int(s), int(slots[s].peer), str(slots[s].name), str(slots[s].hero)])
	return arr


# ---- 경기 시작 ----

## 방장이 시작: 빈자리는 AI 영웅으로 채운 설정을 모두에게 보내고 함께 전투 화면으로 간다.
## 밴 단계가 켜져 있고 아직 안 했으면 먼저 밴 단계를 한다(끝나면 방으로 돌아오고, 다시 시작하기를 누른다).
func start_match() -> void:
	if not is_host() or ban_turn >= 0:
		return
	if ban_enabled and not bans_done:
		_begin_bans()
		return
	var cfg := build_start_cfg()
	_start.rpc(cfg)
	_start(cfg)


## 방장: 경기 설정을 만든다. 빈자리는 금지되지 않았고 같은 팀과 겹치지 않는 영웅으로 채운다.
func build_start_cfg() -> Dictionary:
	var heroes := ["", "", "", "", "", ""]
	for s in slots:
		heroes[int(s)] = slots[s].hero if not bans.has(slots[s].hero) else _unique_hero(int(s), slots[s].hero)
	var pool: Array = BanPhase.allowed(bans)
	pool.shuffle()
	for i in 6:
		if heroes[i] == "":
			var team_ids := heroes.slice(0, 3) if i < 3 else heroes.slice(3, 6)
			for id in pool:
				if not team_ids.has(id):
					heroes[i] = id
					break
	var cfg := {
		"blue": heroes.slice(0, 3), "red": heroes.slice(3, 6),
		"difficulty": SaveManager.get_setting("difficulty", "normal"),
		"kill_target": int(SaveManager.get_setting("kill_target", 15)),
		"map": GameManager.DEFAULT_MAP, "seed": randi() % 100000 + 1,
		"humans": _slots_to_array(), "bans": bans.duplicate(),
	}
	return cfg


@rpc("authority", "reliable")
func _start(cfg: Dictionary) -> void:
	var c := MatchConfig.new()
	c.blue_heroes = PackedStringArray(cfg.blue)
	c.red_heroes = PackedStringArray(cfg.red)
	c.difficulty = str(cfg.difficulty)
	c.kill_target = int(cfg.kill_target)
	c.map_id = str(cfg.map)
	c.mode = "lan"
	c.net_seed = int(cfg.seed)
	c.net_humans = {}
	for e in cfg.humans:
		c.net_humans[int(e[0])] = int(e[1])
	c.bans = PackedStringArray(cfg.get("bans", []))
	if GameManager.dev_args.has("lan_quit"):
		print("LAN_START bans=%s blue=%s red=%s" % [",".join(c.bans), ",".join(c.blue_heroes), ",".join(c.red_heroes)])
	var mine := my_slot()
	c.player_index = mine % 3 if mine >= 0 else -1
	c.net_my_team = Enums.Team.BLUE if mine < 3 else Enums.Team.RED
	c.net_my_slot = mine
	c.net_spectator = mine < 0
	ready_peers = {}
	# 다음 판은 밴을 새로 한다.
	bans = []
	bans_done = false
	ban_turn = -1
	started.emit()
	GameManager.start_match(c)
