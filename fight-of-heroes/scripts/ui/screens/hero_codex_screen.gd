extends Control
## 영웅 도감: 영웅별 능력치(기본·레벨당), 패시브, 스킬(마나·쿨타임·사거리), 추천 아이템, 내 기록.

const ROLE_NAMES := {"fighter": "돌격", "hunter": "사냥꾼", "support": "지원"}
const STAT_ORDER := ["max_hp", "max_mp", "attack", "ability_power", "armor", "magic_resist", "attack_speed", "move_speed", "crit_chance", "hp_regen", "mp_regen"]

var list_buttons: Array = []
var detail: VBoxContainer


func _ready() -> void:
	var box := UiKit.page(self)
	UiKit.header(box, "영웅 도감", on_back)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 14)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(body)
	var ls := UiKit.scroll(Vector2(250, 0))
	ls.size_flags_horizontal = Control.SIZE_FILL
	body.add_child(ls)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	ls.add_child(list)
	var heroes: Array = DataRegistry.get_all("heroes")
	heroes.sort_custom(func(a, b): return a.display_name < b.display_name)
	for h: HeroData in heroes:
		var b := UiKit.toggle(h.display_name, Vector2(230, 56), 19)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var badge := UiKit.hero_badge(h, 36.0)
		badge.position = Vector2(8, 10)
		b.add_child(badge)
		b.set_meta("id", h.id)
		b.pressed.connect(show_hero.bind(h.id))
		list.add_child(b)
		UiKit.indent_button(b, 54.0)
		list_buttons.append(b)
	var ds := UiKit.scroll()
	body.add_child(ds)
	detail = VBoxContainer.new()
	detail.add_theme_constant_override("separation", 8)
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ds.add_child(detail)
	show_hero(heroes[0].id)


func show_hero(id: String) -> void:
	for b in list_buttons:
		b.button_pressed = b.get_meta("id") == id
	for c in detail.get_children():
		c.queue_free()
	var h := DataRegistry.hero(id)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	detail.add_child(top)
	top.add_child(UiKit.hero_badge(h, 64.0))
	var tv := VBoxContainer.new()
	top.add_child(tv)
	tv.add_child(UiKit.label(h.display_name, 30, UiKit.ACCENT))
	tv.add_child(UiKit.label("%s · 난이도 %s · 기본 역할 %s · %s" % [h.role, "★".repeat(h.difficulty), ROLE_NAMES.get(h.preferred_role, ""), "원거리" if h.is_ranged else "근접"], 17, UiKit.MUTED))
	detail.add_child(UiKit.wrap_label(h.lore, 17))
	# 능력치 표
	var grid := GridContainer.new()
	grid.columns = 6
	grid.add_theme_constant_override("h_separation", 18)
	detail.add_child(grid)
	for k in STAT_ORDER:
		var base := float(h.base_stats.get(k, StatsComponent.DEFAULTS.get(k, 0.0)))
		var g := float(h.growth_stats.get(k, 0.0))
		var v := _fmt(k, base) + ("  (+%s)" % _fmt(k, g) if g != 0.0 else "")
		grid.add_child(UiKit.label(StatsComponent.NAMES.get(k, k), 15, UiKit.MUTED))
		grid.add_child(UiKit.label(v, 16))
	grid.add_child(UiKit.label("사거리", 15, UiKit.MUTED))
	grid.add_child(UiKit.label(str(roundi(h.attack_range)), 16))
	detail.add_child(UiKit.label("괄호 안은 레벨당 증가량입니다.", 14, UiKit.MUTED))
	detail.add_child(UiKit.label("패시브", 22, UiKit.ACCENT))
	detail.add_child(UiKit.wrap_label(h.passive_description, 17))
	detail.add_child(UiKit.label("스킬", 22, UiKit.ACCENT))
	for i in h.skills.size():
		var s: SkillData = h.skills[i]
		var line := "%s  %s  (최대 %d단계, 마나 %s, 쿨타임 %s초%s)" % [Enums.SLOT_KEYS[i], s.display_name, s.max_rank, _arr(s.mana_cost), _arr(s.cooldown), (", 사거리 %d" % roundi(s.cast_range)) if s.cast_range > 0.0 else ""]
		detail.add_child(UiKit.label(line, 18, Color(0.75, 0.9, 1.0)))
		detail.add_child(UiKit.wrap_label(s.description, 16))
	detail.add_child(UiKit.label("추천 아이템", 22, UiKit.ACCENT))
	var names := PackedStringArray()
	for iid in h.ai_build:
		var it := ItemManager.get_item(iid)
		if it != null:
			names.append(it.display_name)
	detail.add_child(UiKit.wrap_label(" → ".join(names), 16))
	var rec: Dictionary = SaveManager.records().heroes.get(id, {})
	if not rec.is_empty():
		var games := int(rec.games)
		detail.add_child(UiKit.label("내 기록", 22, UiKit.ACCENT))
		detail.add_child(UiKit.label("%d판 %d승 (승률 %d%%) · 평균 %.1f / %.1f / %.1f" % [games, int(rec.wins), roundi(100.0 * int(rec.wins) / maxf(1, games)), rec.kills / maxf(1, games), rec.deaths / maxf(1, games), rec.assists / maxf(1, games)], 17))


func _fmt(k: String, v: float) -> String:
	if StatsComponent.PERCENT_STATS.has(k):
		return "%d%%" % roundi(v * 100.0)
	if k == "attack_speed":
		return "%.2f" % v
	if absf(v - roundf(v)) > 0.01:
		return "%.1f" % v
	return str(roundi(v))


func _arr(a: PackedFloat32Array) -> String:
	var parts := PackedStringArray()
	for v in a:
		parts.append(str(roundi(v)) if absf(v - roundf(v)) < 0.01 else "%.1f" % v)
	return "/".join(parts)


func on_back() -> void:
	GameManager.go_main()
