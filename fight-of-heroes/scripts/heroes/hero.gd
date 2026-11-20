class_name Hero
extends Unit
## 영웅. 모든 영웅이 이 스크립트와 hero.tscn 하나를 함께 쓰고, 차이는 HeroData 로만 만든다.

var data: HeroData
var level: int = 1
var controller: Node = null
var spawn_point := Vector2.ZERO
var respawn_left := 0.0
var kills := 0
var deaths := 0
var assists := 0
var xp := 0.0
var gold := 0
var skill_points := 0

signal leveled_up(level: int)
signal gold_changed(gold: int)
signal skill_points_changed(points: int)

@onready var skill_caster: SkillCaster = $SkillCaster
@onready var inventory: InventoryComponent = $Inventory

## 귀환 중 남은 시간 (0 이면 귀환 중이 아님)
var recall_left := 0.0
var recall_total := 0.0
signal recall_finished


func setup(hero_data: HeroData, hero_team: int) -> void:
	data = hero_data
	team = hero_team
	add_to_group("heroes")
	display_name = hero_data.display_name
	stats.setup(hero_data.base_stats, hero_data.growth_stats)
	stats.set_level(level)
	attack.attack_range = hero_data.attack_range
	attack.is_ranged = hero_data.is_ranged
	attack.projectile_speed = hero_data.projectile_speed
	attack.projectile_color = hero_data.color.lightened(0.4)
	attack.projectile_style = hero_data.attack_vfx
	skill_caster.setup(hero_data.skills, 0)
	skill_points = 1
	gold = DataRegistry.progression().start_gold
	health.reset_full()
	mana.reset_full()
	$Passive.setup(hero_data.passive as PassiveData)
	$Visual.setup(self)
	attack.setup_hero(hero_data)
	skill_caster.setup_forms(hero_data.alt_status, hero_data.alt_skills)
	if has_gauge():
		attack.attack_landed.connect(func(_t): add_gauge(data.gauge_on_hit))
		skill_caster.cast_done.connect(func(_s, _k): add_gauge(data.gauge_on_cast))
		if not EventBus.hero_killed.is_connected(_on_hero_killed_gauge):
			EventBus.hero_killed.connect(_on_hero_killed_gauge)
			EventBus.unit_died.connect(_on_unit_died_gauge)


# ---- 영구 비약 ----

## 마신 비약: id -> 횟수
var elixirs: Dictionary = {}


func drink_elixir(item: ItemData, times := 1) -> void:
	var n: int = int(elixirs.get(item.id, 0)) + times
	elixirs[item.id] = n
	var mods: Array = []
	for m in item.modifiers:
		if m is StatModifier:
			mods.append(StatModifier.make(m.stat, m.flat * n, m.percent * n))
	stats.add_modifiers("elixir:" + item.id, mods)
	if is_inside_tree():
		SkillFx.power_up(self, "holy")


# ---- 고유 게이지 (검기·기·분노·영혼) ----

var gauge := 0.0
var _gauge_idle := 0.0


func has_gauge() -> bool:
	return data != null and data.gauge_name != ""


func add_gauge(amount: float) -> void:
	if Net.is_client():
		return
	if not has_gauge() or amount == 0.0 or is_dead:
		return
	set_gauge(gauge + amount)
	if amount > 0.0:
		_gauge_idle = 0.0


func set_gauge(v: float) -> void:
	if not has_gauge():
		return
	var old := gauge
	gauge = clampf(v, 0.0, data.gauge_max)
	if data.gauge_stat != "" and int(old) != int(gauge):
		stats.add_modifiers("gauge", [StatModifier.make(data.gauge_stat, floorf(gauge) * data.gauge_stat_per, 0.0)])


func gauge_ratio() -> float:
	return gauge / maxf(1.0, data.gauge_max) if has_gauge() else 0.0


