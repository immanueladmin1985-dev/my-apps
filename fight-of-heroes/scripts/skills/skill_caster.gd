class_name SkillCaster
extends Node
## 영웅의 Q/W/E/R. 시전 가능 여부(단계, 쿨타임, 마나, 기절, 사거리)를 검사하고 효과를 실행한다.

signal cast_done(slot: int, skill: SkillData)
signal ranks_changed

var skills: Array = [null, null, null, null]
var ranks: Array = [0, 0, 0, 0]
var cooldowns: Array = [0.0, 0.0, 0.0, 0.0]
## 마지막 시전 때 정해진 쿨타임 (쿨타임 감소 반영). 버튼의 남은 비율 표시에 쓴다.
var max_cooldowns: Array = [1.0, 1.0, 1.0, 1.0]
var cast_counts: Array = [0, 0, 0, 0]

@onready var unit = get_parent()


func setup(list: Array, start_rank := 0) -> void:
	for i in 4:
		skills[i] = list[i] if i < list.size() else null
		ranks[i] = start_rank if skills[i] != null else 0
		cooldowns[i] = 0.0


## 이 레벨에서 slot 을 한 단계 올릴 수 있는지 (스킬 포인트는 따로 검사한다).
func can_level(slot: int, level: int) -> bool:
	var s := get_skill(slot)
	if s == null:
		return false
	return ranks[slot] < DataRegistry.progression().rank_cap(slot, level, s.max_rank)


func level_up(slot: int) -> void:
	ranks[slot] += 1
	ranks_changed.emit()


func get_skill(slot: int) -> SkillData:
	return skills[slot] if slot >= 0 and slot < 4 else null


func cooldown_ratio(slot: int) -> float:
	var s := get_skill(slot)
	if s == null or cooldowns[slot] <= 0.0:
		return 0.0
	return clampf(cooldowns[slot] / maxf(0.01, max_cooldowns[slot]), 0.0, 1.0)


func mana_cost(slot: int) -> float:
	var s := get_skill(slot)
	return s.get_mana(ranks[slot]) if s != null else 0.0


func check(slot: int, aim: CastAim = null) -> int:
	var s := get_skill(slot)
	if unit.is_dead:
		return Enums.CastResult.DEAD
	if s == null or ranks[slot] <= 0:
		return Enums.CastResult.NOT_LEARNED
	if cooldowns[slot] > 0.0:
		return Enums.CastResult.COOLDOWN
	if not unit.mana.has(s.get_mana(ranks[slot])):
		return Enums.CastResult.NO_MANA
	if not unit.can_act():
		return Enums.CastResult.DISABLED
	if s.target_mode == Enums.TargetMode.UNIT:
		if aim == null or not Targeting.is_valid(aim.unit, unit.team, s.target_team):
			return Enums.CastResult.NO_TARGET
		if unit.global_position.distance_to(aim.unit.global_position) > s.cast_range + aim.unit.radius:
			return Enums.CastResult.OUT_OF_RANGE
	return Enums.CastResult.OK


func cast(slot: int, aim: CastAim = null) -> int:
	var result := check(slot, aim)
	if result != Enums.CastResult.OK:
		return result
	var s := get_skill(slot)
	var rank: int = ranks[slot]
	unit.mana.spend(s.get_mana(rank))
	cooldowns[slot] = s.get_cooldown(rank) * (1.0 - unit.stats.get_stat("cooldown_reduction"))
	max_cooldowns[slot] = cooldowns[slot]
	cast_counts[slot] += 1
	unit.attack.cancel_windup()
	if s.cast_lock > 0.0:
		unit.cast_lock_left = s.cast_lock
	var ctx := _build_context(s, rank, aim)
	if s.custom_script != null:
		var runner = s.custom_script.new()
		runner.execute(ctx)
	else:
		SkillEffect.apply_list(s.effects, ctx)
	cast_done.emit(slot, s)
	EventBus.skill_cast.emit(unit, slot, s)
	return Enums.CastResult.OK


func _build_context(s: SkillData, rank: int, aim: CastAim) -> SkillContext:
	var ctx := SkillContext.new()
	ctx.caster = unit
	ctx.skill = s
	ctx.rank = rank
	ctx.direction = unit.facing
	ctx.point = unit.global_position + unit.facing * s.cast_range * 0.6
	ctx.target_unit = unit
	match s.target_mode:
		Enums.TargetMode.UNIT:
			ctx.target_unit = aim.unit
			ctx.point = aim.unit.global_position
			ctx.direction = (aim.unit.global_position - unit.global_position).normalized()
		Enums.TargetMode.DIRECTION:
			if aim != null and aim.direction.length() > 0.01:
				ctx.direction = aim.direction.normalized()
			elif aim != null and aim.has_point:
				ctx.direction = (aim.point - unit.global_position).normalized()
			elif aim != null and aim.unit != null and is_instance_valid(aim.unit):
				ctx.direction = (aim.unit.global_position - unit.global_position).normalized()
		Enums.TargetMode.POINT:
			var p: Vector2 = ctx.point
			if aim != null and aim.has_point:
				p = aim.point
			elif aim != null and aim.unit != null and is_instance_valid(aim.unit):
				p = aim.unit.global_position
			var off: Vector2 = p - unit.global_position
			ctx.point = unit.global_position + off.limit_length(s.cast_range)
			if off.length() > 1.0:
				ctx.direction = off.normalized()
	if ctx.direction.length() < 0.01:
		ctx.direction = unit.facing
	unit.facing = ctx.direction
	return ctx


func _physics_process(delta: float) -> void:
	for i in 4:
		if cooldowns[i] > 0.0:
			cooldowns[i] = maxf(0.0, cooldowns[i] - delta)
