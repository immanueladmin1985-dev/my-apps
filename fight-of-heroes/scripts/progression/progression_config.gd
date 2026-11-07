class_name ProgressionConfig
extends Resource
## 성장과 경제 규칙. 수치는 data/config/progression.tres 에서 조정한다.

@export var id: String = "progression"
@export_group("레벨")
@export var max_level: int = 15
## 다음 레벨까지 필요한 경험치 = xp_base + xp_growth × (레벨 − 1)
@export var xp_base: float = 100.0
@export var xp_growth: float = 60.0
## R(궁극기)이 한 단계씩 열리는 레벨
@export var ultimate_levels: PackedInt32Array = PackedInt32Array([6, 11, 15])
@export_group("경험치 보상")
## 영웅 처치 경험치 = hero_xp_base + hero_xp_per_level × 죽은 영웅 레벨. 주변 아군이 나눠 받는다.
@export var hero_xp_base: float = 80.0
@export var hero_xp_per_level: float = 30.0
@export var hero_xp_radius: float = 1200.0
## 몬스터 경험치는 이 거리 안의 아군이 나눠 받고, 함께 있으면 1명당 group_bonus 만큼 늘어난다.
@export var monster_xp_radius: float = 900.0
@export var group_bonus: float = 0.15
@export_group("골드")
@export var start_gold: int = 0
@export var passive_gold_per_sec: float = 2.0
@export var hero_kill_gold: int = 250
@export var hero_kill_gold_per_level: int = 20
## 영웅 처치 골드의 이 비율을 도움 영웅들이 나눠 받는다.
@export var assist_gold_ratio: float = 0.5


func xp_to_next(level: int) -> float:
	return xp_base + xp_growth * (level - 1)


## 이 레벨에서 올릴 수 있는 스킬 단계의 한도.
func rank_cap(slot: int, level: int, max_rank: int) -> int:
	if slot == Enums.Slot.R:
		var n := 0
		for l in ultimate_levels:
			if level >= l:
				n += 1
		return mini(n, max_rank)
	return mini(max_rank, (level + 1) / 2)
