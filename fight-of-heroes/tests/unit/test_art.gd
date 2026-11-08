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
	for id in DataRegistry.ids("heroes"):
		check(Art.has("heroes", id), "영웅 그림: " + id)
		check(Art.has("heroes", id + "_face"), "얼굴 그림: " + id)
	for id in DataRegistry.ids("monsters"):
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
