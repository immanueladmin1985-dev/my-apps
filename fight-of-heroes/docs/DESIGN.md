# FIGHT OF HEROES 설계 문서 (기획서 분석 결과)

기획서 v1.0을 분석하여 Godot 4 프로젝트의 구조, 시스템 의존성, Scene·Script·Resource 목록, 개발 순서, PHASE 1 계획을 정리한 문서입니다. 아직 게임 코드는 만들지 않았습니다.

## 0. 현재 상태와 작업 환경

> PHASE 0~6 을 마쳤습니다(PHASE 3 보완: 맵 개편·역할 AI 포함). 결과는 `docs/PHASE1_REPORT.md` ~ `docs/PHASE6_REPORT.md`, `docs/PHASE3B_REPORT.md` 에 있습니다. 맵과 아군 AI 는 1-2 의 기본값 대신 PHASE3B 보고서의 설계(영웅의 계곡, 역할 AI)를 따릅니다. 구현하면서 바뀐 점:
> Godot 4.7 에 기본 `VirtualJoystick` 클래스가 생겨 조이스틱은 `TouchJoystick` 으로, CombatManager 는 상태가 없는 정적 클래스로 만들었습니다.

- 이 저장소(`my-apps`)에는 Godot 프로젝트 파일(`project.godot`, `.tscn`, `.gd`)이 없습니다. 보존해야 할 기존 게임 파일은 없으며, 다른 앱 폴더는 건드리지 않습니다.
- 작업 환경(클라우드 컨테이너)에서 Godot 공식 릴리스(4.7.2-stable까지 확인)를 내려받을 수 있습니다. `Xvfb`도 설치되어 있으므로 헤드리스 테스트와 화면 캡처가 가능합니다.
- 저장소의 다른 안드로이드 앱(`baseball-relay`, `tv-remote`)처럼 GitHub Actions에서 APK를 만들고, 서명 키는 Artifact에 따로 보관하는 방식을 따릅니다.

## 1. 기획서 분석 요약

### 1-1. 기획서에서 확정된 사항
- 오프라인 3대3, 플레이어 1명 + 아군 AI 2명 + 적군 AI 3명
- 영웅 구조: 기본 공격 + 패시브 + Q/W/E/R, 최대 15레벨
- 승리 조건 두 가지(목표 킬 / 최종 보스 처치), 먼저 달성된 조건으로 즉시 종료
- 아이템 6칸, 구매·판매·조합, AI도 같은 경제 규칙
- 난이도는 능력치 보정이 아니라 판단력과 반응 속도로 구분

### 1-2. 기획서에 빠져 있거나 모호해서 기본값을 정해야 하는 사항

| 항목 | 문제 | 제안 기본값 (데이터로 바꿀 수 있게 구현) |
|---|---|---|
| 스킬 포인트 수 | 15레벨이면 포인트가 15개뿐이라 Q/W/E를 5단계씩 올리면 R을 올릴 수 없음 | Q/W/E 최대 4단계, R 최대 3단계(6·11·15레벨에 해금) → 12 + 3 = 15 |
| 맵 형태 | 라인·타워 언급이 없고 "중앙 최종 보스"만 있음 | 파오케식 아레나 맵: 양 팀 기지(부활 지점 + 상점)가 대각선 끝, 사이에 몬스터 캠프, 좌우에 중립 보스, 중앙에 최종 보스 |
| 최종 보스 출현 조건 | "별도 출현 조건"만 적혀 있음 | 경기 시작 10분 후 출현(설정값). 출현 1분 전 알림 |
| 보스 처치 판정 | "팀 단위"의 기준이 없음 | 마지막 일격을 넣은 유닛의 팀(소환수 포함). 보스 피해 기여 기록은 결과 화면에 표시 |
| 상점 이용 장소 | 정해지지 않음 | 기지 상점 범위 안 또는 사망 중에만 구매·판매 가능 (모바일 편의) |
| 사망 시 골드 | "손실 또는 상대 보상" | 사망자는 골드를 잃지 않고, 처치자와 도움 영웅이 보상을 받음(연속 처치 보너스 포함) |
| 부활 시간 | 수치 없음 | 4초 + 레벨 × 1.5초, 최대 25초 |
| 피해 공식의 계수 | "감소 계수"만 있음 | 방어력 ≥ 0: 100 / (100 + 방어력), 방어력 < 0: 2 − 100 / (100 − 방어력) |
| 스킬 조작 | 대상·방향·범위 지정 방법이 모호함 | 버튼을 짧게 누르면 자동 조준(가장 가까운 적 또는 바라보는 방향), 버튼을 끌면 조준선·범위 표시 후 손을 떼면 발동, 취소 영역으로 끌면 취소 |

