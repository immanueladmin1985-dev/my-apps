class_name ReviveEffect
extends SkillEffect
## 부활: 가장 최근에 쓰러진 아군 영웅 한 명을 쓰러진 자리에서 hp_ratio 체력으로 되살린다.
## radius 가 0 보다 크면 시전자에게서 그 거리 안에 쓰러진 아군만.

@export var hp_ratio: PackedFloat32Array = PackedFloat32Array([0.4])
@export var radius: float = 0.0


static func candidate(caster, r: float):
	var best = null
	for h in caster.get_tree().get_nodes_in_group("heroes"):
		if h == caster or not h.is_dead or h.team != caster.team:
			continue
		if r > 0.0 and h.global_position.distance_to(caster.global_position) > r:
			continue
		if best == null or h.respawn_left > best.respawn_left:
			best = h
	return best


func apply(ctx: SkillContext) -> void:
	if not ctx.caster_valid():
		return
	var h = candidate(ctx.caster, radius)
	if h == null:
		return
	h.respawn_left = 0.0
	h.respawn_at(h.global_position)
	h.health.hp = h.health.max_hp() * SkillData.at(hp_ratio, ctx.rank)
	EventBus.hero_respawned.emit(h)
	SkillFx.power_up(h, "holy")
	SkillFx.burst(h, h.global_position, 120.0, "holy")
	EventBus.notice.emit("%s 이(가) %s 을(를) 되살렸습니다!" % [ctx.caster.display_name, h.display_name])
