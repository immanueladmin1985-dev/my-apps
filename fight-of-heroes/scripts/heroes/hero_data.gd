class_name HeroData
extends Resource
## 영웅 하나의 데이터. 새 영웅은 이 Resource 파일과 스킬 파일만 추가하면 된다.

@export var id: String = ""
@export var display_name: String = ""
## 직업 (예: 근접 물리 딜러)
@export var role: String = ""
@export_range(1, 3) var difficulty: int = 1
@export_multiline var lore: String = ""

@export_group("외형")
@export var color: Color = Color.WHITE
## 임시 그림에 쓰는 글자와 무기 모양 (sword, bow, staff, fist, shield)
@export var glyph: String = "?"
@export var weapon: String = "sword"
@export var portrait: Texture2D
## 실제 스프라이트. 비어 있으면 임시 그림을 그린다. 애니메이션 이름: idle, move, attack, hit, death
@export var sprite_frames: SpriteFrames

@export_group("능력치")
## 키: max_hp, max_mp, attack, ability_power, armor, magic_resist, attack_speed, move_speed,
## crit_chance, crit_damage, hp_regen, mp_regen, armor_pen, magic_pen
@export var base_stats: Dictionary = {}
@export var growth_stats: Dictionary = {}

@export_group("기본 공격")
@export var attack_range: float = 70.0
@export var is_ranged: bool = false
@export var projectile_speed: float = 900.0

@export_group("스킬")
## PHASE 5 에서 패시브 데이터를 연결한다.
@export var passive: Resource
@export_multiline var passive_description: String = ""
## Q, W, E, R 순서
@export var skills: Array[Resource] = []

@export_group("AI 성향")
## 0~1. 높을수록 체력이 낮아도 싸운다.
@export var ai_aggression: float = 0.5
## 스킬 포인트를 올리는 순서(R 은 열리면 항상 먼저). 0=Q, 1=W, 2=E
@export var ai_skill_priority: PackedInt32Array = PackedInt32Array([0, 1, 2])


func get_skill(slot: int) -> SkillData:
	return skills[slot] as SkillData if slot < skills.size() else null
