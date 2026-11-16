extends Node
## 효과음과 배경 음악.
## 효과음: assets/sounds/sfx/<이름>.wav (tools/gen_audio.py 가 만든다). 파일이 없으면 시작할 때 코드로 만든 소리를 쓴다.
## 스킬은 SkillData.sound 이름의 소리를 낸다. 플레이어 스킬은 크게, 화면 안(시야 안) 다른 유닛의 스킬은 작게.
## 음악: assets/sounds/music/<menu|battle|boss>.wav. 지금 화면에 따라 고르고(전투 중 보스가 나오면 보스 음악), 바꿀 때 서서히 넘긴다.

const RATE := 22050
const POOL := 10
const SFX_DIR := "res://assets/sounds/sfx"
const MUSIC_DIR := "res://assets/sounds/music"
## 다른 유닛의 스킬 소리가 들리는 거리
const HEAR_RANGE := 1100.0
const FADE := 1.2

var sounds: Dictionary = {}
var player_unit = null
var _players: Array = []
var _next := 0
var _last_played: Dictionary = {}
var play_count := 0  # 시험용
var last_played := ""  # 시험용
var music_name := ""
var _music: Array = []  # [지금, 이전] 두 개로 서서히 넘긴다
var _fade_t := 1.0
var _music_cache: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in POOL:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	_build_sounds()
	_load_sound_files()
	for i in 2:
		var m := AudioStreamPlayer.new()
		m.name = "Music%d" % i
		add_child(m)
		_music.append(m)
	EventBus.hero_respawned.connect(func(h): if h == player_unit: play("respawn"))
	EventBus.boss_killed.connect(func(_b, _t): play("level_up"))
	EventBus.unit_damaged.connect(_on_damaged)
	EventBus.skill_cast.connect(_on_cast)
	EventBus.hero_killed.connect(func(_v, _k, _a): play("death"))
	EventBus.hero_level_up.connect(func(h, _l): if h == player_unit: play("level_up"))
	EventBus.item_bought.connect(func(h, _i): if h == player_unit: play("buy"))
	EventBus.boss_warning.connect(func(_n, _s): play("boss"))
	EventBus.boss_spawned.connect(func(_b): play("boss"))


func play(name: String, min_gap := 0.05, gain := 1.0) -> void:
	var s = sounds.get(name)
	if s == null:
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_played.get(name, -10.0) < min_gap:
		return
	_last_played[name] = now
	var vol := float(SaveManager.get_setting("sfx_volume", 0.8))
	if vol <= 0.001:
		return
	play_count += 1
	last_played = name
	# 화면 없이 도는 시험·CI 에서는 실제로 재생하지 않는다 (끝날 때 재생 중인 소리가 남아 오류로 잡히는 것 방지).
	if DisplayServer.get_name() == "headless":
		return
	var p: AudioStreamPlayer = _players[_next]
	_next = (_next + 1) % POOL
	p.stream = s
	p.volume_db = linear_to_db(vol * gain)
	p.play()


func _on_damaged(target, info, amount: float) -> void:
	if player_unit == null or not is_instance_valid(player_unit) or amount < 1.0:
		return
	if info.source == player_unit:
		play("crit" if info.is_crit else "hit", 0.08)
	elif target == player_unit:
		play("hurt", 0.15)


func _on_cast(caster, _slot, s) -> void:
	var name: String = s.sound if s != null and s.get("sound") != null and s.sound != "" and sounds.has(s.sound) else "skill"
	if caster == player_unit:
		play(name, 0.05)
		return
	if player_unit == null or not is_instance_valid(player_unit) or not is_instance_valid(caster):
		return
	var d: float = player_unit.global_position.distance_to(caster.global_position)
	if d > HEAR_RANGE or not FogOfWar.can_see(caster):
		return
	# 멀수록 작게 (가까우면 60%, 끝에서 15%)
	play(name, 0.08, lerpf(0.6, 0.15, d / HEAR_RANGE))


# ---- 소리 파일 ----

## assets/sounds/sfx 의 소리를 읽어 같은 이름의 만든 소리를 바꾼다. 내보낸 APK 에서는 파일 이름이 .wav.import 로 보인다.
func _load_sound_files() -> void:
	var dir := DirAccess.open(SFX_DIR)
	if dir == null:
		return
	for f in dir.get_files():
		var n: String = f.trim_suffix(".import").trim_suffix(".remap")
		if not n.ends_with(".wav"):
			continue
		var res = load(SFX_DIR.path_join(n))
		if res is AudioStream:
			sounds[n.get_basename()] = res


func _music_stream(name: String) -> AudioStream:
	if _music_cache.has(name):
		return _music_cache[name]
	var path := MUSIC_DIR.path_join(name + ".wav")
	var s: AudioStream = load(path) if ResourceLoader.exists(path) else null
	if s is AudioStreamWAV:
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_begin = 0
		s.loop_end = int(s.get_length() * s.mix_rate)
	_music_cache[name] = s
	return s


