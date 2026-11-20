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
## 재사용을 기다리는 남은 시간 (0 이면 아님)과, 재사용이 끝나면 시작할 재사용 대기시간
var recast_left: Array = [0.0, 0.0, 0.0, 0.0]
var _pending_cd: Array = [0.0, 0.0, 0.0, 0.0]
## 형태 (용 변신): alt_status 상태이면 alt_skills 를 쓴다
var alt_status := ""
var alt_skills: Array = []
## 마지막으로 쓴 스킬의 실행 정보 (분신 따라 쓰기)
var last_ctx: SkillContext = null
## 마지막 시전이 재사용(두 번째 누르기)이었는지
var last_was_recast := false

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


func setup_forms(status_id: String, list: Array) -> void:
	alt_status = status_id
	alt_skills = list


func in_alt_form() -> bool:
	return alt_status != "" and unit.status.has(alt_status)


func get_skill(slot: int) -> SkillData:
	if slot < 0 or slot >= 4:
		return null
	if slot < alt_skills.size() and alt_skills[slot] != null and in_alt_form():
		return alt_skills[slot]
	return skills[slot]


func is_recasting(slot: int) -> bool:
	return slot >= 0 and slot < 4 and recast_left[slot] > 0.0


## 처치 등으로 재사용 대기시간을 바로 끝낸다.
func reset_cooldown(s: SkillData) -> void:
	for i in 4:
		if skills[i] == s or (i < alt_skills.size() and alt_skills[i] == s):
			cooldowns[i] = 0.0
			recast_left[i] = 0.0
			if unit is Hero and unit.controller is PlayerController:
				EventBus.notice.emit("%s 재사용 가능!" % s.display_name)


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
	if recast_left[slot] > 0.0:
		# 재사용: 마나·사거리는 보지 않고, 조건(표식·분신·연결)만 본다.
		if cooldowns[slot] > 0.0:
			return Enums.CastResult.COOLDOWN
		if not unit.can_act():
			return Enums.CastResult.DISABLED
		if s.recast_requires != "" and TeleportEffect.find_destination(unit, s.recast_requires) == null:
			return Enums.CastResult.NO_TARGET
		return Enums.CastResult.OK
	if cooldowns[slot] > 0.0:
		return Enums.CastResult.COOLDOWN
	if s.requires_gauge > 0.0 and unit is Hero and unit.gauge < s.requires_gauge:
		return Enums.CastResult.NOT_READY
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
	if recast_left[slot] > 0.0:
		return _recast(slot, s, rank, aim)
	unit.mana.spend(s.get_mana(rank))
	cooldowns[slot] = s.get_cooldown(rank) * (1.0 - unit.stats.get_stat("cooldown_reduction"))
	max_cooldowns[slot] = cooldowns[slot]
	if s.requires_gauge > 0.0 and unit is Hero:
		unit.set_gauge(unit.gauge - s.requires_gauge)
	if not s.recast_effects.is_empty() and s.recast_window > 0.0:
		# 재사용을 기다린다: 재사용 대기시간은 재사용하거나 시간이 지난 뒤에 시작한다.
		_pending_cd[slot] = cooldowns[slot]
		recast_left[slot] = s.recast_window
		cooldowns[slot] = 0.3
		max_cooldowns[slot] = 0.3
	cast_counts[slot] += 1
	unit.attack.cancel_windup()
	unit.status.remove_kind(Enums.StatusKind.STEALTH)
	unit.revealed_until = Unit.now() + Bushes.REVEAL
	if s.cast_lock > 0.0:
		unit.cast_lock_left = s.cast_lock
	var ctx := _build_context(s, rank, aim)
	last_ctx = ctx
	last_was_recast = false
	if s.custom_script != null:
		var runner = s.custom_script.new()
		runner.execute(ctx)
	else:
		SkillEffect.apply_list(s.effects, ctx)
		_direct_hit_fx(s, ctx)
	cast_done.emit(slot, s)
	EventBus.skill_cast.emit(unit, slot, s)
	return Enums.CastResult.OK


func _recast(slot: int, s: SkillData, rank: int, aim: CastAim) -> int:
	recast_left[slot] = 0.0
	_start_pending_cooldown(slot)
	unit.attack.cancel_windup()
	var ctx := _build_context(s, rank, aim if aim != null and s.target_mode != Enums.TargetMode.UNIT else null)
	last_ctx = ctx
	last_was_recast = true
	SkillEffect.apply_list(s.recast_effects, ctx)
	EventBus.skill_cast.emit(unit, slot, s)
	return Enums.CastResult.OK


func _start_pending_cooldown(slot: int) -> void:
	cooldowns[slot] = maxf(0.5, _pending_cd[slot] - (get_skill(slot).recast_window if get_skill(slot) != null else 0.0) * 0.5)
	max_cooldowns[slot] = cooldowns[slot]


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
			if aim != null and aim.unit != null and is_instance_valid(aim.unit):
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
		if recast_left[i] > 0.0:
			recast_left[i] -= delta
			if recast_left[i] <= 0.0 or unit.is_dead:
				recast_left[i] = 0.0
				_start_pending_cooldown(i)


## 대상 하나에 바로 거는 스킬(속박·사슬·심판 등)은 범위나 투사체 그림이 없으므로,
## 시전자에서 대상까지 빛줄기를 긋고 대상 자리에서 터지는 효과를 보여 준다.
func _direct_hit_fx(s: SkillData, ctx: SkillContext) -> void:
	if s.target_mode != Enums.TargetMode.UNIT or ctx.target_unit == null or not is_instance_valid(ctx.target_unit):
		return
	for e in s.effects:
		if e is AreaEffect or e is ProjectileEffect or e is DashEffect or e is LineZoneEffect or e is TeleportEffect or e is SummonEffect or e is BarrageEffect:
			return
	var style := SkillFx.style_of(s)
	var to: Vector2 = ctx.target_unit.global_position
	SkillFx.line(unit, unit.global_position, to, 22.0, style)
	SkillFx.burst(unit, to, 60.0, style)
