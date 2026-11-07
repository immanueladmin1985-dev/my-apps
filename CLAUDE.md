# my-apps 저장소 작업 규칙

- 저장소: https://github.com/immanueladmin1985-dev/my-apps
- 주소: https://immanueladmin1985-dev.github.io/my-apps/
- 답변은 항상 한국어로.

이 저장소에는 빌드 없이 브라우저에서 바로 동작하는 웹 앱(게임, 연습 도구 등)을 앱마다 폴더 하나씩 만든다. 예: `bible-marble/`, `piano/`
- 작은 앱은 HTML 파일 하나로 만들어도 된다. 커지면 `bible-marble/`처럼 `index.html` + `css/` + `js/`(일반 `<script>`, 빌드 없음)로 나눈다.
- GitHub Pages(`main` 브랜치)로 배포한다. 주소: https://immanueladmin1985-dev.github.io/my-apps/<앱 폴더>/
- 채팅에서 새 HTML 앱을 만들 때도 따로 말하지 않아도 이 저장소에 새 앱 폴더로 만들어 `main`에 올리고, 루트 앱 목록(`index.html`)과 `README.md`에 추가한다(사용자 요청).
- 파일을 만들거나 고친 뒤에는 묻지 않고 바로 커밋하고 푸시한다 (`git add -A; git commit -m "<한국어 요약>"; git push`). 푸시 후 1~2분 뒤 주소에 반영된다.
- gh 경로: `C:\Program Files\GitHub CLI\gh.exe`
- 파일을 추가·변경하면 앱의 `sw.js` 캐시 목록과 캐시 이름(버전)도 함께 고친다.
- 외부 라이브러리는 `vendor/`에 넣고 라이선스 파일을 같이 둔다.
- 저작권이 있는 본문(예: 개역개정 성경)은 저장소에 넣지 않는다. 사용자가 자기 파일을 불러와 기기 안에만 저장하게 한다.

## 모든 웹 앱에 기본으로 넣을 기능 (사용자 요청 사항)

새 앱을 만들거나 기존 앱을 크게 고칠 때, 따로 말하지 않아도 아래 두 기능을 반드시 넣는다.

### 1. 홈 화면 설치
- 앱 폴더에 `manifest.webmanifest`, `icon-192.png`, `icon-512.png`를 둔다. 매니페스트에는 `display: "fullscreen"`, `display_override: ["fullscreen","standalone"]`, 한국어 `name`/`short_name`, 테마 색을 넣는다. `start_url`은 넣지 않는다(Artifact 주소에서도 동작하도록).
- `<head>`에 manifest, icon, apple-touch-icon, `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` 태그를 넣는다. Artifact로 게시하면 태그가 body로 들어가므로, 스크립트에서 이 태그들을 `document.head`로 옮긴다.
- 첫 화면(처음 실행 화면) 위쪽에 "홈 화면에 설치" 안내 배너를 띄운다. 버튼: 설치하기 / 전체화면 / 다음에. "다음에"를 누르면 기억해서 다시 띄우지 않고, 첫 화면 아래와 설정 메뉴에는 "홈 화면에 설치하기" 버튼을 계속 둔다.
- `beforeinstallprompt`를 받았으면 바로 설치 창을 띄우고, 없으면 기기별 설치 방법(아이패드·아이폰 Safari 공유 버튼, 안드로이드 크롬 ⋮ 메뉴, 삼성 인터넷 ≡ 메뉴, PC 크롬·엣지 설치 아이콘)을 안내한다.
- 홈 화면 앱으로 열렸을 때(`display-mode: standalone/fullscreen`, `navigator.standalone`)는 설치 안내와 전체화면 버튼을 숨긴다. 단, 크롬은 브라우저에서 전체화면 버튼(Fullscreen API)으로 전체화면이 되어도 `display-mode: fullscreen`을 맞다고 하므로, 처음 열렸을 때의 값을 저장해 두고 `document.fullscreenElement`가 있는 동안에는 그 저장한 값으로 판단한다(안 그러면 설치하지 않았는데 ‘홈 화면 앱으로 실행 중’이라고 나옴).

### 2. 전체화면
- 헤더에 전체화면 버튼(켜기/끄기 아이콘 전환, `fullscreenchange`·`webkitfullscreenchange` 처리)을 둔다. 게임처럼 화면을 최대한 넓게 써야 하는 화면에서는 헤더를 숨기고 전체화면 켜기·끄기를 설정 메뉴(화면)에 둔다(사용자 요청).
- 설정에 "자동 전체화면"(기본 켬)을 두고, 켜져 있으면 화면을 처음 누를 때 전체화면으로 바꾼다. 사용자가 버튼으로 직접 끈 뒤에는 자동으로 다시 켜지 않는다.
- 전체화면이 막힌 환경(iframe, 아이폰 등)에서는 버튼을 눌렀을 때 홈 화면 설치 방법을 안내한다.
- 게임처럼 오래 켜 두는 앱은 Wake Lock으로 화면이 꺼지지 않게 한다(실패해도 조용히 넘어간다).

