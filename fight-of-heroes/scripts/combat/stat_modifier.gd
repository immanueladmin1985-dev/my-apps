class_name StatModifier
extends Resource
## 능력치 하나를 고정값(flat)이나 비율(percent, 0.1 = 10%)로 바꾼다.
## 아이템, 버프, 패시브가 모두 이 형식을 쓴다.

@export var stat: String = ""
@export var flat: float = 0.0
@export var percent: float = 0.0


static func make(stat_name: String, flat_value := 0.0, percent_value := 0.0) -> StatModifier:
	var m := StatModifier.new()
	m.stat = stat_name
	m.flat = flat_value
	m.percent = percent_value
	return m
