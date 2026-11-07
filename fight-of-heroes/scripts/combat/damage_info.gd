class_name DamageInfo
extends RefCounted
## 피해 한 번의 정보. CombatManager 가 계산 결과(final_amount, is_crit 등)를 채운다.

var source = null  # Unit 또는 null
var amount: float = 0.0
var type: int = Enums.DamageType.PHYSICAL
var can_crit := false
var is_crit := false
var is_basic_attack := false
var skill = null  # SkillData 또는 null
var final_amount := 0.0
var absorbed := 0.0


func _init(src = null, amt := 0.0, damage_type := Enums.DamageType.PHYSICAL) -> void:
	source = src
	amount = amt
	type = damage_type
