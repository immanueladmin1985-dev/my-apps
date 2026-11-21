class_name ProgressMeta
## 영웅 숙련도, 오늘의 도전 과제, 업적. 모두 SaveManager.data["meta"] 에 저장한다.
## 저장 내용이 깨져 있어도 쓰기 전에 형식을 바로잡으므로 읽기·쓰기에서 오류가 나지 않는다.
## 경기가 끝나면 GameManager 가 apply_match(경기 요약) 을 부른다 (관전·자동 진행 경기는 빼고).

## 숙련도 단계별 필요한 누적 점수 (1단계 = 0점)
const MASTERY_LEVELS := [0, 200, 500, 1000, 1800, 3000, 5000]
const MASTERY_WIN := 100
const MASTERY_LOSS := 40
const MASTERY_PER_KILL := 10
const MASTERY_PER_ASSIST := 5

## 오늘의 도전 과제. 세 묶음(쉬움·보통·어려움)에서 하나씩 고른다.
## kind: games 판 수, wins 승리, assists·kills·wards·damage·boss_kills 하루 누적,
##       match_kills 한 판 최고 킬, ranged·support 그 역할로 판 수, fast_win 정한 시간 안에 승리, safe_win 데스 3 이하 승리
const DAILY := [
	[
		{"id": "play_1", "text": "아무 영웅으로 1판을 끝내세요.", "kind": "games", "target": 1, "stars": 1},
		{"id": "win_1", "text": "아무 영웅으로 1승을 하세요.", "kind": "wins", "target": 1, "stars": 1},
		{"id": "assists_8", "text": "도움을 8번 기록하세요.", "kind": "assists", "target": 8, "stars": 1},
		{"id": "wards_3", "text": "감시 와드를 3개 꽂으세요.", "kind": "wards", "target": 3, "stars": 1},
	],
	[
		{"id": "match_kills_5", "text": "한 판에 5킬을 하세요.", "kind": "match_kills", "target": 5, "stars": 2},
		{"id": "ranged_1", "text": "원거리 영웅으로 1판을 끝내세요.", "kind": "ranged", "target": 1, "stars": 2},
		{"id": "support_1", "text": "지원 역할 영웅(성녀, 성기사 등)으로 1판을 끝내세요.", "kind": "support", "target": 1, "stars": 2},
		{"id": "kills_10", "text": "처치를 10번 하세요.", "kind": "kills", "target": 10, "stars": 2},
	],
	[
		{"id": "boss_1", "text": "보스를 1마리 직접 처치하세요.", "kind": "boss_kills", "target": 1, "stars": 3},
		{"id": "fast_win", "text": "15분 안에 승리하세요.", "kind": "fast_win", "target": 1, "stars": 3, "seconds": 900},
		{"id": "damage_20k", "text": "적 영웅에게 피해를 20000 주세요.", "kind": "damage", "target": 20000, "stars": 3},
		{"id": "safe_win", "text": "데스 3번 이하로 승리하세요.", "kind": "safe_win", "target": 1, "stars": 3},
	],
]
## 묶음마다 하루에 몇 칸씩 넘어갈지와 크게 섞는 주기 (어느 날이든 다음 날에는 세 과제가 모두 바뀐다)
const DAILY_STEP := [1, 3, 1]
const DAILY_PERIOD := [4, 5, 7]

