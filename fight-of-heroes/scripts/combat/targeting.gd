class_name Targeting
## 유닛 찾기 도우미. 유닛은 모두 "units" 그룹에 들어 있다.


## include_hidden 가 false 면 은신한 적은 고를 수 없다 (범위 공격처럼 맞히는 쪽은 true 로 부른다).
static func is_valid(u, team: int, affects: int, include_hidden := false) -> bool:
	if u == null or not is_instance_valid(u) or u.is_dead or not u.targetable:
		return false
	if not include_hidden and affects == Enums.TargetTeam.ENEMY and Enums.is_enemy(team, u.team) and u.status.is_stealthed():
		return false
	match affects:
		Enums.TargetTeam.ENEMY:
			return Enums.is_enemy(team, u.team)
		Enums.TargetTeam.ALLY:
			return u.team == team
	return true


static func units(tree: SceneTree) -> Array:
	return tree.get_nodes_in_group("units")


static func in_radius(tree: SceneTree, center: Vector2, radius: float, team: int, affects: int, include_hidden := false) -> Array:
	var out: Array = []
	for u in units(tree):
		if is_valid(u, team, affects, include_hidden) and u.global_position.distance_to(center) <= radius + u.radius:
			out.append(u)
	return out


static func on_segment(tree: SceneTree, a: Vector2, b: Vector2, width: float, team: int, affects: int, include_hidden := true) -> Array:
	var out: Array = []
	for u in units(tree):
		if not is_valid(u, team, affects, include_hidden):
			continue
		var p: Vector2 = Geometry2D.get_closest_point_to_segment(u.global_position, a, b)
		if p.distance_to(u.global_position) <= width * 0.5 + u.radius:
			out.append(u)
	return out


static func nearest(tree: SceneTree, pos: Vector2, max_dist: float, team: int, affects: int, exclude = null):
	var best = null
	var best_d := max_dist
	for u in units(tree):
		if u == exclude or not is_valid(u, team, affects):
			continue
		var d: float = u.global_position.distance_to(pos) - u.radius
		if d <= best_d:
			best_d = d
			best = u
	return best


## 투사체·장판 같은 효과 노드를 넣을 부모. 전투 화면의 "effects_layer" 그룹 노드를 쓴다.
static func effects_parent(node: Node) -> Node:
	var layer := node.get_tree().get_first_node_in_group("effects_layer")
	return layer if layer != null else node.get_parent()


## a 와 b 사이에 벽(충돌 레이어 1)이 없는지.
static func has_line_of_sight(node: Node2D, a: Vector2, b: Vector2) -> bool:
	var space := node.get_world_2d().direct_space_state
	if space == null:
		return true
	var q := PhysicsRayQueryParameters2D.create(a, b, 1)
	return space.intersect_ray(q).is_empty()


## 처치·도움을 인정받을 영웅: 영웅이면 그대로, 소환수면 주인 영웅
static func hero_of(u):
	if u == null or not is_instance_valid(u):
		return null
	if u is Hero:
		return u
	if u.get("owner_unit") != null and is_instance_valid(u.owner_unit) and u.owner_unit is Hero:
		return u.owner_unit
	return null
