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
## 원거리 기본 공격 투사체의 효과 종류 (SkillFx.STYLES, "" 이면 단순한 점)
@export var attack_vfx: String = ""
## 탄창: 이만큼 쏘면 reload_time 초 동안 재장전한다. 마지막 탄은 last_shot_mult 배 피해 (0 이면 탄창 없음)
@export var magazine_size: int = 0
@export var reload_time: float = 1.2
@export var last_shot_mult: float = 2.0
## 멀리서 맞힐수록 기본 공격 피해 증가 (사거리 끝에서 +far_bonus)
@export var far_bonus: float = 0.0
## 원거리 영웅이 이 거리 안의 적은 주먹으로 친다 (피해 ×close_mult, 0 이면 없음)
@export var close_melee_range: float = 0.0
@export var close_mult: float = 1.2

@export_group("게이지")
## 영웅 고유 게이지 (검기·기·분노·영혼 등). gauge_name 이 비어 있으면 없음.
@export var gauge_name: String = ""
@export var gauge_max: float = 100.0
@export var gauge_on_hit: float = 0.0
@export var gauge_on_cast: float = 0.0
@export var gauge_on_damaged: float = 0.0
## 적 영웅 처치 / 도움 / 몬스터 처치 때 오르는 양
@export var gauge_on_kill: float = 0.0
@export var gauge_on_assist: float = 0.0
@export var gauge_on_monster_kill: float = 0.0
## 마지막으로 오른 뒤 gauge_decay_delay 초가 지나면 초당 gauge_decay 만큼 줄어든다 (0 이면 줄지 않음)
@export var gauge_decay_delay: float = 4.0
@export var gauge_decay: float = 0.0
## 죽었을 때 남는 비율 (1 이면 그대로)
@export var gauge_keep_on_death: float = 0.0
## 게이지 1 당 붙는 능력치 (사신의 영혼 → 공격력)
@export var gauge_stat: String = ""
@export var gauge_stat_per: float = 0.0
## 게이지를 점으로 보여 줄지 (최대값이 작은 검기·탄창 같은 것)
@export var gauge_pips: bool = false
@export var gauge_color: Color = Color(1, 0.85, 0.3)

@export_group("형태")
## alt_status 상태(용 변신 등)일 때 Q/W/E/R 대신 쓰는 스킬 (빈 칸은 원래 스킬)
@export var alt_status: String = ""
@export var alt_skills: Array[Resource] = []

@export_group("스킬")
## PHASE 5 에서 패시브 데이터를 연결한다.
@export var passive: Resource
@export_multiline var passive_description: String = ""
## Q, W, E, R 순서
@export var skills: Array[Resource] = []

@export_group("AI 성향")
## 선호 역할: "fighter"(돌격), "hunter"(사냥꾼), "support"(지원). 경기 시작 때 팀 안에서 겹치지 않게 나눈다.
@export_enum("fighter", "hunter", "support") var preferred_role: String = "fighter"
## 0~1. 높을수록 체력이 낮아도 싸운다.
@export var ai_aggression: float = 0.5
## AI 가 사는 완성품 순서. 재료부터 차례로 산다.
@export var ai_build: PackedStringArray = PackedStringArray()
## 스킬 포인트를 올리는 순서(R 은 열리면 항상 먼저). 0=Q, 1=W, 2=E
@export var ai_skill_priority: PackedInt32Array = PackedInt32Array([0, 1, 2])


func get_skill(slot: int) -> SkillData:
	return skills[slot] as SkillData if slot < skills.size() else null
