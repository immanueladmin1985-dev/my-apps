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
@export var mana_cost: PackedFloat32Array = []
@export var cooldown: PackedFloat32Array = []
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
## 빠르게 눌러 쓸 때 가장 가까운 적의 반대쪽으로 조준한다 (후퇴 스킬)
@export var auto_aim_away: bool = false
@export var ai_use: Enums.AIUse = Enums.AIUse.OFFENSE
## AI 가 사용을 판단하는 거리. 0 이면 사거리 + 범위
@export var ai_range: float = 0.0
@export var color: Color = Color(1, 1, 1)


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