## 업적 (한 번 얻으면 계속 남는다)
const ACHIEVEMENTS := [
	{"id": "first_win", "name": "첫 승리", "hint": "아무 경기에서나 1번 이기면 얻습니다."},
	{"id": "wins_10", "name": "승리의 맛", "hint": "모두 합쳐 10번 이기면 얻습니다."},
	{"id": "wins_50", "name": "백전노장", "hint": "모두 합쳐 50번 이기면 얻습니다."},
	{"id": "games_30", "name": "꾸준한 영웅", "hint": "모두 합쳐 30판을 끝내면 얻습니다."},
	{"id": "triple_kill", "name": "트리플 킬", "hint": "10초 안에 적 영웅을 연달아 3명 잡으면 얻습니다."},
	{"id": "match_kills_10", "name": "전장의 지배자", "hint": "한 판에 10킬을 하면 얻습니다."},
	{"id": "kills_100", "name": "백 번의 승부", "hint": "모두 합쳐 적 영웅을 100번 처치하면 얻습니다."},
	{"id": "dragon_slayer", "name": "흑룡 사냥꾼", "hint": "최종 보스 고대 흑룡을 처치하고 이기면 얻습니다."},
	{"id": "boss_10", "name": "보스 사냥꾼", "hint": "보스를 모두 합쳐 10마리 직접 처치하면 얻습니다."},
	{"id": "hard_win", "name": "강적 격파", "hint": "AI 난이도 어려움에서 이기면 얻습니다."},
	{"id": "flawless", "name": "무결점", "hint": "한 번도 쓰러지지 않고 이기면 얻습니다."},
	{"id": "unlimited_win", "name": "끝까지 간다", "hint": "목표 킬이 무제한인 경기에서 이기면 얻습니다."},
	{"id": "all_heroes", "name": "모든 영웅의 친구", "hint": "모든 영웅으로 한 판씩 끝내면 얻습니다."},
	{"id": "mastery_7", "name": "달인", "hint": "한 영웅의 숙련도를 7단계까지 올리면 얻습니다."},
	{"id": "lan_game", "name": "함께라서 즐겁다", "hint": "같은 와이파이 대전을 1판 끝내면 얻습니다."},
	{"id": "daily_10", "name": "성실한 도전자", "hint": "오늘의 도전 과제를 모두 합쳐 10개 끝내면 얻습니다."},
]


static func _default_meta() -> Dictionary:
	return {
		"mastery": {}, "stars": 0, "achievements": {},
		"daily": {"date": "", "progress": {}, "done": []},
		"stats": {"games": 0, "wins": 0, "kills": 0, "boss_kills": 0, "daily_done": 0, "heroes_played": []},
	}


## 저장된 진행 내용. 없거나 형식이 틀린 항목은 기본값으로 바꿔 둔다.
static func meta() -> Dictionary:
	var d = SaveManager.data.get("meta")
	if not (d is Dictionary):
		d = {}
		SaveManager.data["meta"] = d
	var base := _default_meta()
	for k in base:
		if not d.has(k) or (typeof(d[k]) != typeof(base[k]) and not (base[k] is int and d[k] is float)):
			d[k] = base[k]
	for k in base.daily:
		if not d.daily.has(k) or typeof(d.daily[k]) != typeof(base.daily[k]):
			d.daily[k] = base.daily[k]
	for k in base.stats:
		if not d.stats.has(k) or (typeof(d.stats[k]) != typeof(base.stats[k]) and not (base.stats[k] is int and d.stats[k] is float)):
			d.stats[k] = base.stats[k]
	return d


static func reset() -> void:
	SaveManager.data["meta"] = _default_meta()
	SaveManager.save_data()


static func stars() -> int:
	return int(meta().stars)


# ── 숙련도 ──

static func mastery_points(hero_id: String) -> int:
	return int(meta().mastery.get(hero_id, 0))


static func level_for(points: int) -> int:
	var lv := 1
	for i in MASTERY_LEVELS.size():
		if points >= MASTERY_LEVELS[i]:
			lv = i + 1
	return lv


static func mastery_level(hero_id: String) -> int:
	return level_for(mastery_points(hero_id))


## 다음 단계까지 남은 점수 (최고 단계면 0)
static func points_to_next(points: int) -> int:
	var lv := level_for(points)
	if lv >= MASTERY_LEVELS.size():
		return 0
	return MASTERY_LEVELS[lv] - points


## 이번 단계 안에서 얼마나 찼는지 (0~1, 최고 단계면 1)
static func level_progress(points: int) -> float:
	var lv := level_for(points)
	if lv >= MASTERY_LEVELS.size():
		return 1.0
	var lo: int = MASTERY_LEVELS[lv - 1]
	return clampf(float(points - lo) / float(MASTERY_LEVELS[lv] - lo), 0.0, 1.0)


