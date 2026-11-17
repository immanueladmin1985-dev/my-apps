class_name KnockbackEffect
extends SkillEffect
## 밀쳐내기. 시전자(from_point 면 ctx.point)에게서 멀어지는 쪽으로 distance 만큼 민다 (음수면 끌어당긴다).
## 벽에 부딪혀 멈추면 wall_status 를 건다 (벽꽝 기절). 보스는 밀리지 않는다.

@export var distance: float = 200.0
@export var speed: float = 1200.0
@export var from_point: bool = false
@export var wall_status: StatusEffectData
@export var wall_duration: float = 1.0


func apply(ctx: SkillContext) -> void:
	var t = ctx.target_unit
	if t == null or not is_instance_valid(t) or t.is_dead or t == ctx.caster or not ctx.caster_valid():
		return
	if t is Monster and t.is_boss():
		return
	var origin: Vector2 = ctx.point if from_point else ctx.caster.global_position
	var dir: Vector2 = t.global_position - origin
	if dir.length() < 1.0:
		dir = ctx.direction
	var dist := distance
	if distance < 0.0:
		# 끌어당길 때는 중심을 넘어가지 않는다.
		dist = -minf(-distance, maxf(0.0, dir.length() - t.radius * 2.0))
		if dist > -1.0:
			return
	var st := wall_status
	var dur := wall_duration
	var caster = ctx.caster
	t.start_dash(dir.normalized() * signf(dist), absf(dist), speed, 0.0, Callable(), func():
		if st != null and is_instance_valid(t) and not t.is_dead and t.last_dash_blocked:
			t.status.apply(st, dur, 0.0, caster if is_instance_valid(caster) else null)
			SkillFx.burst(t, t.global_position, 70.0, "impact")
			if caster is Hero and caster.controller is PlayerController:
				EventBus.notice.emit("벽꽝!"))
