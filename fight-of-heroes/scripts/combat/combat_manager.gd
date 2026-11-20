class_name CombatManager
## 피해 계산 파이프라인: 치명타 → 관통 → 방어 감소 → 보호막 → 체력 → 사망 판정.
## 모든 피해와 회복은 여기를 거친다. 결과는 EventBus 신호로만 알린다.

static var rng := RandomNumberGenerator.new()


## 방어력(또는 마법 저항력)에 따른 피해 배율.
static func mitigation(resist: float, k := 100.0) -> float:
	if resist >= 0.0:
		return k / (k + resist)
	return 2.0 - k / (k - resist)


static func compute(target, info: DamageInfo) -> float:
	var amt := info.amount
	var src = info.source if is_instance_valid(info.source) else null
	if info.can_crit and src != null:
		if rng.randf() < src.stats.get_stat("crit_chance"):
			info.is_crit = true
			amt *= src.stats.get_stat("crit_damage")
	# 뒤치기: 대상이 바라보는 방향의 뒤쪽에서 때리면 세진다 (암살자).
	if src != null and src != target:
		var bs: float = src.stats.get_stat("backstab")
		if bs > 0.0 and is_behind(src, target):
			amt *= 1.0 + bs
			info.is_backstab = true
	var k := DataRegistry.combat_config().armor_constant
	match info.type:
		Enums.DamageType.PHYSICAL:
			amt *= mitigation(_effective_resist(target.stats.get_stat("armor"), src, "armor_pen"), k)
		Enums.DamageType.MAGIC:
			amt *= mitigation(_effective_resist(target.stats.get_stat("magic_resist"), src, "magic_pen"), k)
	return maxf(0.0, amt)


## src 가 target 의 뒤쪽(바라보는 방향의 반대편 120도)에 있는지
static func is_behind(src, target) -> bool:
	var to_src: Vector2 = src.global_position - target.global_position
	if to_src.length() < 1.0:
		return false
	return target.facing.dot(to_src.normalized()) < -0.5


static func _effective_resist(resist: float, src, pen_key: String) -> float:
	if src == null or resist <= 0.0:
		return resist
	return maxf(0.0, resist - src.stats.get_stat(pen_key))


## 피해를 적용하고 보호막을 포함한 총 피해량을 돌려준다.
static func apply_damage(target, info: DamageInfo) -> float:
	if target == null or not is_instance_valid(target) or target.is_dead:
		return 0.0
	# 와이파이 대전 참가자: 피해 계산은 방장만 한다 (참가자는 방장이 보낸 체력을 그린다).
	if Net.is_client():
		return 0.0
	var amt := compute(target, info)
	# 수호: 이 피해의 일부를 상태를 건 아군(성기사)이 대신 받는다.
	for e in target.status.active.values():
		if e.data.redirect_ratio > 0.0 and e.source != null and is_instance_valid(e.source) and not e.source.is_dead and e.source != target:
			var part: float = amt * e.data.redirect_ratio
			amt -= part
			var g = e.source
			var left: float = g.health.absorb(part)
			g.health.take(left)
			EventBus.unit_damaged.emit(g, info, part)
			if g.health.hp <= 0.0:
				g.die(info.source if is_instance_valid(info.source) else null)
			break
	var rest: float = target.health.absorb(amt)
	info.absorbed = amt - rest
	target.health.take(rest)
	info.final_amount = amt
	target.register_attacker(info.source)
	target.on_damaged(info.source if is_instance_valid(info.source) else null, amt)
	EventBus.unit_damaged.emit(target, info, amt)
	if target.health.hp <= 0.0:
		target.die(info.source if is_instance_valid(info.source) else null)
	return amt


static func heal(target, amount: float, source = null) -> float:
	if target == null or not is_instance_valid(target) or target.is_dead or Net.is_client():
		return 0.0
	var healed: float = target.health.heal(amount)
	if healed > 0.0:
		EventBus.unit_healed.emit(target, healed, source)
	return healed
