class_name BarrageEffect
extends SkillEffect
## 난사: 조준한 방향으로 정해진 시간 동안 하위 효과(보통 투사체)를 여러 번 되풀이한다.
## 한 발마다 방향이 spread 각도 안에서 조금씩 흔들린다. 시전자가 죽거나 기절하면 멈춘다.
## 쏘는 동안 시전자에게 caster_status(보통 둔화)를 slow_caster 세기로 건다 (없으면 그대로).

@export var shots: int = 12
@export var interval: float = 0.2
## 한 발마다 흔들리는 각도 (도, 양쪽으로)
@export var spread: float = 12.0
@export var caster_status: StatusEffectData
@export var slow_caster: float = 0.4
## 한 발마다 낼 소리 (AudioManager 이름, "" 이면 없음)
@export var shot_sound: String = ""
@export var effects: Array[Resource] = []


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var runner := BarrageRunner.new()
	runner.setup(self, ctx)
	Targeting.effects_parent(ctx.caster).add_child(runner)
	if caster_status != null:
		ctx.caster.status.apply(caster_status, shots * interval, slow_caster, ctx.caster)


## 정해진 간격마다 한 발씩 쏘는 노드 (다 쏘면 사라진다)
class BarrageRunner extends Node:
	var effect: BarrageEffect
	var ctx: SkillContext
	var left := 0
	var timer := 0.0
	var rng := RandomNumberGenerator.new()

	func setup(e: BarrageEffect, c: SkillContext) -> void:
		effect = e
		ctx = c
		left = e.shots
		rng.seed = hash(Vector2i(int(c.caster.global_position.x), int(c.caster.global_position.y)))

	func _physics_process(delta: float) -> void:
		if not ctx.caster_valid() or ctx.caster.is_dead or ctx.caster.status.is_stunned():
			queue_free()
			return
		timer -= delta
		while timer <= 0.0 and left > 0:
			timer += effect.interval
			left -= 1
			_fire()
		if left <= 0:
			queue_free()

	func _fire() -> void:
		var c := ctx.with_target(null)
		c.direction = ctx.direction.rotated(deg_to_rad(rng.randf_range(-effect.spread, effect.spread)))
		SkillEffect.apply_list(effect.effects, c)
		if effect.shot_sound != "" and FogOfWar.can_see(ctx.caster):
			AudioManager.play(effect.shot_sound, 0.06, 0.35 if ctx.caster == AudioManager.player_unit else 0.15)