## 2. 핵심 설계 원칙

1. **모든 유닛은 같은 부품으로 만든다.** 영웅·몬스터·보스·소환수가 공통 `Unit` 기반과 컴포넌트(능력치, 체력, 상태 효과, 공격)를 공유합니다. 그러면 소환술사의 소환수나 보스에게도 기절·둔화·피해 공식이 자동으로 똑같이 적용됩니다.
2. **조작과 영웅을 분리한다.** 영웅은 "이동하라 / 공격하라 / 스킬을 써라" 명령만 받습니다. 명령을 내리는 쪽이 `PlayerController`(터치 입력)인지 `AIController`인지 영웅은 알지 못합니다. 그러면 AI와 플레이어가 자동으로 같은 규칙(쿨타임, 마나, 골드)을 따르고, 나중에 온라인 대전을 추가할 때도 명령을 네트워크로 보내는 컨트롤러만 새로 만들면 됩니다.
3. **스킬은 코드가 아니라 효과의 조합으로 정의한다.** 스킬 = 조준 방식 + 효과 목록(피해, 둔화, 돌진 등)입니다. 새 영웅은 대부분 `.tres` 데이터만 추가해서 만듭니다. 용기사의 변신처럼 조합으로 표현할 수 없는 스킬만 전용 스크립트를 연결합니다.
4. **의존성은 한 방향으로만 흐른다.** 아래 계층은 위 계층을 모릅니다. UI는 게임 상태를 신호(signal)로 관찰만 하고, 전투 코드는 UI를 호출하지 않습니다.
5. **게임 데이터는 Resource(`.tres`), 저장 데이터는 JSON**으로 관리합니다. 사용자 폴더(`user://`)의 Resource 파일을 불러오면 그 안의 스크립트가 실행될 위험이 있으므로 저장 파일은 JSON으로 만듭니다.

## 3. 프로젝트 구조

저장소의 `fight-of-heroes/` 폴더 안에 Godot 프로젝트를 둡니다. 기획서의 디렉터리 구조를 그대로 따르고, 테스트·도구·임시 에셋 경로만 추가했습니다.

```
fight-of-heroes/
  project.godot
  export_presets.cfg          # Android 내보내기 설정 (키 비밀번호는 넣지 않음)
  docs/                       # 이 문서, PHASE별 보고서
  scenes/
    main/        main.tscn (첫 진입, 화면 전환)
    menu/        main_menu.tscn, settings.tscn, codex_heroes.tscn, codex_items.tscn, records.tscn
    selection/   mode_select.tscn, hero_select.tscn, team_setup.tscn
    battlefield/ battle.tscn, maps/arena_01.tscn
    heroes/      hero.tscn (모든 영웅이 공유하는 하나의 Scene)
    monsters/    monster.tscn, camp_spawner.tscn
    bosses/      boss.tscn
    ui/          hud.tscn, virtual_joystick.tscn, skill_button.tscn, minimap.tscn,
                 floating_text.tscn, unit_bar.tscn, skill_level_panel.tscn, pause_menu.tscn
    shop/        shop_panel.tscn
    results/     results.tscn
    effects/     projectile.tscn, area_telegraph.tscn, hit_effect.tscn
  scripts/
    core/        game_manager.gd, event_bus.gd, data_registry.gd, battle_manager.gd,
                 match_config.gd, enums.gd, game_config.gd
    combat/      unit.gd, stats_component.gd, stat_modifier.gd, health_component.gd,
                 mana_component.gd, attack_component.gd, damage_info.gd, combat_manager.gd,
                 status_effect_container.gd, projectile.gd, targeting.gd
    skills/      skill_data.gd, skill_caster.gd, skill_instance.gd, passive_data.gd,
                 effects/(damage, heal, shield, apply_status, dash, teleport, summon,
                 spawn_projectile, area_over_time ...).gd, custom/(전용 스킬 스크립트)
    heroes/      hero.gd, hero_data.gd, hero_controller.gd, player_controller.gd
    ai/          ai_controller.gd, ai_state_machine.gd, states/*.gd, ai_profile.gd,
                 ai_manager.gd, threat_evaluator.gd
    items/       item_data.gd, inventory_component.gd, item_manager.gd, shop_manager.gd
    progression/ experience_component.gd, wallet_component.gd, experience_manager.gd,
                 level_curve.gd, economy_config.gd
    map/         map_data.gd, monster_manager.gd, boss_manager.gd, monster.gd, boss.gd,
                 boss_pattern.gd
    save/        save_manager.gd, save_migrations.gd
    ui/          ui_manager.gd, hud.gd, virtual_joystick.gd, skill_button.gd, minimap.gd ...
  data/
    heroes/      blade_master.tres, fire_mage.tres ...
    skills/      blade_master_q.tres ...
    items/       *.tres
    monsters/    *.tres
    bosses/      *.tres
    maps/        arena_01.tres
    config/      combat_config.tres, economy_config.tres, level_curve.tres, ai_easy/normal/hard.tres
  assets/
    placeholder/ (자동 생성한 임시 스프라이트·아이콘. 실제 에셋과 경로 분리)
    heroes/ monsters/ bosses/ items/ skills/ ui/ effects/ sounds/ backgrounds/
  resources/     (공용 테마, 셰이더, SpriteFrames)
  addons/        (외부 애드온을 쓰면 라이선스 파일과 함께)
  tests/         run_tests.gd, unit/*.gd, sim/*.gd
  tools/         make_placeholders.py, build/서명 보조 스크립트
```

