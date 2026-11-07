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
	var credit = killer
	if credit == null or not is_instance_valid(credit) or not Enums.is_enemy(credit.team, victim.team):
		credit = _last_enemy_attacker(victim)
	if credit == null:
		return
	if credit is Hero:
		credit.kills += 1
	if not kills.has(credit.team):
		return
	kills[credit.team] += 1
	EventBus.kill_score_changed.emit(kills[Enums.Team.BLUE], kills[Enums.Team.RED])
	EventBus.notice.emit("%s 처치! (%s)" % [victim.display_name, Enums.team_name(credit.team)])
	if kills[credit.team] >= config.kill_target:
		finish(credit.team, "kills")


func _last_enemy_attacker(victim):
	var best = null
	var best_t := Unit.now() - 10.0
	for u in victim.recent_attackers:
		if is_instance_valid(u) and Enums.is_enemy(u.team, victim.team) and victim.recent_attackers[u] > best_t:
			best = u
			best_t = victim.recent_attackers[u]
	return best


func finish(team: int, reason: String) -> void:
	if match_over:
		return
	match_over = true
	winner = team
	end_reason = reason
	ended.emit(team, reason)
	EventBus.match_ended.emit(team, reason)
