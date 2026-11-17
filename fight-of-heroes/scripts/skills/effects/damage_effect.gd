class_name DamageEffect
extends SkillEffect
## 피해 = 단계별 기본값 + 공격력 × ad_ratio + 주문력 × ap_ratio
## 덧붙는 규칙:
## - 게이지(시전자 영웅의 고유 게이지) 1 당 gauge_bonus 비율만큼 세지고, consume_gauge 면 다 쓴다.
## - 대상이 잃은 체력 비율 × missing_hp_bonus 만큼 세진다 (처형).
## - 대상 체력이 execute_below 비율 아래면(보스 제외) 바로 쓰러뜨린다.
## - 대상에게 status_bonus_id 상태가 있으면 status_bonus 만큼 세지고, status_consume 이면 그 상태를 없앤다 (화상 폭발).
## - 시전자에게 summon_bonus_id 소환수가 살아 있으면 summon_bonus 만큼 세진다.

@export var damage_type: Enums.DamageType = Enums.DamageType.PHYSICAL
@export var base: PackedFloat32Array = PackedFloat32Array([])
@export var ad_ratio: float = 0.0
@export var ap_ratio: float = 0.0
@export var can_crit: bool = false
@export var gauge_bonus: float = 0.0
@export var consume_gauge: bool = false
@export var missing_hp_bonus: float = 0.0
@export var execute_below: PackedFloat32Array = PackedFloat32Array()
@export var status_bonus_id: String = ""
@export var status_bonus: float = 0.0
@export var status_consume: bool = false
@export var summon_bonus_id: String = ""
@export var summon_bonus: float = 0.0


func apply(ctx: SkillContext) -> void:
	var t = ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead or t == ctx.caster:
		return
	var c = ctx.caster if ctx.caster_valid() else null
	var amount := scaled(ctx, base, ad_ratio, ap_ratio) * ctx.power
	var mult := 1.0
	if c != null and gauge_bonus > 0.0 and c is Hero and c.has_gauge():
		mult += gauge_bonus * floorf(c.gauge)
	if missing_hp_bonus > 0.0:
		mult += missing_hp_bonus * (1.0 - t.health.ratio())
	if status_bonus_id != "" and t.status.has(status_bonus_id):
		mult += status_bonus
		if status_consume:
			t.status.remove(status_bonus_id)
			SkillFx.burst(t, t.global_position, 70.0, SkillFx.style_of(ctx.skill))
	if c != null and summon_bonus_id != "" and SummonEffect.alive_of(c, summon_bonus_id).size() > 0:
		mult += summon_bonus
	var info := DamageInfo.new(c, amount * mult, damage_type)
	info.can_crit = can_crit
	info.skill = ctx.skill
	var ex := SkillData.at(execute_below, ctx.rank)
	var boss: bool = t is Monster and t.is_boss()
	if ex > 0.0 and not boss and t.health.ratio() <= ex:
		# 처형: 남은 체력과 보호막을 넘는 피해로 쓰러뜨린다.
		info.amount = 999999.0
		info.type = Enums.DamageType.TRUE
		if c is Hero and c.controller is PlayerController:
			EventBus.notice.emit("처형!")
	CombatManager.apply_damage(t, info)
	if t.is_dead and c != null and ctx.skill != null and ctx.skill.reset_on_kill and c.get("skill_caster") != null:
		c.skill_caster.reset_cooldown(ctx.skill)
	if consume_gauge and c is Hero:
		c.call_deferred("set_gauge", 0.0)