## 배경 음악 바꾸기 ("" 이면 멈춤). 같은 곡이면 그대로 둔다.
func play_music(name: String) -> void:
	if name == music_name:
		return
	music_name = name
	var old: AudioStreamPlayer = _music[0]
	var cur: AudioStreamPlayer = _music[1]
	_music = [cur, old]
	var s := _music_stream(name) if name != "" and DisplayServer.get_name() != "headless" else null
	if s != null:
		cur.stream = s
		cur.volume_db = -60.0
		cur.play()
	else:
		cur.stop()
	_fade_t = 0.0


func music_volume() -> float:
	return float(SaveManager.get_setting("music_volume", 0.5))


## 지금 화면에 맞는 곡: 전투 화면이면 보스가 있을 때 보스 음악, 아니면 전투 음악. 결과 화면은 조용히. 나머지는 메뉴 음악.
func wanted_music() -> String:
	var scene := get_tree().current_scene
	if scene == null:
		return ""
	var path: String = scene.scene_file_path
	if path == GameManager.BATTLE_SCENE:
		if scene.get("battle_manager") != null and scene.battle_manager.match_over:
			return ""
		var bm = scene.get("monster_manager")
		if bm != null and not bm.bosses().is_empty():
			return "boss"
		return "battle"
	if path == GameManager.RESULTS_SCENE:
		return ""
	if path.begins_with("res://tests"):
		return ""
	return "menu"


func _process(delta: float) -> void:
	play_music(wanted_music())
	var vol := music_volume()
	_fade_t = minf(1.0, _fade_t + delta / FADE)
	var cur: AudioStreamPlayer = _music[0]
	var old: AudioStreamPlayer = _music[1]
	if cur.playing:
		cur.volume_db = linear_to_db(maxf(0.0001, vol * _fade_t))
	if old.playing:
		old.volume_db = linear_to_db(maxf(0.0001, vol * (1.0 - _fade_t)))
		if _fade_t >= 1.0:
			old.stop()


# ---- 효과음 만들기 ----

func _build_sounds() -> void:
	sounds["hit"] = _make(0.08, func(t, _d): return _noise() * 0.5 * exp(-t * 40.0) + sin(TAU * 180.0 * t) * 0.4 * exp(-t * 30.0))
	sounds["crit"] = _make(0.14, func(t, _d): return _noise() * 0.5 * exp(-t * 25.0) + sin(TAU * (520.0 - t * 1500.0) * t) * 0.45 * exp(-t * 18.0))
	sounds["hurt"] = _make(0.12, func(t, _d): return sin(TAU * (240.0 - t * 600.0) * t) * 0.5 * exp(-t * 20.0) + _noise() * 0.2 * exp(-t * 30.0))
	sounds["skill"] = _make(0.22, func(t, _d): return sin(TAU * (300.0 + t * 1400.0) * t) * 0.35 * exp(-t * 9.0))
	sounds["death"] = _make(0.45, func(t, _d): return sin(TAU * (440.0 - t * 500.0) * t) * 0.4 * exp(-t * 5.0))
	sounds["level_up"] = _make(0.5, func(t, _d): return _chord([523.0, 659.0, 784.0, 1047.0], t, 0.12) * 0.35 * exp(-t * 3.0))
	sounds["buy"] = _make(0.25, func(t, _d): return (sin(TAU * 1320.0 * t) + sin(TAU * 1760.0 * t) * 0.5) * 0.3 * exp(-t * 14.0))
	sounds["boss"] = _make(0.9, func(t, _d): return (sin(TAU * 110.0 * t) + sin(TAU * 165.0 * t) * 0.6) * 0.35 * minf(1.0, t * 8.0) * exp(-t * 2.5))
	sounds["victory"] = _make(1.0, func(t, _d): return _chord([523.0, 659.0, 784.0, 1047.0, 1319.0], t, 0.15) * 0.3 * exp(-t * 1.8))
	sounds["defeat"] = _make(1.0, func(t, _d): return _chord([440.0, 392.0, 349.0, 262.0], t, 0.2) * 0.3 * exp(-t * 1.8))
	sounds["click"] = _make(0.04, func(t, _d): return sin(TAU * 900.0 * t) * 0.3 * exp(-t * 80.0))


## 시간에 따라 차례로 올라가는(또는 내려가는) 음
func _chord(freqs: Array, t: float, step: float) -> float:
	var i := mini(int(t / step), freqs.size() - 1)
	return sin(TAU * freqs[i] * t)


func _noise() -> float:
	return randf() * 2.0 - 1.0


func _make(seconds: float, f: Callable) -> AudioStreamWAV:
	var n := int(seconds * RATE)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var t := float(i) / RATE
		var v := clampf(f.call(t, seconds), -1.0, 1.0)
		# 끝을 부드럽게 줄여 딸깍 소리를 막는다.
		v *= minf(1.0, (seconds - t) * 60.0)
		data.encode_s16(i * 2, int(v * 32000.0))
	var s := AudioStreamWAV.new()
	s.format = AudioStreamWAV.FORMAT_16_BITS
	s.mix_rate = RATE
	s.stereo = false
	s.data = data
	return s


## 끝날 때 붙잡고 있는 소리를 놓아 준다 (리소스가 남았다는 경고 방지).
func _exit_tree() -> void:
	for p in _players + _music:
		p.stop()
		p.stream = null
	sounds.clear()
	_music_cache.clear()
