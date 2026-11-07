class_name AIProfile
extends Resource
## AI 난이도. 능력치를 올리지 않고 판단 속도와 판단 항목만 바꾼다.

@export var id: String = "normal"
@export var display_name: String = "보통"
## 상황을 다시 판단하는 간격(초)
@export var reaction_time: float = 0.3
## 쓸 수 있는 스킬을 실제로 쓸 확률
@export var skill_use_chance: float = 0.7
## 조준 오차(도)
@export var aim_error_deg: float = 8.0
## 체력 비율이 이 값보다 낮으면 후퇴, 회복 비율에 이르면 복귀
@export var retreat_hp: float = 0.3
@export var retreat_recover: float = 0.75
@export var can_retreat: bool = true
## 궁극기를 적 체력이 충분히 낮을 때 아껴 쓰는지
@export var smart_ultimate: bool = true
## 팀이 같은 대상을 함께 공격하는지 (PHASE 2)
@export var focus_fire: bool = false
## 적을 찾는 거리
@export var sight_range: float = 900.0
