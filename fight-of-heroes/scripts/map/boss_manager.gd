class_name BossManager
extends Node
## 보스 출현 알림, 처치 보상(팀 버프), 최종 보스 처치 승리.

var battle: BattleManager
var hero_manager: HeroManager
var monsters: MonsterManager


func setup(bm: BattleManager, hm: HeroManager, mm: MonsterManager) -> void:
	battle = bm
	hero_manager = hm
	monsters = mm
	EventBus.unit_died.connect(_on_unit_died)
	EventBus.boss_warning.connect(_on_warning)
	EventBus.boss_spawned.connect(_on_spawned)


func _exit_tree() -> void:
	for pair in [[EventBus.unit_died, _on_unit_died], [EventBus.boss_warning, _on_warning], [EventBus.boss_spawned, _on_spawned]]:
		if pair[0].is_connected(pair[1]):
			pair[0].disconnect(pair[1])


func _on_warning(boss_name: String, seconds: int) -> void:
	if _raid():
		EventBus.notice.emit("레이드 보스 %s 이(가) %d초 뒤에 맵 가운데에 나타납니다. 함께 맞설 준비를 하세요!" % [boss_name, seconds])
		return
	EventBus.notice.emit("%s 이(가) %d초 뒤에 나타납니다" % [boss_name, seconds])


func _on_spawned(boss) -> void:
	if _raid() and boss.is_final_boss():
		EventBus.notice.emit("%s 이(가) 맵 가운데에 나타났습니다! 쓰러뜨리면 레이드 성공입니다" % boss.display_name)
		return
	EventBus.notice.emit("%s 이(가) 나타났습니다!" % boss.display_name)


func _raid() -> bool:
	return monsters != null and monsters.raid


func _on_unit_died(victim, killer) -> void:
	if not (victim is Monster) or not victim.is_boss():
		return
	var credit = ExperienceManager.credit_hero(victim, killer)
	if credit == null:
		return
	var team: int = credit.team
	EventBus.boss_killed.emit(victim, team)
	EventBus.notice.emit("%s 팀이 %s 을(를) 처치했습니다!" % [Enums.team_name(team), victim.display_name])
	var d: MonsterData = victim.data
	if d.team_buff != null:
		for h in hero_manager.team_heroes(team):
			if not h.is_dead:
				h.status.apply(d.team_buff, d.team_buff_duration, 0.0, null)
	if victim.is_final_boss() and battle != null:
		battle.finish(team, "raid" if _raid() else "boss")
