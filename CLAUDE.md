# my-apps

GitHub Pages로 배포되는 스마트폰 홈 화면용 HTML 앱 모음.
- 저장소: https://github.com/immanueladmin1985-dev/my-apps
- 주소: https://immanueladmin1985-dev.github.io/my-apps/

## 규칙
- 답변은 항상 한국어로.
- 새 앱은 폴더 하나로 만든다: `<앱이름>/index.html` → `https://immanueladmin1985-dev.github.io/my-apps/<앱이름>/`
- 각 앱에는 홈 화면 설정을 넣는다: viewport 메타, `manifest.webmanifest`(start_url/scope `./`, display `standalone`), `apple-touch-icon`(PNG), 아이콘 192/512 PNG. 루트 `index.html`을 참고.
- 루트 `index.html`은 앱 목록 겸 예제다. 새 앱을 만들면 목록에 링크를 추가한다.
- 파일을 만들거나 고친 뒤에는 묻지 않고 바로 커밋하고 푸시한다 (`git add -A; git commit -m "<한국어 요약>"; git push`). 푸시 후 1~2분 뒤 주소에 반영된다.
- gh 경로: `C:\Program Files\GitHub CLI\gh.exe`
