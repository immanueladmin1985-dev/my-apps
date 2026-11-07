class_name CombatConfig
extends Resource
## 전투 공식에 쓰는 수치. 밸런스 조정은 data/config/combat.tres 에서 한다.

@export var id: String = "combat"
## 방어력 계수: 방어력 ≥ 0 이면 K / (K + 방어력)
@export var armor_constant: float = 100.0
@export var default_crit_damage: float = 1.75
## 기본 공격 선딜레이 비율 (공격 간격 대비)
@export var attack_windup_ratio: float = 0.3
## 근접 공격이 맞는 거리 여유
@export var melee_leeway: float = 30.0
## 부활 시간 = base + 레벨 × per_level (최대 max)
@export var respawn_base: float = 4.0
@export var respawn_per_level: float = 1.5
@export var respawn_max: float = 25.0
## 팀 시작 지점(우물) 근처에서는 초당 최대 체력·마나의 일정 비율을 회복한다.
@export var fountain_radius: float = 260.0
@export var fountain_regen_ratio: float = 0.1


func respawn_time(level: int) -> float:
	return minf(respawn_base + respawn_per_level * level, respawn_max)
