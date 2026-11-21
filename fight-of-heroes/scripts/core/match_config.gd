class_name MatchConfig
extends Resource
## 한 경기의 설정. 영웅 선택 화면이 만들고 전투 화면이 읽는다.

@export var blue_heroes: PackedStringArray = PackedStringArray()
@export var red_heroes: PackedStringArray = PackedStringArray()
## 블루 팀에서 플레이어가 조작하는 영웅의 순번. -1 이면 모두 AI (관전·시험용)
@export var player_index: int = 0
@export var difficulty: String = "normal"
## 0 이면 무제한 (최종 보스를 잡아야 끝남)
@export var kill_target: int = 15
@export var map_id: String = "valley_01"
## 최종 보스가 나타나는 시각(초). 0 이하이면 맵 데이터 값을 쓴다.
@export var final_boss_time: float = 600.0
## team: 3대3 대전, practice: 1대1 연습, watch: AI 끼리 관전
@export var mode: String = "team"
## 시험용: 플레이어 영웅도 AI 가 조작한다.
@export var autoplay: bool = false
## 무작위로 채운 팀인지 ("다시 하기" 때 플레이어 영웅만 두고 다시 뽑는다)
@export var random_teams: bool = false
## 같은 와이파이 대전 (mode == "lan"): 사람이 맡은 자리(0~2 블루, 3~5 레드) -> 피어 번호, 내 자리, 모두가 같은 시드
@export var net_humans: Dictionary = {}
@export var net_my_slot: int = -1
@export var net_my_team: int = Enums.Team.BLUE
@export var net_seed: int = 0
## 와이파이 대전에서 영웅 없이 보기만 하는 관전자인지
@export var net_spectator: bool = false
## 밴 단계에서 금지한 영웅 (아무도 고를 수 없다)
@export var bans: PackedStringArray = PackedStringArray()

## 게임 방식: "normal"(일반), "quick"(짧은 판), "raid"(보스 레이드). mode(대전·연습·관전·와이파이)와 따로 고른다.
## 아래 규칙 값은 apply_game_type() 이 채우고, 영웅·전투·몬스터 매니저가 읽는다.
@export var game_type: String = "normal"
## 시작 레벨 (1 보다 크면 그만큼 레벨을 올리고 스킬 포인트를 자동으로 배운다)
@export var start_level: int = 1
## 시작 골드 (-1 이면 진행 설정 값)
@export var start_gold: int = -1
## 부활 시간 배율
@export var respawn_scale: float = 1.0
## 캠프가 처음 나타나는 시각 배율 (최종 보스는 final_boss_time 을 따로 쓴다)
@export var camp_spawn_scale: float = 1.0
## 보스 레이드: 제한 시간(초). 0 이면 없음. 시간이 다 되면 레이드 실패.
@export var raid_time_limit: float = 0.0
## 보스 레이드: 레이드 보스(최종 보스) 체력 배율
@export var raid_boss_hp_scale: float = 1.0

const GAME_TYPES := ["normal", "quick", "raid"]
const GAME_TYPE_NAMES := {"normal": "일반", "quick": "짧은 판", "raid": "보스 레이드"}
const QUICK_KILL_TARGET := 5
## 보스 레이드에서 아군 AI 가 레벨과 상관없이 보스에 도전하기 시작하는 시각(초)
const RAID_ENGAGE_TIME := 120.0
const RAID_ENGAGE_LEVEL := 9.0


func is_raid() -> bool:
	return game_type == "raid"


func is_quick() -> bool:
	return game_type == "quick"


## 게임 방식에 맞게 규칙 값을 정한다. 보스 레이드는 레드 팀을 비운다.
func apply_game_type(t: String) -> void:
	game_type = t if GAME_TYPES.has(t) else "normal"
	start_level = 1
	start_gold = -1
	respawn_scale = 1.0
	camp_spawn_scale = 1.0
	raid_time_limit = 0.0
	raid_boss_hp_scale = 1.0
	match game_type:
		"quick":
			kill_target = QUICK_KILL_TARGET
			start_level = 6
			start_gold = 2500
			respawn_scale = 0.5
			camp_spawn_scale = 0.5
			final_boss_time = 300.0
		"raid":
			red_heroes = PackedStringArray()
			kill_target = 0
			start_level = 8
			start_gold = 3000
			final_boss_time = 20.0
			raid_time_limit = 600.0
			raid_boss_hp_scale = 2.2
