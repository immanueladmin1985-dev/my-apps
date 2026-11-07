class_name CastAim
extends RefCounted
## 스킬을 어디에 쓸지. 대상 유닛, 지점, 방향 중 스킬 종류에 맞는 값을 쓴다.

var unit = null
var point := Vector2.ZERO
var has_point := false
var direction := Vector2.ZERO


static func at_unit(u) -> CastAim:
	var a := CastAim.new()
	a.unit = u
	return a


static func at_point(p: Vector2) -> CastAim:
	var a := CastAim.new()
	a.point = p
	a.has_point = true
	return a


static func toward(dir: Vector2) -> CastAim:
	var a := CastAim.new()
	a.direction = dir
	return a
