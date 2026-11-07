class_name ProjectileEffect
extends SkillEffect
## 직선 투사체를 쏜다. 맞은 유닛마다 하위 효과를 실행한다.

@export var speed: float = 1000.0
## 0 이면 스킬 사거리를 쓴다
@export var max_range: float = 0.0
@export var width: float = 30.0
@export var pierce: bool = false
@export var affects: Enums.TargetTeam = Enums.TargetTeam.ENEMY
@export var effects: Array[Resource] = []
@export var color: Color = Color(1, 1, 0.7)


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var p := Projectile.new()
	var dist := max_range if max_range > 0.0 else ctx.skill.cast_range
	var list := effects
	p.setup_line(ctx.caster, ctx.direction, speed, dist, width, pierce, func(u): SkillEffect.apply_list(list, ctx.with_target(u)))
	p.affects = affects
	p.color = color
	Targeting.effects_parent(ctx.caster).add_child(p)
	p.global_position = ctx.caster.global_position