## 그 밖의 관례
- UI 문구는 한국어로 쓰고, 휴대폰·태블릿(가로 화면 포함)을 먼저 고려한다.
- 사용자 설정과 진행 상황은 localStorage에 저장하되, 모든 읽기·쓰기를 try/catch로 감싼다.
- `alert`/`confirm`/`prompt` 대신 페이지 안의 창(모달)을 쓴다.
- 여러 기기로 하는 앱은 화면 버튼만 숨기지 말고, 상태를 바꾸는 요청마다 보낸 기기의 권한을 검사한다. 정답처럼 공개하면 안 되는 정보는 그 정보를 볼 수 있는 기기에만 보낸다.
- 커밋하기 전에 Playwright(`/opt/pw-browsers/chromium`)로 휴대폰·태블릿 크기 화면을 확인하고, 게임이라면 컴퓨터끼리 끝까지 자동 진행해서 스크립트 오류가 없는지 확인한다.

## 비공개 앱 (사용자 요청)
- 사용자만 보는 앱은 이 공개 저장소에 올리지 않는다. Claude 비공개 페이지(Artifact)에 게시하고, 앱 목록(`index.html`)과 `README.md`에도 넣지 않는다.
- 다이스바운드(DICEBOUND 운명의 주사위)가 여기에 해당한다. Artifact 목록에서 "DICEBOUND · 운명의 주사위"를 찾는다. 게임 파일과 함께 개발용 파일(README, tools, tests, 원래 index.html 은 `index.dev.html`)도 그 Artifact 에 들어 있다.
- 고칠 때: Artifact 를 read 해서 파일을 작업 폴더에 받고, `index.dev.html` 을 `index.html` 로 되돌려 고치고 점검한 뒤, `python3 tools/make_artifact.py <출력 폴더>` 로 묶어 같은 Artifact URL 에 다시 게시한다(한 번에 255개까지라 두 번에 나눠 올린다). 이 저장소에는 커밋하지 않는다.
- 개인용 안드로이드 앱(APK)도 만든다: `cd tools/apk && python3 build_apk.py ../.. <출력.apk> --version-code <이전+1>`. 서명 키는 Artifact 의 `tools/apk/dicebound-release.jks.b64.txt` 와 `keystore.txt` 로 보관한다(같은 키라야 기존 앱 위에 업데이트되고 저장 기록이 남는다). APK 는 어디에도 올리지 않고 사용자에게 파일로만 준다.

