class_name MatchConfig
extends Resource
## 한 경기의 설정. 영웅 선택 화면이 만들고 전투 화면이 읽는다.

@export var blue_heroes: PackedStringArray = PackedStringArray()
@export var red_heroes: PackedStringArray = PackedStringArray()
## 블루 팀에서 플레이어가 조작하는 영웅의 순번. -1 이면 모두 AI (관전·시험용)
@export var player_index: int = 0
@export var difficulty: String = "normal"
@export var kill_target: int = 15
@export var map_id: String = "valley_01"
## 최종 보스가 나타나는 시각(초). 0 이하이면 맵 데이터 값을 쓴다.
@export var final_boss_time: float = 600.0
## team: 3대3 대전, practice: 1대1 연습, watch: AI 끼리 관전
@export var mode: String = "team"
## 시험용: 플레이어 영웅도 AI 가 조작한다.
@export var autoplay: bool = false
