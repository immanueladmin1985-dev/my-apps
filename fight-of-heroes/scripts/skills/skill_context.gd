class_name SkillContext
extends RefCounted
## 효과를 실행할 때 넘기는 정보. target_unit 은 지금 효과를 받을 유닛이다.

var caster = null
var skill: SkillData
var rank: int = 1
var target_unit = null
var point := Vector2.ZERO
var direction := Vector2.RIGHT


func with_target(u) -> SkillContext:
	var c := SkillContext.new()
	c.caster = caster
	c.skill = skill
	c.rank = rank
	c.target_unit = u
	c.point = point
	c.direction = direction
	return c


func caster_valid() -> bool:
	return caster != null and is_instance_valid(caster)


func team() -> int:
	return caster.team if caster_valid() else Enums.Team.NEUTRAL
