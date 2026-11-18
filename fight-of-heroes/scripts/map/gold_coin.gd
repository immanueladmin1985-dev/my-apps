class_name GoldCoin
extends Node2D
## 떨어진 금화. 아무 영웅이나 밟으면 그 영웅이 골드를 얻는다. 시간이 지나면 사라진다.

const PICK := 50.0
var value := 25
var life := 20.0
var _age := 0.0
var _vel := Vector2.ZERO


static func drop(parent_of: Node, pos: Vector2, gold: int) -> GoldCoin:
	var c := GoldCoin.new()
	c.value = gold
	c.add_to_group("coins")
	Targeting.effects_parent(parent_of).add_child(c)
	c.global_position = pos
	c._vel = Vector2.from_angle(randf() * TAU) * randf_range(120.0, 260.0)
	return c


func _physics_process(delta: float) -> void:
	_age += delta
	if _age >= life:
		queue_free()
		return
	global_position += _vel * delta
	_vel = _vel.move_toward(Vector2.ZERO, 600.0 * delta)
	if _age < 0.3:
		return
	for h in get_tree().get_nodes_in_group("heroes"):
		if not h.is_dead and h.global_position.distance_to(global_position) <= PICK + h.radius:
			h.add_gold(value)
			if h.controller is PlayerController:
				EventBus.notice.emit("+%d 골드" % value)
			queue_free()
			return


func _process(_d: float) -> void:
	queue_redraw()


func _draw() -> void:
	var blink := 1.0 if _age < life - 4.0 else (0.4 + 0.6 * absf(sin(_age * 8.0)))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, View.upright()))
	var bob := sin(_age * 6.0) * 3.0
	draw_circle(Vector2(0, -12 + bob), 11.0, Color(0.35, 0.25, 0.05, blink))
	draw_circle(Vector2(0, -12 + bob), 9.0, Color(1, 0.82, 0.25, blink))
	draw_circle(Vector2(-3, -15 + bob), 3.0, Color(1, 1, 0.8, 0.8 * blink))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
