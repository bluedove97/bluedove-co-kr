/**
 * 좌측 메뉴 · 메인 도구 카드 · '다른 도구' · sitemap.xml 이 모두 이 목록을 사용합니다.
 *
 * 새 메뉴 추가 방법
 * 1) 아래 그룹의 items 에 항목 추가 (href 는 반드시 / 로 끝나게)
 * 2) src/app/<그룹>/<slug>/page.tsx 생성 (기존 page.tsx 복사 후 수정)
 * 3) src/components/tools/<slug>/ 에 <Name>Tool.tsx(기능) 와 Guide.tsx(설명) 작성
 */

export type ToolItem = {
  /** URL (끝에 / 포함) */
  href: string;
  /** URL 마지막 조각 — 히어로 상단 "Developer Tools / json" 표시에 사용 */
  slug: string;
  /** 메뉴·카드 아이콘 자리에 들어가는 짧은 모노 글자 */
  icon: string;
  /** 메뉴 · 카드 · 다른 도구에 표시되는 이름 */
  label: string;
  /** 페이지 h1 */
  title: string;
  /** 메인 페이지 도구 카드 설명 */
  cardDesc: string;
  /** 도구 페이지 하단 '다른 도구' 설명 */
  relatedDesc: string;
};

export type MenuGroup = {
  key: 'developer' | 'daily' | 'playground';
  title: string;
  items: ToolItem[];
};

export const MENU: MenuGroup[] = [
  {
    key: 'developer',
    title: 'Developer Tools',
    items: [
      { href: '/developer/json/', slug: 'json', icon: '{ }', label: 'JSON Formatter / Validator', title: 'JSON Formatter / Validator', cardDesc: 'JSON 정렬·압축·문법 오류 위치 확인', relatedDesc: 'JSON 정렬·검증' },
      { href: '/developer/yaml/', slug: 'yaml', icon: 'YML', label: 'JSON ↔ YAML 변환', title: 'JSON ↔ YAML 변환', cardDesc: '쿠버네티스·compose 설정을 서로 변환', relatedDesc: 'JSON과 YAML 상호 변환' },
      { href: '/developer/base64/', slug: 'base64', icon: 'B64', label: 'Base64 Encoder / Decoder', title: 'Base64 Encoder / Decoder', cardDesc: '한글(UTF-8)·URL-safe·파일 Data URL', relatedDesc: '텍스트·파일 Base64 변환' },
      { href: '/developer/jwt/', slug: 'jwt', icon: 'JWT', label: 'JWT Decoder', title: 'JWT Decoder', cardDesc: 'Header·Payload 파싱, 만료 확인, 서명 검증', relatedDesc: '토큰 파싱·서명 검증' },
      { href: '/developer/url/', slug: 'url', icon: '%20', label: 'URL Encoder / Decoder', title: 'URL Encoder / Decoder', cardDesc: '퍼센트 인코딩과 쿼리스트링 분석', relatedDesc: 'URL 인코딩·쿼리 분석' },
      { href: '/developer/timestamp/', slug: 'timestamp', icon: 'TS', label: 'Timestamp Converter', title: 'Timestamp Converter', cardDesc: 'Unix 시간 ↔ KST·UTC·ISO 8601', relatedDesc: 'Unix 시간 ↔ 날짜 변환' },
      { href: '/developer/uuid/', slug: 'uuid', icon: 'ID', label: 'UUID Generator', title: 'UUID Generator', cardDesc: 'UUID v4 1~100개 한 번에, 하이픈 제거', relatedDesc: 'UUID v4 대량 생성' },
      { href: '/developer/image/', slug: 'image', icon: 'IMG', label: '이미지 압축 · 변환', title: '이미지 압축 · 변환 도구', cardDesc: 'JPG·PNG·WebP, 업로드 없이 압축', relatedDesc: 'JPG·PNG·WebP 압축' },
      { href: '/developer/diff/', slug: 'diff', icon: 'DIF', label: '텍스트 비교 · 변환', title: '텍스트 비교 · 변환 도구', cardDesc: 'Diff, 줄 정렬, 글자 수 세기', relatedDesc: 'Diff·줄 정렬·글자 수' },
    ],
  },
  {
    key: 'daily',
    title: 'Daily Life Tools',
    items: [
      { href: '/daily/overseas/', slug: 'overseas', icon: 'TZ', label: '해외시간 계산기', title: '해외시간 계산기', cardDesc: '한국 시간과 세계 도시 시차', relatedDesc: '한국 시간 ↔ 세계 시간' },
      { href: '/daily/age/', slug: 'age', icon: 'AGE', label: '만나이 계산기', title: '만나이 계산기', cardDesc: '만 나이, 연 나이, 띠, 다음 생일', relatedDesc: '만 나이·연 나이·띠' },
      { href: '/daily/fuel/', slug: 'fuel', icon: 'KM', label: '연비 계산기', title: '연비 계산기', cardDesc: 'km/L, 금액당 주행거리, km당 연료비', relatedDesc: 'km/L·금액당 주행거리' },
      { href: '/daily/qr/', slug: 'qr', icon: 'QR', label: 'QR 코드 만들기', title: 'QR 코드 만들기', cardDesc: 'URL·Wi-Fi·연락처·전화 QR, PNG·SVG 저장', relatedDesc: 'URL·Wi-Fi·연락처 QR 생성' },
    ],
  },
  {
    key: 'playground',
    title: 'Playground',
    items: [
      { href: '/playground/browser/', slug: 'browser', icon: 'FPS', label: '브라우저 성능 테스트', title: '브라우저 성능 테스트', cardDesc: '물고기를 늘려 가며 브라우저가 버티는지 측정', relatedDesc: '어항 물고기로 FPS 측정' },
      { href: '/playground/features/', slug: 'features', icon: 'API', label: '브라우저 기능 진단', title: '브라우저 기능 진단', cardDesc: 'WebGPU·저장소·암호화 등 70여 개 웹 기술 지원 검사', relatedDesc: '웹 API 지원 여부 진단' },
    ],
  },
];

export const ALL_TOOLS: ToolItem[] = MENU.flatMap((g) => g.items);

export function findTool(href: string): { group: MenuGroup; item: ToolItem } {
  for (const group of MENU) {
    const item = group.items.find((i) => i.href === href);
    if (item) return { group, item };
  }
  throw new Error(`menu.ts 에 등록되지 않은 페이지입니다: ${href}`);
}

/** 경로 비교용: 끝의 / 유무와 상관없이 같은 페이지로 본다 */
export function samePath(a: string, b: string): boolean {
  const n = (s: string) => (s.length > 1 ? s.replace(/\/+$/, '') : s);
  return n(a) === n(b);
}
