extends TestCase
## 숙련도, 오늘의 도전 과제, 업적 (ProgressMeta). 시험용 저장 파일을 쓰고 끝나면 원래 저장 파일을 다시 읽는다.

var _saved_path := ""


func before_each() -> void:
	super.before_each()
	_saved_path = SaveManager.save_path
	SaveManager.save_path = "user://test_progress_meta.json"
	SaveManager.load_data()
	SaveManager.reset_records()
	ProgressMeta.reset()


func after_each() -> void:
	if FileAccess.file_exists(SaveManager.save_path):
		DirAccess.remove_absolute(SaveManager.save_path)
	SaveManager.save_path = _saved_path
	SaveManager.load_data()
	await super.after_each()


func _summary(won: bool, kills := 5, assists := 4, extra := {}) -> Dictionary:
	var me := {"id": "gunslinger", "name": "총잡이", "team": Enums.Team.BLUE, "is_player": true, "level": 9, "kills": kills, "deaths": 2,
		"assists": assists, "gold": 300, "damage": 9000, "items": [], "best_multi": 1, "boss_kills": 0, "final_boss_kills": 0, "wards": 0}
	me.merge(extra.get("me", {}), true)
	var s := {
		"winner": Enums.Team.BLUE if won else Enums.Team.RED, "reason": "kills", "time": 600.0, "mvp": "gunslinger",
		"blue_kills": 15, "red_kills": 9, "difficulty": "normal", "kill_target": 15, "mode": "team", "autoplay": false,
		"heroes": [me, {"id": "saint", "name": "성녀", "team": Enums.Team.RED, "is_player": false, "level": 8, "kills": 1, "deaths": 5, "assists": 2, "gold": 100, "damage": 3000, "items": []}],
	}
	s.merge(extra.get("s", {}), true)
	return s


func test_mastery_points_and_levels() -> void:
	eq(ProgressMeta.match_points(true, 3, 2), 100 + 30 + 10, "승리 점수")
	eq(ProgressMeta.match_points(false, 0, 0), 40, "패배 점수")
	eq(ProgressMeta.level_for(0), 1, "0점은 1단계")
	eq(ProgressMeta.level_for(199), 1, "199점은 1단계")
	eq(ProgressMeta.level_for(200), 2, "200점은 2단계")
	eq(ProgressMeta.level_for(5000), 7, "5000점은 7단계")
	eq(ProgressMeta.level_for(99999), 7, "최고 단계는 7")
	eq(ProgressMeta.points_to_next(260), 240, "500점까지 240")
	eq(ProgressMeta.points_to_next(6000), 0, "최고 단계면 남은 점수 0")
	near(ProgressMeta.level_progress(350), 0.5, 0.001, "200~500 중 절반")


func test_mastery_level_up_from_match() -> void:
	var r := ProgressMeta.apply_match(_summary(true, 5, 4))
	eq(int(r.gain), 170, "이긴 판 5킬 4도움")
	eq(int(r.level_before), 1, "처음 단계")
	eq(int(r.level_after), 1, "170점은 아직 1단계")
	r = ProgressMeta.apply_match(_summary(false, 1, 0))
	eq(int(r.gain), 50, "진 판 1킬")
	eq(int(r.level_after), 2, "220점이면 2단계로 오름")
	eq(ProgressMeta.mastery_points("gunslinger"), 220, "누적 점수 저장")
	# 저장 파일에서 다시 읽어도 남아 있다.
	SaveManager.load_data()
	eq(ProgressMeta.mastery_level("gunslinger"), 2, "다시 읽은 뒤 단계")
	eq(ProgressMeta.mastery_level("monk"), 1, "안 해 본 영웅은 1단계")


