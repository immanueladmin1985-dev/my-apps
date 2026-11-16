extends TestCase
## PHASE 8: 그림 파일 연결 (그림이 있으면 그림, 없으면 도형)

const BATTLE := preload("res://scenes/battlefield/battle.tscn")


func after_each() -> void:
	Art.clear_overrides()
	Art._cache.clear()
	await super.after_each()


func _tex(w := 64, h := 128, c := Color(0.8, 0.3, 0.3)) -> Texture2D:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(c)
	return ImageTexture.create_from_image(img)


func test_no_art_uses_shapes() -> void:
	check(Art.texture("heroes", "no_such_hero") == null, "없는 그림은 null")
	Art.set_override("heroes", "blade_master", null)
	Art.set_override("items", "dagger", null)
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(300, 300))
	await frames(2)
	var v: UnitVisual = h.get_node("Visual")
	check(v.art == null, "그림이 없으면 도형으로 그림")
	check(Art.item_icon(ItemManager.get_item("dagger")) == null, "아이콘이 없으면 글자로 그림")


func test_real_art_files() -> void:
	# 저장소에 들어 있는 그림: 영웅 10명은 모두 그림과 얼굴 그림이 있어야 한다.
	# 그림이 있는 영웅은 얼굴 그림도 있어야 한다. 처음 10명과 몬스터 9종은 그림이 들어 있다.
	var with_art := 0
	for id in DataRegistry.ids("heroes"):
		if Art.has("heroes", id):
			with_art += 1
			check(Art.has("heroes", id + "_face"), "얼굴 그림: " + id)
	check(with_art >= 10, "영웅 그림 %d개" % with_art)
	for id in ["ancient_dragon", "bone_golem", "forest_guardian", "goblin", "lava_giant", "skeleton", "stone_golem", "wolf", "wolf_alpha"]:
		check(Art.has("monsters", id), "몬스터 그림: " + id)


func test_hero_and_monster_art() -> void:
	Art.set_override("heroes", "monk", _tex())
	Art.set_override("heroes", "dragon_knight", _tex())
	Art.set_override("heroes", "dragon_knight_dragon", _tex(96, 96))
	var h := spawn_hero("monk", Enums.Team.BLUE, Vector2(300, 300))
	var dk := spawn_hero("dragon_knight", Enums.Team.RED, Vector2(500, 300))
	await frames(3)
	var v: UnitVisual = h.get_node("Visual")
	check(v.art != null, "영웅 그림을 씀")
	check(v._head_y < -h.radius * 2.0, "체력 막대가 그림 위로 올라감 (%.1f)" % v._head_y)
	h.facing = Vector2.LEFT
	await frames(2)
	check(v._flip, "왼쪽을 보면 좌우를 뒤집음")
	var dv: UnitVisual = dk.get_node("Visual")
	check(dv._current_art() == dv.art, "변신 전에는 기본 그림")
	dk.status.apply(DataRegistry.get_item("status", "dragon_form"), 5.0, 0.0, null)
	check(dv._current_art() == dv.art_alt, "변신하면 변신 그림")
	CombatManager.apply_damage(h, DamageInfo.new(dk, 99999.0, Enums.DamageType.TRUE))
	await frames(2)
	check(h.is_dead, "쓰러진 영웅도 그림으로 그려짐")


func test_skill_icon() -> void:
	var s: SkillData = DataRegistry.hero("blade_master").skills[0]
	Art.set_override("skills", s.id, null)
	check(Art.skill_icon(s) == null, "아이콘이 없으면 글자로 그림")
	var tex := _tex(32, 32)
	Art.set_override("skills", s.id, tex)
	eq(Art.skill_icon(s), tex, "assets/skills/<스킬 id>.png 를 씀")
	var h := spawn_hero("blade_master", Enums.Team.BLUE, Vector2(300, 300))
	var b := SkillButton.new()
	b.configure(0, "Q", "돌", 46.0, Color.GRAY)
	b.hero = h
	add_child(b)
	await frames(2)
	b.queue_free()


func test_item_icon_and_map_art() -> void:
	Art.set_override("items", "dagger", _tex(32, 32))
	check(Art.item_icon(ItemManager.get_item("dagger")) != null, "아이템 아이콘")
	Art.set_override("map", "ground_grass", _tex(64, 64, Color(0.2, 0.5, 0.2)))
	Art.set_override("map", "wall_rock", _tex(64, 64, Color(0.4, 0.4, 0.4)))
	Art.set_override("map", "tree_1", _tex(64, 64, Color(0.1, 0.5, 0.1)))
	Art.set_override("map", "rock_1", _tex(64, 64, Color(0.5, 0.5, 0.5)))
	var cfg := MatchConfig.new()
	cfg.map_id = "valley_01"
	cfg.blue_heroes = PackedStringArray(["monk"])
	cfg.red_heroes = PackedStringArray(["saint"])
	cfg.autoplay = true
	GameManager.match_config = cfg
	var battle: Node = BATTLE.instantiate()
	add_child(battle)
	await frames(3)
	var arena: Arena = battle.arena
	var spots: Array = arena.decoration_spots()
	check(spots.size() >= 20, "장식을 흩어 놓음 (%d개)" % spots.size())
	eq(spots, arena.decoration_spots(), "같은 맵이면 같은 자리")
	var ok := true
	for d in spots:
		for r in arena.map.obstacles:
			if r.has_point(d.pos):
				ok = false
	check(ok, "장식이 벽 위에 놓이지 않음")
	battle.queue_free()


func test_skill_fx() -> void:
	for id in DataRegistry.ids("skills"):
		var s: SkillData = DataRegistry.get_item("skills", id)
		check(SkillFx.STYLES.has(s.vfx), "효과 종류: %s → %s" % [id, s.vfx])
	for name in ["dot", "flame", "shard", "streak", "star", "ring"]:
		check(SkillFx.tex(name) != null, "입자 그림: " + name)
	var fx := SkillFx.burst(world, Vector2(300, 300), 120.0, "fire")
	check(fx.get_child_count() > 0, "터짐 입자")
	var ln := SkillFx.line(world, Vector2(100, 100), Vector2(400, 100), 40.0, "ice")
	check(ln != null, "직선 효과")
	var h := spawn_hero("saint", Enums.Team.BLUE, Vector2(500, 300))
	SkillFx.sparkle(h, "heal")
	await frames(100)
	check(not is_instance_valid(fx), "터짐 효과는 잠시 뒤 사라짐")
	# 그림 파일이 있으면 그 그림을 쓴다
	Art.set_override("effects", "fire_ground", _tex(32, 32))
	check(SkillFx.art("fire", "ground") != null, "효과 그림 파일")
