class_name QuickChat
extends Node
## 빠른 대화: 미리 정한 문장만 보낼 수 있다 (자유 입력 없음).
## 기본은 같은 팀에게만, "전체에게" 를 켜면 양 팀 모두에게 보인다. 관전자(조작하는 영웅이 없는 화면)는 모두 본다.
## 혼자 하는 경기와 방장 폰에서는 사람이 보낸 문장에 아군 AI 가 반응하고 가끔 대답한다.
## 와이파이 대전: 참가자는 문장 번호만 방장에게 보내고, 방장이 번호·보내는 간격을 확인한 뒤 받을 사람에게만 보낸다.

enum Result { OK, TOO_FAST, BAD }

## 0~11: 대화 창에 보이는 문장. 12~: AI 대답용 (사람은 보낼 수 없다).
const PHRASES := [
	"도와줘!", "후퇴하자", "모여서 싸우자", "보스 잡자",
	"잘했어!", "고마워", "적이 안 보여, 조심해", "궁극기 준비됐어",
	"기다려", "좋은 경기였어", "좋아!", "미안해",
	"알겠어!", "가는 중!", "지금은 보스가 없어",
]
const PANEL_COUNT := 12
const HELP := 0
const RETREAT := 1
const GATHER := 2
const BOSS := 3
const WELL_DONE := 4
const THANKS := 5
const WAIT := 8
const GOOD_GAME := 9
const OK_REPLY := 12
const ON_MY_WAY := 13
const NO_BOSS := 14

## 한 사람이 이 간격(초)보다 자주 보낼 수 없다.
const RATE_SECONDS := 1.5
## 화면에 남아 있는 시간(초)
const FEED_SECONDS := 6.0
## "후퇴하자" 를 받은 아군 AI 가 우물로 물러나는 시간(초)
const RETREAT_SECONDS := 6.0

var battle: Node
## AI 가 대답하기까지 걸리는 시간 범위(초)
var reply_delay := Vector2(0.5, 1.5)
var rng := RandomNumberGenerator.new()
## 보낸 사람 -> 마지막으로 보낸 시각 (Time 기준 초)
var _last: Dictionary = {}
var _end_said := false


func setup(b: Node) -> void:
	battle = b
	name = "QuickChat"
	rng.randomize()
	battle.battle_manager.ended.connect(_on_match_ended)


static func phrase(idx: int) -> String:
	return PHRASES[idx] if idx >= 0 and idx < PHRASES.size() else ""


func _now() -> float:
	return Time.get_ticks_msec() * 0.001


func can_send(sender) -> bool:
	return _now() - float(_last.get(sender, -1000.0)) >= RATE_SECONDS


## 내 영웅으로 보낸다 (대화 창의 버튼). 참가자이면 방장에게 보내고, 아니면 바로 보낸다.
func player_say(idx: int, to_all := false) -> int:
	var h = battle.player_hero
	if h == null or idx < 0 or idx >= PANEL_COUNT:
		return Result.BAD
	if not can_send(h):
		return Result.TOO_FAST
	if Net.is_client():
		_last[h] = _now()
		NetSync.client_request("chat", [idx, to_all])
		return Result.OK
	return say(h, idx, to_all)


## 방장·혼자: hero 가 idx 문장을 보낸다. from_ai 이면 AI 대답(번호 제한·간격 검사 없음, 반응 없음).
func say(hero, idx: int, to_all := false, from_ai := false) -> int:
	if hero == null or not is_instance_valid(hero) or Net.is_client():
		return Result.BAD
	if idx < 0 or idx >= (PHRASES.size() if from_ai else PANEL_COUNT):
		return Result.BAD
	if not from_ai:
		if not can_send(hero):
			return Result.TOO_FAST
		_last[hero] = _now()
	deliver(hero.team, name_of(hero), idx, to_all)
	if not from_ai and not (hero.controller is AIController):
		_react(hero, idx)
	return Result.OK


## 보내는 사람 이름: 와이파이 대전의 사람 자리이면 그 사람 이름, 아니면 영웅 이름
func name_of(hero) -> String:
	var slot: int = battle.hero_manager.heroes.find(hero)
	if battle.config.mode == "lan" and Net.slots.has(slot):
		return str(Net.slots[slot].name)
	return hero.display_name


## 이 화면에서 볼 수 있는지 (같은 팀, 전체에게, 관전자)
func visible_here(team: int, to_all: bool) -> bool:
	var me = battle.player_hero
	return to_all or me == null or me.team == team


