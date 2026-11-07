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
