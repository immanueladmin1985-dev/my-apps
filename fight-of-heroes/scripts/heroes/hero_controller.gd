class_name HeroController
extends Node
## 영웅을 조작하는 쪽의 기반. 영웅에게는 명령(move_input, attack_order, nav_goal, 스킬 시전)만 내린다.

var hero = null


func _enter_tree() -> void:
	hero = get_parent()
