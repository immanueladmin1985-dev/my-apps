class_name DashEffect
extends SkillEffect
## 돌진. 지나가는 길 위의 적에게 path_effects 를 한 번씩, 도착하면 end_effects 를 시전자에게 실행한다.
## reverse 가 켜져 있으면 조준한 방향의 반대쪽으로 물러난다.

@export var distance: float = 250.0
@export var speed: float = 900.0
@export var width: float = 50.0
@export var reverse: bool = false
@export var path_effects: Array[Resource] = []
@export var end_effects: Array[Resource] = []
@export var trail_color: Color = Color(1, 1, 1, 0.5)


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var dir := -ctx.direction if reverse else ctx.direction
	var start: Vector2 = ctx.caster.global_position
	var caster = ctx.caster
	var path := path_effects
	var ends := end_effects
	var on_pass := func(u): SkillEffect.apply_list(path, ctx.with_target(u))
	var on_end := func():
		if is_instance_valid(caster):
			Vfx.line(caster, start, caster.global_position, width * 0.6, trail_color, 0.35)
			SkillEffect.apply_list(ends, ctx.with_target(caster))
	ctx.caster.start_dash(dir, distance, speed, width, on_pass, on_end)
