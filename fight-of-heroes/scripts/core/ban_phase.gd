class_name BanPhase
extends RefCounted
## 영웅 금지(밴) 단계. 블루 → 레드 → 블루 → 레드 차례로 팀마다 2명씩 금지한다.
## 금지한 영웅은 그 경기에서 아무도(사람·AI·무작위 팀) 고를 수 없다.

const ORDER := [Enums.Team.BLUE, Enums.Team.RED, Enums.Team.BLUE, Enums.Team.RED]
const PER_TEAM := 2
## 한 번 금지할 때 주는 시간(초). 지나면 대신 골라 준다.
const TURN_SECONDS := 20.0
## AI 차례에 잠깐 기다렸다가 금지한다 (화면에서 보이도록).
const AI_DELAY := 1.2
## AI 가 금지할 때 쓰는 영웅별 무게 (강하거나 다루기 까다로운 영웅일수록 큼). 없으면 2.
const AI_PRIORITY := {
	"reaper": 6.0, "ninja": 5.0, "assassin": 5.0, "dragon_knight": 4.5, "summoner": 4.0,
	"gunslinger": 4.0, "star_girl": 3.5, "frost_mage": 3.0, "fire_mage": 3.0, "ki_master": 3.0,
	"mechanic": 2.5, "paladin": 2.5, "elf_archer": 2.5, "blade_master": 2.0, "monk": 2.0, "saint": 2.0,
}

var bans: Array = []
var turn := 0


func done() -> bool:
	return turn >= ORDER.size()


## 지금 금지할 팀 (끝났으면 -1)
func current_team() -> int:
	return ORDER[turn] if not done() else -1


## 지금 팀의 몇 번째 금지인지 (1 부터)
func team_ban_number() -> int:
	var n := 0
	for i in mini(turn + 1, ORDER.size()):
		if ORDER[i] == current_team():
			n += 1
	return n


## "블루 팀 밴 1/2" 같은 차례 글자
func turn_text() -> String:
	if done():
		return "밴이 끝났습니다"
	return turn_text_of(turn)


static func turn_text_of(t: int) -> String:
	if t < 0 or t >= ORDER.size():
		return "밴이 끝났습니다"
	var team: int = ORDER[t]
	var n := 0
	for i in t + 1:
		if ORDER[i] == team:
			n += 1
	return "%s 팀 밴 %d/%d" % [Enums.team_name(team), n, PER_TEAM]


## 지금 차례에 hero_id 를 금지한다. 끝났거나, 없는 영웅이거나, 이미 금지한 영웅이면 false.
func ban(hero_id: String) -> bool:
	if done() or not can_ban(bans, hero_id):
		return false
	bans.append(hero_id)
	turn += 1
	return true


## AI 가 지금 차례에 금지한다. 금지한 영웅 id (못 했으면 "")
func ai_ban(protect: Array = []) -> String:
	var id := choose_ai_ban(bans, protect)
	return id if ban(id) else ""


static func can_ban(banned: Array, hero_id: String) -> bool:
	return DataRegistry.hero(hero_id) != null and not banned.has(hero_id)


## 금지하지 않은 영웅 id 목록
static func allowed(banned) -> Array:
	var out: Array = []
	for id in DataRegistry.ids("heroes"):
		if not Array(banned).has(id):
			out.append(id)
	return out


## AI 가 금지할 영웅: 강한 영웅과 플레이어가 자주 쓰는 영웅을 무게를 두어 무작위로 고른다.
## protect 에 있는 영웅(자기 팀이 쓸 영웅)은 피한다. 고를 영웅이 없으면 "".
static func choose_ai_ban(banned: Array, protect: Array = []) -> String:
	var cands: Array = allowed(banned).filter(func(id): return not protect.has(id))
	if cands.is_empty():
		cands = allowed(banned)
	if cands.is_empty():
		return ""
	var played: Dictionary = {}
	var rec = SaveManager.records().get("heroes", {})
	if rec is Dictionary:
		played = rec
	var weights: Array = []
	var total := 0.0
	for id in cands:
		var w: float = AI_PRIORITY.get(id, 2.0)
		var hr = played.get(id, {})
		if hr is Dictionary:
			w += minf(float(hr.get("games", 0)), 10.0) * 0.3
		weights.append(w)
		total += w
	var r := randf() * total
	for i in cands.size():
		r -= weights[i]
		if r <= 0.0:
			return cands[i]
	return cands.back()
