class_name SkillEffect
extends Resource
## 스킬 효과 하나. apply(ctx) 는 ctx.target_unit 에게 적용된다.
## 범위·투사체·돌진 효과는 맞은 유닛마다 하위 효과 목록을 실행한다.


func apply(_ctx: SkillContext) -> void:
	pass


static func apply_list(effects: Array, ctx: SkillContext) -> void:
	for e in effects:
		if e is SkillEffect:
			e.apply(ctx)


static func scaled(ctx: SkillContext, base: PackedFloat32Array, ad_ratio: float, ap_ratio: float) -> float:
	var v := SkillData.at(base, ctx.rank)
	if ctx.caster_valid():
		v += ad_ratio * ctx.caster.stats.get_stat("attack") + ap_ratio * ctx.caster.stats.get_stat("ability_power")
	return v
