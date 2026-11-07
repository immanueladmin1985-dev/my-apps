class_name FloatingTextLayer
extends Node2D
## 피해·회복 숫자. 노드를 만들지 않고 목록으로 한꺼번에 그린다.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const LIFE := 0.9
const MAX_ITEMS := 80

var items: Array = []
var player_team := Enums.Team.BLUE
var show_numbers := true


func _ready() -> void:
	show_numbers = bool(SaveManager.get_setting("damage_numbers", true))
	EventBus.unit_damaged.connect(_on_damaged)
	EventBus.unit_healed.connect(_on_healed)
	EventBus.reward.connect(_on_reward)
	EventBus.hero_level_up.connect(_on_level_up)
	EventBus.unit_died.connect(_on_died)


func _on_level_up(hero, _level: int) -> void:
	if is_instance_valid(hero):
		Vfx.ring(self, hero.global_position, 70.0, Color(1, 0.85, 0.3), 0.7)
		_add(hero.global_position + Vector2(0, -70), "레벨 업!", Color(1, 0.9, 0.4), 20)


func _on_died(victim, _killer) -> void:
	if is_instance_valid(victim):
		Vfx.ring(self, victim.global_position, victim.radius * 3.0, Color(1, 1, 1, 0.8) if victim is Hero else Color(0.9, 0.8, 0.6, 0.5), 0.45)


func _exit_tree() -> void:
	EventBus.hero_level_up.disconnect(_on_level_up)
	EventBus.unit_died.disconnect(_on_died)
	EventBus.unit_damaged.disconnect(_on_damaged)
	EventBus.unit_healed.disconnect(_on_healed)
	EventBus.reward.disconnect(_on_reward)


func _on_reward(hero, _xp: float, gold: int) -> void:
	if gold > 0 and is_instance_valid(hero) and hero.get_node("Visual").is_player:
		_add(hero.global_position + Vector2(0, -60), "+%d G" % gold, Color(1, 0.85, 0.3), 18)


func _on_damaged(target, info: DamageInfo, amount: float) -> void:
	if amount < 0.5 or not is_instance_valid(target):
		return
	if info.is_basic_attack or info.is_crit:
		Vfx.spark(self, target.global_position + Vector2(randf_range(-6, 6), randf_range(-12, 0)), Color(1, 0.9, 0.5) if info.is_crit else Color(1, 1, 1, 0.8), 20.0 if info.is_crit else 13.0)
	if not show_numbers:
		return
	var c := Color(1, 1, 1)
	match info.type:
		Enums.DamageType.PHYSICAL:
			c = Color(1.0, 0.85, 0.55)
		Enums.DamageType.MAGIC:
			c = Color(0.75, 0.6, 1.0)
	if target.team == player_team:
		c = Color(1.0, 0.4, 0.35)
	var size := 18
	var text := str(roundi(amount))
	if info.is_crit:
		size = 26
		text += "!"
		c = Color(1.0, 0.9, 0.2)
	_add(target.global_position + Vector2(randf_range(-14, 14), -40), text, c, size)


func _on_healed(target, amount: float, _source) -> void:
	if amount >= 5.0 and is_instance_valid(target):
		_add(target.global_position + Vector2(0, -40), "+" + str(roundi(amount)), Color(0.4, 1.0, 0.5), 16)


func _add(pos: Vector2, text: String, c: Color, size: int) -> void:
	if items.size() >= MAX_ITEMS:
		items.pop_front()
	items.append({"pos": pos, "text": text, "color": c, "size": size, "age": 0.0})


func _process(delta: float) -> void:
	if items.is_empty():
		return
	for it in items:
		it.age += delta
		it.pos.y -= 40.0 * delta
	items = items.filter(func(it): return it.age < LIFE)
	queue_redraw()


func _draw() -> void:
	for it in items:
		var a := 1.0 - clampf((it.age - LIFE * 0.5) / (LIFE * 0.5), 0.0, 1.0)
		var w := FONT.get_string_size(it.text, HORIZONTAL_ALIGNMENT_LEFT, -1, it.size).x
		var p: Vector2 = it.pos - Vector2(w * 0.5, 0)
		draw_string_outline(FONT, p, it.text, HORIZONTAL_ALIGNMENT_LEFT, -1, it.size, 4, Color(0, 0, 0, 0.7 * a))
		draw_string(FONT, p, it.text, HORIZONTAL_ALIGNMENT_LEFT, -1, it.size, Color(it.color, a))