## 방장: 받을 참가자. 자리가 없는 참가자(관전자)는 모두 받는다.
static func peers_for(team: int, to_all: bool, peers: Array, humans: Dictionary) -> Array:
	var out: Array = []
	for p in peers:
		var slot := -1
		for s in humans:
			if int(humans[s]) == int(p):
				slot = int(s)
		var peer_team: int = Enums.Team.BLUE if slot < 3 else Enums.Team.RED
		if to_all or slot < 0 or peer_team == team:
			out.append(p)
	return out


## 화면에 보여 주고, 방장이면 받을 참가자에게 보낸다.
func deliver(team: int, who: String, idx: int, to_all: bool) -> void:
	if Net.is_host() and battle.net_sync != null:
		var ns: NetSync = battle.net_sync
		for peer in peers_for(team, to_all, ns._ready_peers_list(), battle.config.net_humans):
			ns._chat_event.rpc_id(peer, team, who, idx, to_all)
	show_line(team, who, idx, to_all)


## 받은 문장을 대화 목록에 띄운다 (볼 수 없는 팀이면 무시).
func show_line(team: int, who: String, idx: int, to_all: bool) -> void:
	var text := phrase(idx)
	if text == "" or not visible_here(team, to_all):
		return
	if GameManager.dev_args.has("lan_quit"):
		print("CHAT %s %s: %s" % ["전체" if to_all else Enums.team_name(team), who, text])
	if battle.hud != null:
		battle.hud.add_chat_line(team, who, text, to_all)


# ---- 아군 AI 반응 ----

func _ai_allies(team: int) -> Array:
	var out: Array = []
	for c in battle.ai_manager.controllers:
		if is_instance_valid(c) and c.hero != null and c.hero.team == team and c.hero.controller == c and not c.hero.is_dead:
			out.append(c.hero)
	return out


func _react(hero, idx: int) -> void:
	var team: int = hero.team
	var am: AIManager = battle.ai_manager
	var reply := -1
	match idx:
		HELP, GATHER:
			am.request_gather(team, hero.global_position)
			reply = ON_MY_WAY
		RETREAT:
			am.request_retreat(team, RETREAT_SECONDS)
			reply = OK_REPLY
		BOSS:
			var boss = _nearest_boss(hero.global_position)
			if boss != null:
				am.add_ping(team, "attack", boss.global_position)
				reply = ON_MY_WAY
			else:
				reply = NO_BOSS
		WAIT:
			reply = OK_REPLY if rng.randf() < 0.6 else -1
		WELL_DONE:
			reply = THANKS if rng.randf() < 0.4 else -1
		THANKS:
			reply = WELL_DONE if rng.randf() < 0.2 else -1
	if reply >= 0:
		var allies := _ai_allies(team)
		if not allies.is_empty():
			_reply_later(allies[rng.randi() % allies.size()], reply)


func _nearest_boss(pos: Vector2):
	var mm = battle.monster_manager
	if mm == null:
		return null
	var best = null
	for b in mm.bosses():
		if best == null or b.global_position.distance_to(pos) < best.global_position.distance_to(pos):
			best = b
	return best


func _reply_later(ai_hero, idx: int) -> void:
	# 전투 화면이 먼저 사라지면 연결도 함께 끊어진다.
	get_tree().create_timer(rng.randf_range(reply_delay.x, reply_delay.y), false).timeout.connect(_reply_now.bind(ai_hero, idx))


func _reply_now(ai_hero, idx: int) -> void:
	if is_instance_valid(ai_hero) and not ai_hero.is_dead and is_inside_tree():
		say(ai_hero, idx, false, true)


## 경기가 끝나면 가끔 상대 팀 AI 가 모두에게 "좋은 경기였어" 라고 한다.
func _on_match_ended(_winner: int, _reason: String) -> void:
	if Net.is_client() or _end_said or rng.randf() > 0.6:
		return
	_end_said = true
	var me = battle.player_hero
	var enemy: int = Enums.Team.RED if me == null or me.team == Enums.Team.BLUE else Enums.Team.BLUE
	var cands := _ai_allies(enemy)
	if cands.is_empty():
		cands = _ai_allies(Enums.Team.BLUE if enemy == Enums.Team.RED else Enums.Team.RED)
	if not cands.is_empty():
		say(cands[rng.randi() % cands.size()], GOOD_GAME, true, true)
