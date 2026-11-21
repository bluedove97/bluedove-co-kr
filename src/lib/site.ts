/* 사이트 전역 상수 */

export const SITE_URL = 'https://bluedove.co.kr';
export const SITE_NAME = "Bluedove's Developer Playground";
export const SITE_DESCRIPTION =
  'JSON 포매터, JWT 디코더, Base64·URL 인코더, 타임스탬프 변환, 이미지 압축, 텍스트 Diff, QR code 생성, 만나이·연비·해외시간 계산기까지. 설치 없이 브라우저에서 바로 쓰는 개발자 실험실입니다.';
export const OG_IMAGE = { url: '/image/bluedove_welcome.png', width: 400, height: 400 };

/**
 * Google AdSense (승인 후 사용)
 * 1) ADSENSE_CLIENT 에 'ca-pub-XXXXXXXXXXXXXXXX' 입력
 * 2) ADSENSE_SLOTS 에 광고 단위(slot) ID 입력
 * 3) ADSENSE_POSITIONS 로 위치별 사용 여부 선택 (true: 사용 / false: 사용 안 함)
 * → 레이아웃에 AdSense 스크립트가 들어가고 <html class="ads-enabled"> 가 붙어 .ad-slot 영역이 표시됩니다.
 * (게시자 ID 는 페이지에 공개되는 값이라 비밀키가 아닙니다)
 */
export type AdPosition = 'top' | 'bottom';

export const ADSENSE_CLIENT = 'ca-pub-5592443853103761';
export const ADSENSE_SLOTS: Record<AdPosition, string> = { top: '1831740503', bottom: '9853297803' };

/** 위치별 광고 사용 여부 — false 인 위치는 광고 자리 자체를 출력하지 않음 (모든 페이지 공통) */
export const ADSENSE_POSITIONS: Record<AdPosition, boolean> = {
  top: false, // 상단: 히어로 아래 · 도구 위 (메인은 본문 맨 위)
  bottom: true, // 하단: 사용 방법·FAQ 아래 · 다른 도구 위 (메인은 본문 맨 아래)
};

/**
 * 메인 페이지(/) 전용 광고 사용 여부 — 위 ADSENSE_POSITIONS 와 둘 다 true 여야 표시
 * (메인은 상단 광고가 히어로 바로 위에 붙어 레이아웃이 어색해서 기본 off)
 */
export const ADSENSE_HOME_POSITIONS: Record<AdPosition, boolean> = {
  top: false, // 메인 상단: 본문 맨 위 (히어로 위)
  bottom: true, // 메인 하단: 프로젝트 이력 아래
};

/** 광고 스크립트를 넣을지 여부: 게시자 ID 가 있고, 켜진 위치가 하나 이상일 때 */
export const ADSENSE_ACTIVE = Boolean(ADSENSE_CLIENT) && Object.values(ADSENSE_POSITIONS).some(Boolean);
