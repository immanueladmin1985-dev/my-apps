class_name Enums
## 게임 전체에서 함께 쓰는 열거형과 상수.

enum Team { NEUTRAL = 0, BLUE = 1, RED = 2 }
enum DamageType { PHYSICAL, MAGIC, TRUE }
enum TargetMode { SELF, UNIT, DIRECTION, POINT }
enum TargetTeam { ENEMY, ALLY, ANY }
enum Slot { Q, W, E, R }
enum CastResult { OK, NOT_LEARNED, COOLDOWN, NO_MANA, DISABLED, OUT_OF_RANGE, NO_TARGET, DEAD }
## HEAL_OVER_TIME / MANA_OVER_TIME: 초당 magnitude 만큼 체력·마나 회복 (물약)
enum StatusKind { STUN, SLOW, DOT, STAT_BUFF, HASTE, HEAL_OVER_TIME, MANA_OVER_TIME }
## AI 가 스킬을 언제 쓸지 고르는 기준.
## OFFENSE: 대상이 사거리 안이면 사용, ENGAGE: 거리를 좁힐 때, DEFENSE: 체력이 줄었을 때, ESCAPE: 도망칠 때.
enum AIUse { OFFENSE, ENGAGE, DEFENSE, ESCAPE }

const SLOT_KEYS := ["Q", "W", "E", "R"]

const CAST_RESULT_TEXT := {
	CastResult.OK: "",
	CastResult.NOT_LEARNED: "아직 배우지 않은 스킬입니다",
	CastResult.COOLDOWN: "재사용 대기 중입니다",
	CastResult.NO_MANA: "마나가 부족합니다",
	CastResult.DISABLED: "지금은 스킬을 쓸 수 없습니다",
	CastResult.OUT_OF_RANGE: "사거리 밖입니다",
	CastResult.NO_TARGET: "대상이 없습니다",
	CastResult.DEAD: "",
}


static func is_enemy(a: int, b: int) -> bool:
	return a != b


static func team_color(team: int) -> Color:
	match team:
		Team.BLUE:
			return Color(0.3, 0.6, 1.0)
		Team.RED:
			return Color(1.0, 0.35, 0.3)
	return Color(0.85, 0.8, 0.5)


static func team_name(team: int) -> String:
	match team:
		Team.BLUE:
			return "블루"
		Team.RED:
			return "레드"
	return "중립"