## 한 판에서 얻는 숙련도 점수
static func match_points(won: bool, kills: int, assists: int) -> int:
	return (MASTERY_WIN if won else MASTERY_LOSS) + kills * MASTERY_PER_KILL + assists * MASTERY_PER_ASSIST


## 단계별 메달 색 (1~2 동, 3~4 은, 5~6 금, 7 보라)
static func tier_color(level: int) -> Color:
	if level >= 7:
		return Color(0.78, 0.55, 1.0)
	if level >= 5:
		return Color(1.0, 0.8, 0.3)
	if level >= 3:
		return Color(0.8, 0.85, 0.92)
	return Color(0.8, 0.52, 0.3)


# ── 오늘의 도전 과제 ──

static func today() -> String:
	return Time.get_date_string_from_system(false)


## "YYYY-MM-DD" 를 1970-01-01 부터의 날 수로 바꾼다. 형식이 틀리면 0.
static func day_number(date: String) -> int:
	var p := date.split("-")
	if p.size() != 3 or not p[0].is_valid_int() or not p[1].is_valid_int() or not p[2].is_valid_int():
		return 0
	var unix := Time.get_unix_time_from_datetime_dict({"year": int(p[0]), "month": int(p[1]), "day": int(p[2]), "hour": 12, "minute": 0, "second": 0})
	return int(floor(unix / 86400.0))


## 날짜로 정해지는 오늘의 도전 과제 3개 (같은 날이면 늘 같다)
static func daily_for(date: String) -> Array:
	var d := day_number(date)
	var out: Array = []
	for i in DAILY.size():
		var group: Array = DAILY[i]
		var idx := posmod(d * int(DAILY_STEP[i]) + floori(d / float(DAILY_PERIOD[i])) * 2 + i, group.size())
		out.append(group[idx])
	return out


static func challenge(id: String) -> Dictionary:
	for group in DAILY:
		for c in group:
			if c.id == id:
				return c
	return {}


## 오늘 날짜의 진행 상태. 날짜가 바뀌었으면 예전 진행을 지우고 새로 시작한다.
static func daily_state(date := "") -> Dictionary:
	if date == "":
		date = today()
	var dl: Dictionary = meta().daily
	if str(dl.get("date", "")) != date:
		dl["date"] = date
		dl["progress"] = {}
		dl["done"] = []
	return dl


static func challenge_progress(id: String, date := "") -> int:
	return int(daily_state(date).progress.get(id, 0))


static func challenge_done(id: String, date := "") -> bool:
	return daily_state(date).done.has(id)


## 경기 하나가 도전 과제에 더하는 양
static func challenge_gain(c: Dictionary, s: Dictionary, me: Dictionary, won: bool) -> int:
	var hd := DataRegistry.hero(str(me.get("id", "")))
	match str(c.kind):
		"games":
			return 1
		"wins":
			return 1 if won else 0
		"assists", "kills", "wards", "boss_kills", "damage":
			return int(me.get(c.kind, 0))
		"match_kills":
			return int(me.get("kills", 0))
		"ranged":
			return 1 if hd != null and hd.is_ranged else 0
		"support":
			return 1 if hd != null and hd.preferred_role == "support" else 0
		"fast_win":
			return 1 if won and float(s.get("time", 99999.0)) <= float(c.get("seconds", 900)) else 0
		"safe_win":
			return 1 if won and int(me.get("deaths", 99)) <= 3 else 0
	return 0


# ── 업적 ──

static func has_achievement(id: String) -> bool:
	return meta().achievements.has(id)


static func achievement(id: String) -> Dictionary:
	for a in ACHIEVEMENTS:
		if a.id == id:
			return a
	return {}


## 얻은 업적이면 false. 처음 얻으면 기록하고 true.
static func unlock(id: String) -> bool:
	var a: Dictionary = meta().achievements
	if a.has(id) or achievement(id).is_empty():
		return false
	a[id] = today()
	return true


