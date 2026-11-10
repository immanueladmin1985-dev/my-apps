class_name CampData
extends Resource
## 맵의 몬스터 캠프 또는 보스 자리.

@export var id: String = ""
@export var position: Vector2 = Vector2.ZERO
@export var monsters: PackedStringArray = PackedStringArray()
## 처음 나타나는 시각(초). 최종 보스는 경기 설정(MatchConfig.final_boss_time)이 우선한다.
@export var first_spawn: float = 0.0
## 모두 처치된 뒤 다시 나타나기까지(초). 0 이면 다시 나타나지 않는다.
@export var respawn: float = 45.0
@export var is_final_boss: bool = false
## 0 보다 크면 이 간격(초)마다 monsters 를 한 무리씩 더 소환한다 (중앙 무대처럼 쌓이는 몬스터).
@export var wave_interval: float = 0.0
## 주기 소환으로 동시에 살아 있을 수 있는 최대 수
@export var wave_max: int = 12
@export_group("주기 소환 성장")
## 0 보다 크면 첫 소환부터 이 간격(초)마다 단계가 오른다. 단계가 오를수록 수가 늘고 세지고 보상도 커진다.
@export var wave_growth_interval: float = 0.0
@export var wave_max_tier: int = 6
## 단계 1마다 체력·공격력이 이 비율만큼 오른다 (0.3 = 30%).
@export var wave_stat_growth: float = 0.3
## 단계 1마다 경험치·골드 보상이 이 비율만큼 오른다.
@export var wave_reward_growth: float = 0.35
## 단계 1마다 한 무리에 차례로 더해지는 몬스터 (2단계에 첫 번째, 3단계에 두 번째까지 …)
@export var wave_extra_monsters: PackedStringArray = PackedStringArray()
## 단계 1마다 동시에 살아 있을 수 있는 최대 수가 이만큼 늘어난다.
@export var wave_max_growth: int = 2


## 첫 소환 뒤 지난 시간으로 정한 단계 (1부터)
func wave_tier(since_first: float) -> int:
	if wave_growth_interval <= 0.0 or since_first < 0.0:
		return 1
	return clampi(1 + int(since_first / wave_growth_interval), 1, wave_max_tier)


## 단계에 맞는 한 무리 몬스터 목록
func wave_group(tier: int) -> PackedStringArray:
	var out := PackedStringArray(monsters)
	for i in mini(tier - 1, wave_extra_monsters.size()):
		out.append(wave_extra_monsters[i])
	return out
