extends Control
## 결과 화면: 승패, 사유, 경기 시간, 영웅별 레벨·킬/데스/도움·골드·준 피해·아이템, MVP.

const REASONS := {"kills": "목표 킬 달성", "boss": "최종 보스 처치"}


func _ready() -> void:
	var s: Dictionary = GameManager.last_summary
	var box := UiKit.page(self, 10)
	if s.is_empty():
		box.add_child(UiKit.label("결과가 없습니다.", 24))
		var b := UiKit.button("메인 메뉴", Vector2(200, 60))
		b.pressed.connect(on_back)
		box.add_child(b)
		return
	var me = null
	for h in s.heroes:
		if h.is_player:
			me = h
	var my_team: int = me.team if me != null else Enums.Team.BLUE
	var won: bool = s.winner == my_team
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 24)
	box.add_child(top)
	var title := ("승리!" if won else "패배") if s.mode != "watch" else "%s 팀 승리" % Enums.team_name(s.winner)
	top.add_child(UiKit.label(title, 52, UiKit.GOOD if won or s.mode == "watch" else UiKit.BAD))
	var t := int(s.time)
	top.add_child(UiKit.label("%s 팀 %s · 블루 %d : %d 레드 · %02d:%02d" % [Enums.team_name(s.winner), REASONS.get(s.reason, ""), s.blue_kills, s.red_kills, t / 60, t % 60], 20, UiKit.MUTED))
	for team in [my_team, Enums.Team.BLUE + Enums.Team.RED - my_team]:
		var p := UiKit.panel()
		box.add_child(p)
		var grid := GridContainer.new()
		grid.columns = 7
		grid.add_theme_constant_override("h_separation", 22)
		grid.add_theme_constant_override("v_separation", 4)
		p.add_child(grid)
		var tc := Enums.team_color(team)
		for head in ["%s 팀" % Enums.team_name(team), "레벨", "킬/데스/도움", "골드", "영웅 피해", "아이템", ""]:
			grid.add_child(UiKit.label(head, 15, tc if head.ends_with("팀") else UiKit.MUTED))
		for h in s.heroes:
			if h.team != team:
				continue
			var hd := DataRegistry.hero(h.id)
			var name_row := HBoxContainer.new()
			name_row.add_theme_constant_override("separation", 8)
			name_row.add_child(UiKit.hero_badge(hd, 34.0))
			name_row.add_child(UiKit.label(h.name + (" (나)" if h.is_player else ""), 18, UiKit.ACCENT if h.is_player else UiKit.TEXT))
			grid.add_child(name_row)
			grid.add_child(UiKit.label(str(h.level), 18))
			grid.add_child(UiKit.label("%d / %d / %d" % [h.kills, h.deaths, h.assists], 18))
			grid.add_child(UiKit.label(str(h.gold), 18))
			grid.add_child(UiKit.label(str(h.damage), 18))
			var items := HBoxContainer.new()
			items.add_theme_constant_override("separation", 3)
			for iid in h.items:
				var it := ItemManager.get_item(iid)
				if it != null:
					var tile := ItemTile.new()
					tile.custom_minimum_size = Vector2(34, 34)
					tile.disabled = true
					tile.set_item(it)
					items.add_child(tile)
			grid.add_child(items)
			grid.add_child(UiKit.label("MVP" if h.id == s.mvp else "", 18, UiKit.ACCENT))
	box.add_child(UiKit.spacer(false))
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_END
	row.add_theme_constant_override("separation", 12)
	box.add_child(row)
	var again := UiKit.button("다시 하기", Vector2(200, 62), 22)
	again.pressed.connect(replay)
	row.add_child(again)
	var change := UiKit.button("영웅 바꾸기", Vector2(200, 62), 22)
	change.pressed.connect(func(): GameManager.goto(GameManager.NEW_GAME_SCENE))
	row.add_child(change)
	var home := UiKit.button("메인 메뉴", Vector2(200, 62), 22)
	home.pressed.connect(on_back)
	row.add_child(home)
	AudioManager.play("victory" if won else "defeat")


## 같은 설정으로 다시 한다 (무작위 팀은 새로 섞는다).
func replay() -> void:
	GameManager.restart_match()


func on_back() -> void:
	GameManager.go_main()