`.gitignore`에는 `.godot/`, `*.apk`, `*.aab`, 키 파일을 넣습니다. Godot 4.4 이후 생기는 `.uid` 파일과 `.import` 파일은 커밋합니다.

## 4. 시스템 구성과 의존성

### 4-1. 기획서의 13개 매니저 배치

기획서의 13개 매니저를 모두 만들되, 수명과 역할에 따라 세 종류로 나눕니다. 모든 기능을 매니저에 넣으면 매니저가 거대해지므로, 유닛 한 명에게 속한 상태는 컴포넌트가 맡습니다.

| 구분 | 이름 | 역할 |
|---|---|---|
| Autoload (게임 전체) | `EventBus` | 전역 신호 모음 (추가 항목) |
| | `DataRegistry` | `data/` 의 Resource를 ID로 찾아 줌 (추가 항목) |
| | `GameManager` | 화면 흐름, 경기 설정(`MatchConfig`) 전달 |
| | `SaveManager` | 설정·기록 저장, 버전 이전(migration) |
| 전투 Scene 안 (경기마다 생성) | `BattleManager` | 경기 시작·종료, 킬 점수, 승패 판정, 경기 시간 |
| | `HeroManager` | 영웅 6명 생성, 컨트롤러 연결, 사망·부활 |
| | `CombatManager` | 피해 계산 파이프라인 (치명타 → 관통 → 감소 → 보호막 → 적용) |
| | `SkillManager` | 투사체·장판·소환물 생성과 정리, 스킬 효과 실행 보조 |
| | `AIManager` | AI 난이도 적용, 팀 단위 판단(집중 공격 대상 공유) |
| | `MonsterManager` | 몬스터 캠프 생성·리스폰 |
| | `BossManager` | 중립·최종 보스 출현 조건과 알림 |
| | `ShopManager` | 구매·판매·조합 규칙 검사 (상점 범위, 골드, 빈칸) |
| | `ExperienceManager` | 처치 시 주변 영웅에게 경험치·골드 분배, 시간당 골드 |
| | `UIManager` | HUD, 상점 창, 일시정지, 알림 표시 |
| 정적 데이터 도우미 | `ItemManager` | 아이템 조회, 조합 트리 계산 (상태를 갖지 않음) |

영웅 한 명에게 속하는 컴포넌트: `StatsComponent`, `HealthComponent`, `ManaComponent`, `AttackComponent`, `SkillCaster`, `StatusEffectContainer`, `InventoryComponent`, `ExperienceComponent`, `WalletComponent`, 그리고 컨트롤러 하나.

### 4-2. 의존성 계층 (아래 → 위로만 참조)

```
[5] UI           hud, joystick, skill_button, shop_panel, results   ← 신호만 구독, 명령은 컨트롤러를 통해 전달
[4] 조작         PlayerController, AIController(+상태 머신)         ← 영웅에게 명령만 내림
[3] 경기 규칙    BattleManager, HeroManager, ExperienceManager, ShopManager,
                 MonsterManager, BossManager, AIManager, SkillManager
[2] 전투 핵심    Unit + 컴포넌트, CombatManager, 스킬 효과, 상태 효과, 투사체
[1] 데이터       HeroData, SkillData, ItemData, MonsterData, BossData, MapData, 각종 Config
[0] 기반         EventBus, DataRegistry, Enums, SaveManager, GameManager
```

