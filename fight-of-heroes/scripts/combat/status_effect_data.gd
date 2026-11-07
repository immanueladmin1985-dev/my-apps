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
