class_name TrapEffect
extends SkillEffect
## 덫을 놓는다. 적이 radius 안에 들어오면 터져 그 안의 적마다 effects 를 실행한다.
## 한 영웅의 덫은 max_traps 개까지 (넘으면 가장 오래된 덫이 사라진다). 적에게는 보이지 않는다.

@export var radius: float = 110.0
@export var lifetime: float = 40.0
@export var arm_time: float = 0.6
@export var max_traps: int = 3
@export var effects: Array[Resource] = []


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var mine: Array = []
	for t in ctx.caster.get_tree().get_nodes_in_group("traps"):
		if t.owner_unit == ctx.caster and not t.is_queued_for_deletion():
			mine.append(t)
	while mine.size() >= max_traps and not mine.is_empty():
		mine.pop_front().queue_free()
	var trap := Trap.new()
	trap.setup(self, ctx)
	Targeting.effects_parent(ctx.caster).add_child(trap)
	trap.global_position = ctx.point if ctx.skill != null and ctx.skill.target_mode == Enums.TargetMode.POINT else ctx.caster.global_position
