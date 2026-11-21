class_name BattleManager
extends Node
## 경기 규칙: 경기 시간, 팀 킬 점수, 승패 판정. 승패는 이곳에서만 정한다.
## 처음 판정된 조건으로 끝내고, 그 뒤에 들어오는 조건은 무시한다.

signal ended(winner_team: int, reason: String)

var config: MatchConfig
var kills := {Enums.Team.BLUE: 0, Enums.Team.RED: 0}
var elapsed := 0.0
var match_over := false
var winner := Enums.Team.NEUTRAL
var end_reason := ""

const ASSIST_WINDOW := 10.0
## 이 시간(초) 안에 다음 영웅을 잡으면 연달아 잡은 것으로 센다 (더블·트리플 킬)
const MULTI_WINDOW := 10.0


## 영웅별 준 피해 (영웅에게 준 피해, 전체 피해)
var damage_to_heroes: Dictionary = {}
var damage_total: Dictionary = {}
## 영웅별 연속 처치 (죽으면 0). 연속 처치 중인 영웅을 잡으면 현상금을 더 준다.
var streaks: Dictionary = {}
var hero_manager = null
## 영웅별 연달아 잡은 수 [수, 마지막 처치 시각]
var multi: Dictionary = {}
## 영웅별 경기 기록 (도전 과제·업적용): best_multi 한 번에 연달아 잡은 최대 수, boss_kills 보스 처치,
## final_boss_kills 최종 보스 처치, wards 꽂은 와드 수
var feats: Dictionary = {}


func setup(cfg: MatchConfig, hm = null) -> void:
	config = cfg
	hero_manager = hm
	EventBus.unit_died.connect(_on_unit_died)
	EventBus.unit_damaged.connect(_on_unit_damaged)
	EventBus.item_used.connect(_on_item_used)


## 영웅 h 의 경기 기록 (없으면 만든다)
func feat(h) -> Dictionary:
	if not feats.has(h):
		feats[h] = {"best_multi": 0, "boss_kills": 0, "final_boss_kills": 0, "wards": 0}
	return feats[h]


## 연달아 잡은 수를 갱신해 돌려준다 (m = [수, 마지막 처치 시각]). HUD 알림도 같은 규칙을 쓴다.
static func next_multi(m: Array, now: float) -> Array:
	return [m[0] + 1 if now - m[1] <= MULTI_WINDOW else 1, now]


func _on_item_used(hero, item) -> void:
	if hero is Hero and item != null and item.use_kind == "ward" and not match_over:
		feat(hero).wards += 1


func _exit_tree() -> void:
	if EventBus.unit_died.is_connected(_on_unit_died):
		EventBus.unit_died.disconnect(_on_unit_died)
	if EventBus.unit_damaged.is_connected(_on_unit_damaged):
		EventBus.unit_damaged.disconnect(_on_unit_damaged)
	if EventBus.item_used.is_connected(_on_item_used):
		EventBus.item_used.disconnect(_on_item_used)


func _on_unit_damaged(target, info, amount: float) -> void:
	var src = Targeting.hero_of(info.source)
	if src == null or match_over:
		return
	damage_total[src] = damage_total.get(src, 0.0) + amount
	if target is Hero and Enums.is_enemy(src.team, target.team):
		damage_to_heroes[src] = damage_to_heroes.get(src, 0.0) + amount


## team 이 상대보다 킬 점수가 뒤진 만큼 (앞서거나 같으면 0)
func deficit(team: int) -> int:
	if not kills.has(team):
		return 0
	var other: int = Enums.Team.BLUE + Enums.Team.RED - team
	return maxi(0, kills[other] - kills[team])


## 처치당한 영웅의 현상금: 연속 처치 2번째부터 1번마다 60 골드 (최대 300)
func bounty_of(victim) -> int:
	var st: int = streaks.get(victim, 0)
	return clampi((st - 1) * 60, 0, 300)


func _physics_process(delta: float) -> void:
	if not match_over:
		elapsed += delta