## 지금까지의 기록과 이번 경기로 새로 얻은 업적 id 목록
static func check_achievements(s: Dictionary, me: Dictionary, won: bool) -> Array:
	var m := meta()
	var st: Dictionary = m.stats
	var best_mastery := 1
	for id in m.mastery:
		best_mastery = maxi(best_mastery, level_for(int(m.mastery[id])))
	var all_ids: Array = DataRegistry.ids("heroes")
	var played: Array = st.heroes_played
	var conds := {
		"first_win": int(st.wins) >= 1,
		"wins_10": int(st.wins) >= 10,
		"wins_50": int(st.wins) >= 50,
		"games_30": int(st.games) >= 30,
		"triple_kill": int(me.get("best_multi", 0)) >= 3,
		"match_kills_10": int(me.get("kills", 0)) >= 10,
		"kills_100": int(st.kills) >= 100,
		"dragon_slayer": won and str(s.get("reason", "")) == "boss",
		"boss_10": int(st.boss_kills) >= 10,
		"hard_win": won and str(s.get("difficulty", "")) == "hard",
		"flawless": won and int(me.get("deaths", 1)) == 0,
		"unlimited_win": won and int(s.get("kill_target", -1)) == 0,
		"all_heroes": not all_ids.is_empty() and all_ids.all(func(id): return played.has(id)),
		"mastery_7": best_mastery >= MASTERY_LEVELS.size(),
		"lan_game": str(s.get("mode", "")) == "lan",
		"daily_10": int(st.daily_done) >= 10,
	}
	var out: Array = []
	for a in ACHIEVEMENTS:
		if conds.get(a.id, false) and unlock(a.id):
			out.append(a.id)
	return out


# ── 경기 반영 ──

## 경기 결과를 숙련도·도전 과제·업적에 반영하고 저장한다. 결과 화면에 보여 줄 내용을 돌려준다.
## {hero, gain, points, level_before, level_after, challenges: [완료한 과제], stars, achievements: [새 업적 id]}
## 플레이어 영웅이 없으면 빈 사전.
static func apply_match(s: Dictionary, date := "") -> Dictionary:
	var me: Dictionary = {}
	for h in s.get("heroes", []):
		if h is Dictionary and h.get("is_player", false):
			me = h
	if me.is_empty():
		return {}
	if date == "":
		date = today()
	var m := meta()
	var won: bool = int(s.get("winner", -1)) == int(me.get("team", -2))
	var hid := str(me.get("id", ""))
	# 숙련도
	var before := mastery_points(hid)
	var gain := match_points(won, int(me.get("kills", 0)), int(me.get("assists", 0)))
	m.mastery[hid] = before + gain
	# 누적 기록 (기록 초기화와 상관없이 업적에 쓴다)
	var st: Dictionary = m.stats
	st.games = int(st.games) + 1
	st.wins = int(st.wins) + (1 if won else 0)
	st.kills = int(st.kills) + int(me.get("kills", 0))
	st.boss_kills = int(st.boss_kills) + int(me.get("boss_kills", 0))
	if not st.heroes_played.has(hid):
		st.heroes_played.append(hid)
	# 오늘의 도전 과제
	var dl := daily_state(date)
	var finished: Array = []
	var star_gain := 0
	for c in daily_for(date):
		if dl.done.has(c.id):
			continue
		var g := challenge_gain(c, s, me, won)
		var cur := int(dl.progress.get(c.id, 0))
		cur = maxi(cur, g) if c.kind == "match_kills" else cur + g
		dl.progress[c.id] = mini(cur, int(c.target))
		if cur >= int(c.target):
			dl.done.append(c.id)
			finished.append(c)
			star_gain += int(c.stars)
	m.stars = int(m.stars) + star_gain
	st.daily_done = int(st.daily_done) + finished.size()
	var unlocked := check_achievements(s, me, won)
	SaveManager.save_data()
	return {
		"hero": hid, "gain": gain, "points": before + gain,
		"level_before": level_for(before), "level_after": level_for(before + gain),
		"challenges": finished, "stars": star_gain, "achievements": unlocked,
	}
