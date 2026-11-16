class_name View
extends RefCounted
## 2.5D 기울어진 시점. 게임 판정(위치·거리·원형 범위)은 그대로 두고, 카메라의 세로 배율만 줄여
## 바닥이 비스듬히 누운 것처럼 그린다. 그래서 원형 범위는 화면에서 타원으로 보인다.
## 서 있는 것(영웅·몬스터 그림, 나무, 글자)은 세로를 1/tilt 만큼 늘려 원래 모양으로 세운다.
## 화면에서 손가락으로 정한 방향(조이스틱·스킬 조준)은 screen_to_world 로 바꿔 쓴다.

## 세로 배율 (1.0 이면 위에서 내려다보는 시점)
const TILT := 0.74
static var tilt := 1.0


static func setup_from_settings() -> void:
	tilt = TILT if bool(SaveManager.get_setting("tilt_view", true)) else 1.0


## 서 있는 것을 세울 때 곱하는 세로 배율
static func upright() -> float:
	return 1.0 / tilt


## 화면에서의 방향·조준 벡터 → 맵 위의 벡터 (길이는 그대로)
static func screen_to_world(v: Vector2) -> Vector2:
	if tilt == 1.0 or v.length() < 0.0001:
		return v
	return Vector2(v.x, v.y / tilt).normalized() * v.length()
