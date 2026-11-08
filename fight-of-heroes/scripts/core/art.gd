class_name Art
extends RefCounted
## 그림 파일 찾기. assets/<종류>/<id>.png 가 있으면 그 그림을 쓰고, 없으면 null (호출한 쪽이 도형으로 그린다).
## 종류: heroes, monsters, items, map (map 은 assets/backgrounds 폴더).
## 그림을 넣는 방법은 tools/import_art.py 와 docs/ART_PROMPTS.md 를 본다.

const DIRS := {
	"heroes": "res://assets/heroes",
	"monsters": "res://assets/monsters",
	"items": "res://assets/items",
	"map": "res://assets/backgrounds",
}

static var _cache: Dictionary = {}
## 시험용: 파일 없이 그림을 끼워 넣는다 (kind/id -> Texture2D)
static var _override: Dictionary = {}


static func texture(kind: String, id: String) -> Texture2D:
	var key := kind + "/" + id
	if _override.has(key):
		return _override[key]
	if _cache.has(key):
		return _cache[key]
	var tex: Texture2D = null
	var path: String = DIRS.get(kind, "res://assets/" + kind) + "/" + id + ".png"
	if ResourceLoader.exists(path):
		tex = load(path) as Texture2D
	_cache[key] = tex
	return tex


static func has(kind: String, id: String) -> bool:
	return texture(kind, id) != null


## 시험용: tex 가 null 이면 "그림 없음"으로 정한다. clear_overrides() 로 되돌린다.
static func set_override(kind: String, id: String, tex: Texture2D) -> void:
	_override[kind + "/" + id] = tex


static func clear_overrides() -> void:
	_override.clear()


## 영웅 얼굴을 동그란 칸 안에 그린다 (팀 현황, 영웅 선택 등).
## 얼굴 그림(<id>_face.png, 정리 도구가 만든다)이 있으면 그것을, 없으면 전신 그림의 위쪽 가운데를 잘라 쓴다.
static func draw_portrait(ci: CanvasItem, tex: Texture2D, center: Vector2, radius: float, modulate := Color.WHITE, face: Texture2D = null) -> void:
	var side := radius * 1.7
	var dst := Rect2(center - Vector2(side, side) * 0.5, Vector2(side, side))
	if face != null:
		ci.draw_texture_rect(face, dst, false, modulate)
		return
	var tw := float(tex.get_width())
	var th := float(tex.get_height())
	ci.draw_texture_rect_region(tex, dst, Rect2(tw * 0.22, th * 0.04, tw * 0.56, tw * 0.56), modulate)


## 영웅 얼굴 칸 그리기: 그림이 없으면 false
static func draw_hero_face(ci: CanvasItem, hero_id: String, center: Vector2, radius: float, modulate := Color.WHITE) -> bool:
	var tex := texture("heroes", hero_id)
	if tex == null:
		return false
	draw_portrait(ci, tex, center, radius, modulate, texture("heroes", hero_id + "_face"))
	return true


## 아이템 아이콘: 데이터에 넣은 icon, 없으면 assets/items/<id>.png
static func item_icon(item) -> Texture2D:
	if item == null:
		return null
	if item.icon != null:
		return item.icon
	return texture("items", item.id)
