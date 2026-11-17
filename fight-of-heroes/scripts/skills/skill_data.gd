class_name SkillData
extends Resource
## 스킬 하나의 데이터. 실제 동작은 effects(효과 목록)의 조합으로 정한다.
## 단계별 수치는 배열로 적고, 배열보다 높은 단계는 마지막 값을 쓴다.

@export var id: String = ""
@export var display_name: String = ""
@export_multiline var description: String = ""
@export var icon: Texture2D
## 아이콘이 없을 때 버튼에 쓰는 글자
@export var glyph: String = ""
@export var max_rank: int = 4
@export var mana_cost: PackedFloat32Array = PackedFloat32Array()
@export var cooldown: PackedFloat32Array = PackedFloat32Array()
@export var target_mode: Enums.TargetMode = Enums.TargetMode.SELF
@export var target_team: Enums.TargetTeam = Enums.TargetTeam.ENEMY
## 시전 사거리 (방향형은 날아가는 거리, 지점형은 지점까지 최대 거리)
@export var cast_range: float = 0.0
## 범위 표시용 반지름과 폭
@export var radius: float = 0.0
@export var width: float = 0.0
@export var effects: Array[Resource] = []
## 효과 조합으로 만들 수 없는 스킬은 execute(ctx) 를 가진 스크립트를 연결한다.
@export var custom_script: Script
## 시전 뒤 이 시간(초) 동안 시전자가 움직이거나 공격하지 못한다 (보스 패턴 준비 동작).
@export var cast_lock: float = 0.0
## 빠르게 눌러 쓸 때 가장 가까운 적의 반대쪽으로 조준한다 (후퇴 스킬)
@export var auto_aim_away: bool = false
@export var ai_use: Enums.AIUse = Enums.AIUse.OFFENSE
## AI 가 사용을 판단하는 거리. 0 이면 사거리 + 범위
@export var ai_range: float = 0.0
@export var color: Color = Color(1, 1, 1)
## 쓸 때 나는 소리 (assets/sounds/sfx/<sound>.wav, 비우면 기본 스킬 소리)
@export var sound: String = ""
## 효과 그림 종류 (SkillFx.STYLES: fire ice holy heal poison dark nature steel impact arcane)
@export var vfx: String = ""

@export_group("특수 규칙")
## 재사용: 쓰고 나서 recast_window 초 안에 다시 누르면 recast_effects 를 실행한다 (마나 없음).
## 재사용하거나 시간이 지나면 그때부터 재사용 대기시간이 돈다.
@export var recast_effects: Array[Resource] = []
@export var recast_window: float = 0.0
## 재사용 조건: "mark:<상태 id>" (내가 건 그 상태의 적이 있어야 함), "summon:<몬스터 id>" (내 그 소환수가 있어야 함),
## "link:<상태 id>" (내가 건 그 상태의 아군이 있어야 함)
@export var recast_requires: String = ""
## 게이지가 이만큼 있어야 쓸 수 있고, 쓰면 그만큼 줄어든다 (0 이면 조건 없음)
@export var requires_gauge: float = 0.0
## 이 스킬의 피해로 적을 처치하면 재사용 대기시간이 바로 끝난다
@export var reset_on_kill: bool = false


static func at(values: PackedFloat32Array, rank: int) -> float:
	if values.is_empty():
		return 0.0
	return values[clampi(rank - 1, 0, values.size() - 1)]


func get_mana(rank: int) -> float:
	return at(mana_cost, rank)


func get_cooldown(rank: int) -> float:
	return at(cooldown, rank)


func reach() -> float:
	return ai_range if ai_range > 0.0 else cast_range + radius
