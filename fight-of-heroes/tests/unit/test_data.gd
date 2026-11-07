extends TestCase
## 데이터 파일 검사: 모두 불러와지고, 필수 값이 맞는지.


func test_registry_has_no_errors() -> void:
	eq(DataRegistry.load_errors.size(), 0, "불러오기 오류: %s" % str(DataRegistry.load_errors))
	var errors := DataRegistry.validate()
	eq(errors.size(), 0, "데이터 검사: %s" % str(errors))


## 내보낼 때 값이 빠지지 않도록, 저장되는 Packed 배열 속성의 기본값은 Packed 생성자로 적어야 한다.
func test_packed_defaults_are_not_plain_arrays() -> void:
	for path in _scripts("res://scripts"):
		var text := FileAccess.get_file_as_string(path)
		var re := RegEx.create_from_string("@export var \\w+: Packed\\w+Array = \\[")
		check(re.search(text) == null, "%s: Packed 배열 기본값을 [] 로 적음" % path)


func _scripts(dir_path: String) -> Array:
	var out: Array = []
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return out
	for f in dir.get_files():
		if f.ends_with(".gd"):
			out.append(dir_path.path_join(f))
	for d in dir.get_directories():
		out += _scripts(dir_path.path_join(d))
	return out


func test_heroes_are_valid() -> void:
	var heroes := DataRegistry.get_all("heroes")
	check(heroes.size() >= 2, "영웅이 2명 이상이어야 합니다")
	for h: HeroData in heroes:
		check(h.display_name != "", h.id + ": 이름 없음")
		eq(h.skills.size(), 4, h.id + ": 스킬 수")
		for i in h.skills.size():
			check(h.skills[i] is SkillData, "%s: %d번 스킬이 SkillData 가 아님" % [h.id, i])
		for k in h.base_stats:
			check(StatsComponent.KEYS.has(k), "%s: 알 수 없는 능력치 %s" % [h.id, k])
		for k in h.growth_stats:
			check(StatsComponent.KEYS.has(k), "%s: 알 수 없는 성장 능력치 %s" % [h.id, k])
		check(float(h.base_stats.get("max_hp", 0)) > 0.0, h.id + ": 최대 체력")
		check(h.attack_range > 0.0, h.id + ": 사거리")


func test_skills_are_valid() -> void:
	var ids := {}
	for s: SkillData in DataRegistry.get_all("skills"):
		check(not ids.has(s.id), "스킬 id 중복 " + s.id)
		ids[s.id] = true
		check(s.display_name != "" and s.description != "", s.id + ": 이름·설명")
		check(not s.mana_cost.is_empty() and s.mana_cost.size() <= s.max_rank, s.id + ": 마나 배열 길이")
		check(not s.cooldown.is_empty() and s.cooldown.size() <= s.max_rank, s.id + ": 쿨타임 배열 길이")
		check(not s.effects.is_empty() or s.custom_script != null, s.id + ": 효과 없음")
		_check_effects(s.id, s.effects)


func _check_effects(owner: String, effects: Array) -> void:
	for e in effects:
		check(e is SkillEffect, owner + ": SkillEffect 가 아닌 효과")
		if e is ApplyStatusEffect:
			check(e.status != null, owner + ": 상태 효과 데이터 없음")
		for key in ["effects", "path_effects", "end_effects"]:
			var sub = e.get(key)
			if sub is Array:
				_check_effects(owner, sub)


func test_config_files_exist() -> void:
	check(DataRegistry.get_item("config", "combat") != null, "combat.tres")
	for d in ["easy", "normal", "hard"]:
		check(DataRegistry.get_item("ai", d) != null, "AI 난이도 " + d)
	check(DataRegistry.map_data("arena_01") != null, "맵 arena_01")
