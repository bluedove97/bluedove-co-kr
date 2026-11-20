# bluedove-co-kr

Bluedove's Developer Playground: 백엔드 없이 정적 파일만으로 동작하는 개발 도구와 일상 계산기 모음. https://bluedove.co.kr

## 로컬 실행

```powershell
node .\serve.mjs
# http://localhost:3000
```

`serve.mjs`를 수정했다면(woff2 MIME 타입, 404 페이지 처리 추가) 실행 중인 서버를 끄고 다시 실행해야 합니다.

## 폴더 구조

```
index.html                 메인 (사이트 소개, 개발자 소개, pixi 러너, 프로젝트 이력)
404.html                   404 페이지 (.htaccess ErrorDocument)
sitemap.xml / robots.txt   SEO
.htaccess                  Apache 설정 (MIME, 캐시, 압축, _legacy 차단)
css/site.css               공통 스타일 (design.md 토큰 → CSS 변수)
css/home.css, browser.css  페이지 전용 스타일
js/site.js                 공통 스크립트 (모바일 메뉴, 복사, 토스트, 탭)
js/home.js                 메인 러너 (pixi.html 을 반응형으로 재구성)
js/data.js                 프로젝트 이력 데이터 (러너 · 이력 목록에서 사용)
js/tools/*.js              도구별 스크립트
js/vendor/js-yaml.min.js   js-yaml 4.1.0 (MIT)
js/pixi/                   PixiJS v3 + pixi-spine + 캐릭터 리소스
fonts/                     마루 부리(300/400/600/700), IBM Plex Mono(400/500/600) — SIL OFL
developer/{json,yaml,base64,jwt,url,timestamp,image,diff}/index.html
daily/{overseas,age,fuel}/index.html
playground/browser/index.html
_legacy/                   예전 사이트 파일 백업 (git·FTP 업로드 제외)
```

## FTP 배포

1. 아래 파일과 폴더를 웹 루트(`public_html` 등)에 업로드합니다.
   - `index.html`, `404.html`, `sitemap.xml`, `robots.txt`, `ads.txt`, `favicon.ico`, `.htaccess`
   - `css/`, `js/`, `fonts/`, `image/`, `developer/`, `daily/`, `playground/`
2. 업로드하지 않을 것: `_legacy/`, `tmp/`, `.claude/`, `CLAUDE.md`, `design.md`, `serve.mjs`, `README.md`, `.git/`, `pixi.html`(메인에 통합됨)
3. 서버에 예전 파일(`/css/mstyle.css`, `/js/proto.js`, `stack.html` 등)이 남아 있으면 지워도 됩니다.
4. FTP 프로그램에서 `.htaccess`처럼 점으로 시작하는 파일이 숨겨져 있으면 "숨김 파일 표시"를 켜세요.
5. 업로드 후 `.htaccess` 때문에 500 오류가 나면 호스팅에서 막아 둔 지시어가 있는 것입니다. `Options -Indexes` 줄을 먼저 지워 보세요.
6. SSL이 적용되어 있다면 `.htaccess`의 https·non-www 리다이렉트 4줄 주석을 해제하세요.

CSS·JS를 고친 뒤에는 각 HTML의 `?v=20261121` 값을 바꿔야 방문자 브라우저 캐시가 갱신됩니다.


