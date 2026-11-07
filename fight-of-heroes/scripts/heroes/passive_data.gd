class_name PassiveData
extends Resource
## 영웅의 고유 패시브. 언제 발동할지(trigger)와 조건, 실행할 효과를 적는다.
## 효과의 단계별 수치는 영웅 레벨에 따라 1~4 단계(1·5·9·13레벨)를 쓴다.

@export var id: String = ""
@export var display_name: String = ""
@export_multiline var description: String = ""
## attack_hit: 기본 공격이 맞을 때, skill_cast: 스킬을 쓸 때, periodic: interval 초마다,
## kill: 적을 처치했을 때, always: 능력치가 늘 붙어 있음
@export_enum("attack_hit", "skill_cast", "periodic", "kill", "always") var trigger: String = "attack_hit"
## attack_hit: n 번째 공격마다
@export var every: int = 1
@export var interval: float = 5.0
@export var cooldown: float = 0.0
## 대상 체력 비율이 이 값보다 낮을 때만 (0 이면 조건 없음)
@export var target_below_hp: float = 0.0
## 자신의 체력 비율이 이 값보다 낮을 때만 (0 이면 조건 없음)
@export var self_below_hp: float = 0.0
## 효과는 attack_hit 이면 맞은 대상, 그 밖에는 자신을 대상으로 실행한다.
@export var effects: Array[Resource] = []
@export var stat_modifiers: Array[Resource] = []
