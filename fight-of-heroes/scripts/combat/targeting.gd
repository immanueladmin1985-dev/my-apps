class_name Targeting
## 유닛 찾기 도우미. 유닛은 모두 "units" 그룹에 들어 있다.


static func is_valid(u, team: int, affects: int) -> bool:
	if u == null or not is_instance_valid(u) or u.is_dead or not u.targetable:
		return false
	match affects:
		Enums.TargetTeam.ENEMY:
			return Enums.is_enemy(team, u.team)
		Enums.TargetTeam.ALLY:
			return u.team == team
	return true


static func units(tree: SceneTree) -> Array:
	return tree.get_nodes_in_group("units")


static func in_radius(tree: SceneTree, center: Vector2, radius: float, team: int, affects: int) -> Array:
	var out: Array = []
	for u in units(tree):
		if is_valid(u, team, affects) and u.global_position.distance_to(center) <= radius + u.radius:
			out.append(u)
	return out


static func on_segment(tree: SceneTree, a: Vector2, b: Vector2, width: float, team: int, affects: int) -> Array:
	var out: Array = []
	for u in units(tree):
		if not is_valid(u, team, affects):
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