- 전투 핵심(2)은 경기 규칙(3)을 직접 호출하지 않습니다. 예를 들어 유닛이 죽으면 `EventBus.unit_died(victim, killer, assists)` 신호만 보내고, 킬 점수(BattleManager), 경험치·골드(ExperienceManager), 부활(HeroManager), 처치 알림(UIManager)이 각자 그 신호를 받아 처리합니다.
- 승패 판정은 BattleManager 한 곳에서만 합니다. 첫 판정이 나면 `match_over` 플래그를 세워 같은 프레임의 다른 조건을 무시하므로, 기획서 8-3의 "먼저 판정된 조건 우선" 규칙을 만족합니다.

### 4-3. 주요 EventBus 신호

`unit_damaged`, `unit_healed`, `unit_died`, `hero_respawned`, `kill_score_changed`, `hero_level_up`, `skill_point_gained`, `gold_changed`, `item_bought`, `item_sold`, `boss_warning`, `boss_spawned`, `boss_killed`, `match_ended(winner_team, reason)`

### 4-4. 능력치 계산

`최종값 = (기본값 + 레벨당 증가 × (레벨 − 1) + 고정 보너스 합) × (1 + 비율 보너스 합)`

아이템·버프·패시브는 모두 `StatModifier(출처, 능력치, 고정/비율, 값)`로 추가·제거합니다. 아이템을 팔거나 버프가 끝나면 출처 단위로 제거하고 다시 계산하므로, 능력치가 꼬이거나 누적 오류가 생기지 않습니다.

## 5. Resource(데이터) 정의

| Resource | 주요 필드 |
|---|---|
| `HeroData` | id, 이름, 직업, 난이도, 초상화, SpriteFrames(없으면 임시 스프라이트), 기본 능력치, 레벨당 증가치, 근접/원거리, 사거리, 투사체, passive, skills[Q,W,E,R], AI 성향(공격성, 선호 거리, 스킬 우선순위, 아이템 빌드 목록) |
| `SkillData` | id, 이름, 아이콘, 설명, 슬롯, 최대 단계, 단계별 마나·쿨타임·피해·지속시간 배열, 사거리, 범위, 조준 방식(자신/대상/방향/지점), 대상(적/아군/자신), 효과 목록, 시전 시간, 이펙트, 애니메이션 이름, 전용 스크립트(선택) |
| `SkillEffect` (하위 클래스) | Damage(물리/마법/고정, 계수), Heal, Shield, ApplyStatus, Dash, Teleport, SpawnProjectile, AreaOverTime, Summon, Stealth |
| `StatusEffectData` | 기절, 둔화, 지속 피해, 은신, 능력치 증감 버프·디버프. 지속시간, 중첩 규칙 |
| `PassiveData` | 발동 시점(공격 적중, 피격, 처치, 스킬 사용, 일정 시간마다), 조건, 효과 목록 |
| `ItemData` | id, 이름, 분류, 가격, 판매가 비율, 능력치 목록, 조합 재료, 중복 장착 가능 여부, 사용 효과(물약) |
| `MonsterData` / `BossData` | 능력치, 보상(경험치·골드·팀 버프), 리스폰 시간, 보스 패턴 목록, 체력 구간별 단계 |
| `BossPattern` | 예고 시간, 모양(원/부채꼴/직선), 크기, 피해, 돌진 여부, 사용 조건 |
| `MapData` | 크기, 팀 부활 지점, 상점 위치, 캠프 목록, 보스 위치·출현 조건 |
| `AIProfile` | 반응 지연, 스킬 사용 판단 빈도, 후퇴 체력 비율, 집중 공격 여부, 궁극기 사용 조건, 우선순위 판단 여부 |
| `CombatConfig` / `EconomyConfig` / `LevelCurve` | 피해 공식 상수, 처치·도움·시간당 골드, 레벨별 필요 경험치, 부활 시간 공식 |
| `MatchConfig` | 선택 영웅 6명, 플레이어 영웅, 난이도, 목표 킬, 맵 |

## 6. AI 구조

