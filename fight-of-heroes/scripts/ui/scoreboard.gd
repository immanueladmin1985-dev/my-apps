class_name Scoreboard
extends Control
## 경기 중 점수판: 양 팀 영웅의 얼굴, 이름·레벨, 처치/죽음/도움, 골드, 아이템. 다시 누르거나 판을 누르면 닫힌다.
## 상대 팀 골드는 보이지 않는다 (실제 게임처럼). 화면을 멈추지 않는다.

signal closed

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const ROW_H := 62.0

var hero_manager: HeroManager
var viewer_team := Enums.Team.BLUE
var battle: BattleManager


func setup(hm: HeroManager, bm: BattleManager, team: int) -> void:
	hero_manager = hm
	battle = bm
	viewer_team = team
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventScreenTouch and event.pressed:
		get_viewport().set_input_as_handled()
		closed.emit()


func _process(_d: float) -> void:
	if visible:
		queue_redraw()


func _draw() -> void:
	if hero_manager == null:
		return
	var w := minf(size.x - 40.0, 1000.0)
	var rows := hero_manager.heroes.size()
	var h := 90.0 + ROW_H * rows + 30.0
	var r := Rect2((size.x - w) * 0.5, maxf(20.0, (size.y - h) * 0.5), w, h)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.07, 0.1, 0.92)
	sb.border_color = Color(1, 1, 1, 0.25)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(14)
	draw_style_box(sb, r)
	var title := "점수판   블루 %d : %d 레드" % [battle.kills[Enums.Team.BLUE], battle.kills[Enums.Team.RED]] if battle != null else "점수판"
	_text(r.position + Vector2(24, 40), title, 24, Color(1, 0.9, 0.5))
	_text(r.position + Vector2(r.size.x - 200, 40), "아무 곳이나 누르면 닫힘", 14, Color(1, 1, 1, 0.5))
	var y := r.position.y + 70.0
	var cols := [Vector2(24, 0), Vector2(84, 0), Vector2(320, 0), Vector2(450, 0), Vector2(560, 0)]
	_text(Vector2(r.position.x + 320, y), "처치/죽음/도움", 14, Color(1, 1, 1, 0.55))
	_text(Vector2(r.position.x + 450, y), "골드", 14, Color(1, 1, 1, 0.55))
	_text(Vector2(r.position.x + 560, y), "아이템", 14, Color(1, 1, 1, 0.55))
	y += 10.0
	for team in [Enums.Team.BLUE, Enums.Team.RED]:
		for hero: Hero in hero_manager.team_heroes(team):
			var c := Enums.team_color(team)
			draw_rect(Rect2(r.position.x + 12, y, r.size.x - 24, ROW_H - 6), Color(c, 0.14))
			var face_c := Vector2(r.position.x + 50, y + ROW_H * 0.45)
			draw_circle(face_c, 24.0, Color(0, 0, 0, 0.6))
			if not Art.draw_hero_face(self, hero.data.id, face_c, 22.0, Color(0.45, 0.45, 0.45) if hero.is_dead else Color.WHITE):
				draw_circle(face_c, 22.0, hero.data.color)
			draw_arc(face_c, 24.0, 0, TAU, 32, c, 3.0)
			var nm := "%s  Lv.%d" % [hero.display_name, hero.level]
			if hero.is_dead:
				nm += "  (%d초)" % ceili(hero.respawn_left)
			_text(Vector2(r.position.x + 84, y + 34), nm, 19, Color.WHITE if not hero.is_dead else Color(0.7, 0.7, 0.7))
			_text(Vector2(r.position.x + 320, y + 34), "%d / %d / %d" % [hero.kills, hero.deaths, hero.assists], 20, Color(1, 0.95, 0.8))
			var gold_txt := ("%d G" % hero.gold) if team == viewer_team else "?"
			_text(Vector2(r.position.x + 450, y + 34), gold_txt, 18, Color(1, 0.85, 0.3))
			for i in InventoryComponent.SIZE:
				var it: ItemData = hero.inventory.item_at(i)
				var box := Rect2(r.position.x + 560 + i * 48, y + 6, 42, 42)
				draw_rect(box, Color(0, 0, 0, 0.45))
				if it != null:
					var icon := Art.item_icon(it)
					if icon != null:
						draw_texture_rect(icon, box, false)
					else:
						draw_rect(box.grow(-3), it.color)
						_text(box.position + Vector2(10, 29), it.glyph, 18, Color.WHITE)
			y += ROW_H
		y += 8.0


func _text(p: Vector2, t: String, s: int, col: Color) -> void:
	draw_string_outline(FONT, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, s, 4, Color(0, 0, 0, 0.7))
	draw_string(FONT, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, s, col)
