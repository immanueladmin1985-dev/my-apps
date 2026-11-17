class_name MapData
extends Resource
## 전투 맵. 크기, 팀 시작 지점, 장애물을 적는다.

@export var id: String = ""
@export var display_name: String = ""
@export var size: Vector2 = Vector2(2400, 1400)
@export var blue_spawn: Vector2 = Vector2(220, 700)
@export var red_spawn: Vector2 = Vector2(2180, 700)
@export var obstacles: Array[Rect2] = []
## 둥근 기둥·바위: (중심 x, 중심 y, 반지름)
@export var pillars: PackedVector3Array = PackedVector3Array()
## 몬스터 캠프와 보스 자리 (CampData)
@export var camps: Array[Resource] = []
## 용암 바닥으로 칠할 구역 (가장 어려운 던전)
@export var lava_areas: Array[Rect2] = []
@export var ground_color: Color = Color(0.2, 0.3, 0.22)
@export var obstacle_color: Color = Color(0.35, 0.33, 0.3)


func spawn_of(team: int) -> Vector2:
	return blue_spawn if team == Enums.Team.BLUE else red_spawn