func test_daily_deterministic_and_changes() -> void:
	var a := ProgressMeta.daily_for("2026-11-20")
	var b := ProgressMeta.daily_for("2026-11-20")
	eq(a.size(), 3, "하루 3개")
	eq(a.map(func(c): return c.id), b.map(func(c): return c.id), "같은 날은 같은 과제")
	var ids: Array = a.map(func(c): return c.id)
	check(ids[0] != ids[1] and ids[1] != ids[2] and ids[0] != ids[2], "세 과제가 서로 다름")
	# 어느 날이든 다음 날에는 세 과제가 모두 바뀐다 (1년 동안 확인).
	var start := ProgressMeta.day_number("2026-01-01")
	check(start > 0, "날짜 계산")
	var prev: Array = []
	var seen := {}
	for i in 366:
		var date := Time.get_date_string_from_unix_time((start + i) * 86400 + 43200)
		var cur: Array = ProgressMeta.daily_for(date).map(func(c): return c.id)
		for id in cur:
			seen[id] = true
		if not prev.is_empty():
			for k in 3:
				check(cur[k] != prev[k], "%s 과제 %d 가 전날과 같음" % [date, k])
		prev = cur
	eq(seen.size(), 12, "1년 동안 모든 과제가 나옴")
	eq(ProgressMeta.day_number("엉터리"), 0, "틀린 날짜는 0")


func test_challenge_progress_from_summary() -> void:
	# 총잡이로 끝낼 수 있는 날(지원 역할 과제가 없는 날)을 고른다.
	var date := "2026-11-20"
	var day := ProgressMeta.day_number(date)
	while ProgressMeta.daily_for(date).any(func(c): return c.id == "support_1"):
		day += 1
		date = Time.get_date_string_from_unix_time(day * 86400 + 43200)
	var next := Time.get_date_string_from_unix_time((day + 1) * 86400 + 43200)
	# 날짜별 과제에 상관없이 모든 과제 종류의 증가량을 확인한다.
	var s := _summary(true, 6, 3, {"me": {"wards": 2, "boss_kills": 1, "damage": 12000}, "s": {"time": 800.0}})
	var me: Dictionary = s.heroes[0]
	var gains := {}
	for group in ProgressMeta.DAILY:
		for c in group:
			gains[c.id] = ProgressMeta.challenge_gain(c, s, me, true)
	eq(gains.play_1, 1, "판 수")
	eq(gains.win_1, 1, "승리")
	eq(gains.assists_8, 3, "도움")
	eq(gains.wards_3, 2, "와드")
	eq(gains.match_kills_5, 6, "한 판 킬")
	eq(gains.ranged_1, 1, "총잡이는 원거리")
	eq(gains.support_1, 0, "총잡이는 지원이 아님")
	eq(gains.boss_1, 1, "보스")
	eq(gains.fast_win, 1, "15분 안에 승리")
	eq(gains.damage_20k, 12000, "피해")
	eq(gains.safe_win, 1, "데스 2 승리")
	eq(ProgressMeta.challenge_gain(ProgressMeta.challenge("fast_win"), s, me, false), 0, "지면 빠른 승리 아님")
	# 실제 반영: 그날 과제 3개를 모두 채울 만큼 좋은 경기를 두 번 하면 모두 끝나고 별을 받는다.
	var big := _summary(true, 10, 10, {"me": {"wards": 3, "boss_kills": 1, "damage": 25000, "deaths": 0}, "s": {"time": 600.0}})
	var r1 := ProgressMeta.apply_match(big, date)
	var r2 := ProgressMeta.apply_match(big, date)
	var total_stars := 0
	for c in ProgressMeta.daily_for(date):
		check(ProgressMeta.challenge_done(c.id, date), "%s 완료" % c.id)
		total_stars += int(c.stars)
	eq(r1.challenges.size() + r2.challenges.size(), 3, "과제 3개 완료 (한 번씩만)")
	eq(ProgressMeta.stars(), total_stars, "별 보상")
	# 다시 해도 별은 더 늘지 않는다.
	ProgressMeta.apply_match(big, date)
	eq(ProgressMeta.stars(), total_stars, "끝낸 과제는 다시 보상하지 않음")
	# 다음 날은 진행이 지워지고 새 과제가 나온다.
	for c in ProgressMeta.daily_for(next):
		eq(ProgressMeta.challenge_progress(c.id, next), 0, "다음 날 %s 진행 0" % c.id)
		check(not ProgressMeta.challenge_done(c.id, next), "다음 날 %s 미완료" % c.id)
	# 하루 누적: 도움 과제는 여러 판을 더한다.
	ProgressMeta.reset()
	var dl := ProgressMeta.daily_state(date)
	dl.progress["assists_8"] = 5
	check(ProgressMeta.challenge_progress("assists_8", date) == 5, "진행 읽기")


