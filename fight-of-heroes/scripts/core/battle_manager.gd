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


func setup(cfg: MatchConfig) -> void:
	config = cfg
	EventBus.unit_died.connect(_on_unit_died)


func _exit_tree() -> void:
	if EventBus.unit_died.is_connected(_on_unit_died):
		EventBus.unit_died.disconnect(_on_unit_died)


func _physics_process(delta: float) -> void:
	if not match_over:
		elapsed += delta


func _on_unit_died(victim, killer) -> void:
	if not (victim is Hero):
		return
	victim.deaths += 1
	# 몬스터나 우물에게 죽으면 최근에 때린 적 영웅이 처치를 인정받는다. 없으면 점수 없음.
	var credit = ExperienceManager.credit_hero(victim, killer)
	if credit == null:
		return
	credit.kills += 1
	var helpers := assisters(victim, credit)
	for a in helpers:
		a.assists += 1
	if not kills.has(credit.team):
		return
	kills[credit.team] += 1
	EventBus.hero_killed.emit(victim, credit, helpers)
	EventBus.kill_score_changed.emit(kills[Enums.Team.BLUE], kills[Enums.Team.RED])
	if kills[credit.team] >= config.kill_target:
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
