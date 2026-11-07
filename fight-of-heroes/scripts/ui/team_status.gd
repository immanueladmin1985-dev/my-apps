class_name TeamStatus
extends Control
## 한 팀 영웅들의 상태: 글자 아이콘, 체력 고리, 사망 시 부활까지 남은 초.

const FONT := preload("res://assets/fonts/NotoSansKR-SemiBold-subset.ttf")
const SLOT := 52.0
const R := 20.0

var heroes: Array = []
var team: int = Enums.Team.BLUE
var player = null
var mirror := false  # 오른쪽 정렬


func setup(list: Array, t: int, player_hero, right_aligned: bool) -> void:
	heroes = list
	team = t
	player = player_hero
	mirror = right_aligned
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var c := Enums.team_color(team)
	for i in heroes.size():
		var h: Hero = heroes[i]
		var x := (size.x - SLOT * (i + 0.5)) if mirror else SLOT * (i + 0.5)
		var center := Vector2(x, size.y * 0.5)
		draw_circle(center, R + 3.0, Color(0, 0, 0, 0.55))
		var body := h.data.color if not h.is_dead else Color(0.3, 0.3, 0.3)
		draw_circle(center, R - 2.0, body)
		var ratio := 0.0 if h.is_dead else h.health.ratio()
		draw_arc(center, R + 1.0, -PI / 2.0, -PI / 2.0 + TAU * ratio, 32, c, 4.0)
		if h == player:
			draw_arc(center, R + 6.0, 0, TAU, 32, Color(1, 0.95, 0.4, 0.9), 2.0)
		var text := h.data.glyph
		var fs := 18
		if h.is_dead:
			text = str(ceili(h.respawn_left))
			fs = 20
		var w := FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var col := Color(0, 0, 0, 0.85) if not h.is_dead else Color(1, 1, 1)
		draw_string(FONT, center + Vector2(-w * 0.5, fs * 0.36), text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
