# bluedove-co-kr

Bluedove's Developer Playground: 백엔드 없이 브라우저에서만 동작하는 개발 도구와 일상 계산기 모음. https://bluedove.co.kr

Next.js 16 (App Router) · React 19 · TypeScript, 정적 빌드(`output: 'export'`)로 웹호스팅에 배포합니다.

## 로컬 실행

```powershell
npm install        # 최초 1회
npm run dev        # 개발 서버 http://localhost:3000
```

## 빌드 · 확인

```powershell
npm run build      # out/ 폴더에 정적 HTML 생성 (postbuild 후처리 자동 실행)
npm run start      # out/ 을 로컬 서버로 확인 http://localhost:3000
npm run typecheck  # 타입 검사
```

## 폴더 구조

```
src/app/                    라우팅 · 페이지 (메인, 도구 12개, 404, sitemap.xml)
src/components/layout/      헤더 · 좌측 메뉴 · 푸터 · 도구 페이지 틀(ToolLayout)
src/components/common/      광고 자리, JSON-LD, 상태 메시지, 탭, 세그먼트, 복사 버튼
src/components/home/        메인 러너 (pixi.html 컨셉)
src/components/tools/<slug> 도구 기능(<Name>Tool.tsx) + 설명 · FAQ(Guide.tsx)
src/data/menu.ts            메뉴 목록 (메뉴 · 메인 카드 · 다른 도구 · sitemap 공용)
src/data/history.ts         프로젝트 이력
src/lib/                    사이트 상수(AdSense 설정 포함), SEO 헬퍼
src/styles/                 site.css(공통 · design.md 토큰), tools.css, home.css, browser.css
src/utils/, hooks/, types/  공통 유틸
public/                     .htaccess, ads.txt, robots.txt, favicon, fonts/, image/, js/pixi/, js/image-worker.js
scripts/postbuild.mjs       Next 16 정적 빌드 prefetch 파일 경로 보정
```

새 도구 추가 방법은 `CLAUDE.md`의 "새 메뉴(도구) 추가 방법"을 보세요.

## 빌드 및 배포 (cafe24 등 웹호스팅)

1. `npm run build` 를 실행합니다. 끝에 `[postbuild] prefetch 세그먼트 파일 N개 경로 보정 완료` 가 보이면 정상입니다.
2. `out/` 폴더 **안의 내용 전부**를 웹 루트(`www` 또는 `public_html`)에 업로드합니다. (`out` 폴더 자체가 아니라 그 안의 파일 · 폴더)
   - `.htaccess` 는 점으로 시작하는 숨김 파일입니다. FTP 프로그램에서 "숨김 파일 표시"를 켜고 함께 올리세요.
   - `_next/` 폴더도 반드시 올려야 합니다 (JS · CSS).
3. 서버에 1차 버전(순수 HTML)의 `css/`, `js/site.js`, `js/home.js`, `js/data.js`, `js/tools/`, `js/vendor/`, `sitemap.xml`(덮어쓰기됨), `serve.mjs` 가 남아 있다면 지워도 됩니다. `js/pixi/`, `fonts/`, `image/` 는 새 빌드에도 있으니 덮어쓰면 됩니다.
4. 업로드하지 않을 것: 저장소의 `src/`, `node_modules/`, `.next/`, `_legacy/`, `tmp/`, `.claude/` 등 (`out/` 밖의 파일은 올리지 않습니다)
5. 업로드 후 500 오류가 나면 호스팅에서 막아 둔 지시어가 있는 것입니다. `.htaccess` 의 `Options -Indexes` 줄, 맨 아래 `<If ...>` 블록 순서로 지워 보세요.
6. SSL 이 적용되어 있다면 `public/.htaccess` 의 https · non-www 리다이렉트 4줄 주석을 해제하고 다시 빌드하세요.


