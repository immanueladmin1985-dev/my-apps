class_name LineZoneEffect
extends SkillEffect
## 직선 위험 지역. delay 동안 예고한 뒤 선 위의 유닛마다 effects 를 실행한다.
## dash_caster 를 켜면 발동 순간 시전자가 선 끝까지 돌진하며 지나간 유닛에게 effects 를 실행한다.

@export var length: float = 500.0
@export var width: float = 90.0
@export var delay: float = 0.8
@export var affects: Enums.TargetTeam = Enums.TargetTeam.ENEMY
@export var effects: Array[Resource] = []
@export var dash_caster: bool = false
@export var dash_speed: float = 1600.0
@export var color: Color = Color(1, 0.4, 0.2, 0.35)


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var zone := LineZone.new()
	zone.setup(self, ctx, ctx.caster.global_position, ctx.direction)
	Targeting.effects_parent(ctx.caster).add_child(zone)
	zone.global_position = ctx.caster.global_position
