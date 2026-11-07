class_name TeleportEffect
extends SkillEffect
## 순간이동. POINT 스킬은 지정한 지점(사거리까지), DIRECTION 스킬은 distance 만큼 앞,
## UNIT 스킬은 대상 뒤쪽으로 이동한다. 도착한 뒤 arrive_effects 를 대상(없으면 시전자)에게 실행한다.
## 따라오던 기본 공격 투사체는 대상을 놓친다.

@export var distance: float = 300.0
## UNIT 스킬일 때 대상 뒤로 얼마나 넘어갈지
@export var behind: float = 40.0
@export var arrive_effects: Array[Resource] = []
@export var color: Color = Color(0.7, 0.5, 1, 0.6)


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var c = ctx.caster
	var from: Vector2 = c.global_position
	var dest := from + ctx.direction * distance
	var target = null
	if ctx.skill != null:
		match ctx.skill.target_mode:
			Enums.TargetMode.POINT:
				dest = ctx.point
			Enums.TargetMode.UNIT:
				target = ctx.target_unit
				if target != null and is_instance_valid(target):
					var dir: Vector2 = (target.global_position - from).normalized()
					dest = target.global_position + dir * (target.radius + c.radius + behind)
	var nav: NavigationAgent2D = c.get("nav")
	if nav != null and NavigationServer2D.map_get_iteration_id(nav.get_navigation_map()) > 0:
		var q := NavigationServer2D.map_get_closest_point(nav.get_navigation_map(), dest)
		if q.distance_to(dest) < 300.0:
			dest = q
	c.global_position = dest
	c.dash_count += 1
	c.attack.cancel_windup()
	c.nav_goal = null
	Vfx.circle(c, from, 34.0, color, 0.35)
	Vfx.circle(c, dest, 40.0, color, 0.35)
	SkillEffect.apply_list(arrive_effects, ctx.with_target(target if target != null else c))
