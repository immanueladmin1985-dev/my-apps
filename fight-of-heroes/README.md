# Fight of Heroes (가칭)

오프라인 3대3 2D 모바일 AOS 게임입니다. Godot 4.7, GDScript, 안드로이드 가로 화면용입니다.

- 설계: [docs/DESIGN.md](docs/DESIGN.md)
- PHASE 보고서: [PHASE 1](docs/PHASE1_REPORT.md), [PHASE 2](docs/PHASE2_REPORT.md)

## 실행과 시험

```bash
# Godot 4.7.2 실행 파일 경로를 GODOT 에 넣는다
GODOT=/경로/godot tools/run_tests.sh            # 전체 자동 시험 (1대1 시뮬레이션 포함)
GODOT=/경로/godot tools/run_tests.sh --fast     # 시뮬레이션 빼고
GODOT=/경로/godot tools/run_tests.sh --only=test_skills

# 화면 캡처 (Xvfb)
xvfb-run -a -s "-screen 0 2400x1080x24" godot --path . --rendering-driver opengl3 --windowed --resolution 2400x1080 \
  -- --screenshot=/tmp/shot.png --wait=7 --battle=blade_master [--autoplay] [--seed=3]
```

컴퓨터에서 실행하면 마우스로 터치를 흉내 낼 수 있고, WASD·방향키(이동), 스페이스(공격), Q/W/E/R 키도 쓸 수 있습니다.

## APK

`fight-of-heroes/**` 를 푸시하면 GitHub Actions(`fight-of-heroes-build.yml`)가 시험을 실행하고, 서명 전 APK 를 `fight-of-heroes-build` 브랜치에 올립니다. 서명 키는 저장소에 넣지 않고 Artifact "Fight of Heroes 서명 키"에 보관합니다.

```bash
git fetch origin +fight-of-heroes-build:refs/remotes/origin/fight-of-heroes-build
git archive origin/fight-of-heroes-build | tar -x -C <폴더>
python3 baseball-relay/tools/sign_apk.py <폴더>/fight-of-heroes-unsigned.apk <출력.apk> foh.jks <비밀번호>
```

## 데이터 추가

- 영웅: `data/heroes/<id>.tres` (HeroData) + `data/skills/<id>_q~r.tres` (SkillData). 전투 코드는 고치지 않습니다.
- 스킬 효과는 `scripts/skills/effects/` 의 효과(피해, 회복, 보호막, 상태 효과, 범위, 투사체, 돌진)를 조합합니다.
- 임시 그림은 코드로 그립니다(`scripts/combat/unit_visual.gd`). 실제 스프라이트는 `assets/heroes/` 에 넣고 HeroData 의 `sprite_frames` 에 연결합니다.

## 라이선스

- 글꼴: Noto Sans KR (SIL Open Font License 1.1, `assets/fonts/OFL-NotoSansKR.txt`). 자주 쓰는 한글 2350자로 줄여서 넣었습니다.