## 야구 중계 알림 (`baseball-relay/`, 개인용 안드로이드 앱)
- 사용자 요청으로 이 공개 저장소에 두되, 앱 목록(`index.html`)과 `README.md`에는 넣지 않는다.
- 폰 앱(`app/`)과 갤럭시 워치 앱(`wear/`, 타일·컴플리케이션)은 applicationId `kr.immanuel.relay` 와 서명 키가 같아야 한다.
- 빌드: `baseball-relay/**` 를 main 에 푸시하면 GitHub Actions(`baseball-relay-build.yml`)가 서명 전 APK 를 `baseball-relay-build` 브랜치에 올린다. 받기: `git fetch origin baseball-relay-build:refs/remotes/origin/baseball-relay-build && git archive origin/baseball-relay-build | tar -x -C <폴더>`.
- 서명: Artifact "야구 중계 알림 서명 키"(https://claude.ai/artifact/F8xwtcNRALfnEpCGmzkgrK)에서 `relay.jks.b64.txt`, `keystore.txt` 를 받아 `python3 baseball-relay/tools/sign_apk.py <입력> <출력> relay.jks <비밀번호>`. 키는 저장소에 넣지 않는다. APK 는 사용자에게 파일로만 준다.
- 네이버 중계 API(`api-gw.sports.naver.com`)는 해외 IP(GitHub, 작업 환경)를 막는다. 응답 구조 확인은 앱의 "진단 데이터 공유" 파일로 한다. JSON 구조 지식은 `Naver.kt`, 알림 판단은 `RelayEngine.kt`(단위 테스트 있음)에 모은다.

## 하루 도우미 안드로이드 앱 (`haru-helper/android/`, 개인용)
- 웹 앱(`haru-helper/index.html`)을 WebView 로 그대로 띄운다(빌드할 때 assets 로 복사). 화면을 고치면 웹과 앱이 같이 바뀐다. 웹은 `window.HaruNative` 가 있으면 요약을 `sync` 로 보내고, 위젯·워치·알림에서 누른 동작을 `takeActions` 로 가져와 반영한다. 동작 규칙은 웹의 `applyAction` 과 `shared/java/.../Snap.kt`(단위 테스트 있음)를 함께 맞춘다.
- 폰 앱(`app/`)과 워치 앱(`wear/`)은 applicationId `kr.immanuel.haru` 와 서명 키가 같아야 한다.
- 빌드: main 에 푸시하면 `haru-helper-build.yml` 이 서명 전 APK 를 `haru-helper-build` 브랜치에 올린다. 받기: `git fetch origin +haru-helper-build:refs/remotes/origin/haru-helper-build && git archive origin/haru-helper-build | tar -x -C <폴더>`.
- 서명: Artifact "하루 도우미 서명 키"에서 `haru.jks.b64.txt`, `keystore.txt` 를 받아 `python3 baseball-relay/tools/sign_apk.py <입력> <출력> haru.jks <비밀번호>`. 키는 저장소에 넣지 않는다. APK 는 사용자에게 파일로만 준다.

## TV 한번에 (`tv-remote/`, 개인용 안드로이드 앱)
- 구글 TV(안드로이드 TV 리모컨 v2 프로토콜, 6466/6467 포트)와 헤이홈 레시피(square.hej.so 웹 대시보드의 비공식 요청)를 "모드" 하나로 묶어 실행한다. 앱 목록(`index.html`)과 `README.md`에는 넣지 않는다.
- 화면은 `app/src/main/assets/web/index.html`(WebView, `window.TvNative`), 기기 제어는 Kotlin. 구글 TV 메시지 모양은 `shared/java/.../AtvWire.kt`(파이썬 androidtvremote2 로 만든 기대값 단위 테스트 있음), 헤이홈 요청은 `Hej.kt`.
- 입구: 모드 화면, 홈 화면 위젯(앞 4개), 앱 바로가기, 빠른 설정 타일, 런처 별칭 "티비 켜기"/"티비 끄기"(제미나이 음성용), 워치 타일·앱(폰이 대신 실행).
- 폰 앱(`app/`)과 워치 앱(`wear/`)은 applicationId `kr.immanuel.tvremote` 와 서명 키가 같아야 한다.
- 빌드: main 에 푸시하면 `tv-remote-build.yml` 이 서명 전 APK 를 `tv-remote-build` 브랜치에 올린다. 받기: `git fetch origin +tv-remote-build:refs/remotes/origin/tv-remote-build && git archive origin/tv-remote-build | tar -x -C <폴더>`.
- 서명: Artifact "TV 한번에 서명 키"(https://claude.ai/artifact/3KQgLZh7twWNaF2twLVMJp)에서 `tvremote.jks.b64.txt`, `keystore.txt` 를 받아 `python3 baseball-relay/tools/sign_apk.py <입력> <출력> tvremote.jks <비밀번호>`. 키는 저장소에 넣지 않는다. APK 는 사용자에게 파일로만 준다.

## Fight of Heroes (`fight-of-heroes/`, Godot 4 안드로이드 게임)
- 오프라인 3대3 2D AOS. Godot 4.7.2 + GDScript. 설계는 `fight-of-heroes/docs/DESIGN.md`, PHASE 단위로 작업하고 PHASE 마다 `docs/PHASE<n>_REPORT.md` 를 남긴다. 앱 목록(`index.html`)과 `README.md`에는 넣지 않는다.
- 영웅·스킬·아이템은 `data/*.tres` 로만 추가하고 전투 코드는 고치지 않는다. 스킬 효과는 `scripts/skills/effects/` 를 조합한다.
- 시험: Godot 을 받아 `GODOT=<경로> fight-of-heroes/tools/run_tests.sh` (스크립트 오류가 하나라도 있으면 실패). 화면 캡처는 Xvfb 에서 `-- --screenshot=<경로> --battle=blade_master` (README 참고).
- 빌드: `fight-of-heroes/**` 를 푸시하면 `fight-of-heroes-build.yml` 이 시험 후 서명 전 APK 를 `fight-of-heroes-build` 브랜치에 올린다. 받기: `git fetch origin +fight-of-heroes-build:refs/remotes/origin/fight-of-heroes-build && git archive origin/fight-of-heroes-build | tar -x -C <폴더>`.
- 서명: Artifact "Fight of Heroes 서명 키"(https://claude.ai/artifact/K8h5Qv3QjKmRNJmDLH2W4f)에서 `foh.jks.b64.txt`, `keystore.txt` 를 받아 `python3 baseball-relay/tools/sign_apk.py <입력> <출력> foh.jks <비밀번호>`. 키는 저장소에 넣지 않는다. APK 는 사용자에게 파일로만 준다.
