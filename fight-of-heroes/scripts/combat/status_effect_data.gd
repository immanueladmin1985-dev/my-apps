class_name StatusEffectData
extends Resource
## 상태 효과의 종류. 지속시간과 세기(magnitude)는 스킬이 정한다.
## STUN: 이동·공격·시전 불가, SLOW: 이동 속도 magnitude 비율 감소,
## DOT: 초당 magnitude 피해, HASTE: 이동 속도 magnitude 비율 증가, STAT_BUFF: stat_modifiers 적용

@export var id: String = ""
@export var display_name: String = ""
@export var kind: Enums.StatusKind = Enums.StatusKind.STUN
@export var tick_interval: float = 0.5
@export var damage_type: Enums.DamageType = Enums.DamageType.MAGIC
@export var stat_modifiers: Array[Resource] = []
@export var color: Color = Color.WHITE
## 걸려 있는 동안 유닛 그림의 크기 배율 (변신 등). 1 이면 그대로
@export var visual_scale: float = 1.0
## 걸려 있는 동안 유닛 그림에 섞는 색 (알파 0 이면 섞지 않음)
@export var visual_tint: Color = Color(1, 1, 1, 0)
