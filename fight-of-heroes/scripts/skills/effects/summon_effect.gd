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
## 0 보다 크면 주인의 지금 능력치(체력·공격력·주문력·방어력·마법 저항력)의 이 비율로 만든다 (단계별). 닌자 분신.
@export var owner_stat_ratio: PackedFloat32Array = PackedFloat32Array()
## 주인의 이 소환수가 이만큼 넘으면 가장 오래된 것부터 사라진다 (0 이면 제한 없음)
@export var max_alive: int = 0
## 효과를 실행한 자리(ctx.point)에 부른다 (패시브: 쓰러진 적 자리에서 해골 일으키기)
@export var at_context_point: bool = false
## 주인이 이 칸의 스킬을 쓰면 소환수도 자기 자리에서 같은 스킬을 따라 쓴다
@export var mirror_slots: PackedInt32Array = PackedInt32Array()


## 주인의 살아 있는 monster_id 소환수 (먼저 부른 순서)
static func alive_of(owner, id: String) -> Array:
	var out: Array = []
	if owner == null or not is_instance_valid(owner) or not owner.is_inside_tree():
		return out
	for m in owner.get_tree().get_nodes_in_group("summons"):
		if m.owner_unit == owner and not m.is_dead and m.data != null and m.data.id == id and not m.is_queued_for_deletion():
			out.append(m)
	out.sort_custom(func(a, b): return a.summon_order < b.summon_order)
	return out


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var d := DataRegistry.monster(monster_id)
	if d == null:
		push_error("소환수 데이터가 없습니다: " + monster_id)
		return
	var c = ctx.caster
	var n: int = count[clampi(ctx.rank - 1, 0, count.size() - 1)] if not count.is_empty() else 1
	var center: Vector2 = ctx.point if at_context_point or (ctx.skill != null and ctx.skill.target_mode == Enums.TargetMode.POINT) else c.global_position + c.facing * 60.0
	if max_alive > 0:
		var alive := alive_of(c, monster_id)
		while alive.size() + n > max_alive and not alive.is_empty():
			var old: Monster = alive.pop_front()
			old.expired = true
			old.die(null)
			old.get_tree().create_timer(0.3, false).timeout.connect(old.queue_free)
	var ap: float = c.stats.get_stat("ability_power")
	var k := 1.0 + per_rank * (ctx.rank - 1)
	for i in n:
		var m: Monster = SCENE.instantiate()
		m.name = "%s_%d" % [monster_id, m.get_instance_id()]
		c.get_parent().add_child(m)
		var pos := center + Vector2.from_angle(TAU * i / maxf(1, n)) * (30.0 if n > 1 else 0.0)
		m.setup_summon(d, c, pos, SkillData.at(duration, ctx.rank))
		var ratio := SkillData.at(owner_stat_ratio, ctx.rank)
		if ratio > 0.0:
			# 주인을 닮은 분신: 주인의 지금 능력치에 비율을 곱한다. 속도·치명타는 그대로.
			var st := {}
			for key in ["max_hp", "attack", "ability_power", "armor", "magic_resist"]:
				st[key] = c.stats.get_stat(key) * ratio
			for key in ["attack_speed", "move_speed", "crit_chance", "crit_damage"]:
				st[key] = c.stats.get_stat(key)
			m.stats.setup(st)
			m.mirror_ratio = ratio
		else:
			m.stats.add_modifiers("summon", [StatModifier.make("max_hp", ap * hp_per_ap, k - 1.0), StatModifier.make("attack", ap * attack_per_ap, k - 1.0)])
		m.health.reset_full()
		if not mirror_slots.is_empty():
			m.set_mirror(mirror_slots)
		SkillFx.puff(c, pos, 50.0, "dark")
