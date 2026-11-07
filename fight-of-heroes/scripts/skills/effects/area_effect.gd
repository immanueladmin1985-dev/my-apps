class_name AreaEffect
extends SkillEffect
## 원형 범위 안의 유닛마다 하위 효과를 실행한다.
## delay 가 있으면 위험 지역을 먼저 표시하고, duration 이 있으면 tick 마다 반복한다.

enum Center { CASTER, POINT, TARGET }

@export var center: Center = Center.CASTER
@export var radius: float = 100.0
@export var affects: Enums.TargetTeam = Enums.TargetTeam.ENEMY
@export var delay: float = 0.0
@export var duration: float = 0.0
@export var tick_interval: float = 0.5
@export var effects: Array[Resource] = []
@export var color: Color = Color(1, 0.6, 0.2, 0.35)


func center_of(ctx: SkillContext) -> Vector2:
	match center:
		Center.POINT:
			return ctx.point
		Center.TARGET:
			if ctx.target_unit != null and is_instance_valid(ctx.target_unit):
				return ctx.target_unit.global_position
	return ctx.caster.global_position if ctx.caster_valid() else ctx.point


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var pos := center_of(ctx)
	if delay <= 0.0 and duration <= 0.0:
		hit(ctx, pos)
		Vfx.circle(ctx.caster, pos, radius, color, 0.35)
		return
	var zone := AreaZone.new()
	zone.setup(self, ctx, pos)
	Targeting.effects_parent(ctx.caster).add_child(zone)
	zone.global_position = pos


func hit(ctx: SkillContext, pos: Vector2) -> void:
	if not ctx.caster_valid():
		return
	for u in Targeting.in_radius(ctx.caster.get_tree(), pos, radius, ctx.team(), affects):
		SkillEffect.apply_list(effects, ctx.with_target(u))
