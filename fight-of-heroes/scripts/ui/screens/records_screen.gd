extends Control
## 게임 기록: 전체 전적, 영웅별 기록, 최근 경기. 기록 초기화(확인 창).

const DIFF := {"easy": "쉬움", "normal": "보통", "hard": "어려움"}
const MODE := {"team": "3대3", "practice": "1대1 연습", "watch": "관전"}

var content: VBoxContainer


func _ready() -> void:
	var box := UiKit.page(self)
	var head := UiKit.header(box, "게임 기록", on_back)
	head.add_child(UiKit.spacer())
	var reset := UiKit.button("기록 초기화", Vector2(170, 52), 18)
	reset.pressed.connect(func(): UiKit.confirm(self, "모든 게임 기록을 지울까요? 되돌릴 수 없습니다.", "지우기", _reset))
	head.add_child(reset)
	var s := UiKit.scroll()
	box.add_child(s)
	content = VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.add_child(content)
	_fill()


func _reset() -> void:
	SaveManager.reset_records()
	_fill()


func _fill() -> void:
	for c in content.get_children():
		c.queue_free()
	var r := SaveManager.records()
	var games := int(r.games)
	content.add_child(UiKit.label("%d판 %d승 %d패 · 승률 %d%% · 최고 킬 %d" % [games, int(r.wins), int(r.losses), roundi(100.0 * int(r.wins) / maxf(1, games)), int(r.best_kills)], 24, UiKit.ACCENT))
	if games == 0:
		content.add_child(UiKit.wrap_label("아직 끝낸 경기가 없습니다. 새 게임에서 한 판을 끝내면 여기에 기록됩니다.", 18, UiKit.MUTED))
		return
	content.add_child(UiKit.label("영웅별 기록", 22, UiKit.ACCENT))
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 30)
	content.add_child(grid)
	for t in ["영웅", "경기", "승률", "평균 킬/데스/도움", ""]:
		grid.add_child(UiKit.label(t, 16, UiKit.MUTED))
	var ids: Array = r.heroes.keys()
	ids.sort_custom(func(a, b): return int(r.heroes[a].games) > int(r.heroes[b].games))
	for id in ids:
		var hr: Dictionary = r.heroes[id]
		var h := DataRegistry.hero(id)
		var g := maxf(1, int(hr.games))
		grid.add_child(UiKit.label(h.display_name if h != null else id, 18))
		grid.add_child(UiKit.label(str(int(hr.games)), 18))
		grid.add_child(UiKit.label("%d%%" % roundi(100.0 * int(hr.wins) / g), 18))
		grid.add_child(UiKit.label("%.1f / %.1f / %.1f" % [hr.kills / g, hr.deaths / g, hr.assists / g], 18))
		grid.add_child(Control.new())
	content.add_child(UiKit.label("최근 경기", 22, UiKit.ACCENT))
	for e in r.history:
		var h := DataRegistry.hero(e.hero)
		var t := int(e.time)
		var line := "%s  %s  %s  Lv.%d  %d/%d/%d  점수 %s  %02d:%02d  %s · %s" % [
			str(e.date).replace("T", " ").left(16), "승리" if e.won else "패배", h.display_name if h != null else e.hero,
			int(e.level), int(e.kills), int(e.deaths), int(e.assists), e.score, t / 60, t % 60,
			MODE.get(e.get("mode", "team"), ""), DIFF.get(e.difficulty, "")]
		content.add_child(UiKit.label(line, 16, UiKit.GOOD if e.won else UiKit.BAD))


func on_back() -> void:
	GameManager.go_main()
