class_name RemoteController
extends HeroController
## 방장 폰에서 참가자의 영웅을 움직이는 조작기. 참가자가 보낸 입력(이동 방향, 공격 대상)을 그대로 따른다.

var move := Vector2.ZERO
var target_id := -1
var sync = null  # NetSync (번호로 유닛 찾기)


func _physics_process(_delta: float) -> void:
	if hero == null or hero.is_dead:
		return
	hero.move_input = move.limit_length(1.0)
	var t = sync.unit_by_id(target_id) if sync != null and target_id >= 0 else null
	if t != null and Targeting.is_valid(t, hero.team, Enums.TargetTeam.ENEMY):
		hero.attack_order = t
		if move.length() > 0.05 and not hero.attack.in_range(t):
			hero.attack_order = null
	else:
		hero.attack_order = null
