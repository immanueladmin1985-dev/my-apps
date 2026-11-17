class_name ChainEffect
extends SkillEffect
## 대상 주변(radius)에서 가장 가까운 다른 적 하나에게 하위 효과를 실행한다.
## 하위 효과의 ctx.point 는 처음 대상의 위치다 (서로 끌어당기기 등).

@export var radius: float = 350.0
@export var effects: Array[Resource] = []


func apply(ctx: SkillContext) -> void:
	var first = ctx.target_unit
	if first == null or not is_instance_valid(first) or not ctx.caster_valid():
		return
	var best = null
	var best_d := radius
	for u in Targeting.in_radius(ctx.caster.get_tree(), first.global_position, radius, ctx.team(), Enums.TargetTeam.ENEMY):
		if u == first:
			continue
		var d: float = u.global_position.distance_to(first.global_position)
		if d < best_d:
			best_d = d
			best = u
	if best == null:
		return
	var c := ctx.with_target(best)
	c.point = first.global_position
	SkillFx.line(ctx.caster, first.global_position, best.global_position, 18.0, SkillFx.style_of(ctx.skill))
	SkillEffect.apply_list(effects, c)
