class_name MonsterData
extends Resource
## 몬스터(일반·정예·보스) 데이터.

@export var id: String = ""
@export var display_name: String = ""
@export_enum("normal", "elite", "boss", "final_boss") var tier: String = "normal"
@export_group("외형")
@export var color: Color = Color(0.7, 0.6, 0.5)
@export var glyph: String = "?"
@export var weapon: String = "claw"
@export var radius: float = 18.0
@export var sprite_frames: SpriteFrames
@export_group("능력치")
@export var base_stats: Dictionary = {}
@export var attack_range: float = 50.0
@export var is_ranged: bool = false
@export var projectile_speed: float = 800.0
@export_group("행동")
## 캠프에서 이 거리보다 멀어지면 돌아가 체력을 회복한다.
@export var leash_radius: float = 380.0
## 특수 공격(정예) 또는 보스 패턴. Q, W, E, R 칸에 들어간다.
@export var skills: Array[Resource] = []
## 보스: 각 스킬을 쓸 수 있는 최소 단계(0 = 처음부터, 1 = 분노 후)
@export var skill_min_phase: PackedInt32Array = PackedInt32Array()
## 보스: 체력이 이 비율 아래로 내려가면 분노(2단계)한다. 0 이면 없음.
@export var enrage_hp_ratio: float = 0.0
@export var enrage_modifiers: Array[Resource] = []
## 패턴 사이 최소 간격(초)
@export var skill_interval: float = 3.0
@export_group("보상")
@export var xp: float = 40.0
@export var gold: int = 30
## 처치한 팀 전원에게 거는 버프
@export var team_buff: StatusEffectData
@export var team_buff_duration: float = 90.0