func test_achievements_unlock_once() -> void:
	var r := ProgressMeta.apply_match(_summary(true, 3, 1, {"me": {"best_multi": 3}}))
	check(r.achievements.has("first_win"), "첫 승리 업적")
	check(r.achievements.has("triple_kill"), "트리플 킬 업적")
	check(not r.achievements.has("flawless"), "데스가 있으면 무결점 아님")
	check(ProgressMeta.has_achievement("first_win"), "업적 저장")
	r = ProgressMeta.apply_match(_summary(true, 3, 1, {"me": {"best_multi": 3}}))
	check(not r.achievements.has("first_win"), "첫 승리는 한 번만")
	check(not r.achievements.has("triple_kill"), "트리플 킬은 한 번만")
	r = ProgressMeta.apply_match(_summary(true, 0, 0, {"me": {"deaths": 0}, "s": {"mode": "lan", "kill_target": 0, "difficulty": "hard", "reason": "boss"}}))
	for id in ["flawless", "lan_game", "unlimited_win", "hard_win", "dragon_slayer"]:
		check(r.achievements.has(id), "%s 업적" % id)
	# 숙련도 7단계
	ProgressMeta.meta().mastery["monk"] = 4990
	var s := _summary(true, 0, 0)
	s.heroes[0].id = "monk"
	r = ProgressMeta.apply_match(s)
	check(r.achievements.has("mastery_7"), "숙련도 7단계 업적")
	eq(int(r.level_after), 7, "7단계")
	# 누적 기록은 기록 초기화와 상관없이 남는다.
	SaveManager.reset_records()
	eq(int(ProgressMeta.meta().stats.wins), 4, "업적용 누적 승리")
	check(ProgressMeta.has_achievement("first_win"), "기록을 지워도 업적은 남음")
	eq(ProgressMeta.unlock("없는_업적"), false, "없는 업적은 얻지 못함")


func test_broken_save_is_repaired() -> void:
	SaveManager.data["meta"] = {"mastery": 5, "stars": "많음", "daily": [], "stats": {"wins": "x"}}
	eq(ProgressMeta.stars(), 0, "깨진 별 값은 0")
	eq(ProgressMeta.mastery_level("monk"), 1, "깨진 숙련도는 1단계")
	var r := ProgressMeta.apply_match(_summary(true))
	check(not r.is_empty(), "깨진 저장 내용에도 반영")
	SaveManager.data.erase("meta")
	eq(ProgressMeta.stars(), 0, "meta 가 없어도 동작")
	# 플레이어가 없는 요약 (관전)
	var w := _summary(true)
	w.heroes[0].is_player = false
	eq(ProgressMeta.apply_match(w), {}, "플레이어가 없으면 반영 안 함")


func test_battle_feats_in_summary() -> void:
	var bm := BattleManager.new()
	var cfg := MatchConfig.new()
	world.add_child(bm)
	bm.setup(cfg, null)
	var m := BattleManager.next_multi([0, -100.0], 5.0)
	m = BattleManager.next_multi(m, 9.0)
	m = BattleManager.next_multi(m, 18.5)
	eq(int(m[0]), 3, "10초 안에 연달아 3명")
	m = BattleManager.next_multi(m, 40.0)
	eq(int(m[0]), 1, "10초가 지나면 다시 1")
	var s := bm.summary()
	eq(s.autoplay, false, "요약에 자동 진행 여부")