func _on_unit_died(victim, killer) -> void:
	if Net.is_client():
		return
	if victim is Monster and victim.is_boss():
		# 최종 보스를 잡으면 곧바로 경기가 끝나므로 match_over 와 상관없이 센다.
		var c = ExperienceManager.credit_hero(victim, killer)
		if c is Hero and (not match_over or victim.is_final_boss()):
			feat(c).boss_kills += 1
			if victim.is_final_boss():
				feat(c).final_boss_kills += 1
		return
	# 경기가 끝난 뒤(결과 화면이 뜨기 전)에 쓰러진 것은 점수에 넣지 않는다.
	if not (victim is Hero) or match_over:
		return
	victim.deaths += 1
	var bounty := bounty_of(victim)
	streaks[victim] = 0
	# 몬스터나 우물에게 죽으면 최근에 때린 적 영웅이 처치를 인정받는다. 없으면 점수 없음.
	var credit = ExperienceManager.credit_hero(victim, killer)
	if credit == null:
		return
	credit.kills += 1
	streaks[credit] = streaks.get(credit, 0) + 1
	var m := next_multi(multi.get(credit, [0, -100.0]), Unit.now())
	multi[credit] = m
	multi.erase(victim)
	var f := feat(credit)
	f.best_multi = maxi(int(f.best_multi), int(m[0]))
	if bounty > 0:
		credit.add_gold(bounty)
		EventBus.notice.emit("%s 의 연속 처치를 끊었습니다! 현상금 %d 골드" % [victim.display_name, bounty])
	var helpers := assisters(victim, credit)
	for a in helpers:
		a.assists += 1
	if not kills.has(credit.team):
		return
	kills[credit.team] += 1
	EventBus.hero_killed.emit(victim, credit, helpers)
	EventBus.kill_score_changed.emit(kills[Enums.Team.BLUE], kills[Enums.Team.RED])
	# 목표 킬이 0 이면 무제한: 최종 보스를 잡아야 끝난다.
	if config.kill_target > 0 and kills[credit.team] >= config.kill_target:
		finish(credit.team, "kills")


## 최근 ASSIST_WINDOW 초 안에 피해를 준 적 영웅 중 처치한 영웅을 뺀 목록.
func assisters(victim, killer) -> Array:
	var out: Array = []
	var since := Unit.now() - ASSIST_WINDOW
	for pair in victim.valid_attackers():
		var u = Targeting.hero_of(pair[0])
		if u == null or u == killer:
			continue
		if Enums.is_enemy(u.team, victim.team) and pair[1] >= since:
			if not out.has(u):
				out.append(u)
	return out


func finish(team: int, reason: String) -> void:
	if match_over:
		return
	match_over = true
	winner = team
	end_reason = reason
	ended.emit(team, reason)
	EventBus.match_ended.emit(team, reason)


## 결과 화면과 기록에 쓰는 경기 요약
func summary() -> Dictionary:
	var heroes: Array = []
	if hero_manager != null:
		for h: Hero in hero_manager.heroes:
			var items: Array = []
			for i in InventoryComponent.SIZE:
				var it: ItemData = h.inventory.item_at(i)
				if it != null:
					items.append(it.id)
			heroes.append({
				"id": h.data.id, "name": h.display_name, "team": h.team, "is_player": h.get_node("Visual").is_player,
				"level": h.level, "kills": h.kills, "deaths": h.deaths, "assists": h.assists, "gold": h.gold,
				"damage": roundi(damage_to_heroes.get(h, 0.0)), "damage_total": roundi(damage_total.get(h, 0.0)), "items": items,
				"role": h.controller.role if h.controller is AIController else "",
				"best_multi": int(feat(h).best_multi), "boss_kills": int(feat(h).boss_kills),
				"final_boss_kills": int(feat(h).final_boss_kills), "wards": int(feat(h).wards),
			})
	var mvp := ""
	var best := -INF
	for e in heroes:
		var score: float = e.kills * 3.0 + e.assists * 1.5 - e.deaths * 1.0 + e.damage / 1500.0
		if e.team == winner:
			score += 2.0
		if score > best:
			best = score
			mvp = e.id
	return {
		"winner": winner, "reason": end_reason, "time": elapsed, "heroes": heroes, "mvp": mvp,
		"blue_kills": kills[Enums.Team.BLUE], "red_kills": kills[Enums.Team.RED],
		"difficulty": config.difficulty if config != null else "", "kill_target": config.kill_target if config != null else 0,
		"mode": config.mode if config != null else "team", "autoplay": config.autoplay if config != null else false,
	}
