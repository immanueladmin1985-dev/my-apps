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
## 끝까지 날아간 뒤 돌아오며 다시 맞힌다 (부메랑)
@export var returns: bool = false
## 멀리 날아가 맞힐수록 피해 증가 (끝에서 +distance_bonus)
@export var distance_bonus: float = 0.0


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var p := Projectile.new()
	var dist := max_range if max_range > 0.0 else ctx.skill.cast_range
	var list := effects
	var bonus := distance_bonus
	p.setup_line(ctx.caster, ctx.direction, speed, dist, width, pierce or returns, func(u):
		var c := ctx.with_target(u)
		if bonus > 0.0:
			c.power = 1.0 + bonus * clampf(p.global_position.distance_to(p._origin) / maxf(1.0, dist), 0.0, 1.0)
		SkillEffect.apply_list(list, c))
	p.returns = returns
	p.affects = affects
	p.color = color
	p.style = SkillFx.style_of(ctx.skill)
	Targeting.effects_parent(ctx.caster).add_child(p)
	p.global_position = ctx.caster.global_position
