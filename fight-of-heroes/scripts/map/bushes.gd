class_name Bushes
extends RefCounted
## 풀숲. 풀숲 안의 유닛은 같은 풀숲 안에 들어와 있는 적 팀 유닛이 없으면 그 팀에게 보이지 않는다.
## 공격하거나 스킬을 쓰면 잠깐(REVEAL 초) 드러난다. 전장의 안개 판단(FogOfWar.can_see / team_can_see)에 함께 쓴다.

const REVEAL := 1.2

static var list: PackedVector3Array = PackedVector3Array()


static func setup(map: MapData) -> void:
	list = map.bushes if map != null else PackedVector3Array()


## pos 가 들어 있는 풀숲 번호 (-1 이면 풀숲 밖)
static func index_at(pos: Vector2) -> int:
	for i in list.size():
		var b: Vector3 = list[i]
		if pos.distance_to(Vector2(b.x, b.y)) <= b.z:
			return i
	return -1


## unit 이 풀숲에 숨어 있어 team 에게 보이지 않는지
static func hidden_from(unit, team: int) -> bool:
	if list.is_empty() or unit == null or not is_instance_valid(unit) or unit.team == team:
		return false
	if float(unit.get("revealed_until")) > Unit.now():
		return false
	var i := index_at(unit.global_position)
	if i < 0:
		return false
	# 같은 풀숲 안에 그 팀 유닛이 있으면 보인다.
	for u in unit.get_tree().get_nodes_in_group("units"):
		if u.team == team and not u.is_dead and index_at(u.global_position) == i:
			return false
	for w in unit.get_tree().get_nodes_in_group("wards"):
		if w.team == team and index_at(w.global_position) == i:
			return false
	return true