- 상태: IDLE, FOLLOW, MOVE, ATTACK, CHASE, RETREAT, FARM, BUY_ITEM, BOSS_FIGHT, DEAD, RESPAWN (기획서 그대로)
- 상태 전환은 매 프레임이 아니라 `AIProfile.반응 지연`마다 판단합니다. 쉬움 0.6초, 보통 0.3초, 어려움 0.12초로 시작합니다. 난이도 차이는 이 지연과 판단 항목의 켜짐·꺼짐으로만 만듭니다.
- 대상 선택은 점수 방식입니다: 거리, 남은 체력, 처치 가능 여부, 아군이 공격 중인 대상(어려움에서만 집중 공격).
- 이동은 `NavigationRegion2D` + `NavigationAgent2D` 경로 탐색에 회피(avoidance)를 켜서 처리합니다. 1.5초 동안 거의 움직이지 못하면 끼인 것으로 보고 경로를 다시 구하거나 옆으로 비켜 갑니다.

## 7. 개발 순서

기획서의 PHASE 순서를 유지하되, 각 PHASE에서 만드는 기반이 다음 PHASE를 막지 않도록 순서를 정했습니다.

| PHASE | 새로 만드는 계층 | 핵심 산출물 |
|---|---|---|
| 0 (준비) | 기반 | Godot 프로젝트, 폴더 구조, 테스트 실행기, 임시 에셋 생성기, Android 빌드 워크플로 |
| 1 | 데이터·전투 핵심·조작·HUD | 영웅 1 vs AI 1 실제 전투, APK |
| 2 | 경기 규칙 일부, AI 상태 머신 | 3대3, 사망·부활, 킬 점수, 승패 판정(킬) |
| 3 | 성장 | 경험치·레벨·스킬 포인트, 몬스터 캠프, 보스 패턴, 골드, 보스 승리 판정 |
| 4 | 아이템 | 아이템 30종, 상점, 조합, AI 구매 |
| 5 | 콘텐츠 | 영웅 10명, 패시브, 전용 스킬, AI 성향 |
| 6 | 화면 흐름·마감 | 메뉴, 선택, 결과, 저장, 사운드, 최적화, 서명된 APK |

## 8. PHASE 1 구현 계획

### 8-1. 범위
- 플레이어 영웅 1명: **검성** (근접 물리). Q 돌진 베기(돌진 + 피해), W 회전베기(주변 광역 + 둔화), E 검기 방어(보호막), R 일섬(직선 돌진 + 큰 피해 + 기절)
- 적 AI 1명: **엘프 궁수** (원거리, 투사체 기본 공격). Q 관통 화살(직선 투사체), W 덫(지점 지정 + 기절), E 후퇴 도약(뒤로 이동), R 화살비(지점 광역 지속 피해)
- 두 영웅으로 근접·원거리, 대상·방향·지점·자신 조준, 피해·둔화·기절·보호막·돌진·지속 피해를 모두 한 번씩 검증합니다. 이 부분이 PHASE 5의 영웅 10명을 데이터만으로 추가할 수 있는지 확인하는 핵심입니다.
- 이동(가상 조이스틱), 기본 공격 버튼(사거리 안의 가장 가까운 적 자동 선택, 적을 눌러 직접 지정), Q/W/E/R 버튼(누르기 = 자동 조준, 끌기 = 조준 표시), 체력·마나·자연 회복, 쿨타임·마나 부족 표시, 피해 숫자, 카메라 부드러운 추적, 일시정지
- PHASE 1에서는 모든 스킬이 1단계로 열려 있고, 성장 시스템은 PHASE 3에서 붙입니다. 사망 후에는 간단히 5초 뒤 부활합니다(PHASE 2에서 정식 규칙으로 바꿈).
- 맵: 임시 타일로 만든 작은 아레나, 장애물 몇 개, 내비게이션 영역

### 8-2. 기술 설정
- Godot 4.7.x 안정 버전, 렌더러는 **Compatibility**(안드로이드 기기 호환성이 가장 넓음)
- 기준 해상도 1280×720, stretch mode `canvas_items`, aspect `expand`, 가로 고정, 안드로이드 몰입형 전체화면, 화면 꺼짐 방지(`DisplayServer.screen_set_keep_on`)
- 노치 대응: `DisplayServer.get_display_safe_area()`로 HUD 여백 조정
- 멀티터치: 조이스틱과 스킬 버튼을 동시에 누를 수 있도록 `InputEventScreenTouch`의 손가락 번호(index)로 구분하고, 마우스 흉내(emulate mouse from touch)는 끕니다.

