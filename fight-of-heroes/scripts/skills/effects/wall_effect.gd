class_name WallEffect
extends SkillEffect
## 지정한 곳에 시전 방향과 직각으로 잠시 길을 막는 벽(얼음벽 등)을 세운다.

@export var length: float = 260.0
@export var thickness: float = 36.0
@export var duration: PackedFloat32Array = PackedFloat32Array([3.0])
@export var style: String = "ice"


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var w := TempWall.new()
	w.setup(length, thickness, SkillData.at(duration, ctx.rank), style)
	Targeting.effects_parent(ctx.caster).add_child(w)
	var p: Vector2 = ctx.point if ctx.skill != null and ctx.skill.target_mode == Enums.TargetMode.POINT else ctx.caster.global_position + ctx.direction * 150.0
	w.global_position = p
	var dir: Vector2 = p - ctx.caster.global_position
	if dir.length() < 1.0:
		dir = ctx.direction
	w.rotation = dir.angle() + PI * 0.5
	SkillFx.burst(ctx.caster, p, length * 0.5, style)
