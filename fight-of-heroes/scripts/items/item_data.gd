class_name ItemData
extends Resource
## 아이템 하나의 데이터. 가격(cost)은 재료를 포함한 전체 가격이고,
## 재료를 가지고 있으면 cost − 재료 가격 합 만큼만 더 내고 조합한다.

@export var id: String = ""
@export var display_name: String = ""
## weapon(무기), armor(방어구), boots(신발), ring(반지), necklace(목걸이), potion(물약), special(특수)
@export_enum("weapon", "armor", "boots", "ring", "necklace", "potion", "special") var category: String = "weapon"
## 1 = 기본 재료, 2 = 중간 단계, 3 = 완성품
@export_range(1, 3) var tier: int = 1
@export var glyph: String = ""
@export var color: Color = Color(0.6, 0.6, 0.6)
@export var icon: Texture2D
@export_multiline var description: String = ""
@export var cost: int = 300
@export var components: PackedStringArray = PackedStringArray()
@export var modifiers: Array[Resource] = []
## 한 영웅이 가질 수 있는 최대 개수 (0 = 제한 없음). 신발은 1.
@export var max_owned: int = 0
@export_group("사용 아이템")
@export var consumable: bool = false
@export var max_stack: int = 1
## status: use_status 를 use_duration 동안 use_magnitude 세기로 건다. recall: 기지로 귀환
@export_enum("none", "status", "recall") var use_kind: String = "none"
@export var use_status: StatusEffectData
@export var use_duration: float = 0.0
@export var use_magnitude: float = 0.0


const CATEGORY_NAMES := {
	"weapon": "무기", "armor": "방어구", "boots": "신발", "ring": "반지",
	"necklace": "목걸이", "potion": "물약", "special": "특수",
}


func stat_lines() -> PackedStringArray:
	var out := PackedStringArray()
	for m in modifiers:
		if m is StatModifier:
			out.append(StatsComponent.modifier_text(m))
	return out


func category_name() -> String:
	return CATEGORY_NAMES.get(category, category)
