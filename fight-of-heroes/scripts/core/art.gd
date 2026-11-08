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


static func set_override(kind: String, id: String, tex: Texture2D) -> void:
	if tex == null:
		_override.erase(kind + "/" + id)
	else:
		_override[kind + "/" + id] = tex


static func clear_overrides() -> void:
	_override.clear()


## 전신 그림에서 머리 쪽을 잘라 동그란 얼굴 칸 안에 그린다 (팀 현황, 영웅 선택 등).
static func draw_portrait(ci: CanvasItem, tex: Texture2D, center: Vector2, radius: float, modulate := Color.WHITE) -> void:
	var tw := float(tex.get_width())
	var th := float(tex.get_height())
	var src := Rect2(tw * 0.22, th * 0.04, tw * 0.56, tw * 0.56)
	var side := radius * 1.6
	ci.draw_texture_rect_region(tex, Rect2(center - Vector2(side, side) * 0.5, Vector2(side, side)), src, modulate)


## 아이템 아이콘: 데이터에 넣은 icon, 없으면 assets/items/<id>.png
static func item_icon(item) -> Texture2D:
	if item == null:
		return null
	if item.icon != null:
		return item.icon
	return texture("items", item.id)
