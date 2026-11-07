class_name SummonEffect
extends SkillEffect
## 소환수를 부른다. 소환수는 주인을 따라다니며 주인 근처의 적을 공격하고 duration 초 뒤 사라진다.
## 소환수 능력치는 MonsterData 에 적고, 단계·주문력에 따라 체력·공격력을 늘린다.

const SCENE := preload("res://scenes/monsters/monster.tscn")

@export var monster_id: String = ""
@export var count: PackedInt32Array = PackedInt32Array([1])
@export var duration: PackedFloat32Array = PackedFloat32Array([15.0])
## 주문력 1 당 늘어나는 최대 체력·공격력
@export var hp_per_ap: float = 2.0
@export var attack_per_ap: float = 0.25
## 단계마다 늘어나는 비율 (0.2 = 단계마다 20%)
@export var per_rank: float = 0.2


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var d := DataRegistry.monster(monster_id)
	if d == null:
		push_error("소환수 데이터가 없습니다: " + monster_id)
		return
	var c = ctx.caster
	var n: int = count[clampi(ctx.rank - 1, 0, count.size() - 1)] if not count.is_empty() else 1
	var center: Vector2 = ctx.point if ctx.skill != null and ctx.skill.target_mode == Enums.TargetMode.POINT else c.global_position + c.facing * 60.0
	var ap: float = c.stats.get_stat("ability_power")
	var k := 1.0 + per_rank * (ctx.rank - 1)
	for i in n:
		var m: Monster = SCENE.instantiate()
		m.name = "%s_%d" % [monster_id, m.get_instance_id()]
		c.get_parent().add_child(m)
		var pos := center + Vector2.from_angle(TAU * i / maxf(1, n)) * (30.0 if n > 1 else 0.0)
		m.setup_summon(d, c, pos, SkillData.at(duration, ctx.rank))
		m.stats.add_modifiers("summon", [StatModifier.make("max_hp", ap * hp_per_ap, k - 1.0), StatModifier.make("attack", ap * attack_per_ap, k - 1.0)])
		m.health.reset_full()
		Vfx.circle(c, pos, 36.0, Color(0.6, 0.4, 1, 0.5), 0.4)
