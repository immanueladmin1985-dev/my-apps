class_name GoblinEvent
extends Node
## 황금 고블린: FIRST 초에 처음, 사라지거나 잡히면 INTERVAL 초 뒤 다시 맵 어딘가에 나타난다.
## 도망만 다니고 맞으면 체력이 줄 때마다 금화를 떨어뜨린다. 잡으면 큰 골드, LIFE 초가 지나면 도망쳐 사라진다.

const FIRST := 240.0
const INTERVAL := 240.0
const LIFE := 45.0

## 도망칠 때 맵 밖으로 나가지 않게 (맵 크기)
static var map_size := Vector2(5600, 3400)

var world: Node2D
var map: MapData
var left := FIRST
var goblin: Monster = null
var _life_left := 0.0
var _rng := RandomNumberGenerator.new()


func setup(w: Node2D, m: MapData, seed_value := 0) -> void:
	world = w
	map = m
	map_size = m.size
	_rng.seed = seed_value if seed_value != 0 else hash(m.id) + 77


func _physics_process(delta: float) -> void:
	if goblin != null and (not is_instance_valid(goblin) or goblin.is_dead):
		goblin = null
		left = INTERVAL
	if goblin != null:
		_life_left -= delta
		if _life_left <= 0.0:
			SkillFx.puff(goblin, goblin.global_position, 60.0, "holy")
			goblin.expired = true
			goblin.die(null)
			goblin.queue_free()
			goblin = null
			left = INTERVAL
			EventBus.notice.emit("황금 고블린이 도망쳤습니다")
		return
	left -= delta
	if left <= 0.0:
		spawn()


func spawn() -> Monster:
	var d := DataRegistry.monster("golden_goblin")
	if d == null or world == null:
		return null
	goblin = load("res://scenes/monsters/monster.tscn").instantiate()
	goblin.name = "GoldenGoblin"
	world.add_child(goblin)
	var c := map.size * 0.5
	var pos := c + Vector2(_rng.randf_range(-900, 900), _rng.randf_range(-500, 300))
	goblin.setup(d, pos)
	goblin.flee = true
	goblin.add_to_group("goblins")
	_life_left = LIFE
	EventBus.notice.emit("황금 고블린이 나타났습니다! 때리면 금화를 떨어뜨립니다")
	return goblin
