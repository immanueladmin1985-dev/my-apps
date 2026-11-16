extends Node
## 개발용: --fx_demo=<영웅 id> [--fx_slot=0..3]
## 플레이어 영웅 앞에 멈춘 적을 세워 두고 스킬을 차례로(또는 한 칸만) 계속 써서 효과 그림을 확인한다.

var battle
var slot := -1
var _left := 0.6
var _next := 0


func _ready() -> void:
	battle = get_parent()
	slot = int(GameManager.dev_args.get("fx_slot", "-1"))
	var h: Hero = battle.player_hero
	h.global_position = Vector2(1500, 1300)
	h.skill_caster.setup(h.data.skills, 3)
	h.level = 11
	for e in battle.hero_manager.team_heroes(Enums.Team.RED):
		if e.controller != null:
			e.controller.set_physics_process(false)
			e.controller.set_process(false)
		e.clear_orders()
	var reds: Array = battle.hero_manager.team_heroes(Enums.Team.RED)
	for i in reds.size():
		reds[i].global_position = h.global_position + Vector2(260 + i * 40, -60 + i * 70)
	for a in battle.hero_manager.team_heroes(Enums.Team.BLUE):
		if a != h:
			a.global_position = h.global_position + Vector2(-120, 60)
			if a.controller != null:
				a.controller.set_physics_process(false)


func _physics_process(delta: float) -> void:
	var h: Hero = battle.player_hero
	h.mana.mp = h.mana.max_mp()
	h.health.hp = h.health.max_hp()
	for i in 4:
		h.skill_caster.cooldowns[i] = 0.0
	for e in battle.hero_manager.heroes:
		e.health.hp = e.health.max_hp()
	_left -= delta
	if _left > 0.0:
		return
	_left = 1.1
	var s := slot if slot >= 0 else _next % 4
	_next += 1
	var target = battle.hero_manager.team_heroes(Enums.Team.RED)[0]
	var aim := CastAim.new()
	aim.unit = target
	aim.point = target.global_position
	aim.has_point = true
	aim.direction = (target.global_position - h.global_position).normalized()
	h.skill_caster.cast(s, aim)