### 8-3. 작업 단계 (각 단계마다 커밋)
1. 프로젝트 생성, 폴더 구조, `.gitignore`, 테스트 실행기, 임시 스프라이트 생성 스크립트
2. Enums, EventBus, DataRegistry, Config Resource, HeroData·SkillData·SkillEffect 클래스
3. Unit + Stats/Health/Mana/StatusEffect 컴포넌트, CombatManager 피해 파이프라인 → 단위 테스트
4. AttackComponent(근접·투사체), Projectile, SkillCaster, 효과 클래스 → 단위 테스트
5. hero.tscn, PlayerController, 가상 조이스틱, 스킬 버튼, 조준 표시
6. 단순 AIController (IDLE / CHASE / ATTACK / RETREAT, 스킬 사용) — PHASE 2 상태 머신의 뼈대
7. HUD(체력·마나 막대, 쿨타임, 피해 숫자, 머리 위 체력바), 카메라, 일시정지
8. 아레나 맵 + battle.tscn, 헤드리스 시뮬레이션 테스트
9. Android 내보내기 설정과 GitHub Actions APK 빌드, 휴대폰·태블릿 크기 화면 캡처

### 8-4. 테스트 기준

**자동 테스트 (작업 환경에서 헤드리스 Godot으로 실행, 모두 통과해야 완료)**

| 구분 | 확인 내용 |
|---|---|
| 데이터 | `data/` 의 모든 `.tres`가 오류 없이 불러와지고, 필수 필드(ID 중복 없음, 스킬 4개, 수치 배열 길이)가 맞음 |
| 피해 공식 | 방어력 0 → 100%, 100 → 50%, −50 → 약 133%, 마법 저항 동일, 치명타 배율, 보호막이 먼저 깎이고 남은 피해만 체력에 적용, 체력이 0 아래로 내려가지 않음, 사망 신호 1회만 발생 |
| 능력치 | 수정치 추가·제거 후 원래 값으로 정확히 복귀, 비율·고정 보너스 계산 순서 |
| 스킬 | 마나 부족 시 실패하고 마나·쿨타임 변화 없음, 쿨타임 중 실패, 성공 시 마나 차감·쿨타임 시작, 사거리 밖 대상 지정 실패 |
| 상태 효과 | 기절 중 이동·공격·시전 불가, 둔화 중 이동 속도 감소, 지속시간이 끝나면 원래대로, 같은 효과 중첩 규칙 |
| 공격 | 공격 속도에 맞는 공격 간격, 사거리 밖에서는 공격하지 않고 접근, 투사체가 대상에 맞으면 피해, 대상이 죽으면 투사체 소멸 |
| 시뮬레이션 | 플레이어 자리에 자동 조작 봇을 넣고 1대1을 게임 시간 180초 동안 빠르게 진행: 스크립트 오류 0개, 양쪽 모두 스킬 4개를 1번 이상 사용, 사망과 부활 1회 이상 발생, 끼어서 2초 이상 멈춘 적 없음 |
| 터치 입력 | 가짜 터치 이벤트로 조이스틱을 끌면 영웅이 그 방향으로 이동, 조이스틱을 누른 채 스킬 버튼을 누르면 둘 다 동작, 스킬 버튼 끌기 후 취소 영역에서 떼면 발동하지 않음 |

**화면 확인 (Xvfb로 실행해 캡처)**
- 휴대폰 20:9(2400×1080), 휴대폰 16:9(1920×1080), 태블릿 4:3(2048×1536) 크기에서 버튼이 화면 밖으로 나가거나 겹치지 않음
- 조이스틱·스킬 버튼이 손가락 크기(최소 약 9mm)를 넘음

**실제 기기 확인 (사용자 확인 필요, 작업 환경에서는 불가능)**
- APK가 설치되고 가로 전체화면으로 실행됨
- 조이스틱으로 이동하면서 동시에 스킬 버튼을 누를 수 있음
- 적 AI가 접근·공격·스킬 사용·후퇴를 하고, 서로 죽이고 부활함
- 일반적인 휴대폰에서 끊김 없이 동작(디버그 화면의 FPS 표시로 확인)

**PHASE 1 완료 보고에 포함할 것:** 수정 파일 목록, 구현 기능, 자동 테스트 결과(출력 그대로), 화면 캡처, 남은 작업과 알려진 문제
