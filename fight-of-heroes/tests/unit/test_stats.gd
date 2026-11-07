extends TestCase
## 능력치 계산: 레벨 성장, 고정·비율 보너스, 출처 단위 제거.


func _stats() -> StatsComponent:
	var s := StatsComponent.new()
	world.add_child(s)
	return s


func test_level_growth() -> void:
	var s := _stats()
	s.setup({"max_hp": 600.0}, {"max_hp": 100.0})
	near(s.get_stat("max_hp"), 600.0)
	s.set_level(3)
	near(s.get_stat("max_hp"), 800.0)


func test_modifiers_add_and_remove() -> void:
	var s := _stats()
	s.setup({"max_hp": 600.0, "attack": 50.0})
	s.add_modifiers("item:sword", [StatModifier.make("attack", 20.0)])
	s.add_modifiers("buff", [StatModifier.make("max_hp", 50.0, 0.1), StatModifier.make("attack", 0.0, 0.5)])
	near(s.get_stat("max_hp"), 715.0, 0.01, "(600+50)×1.1")
	near(s.get_stat("attack"), 105.0, 0.01, "(50+20)×1.5")
	s.remove_modifiers("buff")
	near(s.get_stat("max_hp"), 600.0, 0.01, "버프 제거 후")
	near(s.get_stat("attack"), 70.0, 0.01, "버프 제거 후")
	s.remove_modifiers("item:sword")
	near(s.get_stat("attack"), 50.0, 0.01, "아이템 제거 후 원래 값")


func test_defaults_and_clamps() -> void:
	var s := _stats()
	s.setup({"crit_chance": 0.8})
	s.add_modifiers("x", [StatModifier.make("crit_chance", 0.5)])
	near(s.get_stat("crit_chance"), 1.0, 0.001, "치명타 확률 최대 100%")
	near(s.get_stat("attack_speed"), 1.0, 0.001, "기본 공격 속도")
	near(s.get_stat("crit_damage"), 1.75, 0.001, "기본 치명타 배율")
