extends TestCase
## 상태 효과: 기절, 둔화, 가속, 지속시간, 중첩.

var stun: StatusEffectData
var slow: StatusEffectData
var haste: StatusEffectData


func before_each() -> void:
	super.before_each()
	stun = load("res://data/status/stun.tres")
	slow = load("res://data/status/slow.tres")
	haste = load("res://data/status/haste.tres")


func test_stun_blocks_everything() -> void:
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {})
	var e := spawn_dummy(Enums.Team.RED, Vector2(540, 500), {})
	h.status.apply(stun, 1.0, 0.0)
	h.move_input = Vector2.RIGHT
	await frames(20)
	near(h.global_position.x, 500.0, 0.5, "기절 중 이동 불가")
	check(not h.attack.try_attack(e), "기절 중 공격 불가")
	eq(h.skill_caster.cast(1, CastAim.new()), Enums.CastResult.DISABLED, "기절 중 시전 불가")
	await frames(50)
	check(not h.status.is_stunned(), "1초 뒤 기절 해제")
	var x := h.global_position.x
	await frames(10)
	check(h.global_position.x > x + 10.0, "기절이 풀리면 다시 이동")


func test_slow_and_haste() -> void:
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {"move_speed": 200.0})
	h.status.apply(slow, 2.0, 0.3)
	h.status.apply(load("res://data/status/stun.tres").duplicate(), 0.0, 0.0)  # 지속시간 0 은 무시
	near(h.get_move_speed(), 140.0, 0.01, "30% 둔화")
	var slow2 := slow.duplicate()
	slow2.id = "slow_other"
	h.status.apply(slow2, 2.0, 0.5)
	near(h.get_move_speed(), 100.0, 0.01, "가장 강한 둔화만 적용")
	h.status.apply(haste, 2.0, 0.2)
	near(h.get_move_speed(), 120.0, 0.01, "둔화 50% × 가속 20%")
	h.move_input = Vector2.RIGHT
	await frames(30)
	near(h.global_position.x - 500.0, 60.0, 4.0, "0.5초 동안 초당 120 이동")


func test_duration_refresh() -> void:
	var h := spawn_dummy(Enums.Team.BLUE, Vector2(500, 500), {})
	h.status.apply(slow, 0.5, 0.3)
	await frames(15)
	h.status.apply(slow, 0.5, 0.2)
	near(h.status.active["slow"].magnitude, 0.3, 0.001, "더 큰 세기 유지")
	await frames(24)
	check(h.status.has("slow"), "다시 걸면 지속시간이 새로 시작")
	await frames(10)
	check(not h.status.has("slow"), "지속시간이 끝나면 사라짐")
