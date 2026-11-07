extends Node
## 효과음. 소리 파일이 아직 없으므로 시작할 때 사인파·잡음으로 짧은 효과음을 만든다.
## 실제 효과음이 생기면 SOUNDS 의 같은 이름으로 AudioStream 을 넣으면 된다.
## 플레이어와 관련된 사건(때리기·맞기·스킬·레벨업·구매)과 영웅 처치·보스 알림에만 소리를 낸다.

const RATE := 22050
const POOL := 8

var sounds: Dictionary = {}
var player_unit = null
var _players: Array = []
var _next := 0
var _last_played: Dictionary = {}
var play_count := 0  # 시험용


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in POOL:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	_build_sounds()
	EventBus.unit_damaged.connect(_on_damaged)
	EventBus.skill_cast.connect(_on_cast)
	EventBus.hero_killed.connect(func(_v, _k, _a): play("death"))
	EventBus.hero_level_up.connect(func(h, _l): if h == player_unit: play("level_up"))
	EventBus.item_bought.connect(func(h, _i): if h == player_unit: play("buy"))
	EventBus.boss_warning.connect(func(_n, _s): play("boss"))
	EventBus.boss_spawned.connect(func(_b): play("boss"))


func play(name: String, min_gap := 0.05) -> void:
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
	var p: AudioStreamPlayer = _players[_next]
	_next = (_next + 1) % POOL
	p.stream = s
	p.volume_db = linear_to_db(vol)
	p.play()
	play_count += 1


func _on_damaged(target, info, amount: float) -> void:
	if player_unit == null or not is_instance_valid(player_unit) or amount < 1.0:
		return
	if info.source == player_unit:
		play("crit" if info.is_crit else "hit", 0.08)
	elif target == player_unit:
		play("hurt", 0.15)


func _on_cast(caster, _slot, _s) -> void:
	if caster == player_unit:
		play("skill")


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
