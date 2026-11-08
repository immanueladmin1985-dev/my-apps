extends Control
## 메인 메뉴: 새 게임, 영웅 도감, 아이템 도감, 게임 기록, 설정, 게임 종료.

const MENU := [
	["새 게임", GameManager.NEW_GAME_SCENE],
	["영웅 도감", GameManager.HERO_CODEX_SCENE],
	["아이템 도감", GameManager.ITEM_CODEX_SCENE],
	["게임 기록", GameManager.RECORDS_SCENE],
	["설정", GameManager.SETTINGS_SCENE],
]


func _ready() -> void:
	UiKit.background(self)
	var row := HBoxContainer.new()
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.add_theme_constant_override("separation", 40)
	add_child(row)
	var left := MarginContainer.new()
	left.add_theme_constant_override("margin_left", 60)
	left.add_theme_constant_override("margin_top", 40)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(left)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	left.add_child(box)
	box.add_child(UiKit.label("FIGHT OF HEROES", 56, UiKit.ACCENT))
	box.add_child(UiKit.label("오프라인 3대3 영웅 대전", 22, UiKit.MUTED))
	box.add_child(UiKit.spacer(false))
	var r := SaveManager.records()
	var total := int(r.games)
	var rate := (100.0 * int(r.wins) / total) if total > 0 else 0.0
	box.add_child(UiKit.label("전적 %d승 %d패 (승률 %d%%) · 최고 킬 %d" % [int(r.wins), int(r.losses), roundi(rate), int(r.best_kills)], 20, UiKit.TEXT))
	var last: String = SaveManager.get_setting("last_hero", "")
	var h := DataRegistry.hero(last)
	if h != null:
		box.add_child(UiKit.label("최근 영웅: %s" % h.display_name, 18, UiKit.MUTED))
	box.add_child(UiKit.label("버전 %s" % ProjectSettings.get_setting("application/config/version", ""), 15, UiKit.MUTED))
	var right := MarginContainer.new()
	right.add_theme_constant_override("margin_right", 60)
	right.add_theme_constant_override("margin_top", 40)
	right.add_theme_constant_override("margin_bottom", 40)
	row.add_child(right)
	var menu := VBoxContainer.new()
	menu.alignment = BoxContainer.ALIGNMENT_CENTER
	menu.add_theme_constant_override("separation", 12)
	right.add_child(menu)
	var snap := SaveManager.load_battle()
	if BattleSnapshot.make_config(snap) != null:
		var t := int(snap.get("elapsed", 0.0))
		var k: Array = snap.get("kills", [0, 0])
		var cont := UiKit.button("이어 하기", Vector2(340, 70), 26)
		cont.name = "이어 하기"
		cont.pressed.connect(resume)
		menu.add_child(cont)
		var info := UiKit.label("%d:%02d · 블루 %d : %d 레드" % [t / 60, t % 60, int(k[0]), int(k[1])], 17, UiKit.MUTED)
		info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		menu.add_child(info)
	for m in MENU:
		var b := UiKit.button(m[0], Vector2(340, 70), 26)
		b.name = m[0]
		b.pressed.connect(open.bind(m[1]))
		menu.add_child(b)
	var q := UiKit.button("게임 종료", Vector2(340, 62), 22)
	q.pressed.connect(on_back)
	menu.add_child(q)


func resume() -> void:
	if not GameManager.resume_battle():
		UiKit.confirm(self, "저장한 전투를 불러오지 못했습니다.", "확인", func(): GameManager.go_main())


func open(path: String) -> void:
	GameManager.goto(path)


func on_back() -> void:
	UiKit.confirm(self, "게임을 종료할까요?", "종료", func(): get_tree().quit())