func _on_hero_killed_gauge(victim, killer, helpers: Array) -> void:
	if victim == self or not is_instance_valid(victim) or victim.team == team:
		return
	if Targeting.hero_of(killer) == self:
		add_gauge(data.gauge_on_kill)
	elif helpers.has(self):
		add_gauge(data.gauge_on_assist)


func _on_unit_died_gauge(victim, killer) -> void:
	if victim is Monster and not victim.is_summon() and Targeting.hero_of(killer) == self:
		add_gauge(data.gauge_on_monster_kill)


func _exit_tree() -> void:
	if EventBus.hero_killed.is_connected(_on_hero_killed_gauge):
		EventBus.hero_killed.disconnect(_on_hero_killed_gauge)
		EventBus.unit_died.disconnect(_on_unit_died_gauge)


func die(killer = null) -> void:
	if not is_dead and has_gauge():
		set_gauge(floorf(gauge * data.gauge_keep_on_death))
	super.die(killer)


func set_controller(c: Node) -> void:
	if controller != null:
		controller.queue_free()
	controller = c
	add_child(c)


## 다음 레벨까지 필요한 경험치에 대한 현재 비율 (최대 레벨이면 1)
func xp_ratio() -> float:
	var cfg := DataRegistry.progression()
	if level >= cfg.max_level:
		return 1.0
	return clampf(xp / cfg.xp_to_next(level), 0.0, 1.0)


func add_xp(amount: float) -> void:
	var cfg := DataRegistry.progression()
	if level >= cfg.max_level or amount <= 0.0:
		return
	xp += amount
	while level < cfg.max_level and xp >= cfg.xp_to_next(level):
		xp -= cfg.xp_to_next(level)
		_level_up()
	if level >= cfg.max_level:
		xp = 0.0


func _level_up() -> void:
	var old_max := health.max_hp()
	var old_mp := mana.max_mp()
	level += 1
	stats.set_level(level)
	if not is_dead:
		health.heal(health.max_hp() - old_max)
		mana.restore(mana.max_mp() - old_mp)
	skill_points += 1
	skill_points_changed.emit(skill_points)
	leveled_up.emit(level)
	EventBus.hero_level_up.emit(self, level)


func can_learn(slot: int) -> bool:
	return skill_points > 0 and skill_caster.can_level(slot, level)


func learn(slot: int) -> bool:
	if not can_learn(slot):
		return false
	if NetSync.client_request("learn", [slot]):
		return true
	skill_points -= 1
	skill_caster.level_up(slot)
	skill_points_changed.emit(skill_points)
	return true


func add_gold(amount: int) -> void:
	if amount == 0:
		return
	gold = maxi(0, gold + amount)
	gold_changed.emit(gold)


## 귀환: seconds 뒤 기지로 이동한다. 움직이거나, 공격하거나, 피해를 받으면 취소된다.
func start_recall(seconds: float) -> void:
	clear_orders()
	attack.cancel_windup()
	recall_left = maxf(0.1, seconds)
	recall_total = recall_left


func cancel_recall() -> void:
	recall_left = 0.0


func is_recalling() -> bool:
	return recall_left > 0.0


func on_damaged(src, amount: float) -> void:
	if has_gauge() and amount > 0.0 and data.gauge_on_damaged > 0.0:
		add_gauge(data.gauge_on_damaged)
	if recall_left > 0.0 and amount > 0.0:
		cancel_recall()
		if controller is PlayerController:
			EventBus.notice.emit("피해를 받아 귀환이 취소되었습니다")


func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	if Net.is_client():
		return
	if has_gauge() and data.gauge_decay > 0.0 and gauge > 0.0:
		_gauge_idle += delta
		if _gauge_idle >= data.gauge_decay_delay:
			set_gauge(gauge - data.gauge_decay * delta)
	if recall_left > 0.0:
		if is_dead or move_input.length() > 0.05 or attack_order != null or nav_goal != null or attack.is_winding_up():
			cancel_recall()
			return
		recall_left -= delta
		if recall_left <= 0.0:
			recall_left = 0.0
			global_position = spawn_point
			nav_goal = null
			recall_finished.emit()
