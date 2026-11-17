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
## 특별한 도착 지점 (재사용 스킬에 쓴다):
## "mark:<상태 id>" 내가 그 상태를 건 적의 뒤, "summon:<몬스터 id>" 내 그 소환수와 자리 바꾸기,
## "link:<상태 id>" 내가 그 상태를 건 아군 옆
@export var destination: String = ""


## 내가 status_id 상태를 건 유닛 (적 또는 아군, 가장 가까운 것)
static func marked_by(caster, status_id: String, ally: bool):
	var best = null
	var best_d := INF
	for u in caster.get_tree().get_nodes_in_group("units"):
		if u == caster or u.is_dead or not u.status.has(status_id):
			continue
		if (u.team == caster.team) != ally:
			continue
		if u.status.active[status_id].source != caster:
			continue
		var d: float = u.global_position.distance_to(caster.global_position)
		if d < best_d:
			best_d = d
			best = u
	return best


## 재사용 조건 검사용: destination 이 가리키는 대상이 있는지
static func find_destination(caster, spec: String):
	var parts := spec.split(":")
	if parts.size() != 2:
		return null
	match parts[0]:
		"mark":
			return marked_by(caster, parts[1], false)
		"link":
			return marked_by(caster, parts[1], true)
		"summon":
			var list := SummonEffect.alive_of(caster, parts[1])
			return list.back() if not list.is_empty() else null
	return null


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var c = ctx.caster
	var from: Vector2 = c.global_position
	var dest := from + ctx.direction * distance
	var target = null
	if destination != "":
		var d = find_destination(c, destination)
		if d == null:
			return
		if destination.begins_with("summon:"):
			# 분신과 자리를 바꾼다.
			var mine: Vector2 = c.global_position
			c.global_position = d.global_position
			d.global_position = mine
			c.dash_count += 1
			c.attack.cancel_windup()
			c.nav_goal = null
			SkillFx.puff(c, mine, 50.0, SkillFx.style_of(ctx.skill))
			SkillFx.puff(c, c.global_position, 50.0, SkillFx.style_of(ctx.skill))
			SkillEffect.apply_list(arrive_effects, ctx.with_target(c))
			return
		target = d if destination.begins_with("mark:") else null
		var back: Vector2 = (d.global_position - from).normalized()
		dest = d.global_position + back * (d.radius + c.radius + behind) if target != null else d.global_position - back * (d.radius + c.radius + 10.0)
	elif ctx.skill != null:
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
	SkillFx.puff(c, from, 50.0, SkillFx.style_of(ctx.skill))
	SkillFx.puff(c, dest, 60.0, SkillFx.style_of(ctx.skill))
	SkillEffect.apply_list(arrive_effects, ctx.with_target(target if target != null else c))
