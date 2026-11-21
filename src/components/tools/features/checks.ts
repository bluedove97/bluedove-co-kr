/* 브라우저 기능 진단 — 검사 정의 · 실행기 (클라이언트에서만 호출)
 *
 * 원칙 (tmp/BrowserChecker.md)
 * - 가능한 항목은 API 존재만 보지 않고 실제로 만들어 보거나 간단한 작업을 실행한다.
 * - 권한(카메라 · 마이크 · 위치 등)은 요청하지 않고 현재 상태만 읽는다.
 * - 저장소 검사는 임의의 고유 키를 쓰고 끝나면 반드시 지운다.
 *
 * 상태
 *   pass        API가 있고 실제 실행도 성공
 *   fail        API는 있지만 실행에 실패
 *   unsupported 브라우저가 API 자체를 제공하지 않음
 *   blocked     권한 · 정책 · 보안 컨텍스트 때문에 쓸 수 없음
 *   na          이 환경에는 해당하지 않음
 *   info        수치 · 환경 정보
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Status = 'pass' | 'fail' | 'unsupported' | 'blocked' | 'na' | 'info';
export type CheckResult = { status: Status; value?: string; note?: string };

export type Env = {
  browser: string;
  browserVersion: string;
  browserSource: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  isIPhone: boolean;
  userAgent: string;
  secure: boolean;
};

export type Check = {
  id: string;
  name: string;
  /** 검사 방법 */
  method: string;
  /** 추가 설명 */
  desc: string;
  /** 참고 문서 (MDN) */
  ref?: string;
  timeout?: number;
  run: (env: Env) => CheckResult | Promise<CheckResult>;
};

export type Category = { id: string; name: string; ko: string; checks: Check[] };

/* ---------- 결과 helpers ---------- */
const pass = (value?: string, note?: string): CheckResult => ({ status: 'pass', value, note });
const fail = (value?: string, note?: string): CheckResult => ({ status: 'fail', value, note });
const unsup = (note?: string): CheckResult => ({ status: 'unsupported', value: 'Unsupported', note });
const blocked = (value?: string, note?: string): CheckResult => ({ status: 'blocked', value, note });
const na = (note?: string, value = 'N/A'): CheckResult => ({ status: 'na', value, note });
const info = (value: string, note?: string): CheckResult => ({ status: 'info', value, note });

const INSECURE = 'HTTPS(보안 컨텍스트)가 아닌 페이지라 브라우저가 이 API를 숨겼습니다.';
/** API 가 없을 때: 보안 컨텍스트가 아니면 BLOCKED, 맞으면 UNSUPPORTED */
const missing = (note?: string): CheckResult => (isSecureContext ? unsup(note) : blocked('Not Available', INSECURE));

const errName = (e: unknown) => (e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '');
const errMsg = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e));

/** 예외 → 결과. 보안 · 권한 오류는 BLOCKED, 그 외는 FAIL */
export function fromError(e: unknown): CheckResult {
  const name = errName(e);
  const text = [name, errMsg(e)].filter(Boolean).join(': ');
  if (name === 'SecurityError' || name === 'NotAllowedError') return blocked('Blocked', text);
  if (name === 'TimeoutError') return fail('Timeout', '정해진 시간 안에 응답이 없었습니다.');
  return fail('Error', text);
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error('timeout');
      e.name = 'TimeoutError';
      reject(e);
    }, ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

const rand = () => Math.random().toString(36).slice(2, 10);
const tmpKey = () => 'bd-fc-' + rand();
const N = () => navigator as any;
const W = () => window as any;
const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;

function bytes(n: number): string {
  if (!isFinite(n) || n <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return (n / 1024 ** i).toFixed(i ? 1 : 0) + ' ' + u[i];
}

function blobUrl(code: string): string {
  return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
}

/** 화면 밖에 붙이는 임시 요소 (Observer 검사용) */
function tempEl(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;';
  document.body.appendChild(d);
  return d;
}

type PermState = 'granted' | 'denied' | 'prompt' | 'unknown';
const PERM_KO: Record<PermState, string> = { granted: '허용됨', denied: '거부됨', prompt: '요청 전', unknown: '확인 불가' };
async function perm(name: string): Promise<PermState> {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const s = await navigator.permissions.query({ name } as PermissionDescriptor);
    return s.state as PermState;
  } catch {
    return 'unknown';
  }
}

const MDN = 'https://developer.mozilla.org/en-US/docs/Web/';

/* =========================================================
   환경 정보 (브라우저 · OS · 기기)
   ========================================================= */
const BRAND_MAP: Record<string, string> = { 'Google Chrome': 'Chrome', 'Microsoft Edge': 'Edge', 'Opera GX': 'Opera GX' };

const UA_RULES: [RegExp, string][] = [
  [/Whale\/([\d.]+)/, 'Naver Whale'],
  [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Edge'],
  [/(?:OPR|OPT)\/([\d.]+)/, 'Opera'],
  [/FxiOS\/([\d.]+)/, 'Firefox'],
  [/CriOS\/([\d.]+)/, 'Chrome'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
];

export async function detectEnv(): Promise<Env> {
  const ua = navigator.userAgent;
  const uad = N().userAgentData;
  let hi: any = null;
  if (uad?.getHighEntropyValues) {
    try {
      hi = await withTimeout(uad.getHighEntropyValues(['fullVersionList', 'platformVersion', 'model']), 1500);
    } catch {
      hi = null;
    }
  }

  /* 브라우저: Client Hints 우선 */
  let browser = '';
  let browserVersion = '';
  let browserSource = 'User-Agent 문자열 (보조)';
  const list: { brand: string; version: string }[] = hi?.fullVersionList || uad?.brands || [];
  const named = list.filter((b) => !/not.?a.?brand/i.test(b.brand));
  const pick = named.find((b) => b.brand !== 'Chromium') || named[0];
  if (pick) {
    browser = BRAND_MAP[pick.brand] || pick.brand;
    browserVersion = pick.version;
    browserSource = hi?.fullVersionList ? 'User-Agent Client Hints (고정밀)' : 'User-Agent Client Hints';
  }
  // Client Hints 가 Chrome/Chromium 으로만 보이는 파생 브라우저는 UA 로 보정
  const uaHit = UA_RULES.map(([re, name]) => ({ m: ua.match(re), name })).find((x) => x.m);
  if (!browser || (uaHit && /Whale|Samsung/.test(uaHit.name) && /Chrom/.test(browser))) {
    if (uaHit) {
      browser = uaHit.name;
      browserVersion = uaHit.m![1];
      browserSource = browserSource.startsWith('User-Agent Client') ? 'Client Hints + User-Agent 보정' : 'User-Agent 문자열 (보조)';
    } else {
      browser = '알 수 없음';
    }
  }

  /* OS */
  const touch = navigator.maxTouchPoints || 0;
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  let os = '';
  const plat: string = uad?.platform || '';
  const pv: string = hi?.platformVersion || '';
  if (plat === 'Windows' && pv) {
    const major = parseInt(pv, 10);
    os = major >= 13 ? 'Windows 11' : major > 0 ? 'Windows 10' : 'Windows 7/8';
  } else if (plat === 'macOS' && pv) os = 'macOS ' + pv.split('.').slice(0, 2).join('.');
  else if (plat === 'Android' && pv) os = 'Android ' + pv;
  else if (plat === 'Chrome OS' || plat === 'ChromeOS') os = 'ChromeOS';
  else if (isIPhone || isIPad) {
    const v = ua.match(/OS (\d+)[_.](\d+)/);
    os = (isIPad ? 'iPadOS' : 'iOS') + (v ? ` ${v[1]}.${v[2]}` : '');
  } else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)![1];
  else if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else os = plat || '알 수 없음';

  /* 기기 종류 */
  let deviceType: Env['deviceType'] = 'Desktop';
  if (isIPad || (/Android/.test(ua) && !/Mobile/.test(ua))) deviceType = 'Tablet';
  else if (uad?.mobile || /Mobi|iPhone|iPod|Android/.test(ua)) deviceType = 'Mobile';

  return { browser, browserVersion, browserSource, os, deviceType, isIPhone, userAgent: ua, secure: isSecureContext };
}

/* =========================================================
   공통 검사 함수
   ========================================================= */
function webStorage(kind: 'localStorage' | 'sessionStorage'): CheckResult {
  let s: Storage | undefined;
  try {
    s = window[kind];
  } catch (e) {
    return fromError(e);
  }
  if (!s) return unsup();
  const k = tmpKey();
  try {
    s.setItem(k, 'ok');
    const v = s.getItem(k);
    s.removeItem(k);
    return v === 'ok' ? pass('Pass', '고유 키로 쓰기 · 읽기 · 삭제 성공') : fail('Fail', '저장한 값을 다시 읽지 못했습니다.');
  } catch (e) {
    if (errName(e) === 'QuotaExceededError') return fail('Fail', '저장 공간이 없거나 시크릿 모드 제한으로 쓰지 못했습니다.');
    return fromError(e);
  }
}

function glCheck(kind: 'webgl' | 'webgl2'): CheckResult {
  const ctor = kind === 'webgl' ? 'WebGLRenderingContext' : 'WebGL2RenderingContext';
  if (!(ctor in window)) return unsup();
  const gl = document.createElement('canvas').getContext(kind) as WebGLRenderingContext | null;
  if (!gl) return fail('Fail', '컨텍스트를 만들지 못했습니다. 하드웨어 가속이 꺼져 있거나 GPU · 드라이버가 차단 목록에 있을 수 있습니다.');
  const ver = String(gl.getParameter(gl.VERSION));
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return pass(`최대 텍스처 ${max}px`, ver);
}

function sensor(ctorName: string, env: Env): CheckResult {
  if (!(ctorName in window)) return unsup();
  if (env.deviceType === 'Desktop') return na('API는 있지만 센서가 없는 데스크톱 환경이라 해당하지 않습니다.', 'N/A (Desktop)');
  const needsPerm = typeof W()[ctorName]?.requestPermission === 'function';
  return pass('API 지원', needsPerm ? 'iOS는 사용자 동작 뒤 권한을 요청해야 값을 읽을 수 있습니다. 이 검사는 요청하지 않았습니다.' : '센서 값은 읽지 않고 API만 확인했습니다.');
}

function canPlay(el: HTMLMediaElement, list: [string, string][]): string[] {
  return list.filter(([, t]) => el.canPlayType(t) !== '').map(([n]) => n);
}

/* 2 + 3 = 5 를 계산하는 최소 WebAssembly 모듈 (export "add") */
const WASM_ADD = [
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x03, 0x02, 0x01, 0x00, 0x07, 0x07, 0x01, 0x03,
  0x61, 0x64, 0x64, 0x00, 0x00, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
];

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/* =========================================================
   검사 목록
   ========================================================= */
export const CATEGORIES: Category[] = [
  /* ---------------- A. Browser & Platform ---------------- */
  {
    id: 'platform',
    name: 'Browser & Platform',
    ko: '브라우저 및 OS 정보',
    checks: [
      {
        id: 'browser-name',
        name: 'Browser Name',
        method: 'User-Agent Client Hints(navigator.userAgentData) 우선, 없으면 User-Agent 문자열 분석',
        desc: 'UA 문자열은 브라우저마다 다른 브라우저를 흉내 내는 경우가 많아 Client Hints를 먼저 봅니다. Firefox · Safari는 Client Hints를 제공하지 않아 UA로 판별합니다.',
        ref: MDN + 'API/User-Agent_Client_Hints_API',
        run: (env) => info(env.browser, '판별 근거: ' + env.browserSource),
      },
      {
        id: 'browser-version',
        name: 'Browser Version',
        method: 'userAgentData.getHighEntropyValues(["fullVersionList"]) 우선, 없으면 UA',
        desc: 'Client Hints 고정밀 값은 전체 버전(예: 131.0.6778.86)을 알려 줍니다. UA 문자열은 개인정보 보호를 위해 일부 숫자를 0으로 고정한 경우가 있습니다.',
        ref: MDN + 'API/NavigatorUAData/getHighEntropyValues',
        run: (env) => info(env.browserVersion || '확인 불가', '판별 근거: ' + env.browserSource),
      },
      {
        id: 'os',
        name: 'Operating System',
        method: 'Client Hints platform · platformVersion, 없으면 UA',
        desc: 'Windows 10과 11은 UA 문자열이 같아서 Client Hints의 platformVersion(13 이상이면 Windows 11)으로만 구분할 수 있습니다. 터치를 지원하는 Mac 표기는 iPadOS로 봅니다.',
        ref: MDN + 'API/NavigatorUAData/platform',
        run: (env) => info(env.os),
      },
      {
        id: 'device-type',
        name: 'Device Type',
        method: 'userAgentData.mobile, UA, maxTouchPoints',
        desc: '휴대폰 · 태블릿 · 데스크톱을 추정합니다. 데스크톱 모드로 보는 모바일 브라우저는 Desktop으로 나올 수 있습니다.',
        ref: MDN + 'API/NavigatorUAData/mobile',
        run: (env) => info(env.deviceType),
      },
      {
        id: 'screen',
        name: 'Screen Resolution',
        method: 'screen.width × screen.height (CSS 픽셀)',
        desc: '모니터 전체 해상도를 CSS 픽셀로 보여 줍니다. 실제 물리 픽셀은 여기에 Device Pixel Ratio를 곱한 값입니다.',
        ref: MDN + 'API/Screen',
        run: () => info(`${screen.width} × ${screen.height}`, `물리 픽셀 약 ${Math.round(screen.width * devicePixelRatio)} × ${Math.round(screen.height * devicePixelRatio)} · 색 깊이 ${screen.colorDepth}bit`),
      },
      {
        id: 'viewport',
        name: 'Viewport Size',
        method: 'window.innerWidth × window.innerHeight',
        desc: '지금 브라우저 창에서 웹페이지가 쓰는 영역의 크기입니다. 창 크기를 바꾸고 다시 검사하면 값이 바뀝니다.',
        ref: MDN + 'API/Window/innerWidth',
        run: () => info(`${innerWidth} × ${innerHeight}`),
      },
      {
        id: 'dpr',
        name: 'Device Pixel Ratio',
        method: 'window.devicePixelRatio',
        desc: 'CSS 1픽셀에 들어가는 물리 픽셀 수입니다. 레티나 · 고해상도 화면은 2 이상이고, 브라우저 확대 배율에 따라서도 바뀝니다.',
        ref: MDN + 'API/Window/devicePixelRatio',
        run: () => info(String(+devicePixelRatio.toFixed(2))),
      },
      {
        id: 'touch',
        name: 'Touch Support',
        method: 'navigator.maxTouchPoints',
        desc: '동시에 인식할 수 있는 최대 터치 지점 수입니다. 0이면 터치 화면이 없는 환경입니다.',
        ref: MDN + 'API/Navigator/maxTouchPoints',
        run: () => (navigator.maxTouchPoints > 0 ? info('Supported', `최대 ${navigator.maxTouchPoints}점 동시 터치`) : info('Not Supported', '터치 화면이 없습니다.')),
      },
      {
        id: 'language',
        name: 'Language',
        method: 'navigator.language, navigator.languages',
        desc: '브라우저 설정의 첫 번째 선호 언어입니다. 웹사이트가 언어를 자동 선택할 때 이 값을 씁니다.',
        ref: MDN + 'API/Navigator/language',
        run: () => info(navigator.language, '선호 언어 순서: ' + (navigator.languages || [navigator.language]).join(', ')),
      },
      {
        id: 'timezone',
        name: 'Timezone',
        method: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
        desc: '운영체제에 설정된 IANA 시간대입니다. 개인정보 보호 기능이 켜진 브라우저는 UTC로 보고하기도 합니다.',
        ref: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions',
        run: () => {
          const off = -new Date().getTimezoneOffset();
          const sign = off >= 0 ? '+' : '-';
          const a = Math.abs(off);
          return info(Intl.DateTimeFormat().resolvedOptions().timeZone || '확인 불가', `UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`);
        },
      },
    ],
  },

  /* ---------------- B. JavaScript & Web ---------------- */
  {
    id: 'web',
    name: 'JavaScript & Web',
    ko: '기본 웹 기술',
    checks: [
      {
        id: 'javascript',
        name: 'JavaScript',
        method: '스크립트 실행 + 최신 내장 기능(BigInt, Array.prototype.at, Object.hasOwn, structuredClone) 확인',
        desc: '이 검사가 돌고 있다면 JavaScript는 켜져 있습니다. 최신 내장 기능이 빠져 있으면 오래된 브라우저일 가능성이 큽니다.',
        ref: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        run: () => {
          const feats: [string, boolean][] = [
            ['BigInt', typeof BigInt === 'function'],
            ['Array.at', typeof (Array.prototype as any).at === 'function'],
            ['Object.hasOwn', typeof (Object as any).hasOwn === 'function'],
            ['structuredClone', typeof (globalThis as any).structuredClone === 'function'],
          ];
          const miss = feats.filter(([, v]) => !v).map(([n]) => n);
          return pass(`ES2022+ ${feats.length - miss.length}/${feats.length}`, miss.length ? '없는 기능: ' + miss.join(', ') : '확인한 최신 내장 기능이 모두 있습니다.');
        },
      },
      {
        id: 'esm',
        name: 'ES Modules',
        method: '<script type="module"> 지원(noModule) 확인 후 Blob URL 모듈을 동적 import()',
        desc: '모던 번들러 없이 import / export를 바로 쓸 수 있는지 봅니다. 사이트 보안 정책(CSP)이 동적 import를 막으면 API 지원만 표시합니다.',
        ref: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules',
        run: async () => {
          if (!('noModule' in document.createElement('script'))) return unsup();
          const url = blobUrl('export default 42;');
          try {
            const imp = new Function('u', 'return import(u)') as (u: string) => Promise<{ default: number }>;
            const m = await imp(url);
            return m.default === 42 ? pass('Pass', '모듈을 동적으로 불러와 export 값을 읽었습니다.') : fail('Fail', 'export 값이 다릅니다.');
          } catch (e) {
            return pass('Pass', '<script type="module">은 지원합니다. 동적 import 실행은 정책으로 확인하지 못했습니다: ' + errMsg(e));
          } finally {
            URL.revokeObjectURL(url);
          }
        },
      },
      {
        id: 'worker',
        name: 'Web Workers',
        method: 'Blob 스크립트로 Worker를 만들고 21을 보내 42를 돌려받는지 확인',
        desc: '무거운 계산을 화면 멈춤 없이 백그라운드 스레드에서 처리할 수 있습니다. 이 사이트의 이미지 압축 도구도 Web Worker를 씁니다.',
        ref: MDN + 'API/Web_Workers_API',
        run: async () => {
          if (typeof Worker === 'undefined') return unsup();
          const url = blobUrl('onmessage=function(e){postMessage(e.data*2)}');
          const w = new Worker(url);
          try {
            const v = await withTimeout(
              new Promise<number>((res, rej) => {
                w.onmessage = (e) => res(e.data);
                w.onerror = (e) => rej(new Error(e.message || 'worker error'));
                w.postMessage(21);
              }),
              3000,
            );
            return v === 42 ? pass('Pass', '메시지 왕복 성공 (21 → 42)') : fail('Fail', '돌려받은 값이 다릅니다.');
          } finally {
            w.terminate();
            URL.revokeObjectURL(url);
          }
        },
      },
      {
        id: 'shared-worker',
        name: 'Shared Workers',
        method: 'Blob 스크립트로 SharedWorker를 만들고 port로 메시지 왕복',
        desc: '같은 사이트의 여러 탭이 하나의 워커를 함께 씁니다. Android Chrome · iOS Safari 등 모바일 브라우저 상당수는 지원하지 않습니다.',
        ref: MDN + 'API/SharedWorker',
        run: async () => {
          if (typeof SharedWorker === 'undefined') return unsup('모바일 브라우저 상당수는 SharedWorker를 지원하지 않습니다.');
          const url = blobUrl('onconnect=function(e){var p=e.ports[0];p.onmessage=function(m){p.postMessage(m.data*2)}}');
          const sw = new SharedWorker(url);
          try {
            const v = await withTimeout(
              new Promise<number>((res, rej) => {
                sw.port.onmessage = (e) => res(e.data);
                sw.onerror = () => rej(new Error('shared worker error'));
                sw.port.start();
                sw.port.postMessage(21);
              }),
              3000,
            );
            return v === 42 ? pass('Pass', '포트 메시지 왕복 성공 (21 → 42)') : fail('Fail', '돌려받은 값이 다릅니다.');
          } finally {
            sw.port.close();
            URL.revokeObjectURL(url);
          }
        },
      },
      {
        id: 'service-worker',
        name: 'Service Workers',
        method: 'navigator.serviceWorker 존재 + getRegistration() 호출 (등록은 하지 않음)',
        desc: '오프라인 캐시 · 푸시 알림 · PWA의 기반입니다. HTTPS에서만 쓸 수 있고, Firefox 사생활 보호 모드처럼 막는 환경도 있습니다.',
        ref: MDN + 'API/Service_Worker_API',
        run: async () => {
          if (!('serviceWorker' in navigator)) return missing();
          try {
            const reg = await withTimeout(navigator.serviceWorker.getRegistration(), 2000);
            return pass('Pass', reg ? '이 사이트에 등록된 서비스 워커가 있습니다.' : 'API를 쓸 수 있습니다. 서비스 워커를 새로 등록하지는 않았습니다.');
          } catch (e) {
            return fromError(e);
          }
        },
      },
      {
        id: 'wasm',
        name: 'WebAssembly',
        method: '41바이트짜리 add(a, b) 모듈을 컴파일 · 인스턴스화하고 add(2, 3) 실행',
        desc: 'C · C++ · Rust 등으로 만든 코드를 브라우저에서 거의 네이티브 속도로 실행합니다. 사이트 CSP가 wasm-unsafe-eval을 막으면 실패할 수 있습니다.',
        ref: MDN + 'JavaScript/Reference/Global_Objects/WebAssembly',
        run: async () => {
          if (typeof WebAssembly !== 'object') return unsup();
          const { instance } = await WebAssembly.instantiate(new Uint8Array(WASM_ADD));
          const add = instance.exports.add as (a: number, b: number) => number;
          return add(2, 3) === 5 ? pass('Pass', '모듈 컴파일 · 실행 성공 (2 + 3 = 5)') : fail('Fail', '계산 결과가 다릅니다.');
        },
      },
      {
        id: 'custom-elements',
        name: 'Web Components',
        method: 'customElements.define()으로 임시 태그를 정의하고 생성',
        desc: '프레임워크 없이 재사용 가능한 사용자 정의 HTML 태그를 만드는 표준입니다.',
        ref: MDN + 'API/Web_components',
        run: () => {
          if (!('customElements' in window)) return unsup();
          const tag = 'bd-fc-' + rand();
          class El extends HTMLElement {}
          customElements.define(tag, El);
          return document.createElement(tag) instanceof El ? pass('Pass', `<${tag}> 정의 · 생성 성공`) : fail('Fail', '정의한 클래스로 만들어지지 않았습니다.');
        },
      },
      {
        id: 'shadow-dom',
        name: 'Shadow DOM',
        method: 'element.attachShadow({ mode: "open" }) 후 내부 요소 조회',
        desc: '컴포넌트 내부 DOM과 스타일을 바깥과 분리합니다. Web Components와 함께 쓰입니다.',
        ref: MDN + 'API/Web_components/Using_shadow_DOM',
        run: () => {
          const host = document.createElement('div');
          if (typeof host.attachShadow !== 'function') return unsup();
          const root = host.attachShadow({ mode: 'open' });
          root.appendChild(document.createElement('span'));
          return host.shadowRoot === root && root.querySelector('span') ? pass('Pass', 'Shadow Root 생성 · 조회 성공') : fail('Fail');
        },
      },
      {
        id: 'resize-observer',
        name: 'ResizeObserver',
        method: '임시 요소를 observe() 하고 첫 콜백이 오는지 확인',
        desc: '요소 크기가 바뀔 때 알림을 받습니다. 반응형 컴포넌트 · 차트에서 자주 씁니다.',
        ref: MDN + 'API/ResizeObserver',
        run: async () => {
          if (typeof ResizeObserver === 'undefined') return unsup();
          const el = tempEl();
          let ro: ResizeObserver | undefined;
          try {
            await withTimeout(
              new Promise<void>((res) => {
                ro = new ResizeObserver(() => res());
                ro.observe(el);
              }),
              2000,
            );
            return pass('Pass', '콜백 수신 성공');
          } finally {
            ro?.disconnect();
            el.remove();
          }
        },
      },
      {
        id: 'intersection-observer',
        name: 'IntersectionObserver',
        method: '임시 요소를 observe() 하고 첫 콜백이 오는지 확인',
        desc: '요소가 화면에 들어오고 나가는 것을 감지합니다. 이미지 지연 로딩 · 무한 스크롤에 씁니다.',
        ref: MDN + 'API/Intersection_Observer_API',
        run: async () => {
          if (typeof IntersectionObserver === 'undefined') return unsup();
          const el = tempEl();
          let io: IntersectionObserver | undefined;
          try {
            await withTimeout(
              new Promise<void>((res) => {
                io = new IntersectionObserver(() => res());
                io.observe(el);
              }),
              2000,
            );
            return pass('Pass', '콜백 수신 성공');
          } finally {
            io?.disconnect();
            el.remove();
          }
        },
      },
      {
        id: 'mutation-observer',
        name: 'MutationObserver',
        method: '임시 요소의 속성을 바꾸고 변경 알림이 오는지 확인',
        desc: 'DOM 변경(자식 추가 · 속성 변경 등)을 감지합니다.',
        ref: MDN + 'API/MutationObserver',
        run: async () => {
          if (typeof MutationObserver === 'undefined') return unsup();
          const el = document.createElement('div');
          let mo: MutationObserver | undefined;
          try {
            await withTimeout(
              new Promise<void>((res) => {
                mo = new MutationObserver(() => res());
                mo.observe(el, { attributes: true });
                el.setAttribute('data-x', '1');
              }),
              2000,
            );
            return pass('Pass', '변경 알림 수신 성공');
          } finally {
            mo?.disconnect();
          }
        },
      },
      {
        id: 'broadcast-channel',
        name: 'Broadcast Channel',
        method: '같은 이름의 채널 두 개를 열어 메시지 전달 확인',
        desc: '같은 사이트의 탭 · 창 · 워커끼리 메시지를 주고받습니다. 한 탭에서 로그아웃하면 다른 탭도 따라 로그아웃시키는 데 씁니다.',
        ref: MDN + 'API/Broadcast_Channel_API',
        run: async () => {
          if (typeof BroadcastChannel === 'undefined') return unsup();
          const name = tmpKey();
          const a = new BroadcastChannel(name);
          const b = new BroadcastChannel(name);
          try {
            const v = await withTimeout(
              new Promise<string>((res) => {
                b.onmessage = (e) => res(e.data);
                a.postMessage('ping');
              }),
              2000,
            );
            return v === 'ping' ? pass('Pass', '채널 간 메시지 전달 성공') : fail('Fail');
          } finally {
            a.close();
            b.close();
          }
        },
      },
      {
        id: 'websocket',
        name: 'WebSocket',
        method: 'WebSocket 생성자 존재 확인 (연결할 테스트 서버가 없어 실제 연결은 하지 않음)',
        desc: '서버와 양방향 실시간 통신을 합니다. 채팅 · 알림 · 실시간 시세에 쓰입니다. 실제 연결 가능 여부는 방화벽 · 프록시에 따라 달라집니다.',
        ref: MDN + 'API/WebSockets_API',
        run: () => (typeof WebSocket === 'function' ? pass('API 지원', '실제 서버 연결은 시도하지 않았습니다.') : unsup()),
      },
      {
        id: 'webtransport',
        name: 'WebTransport',
        method: 'WebTransport 생성자 존재 확인 (연결은 하지 않음)',
        desc: 'HTTP/3(QUIC) 기반의 차세대 양방향 통신 API입니다. 아직 지원하지 않는 브라우저가 많습니다.',
        ref: MDN + 'API/WebTransport_API',
        run: () => (typeof W().WebTransport === 'function' ? pass('API 지원', '실제 서버 연결은 시도하지 않았습니다.') : missing('Safari 등 일부 브라우저는 아직 지원하지 않습니다.')),
      },
    ],
  },

  /* ---------------- C. Graphics & GPU ---------------- */
  {
    id: 'graphics',
    name: 'Graphics & GPU',
    ko: '그래픽 가속',
    checks: [
      {
        id: 'canvas2d',
        name: 'Canvas 2D',
        method: "getContext('2d')로 빨간 사각형을 그리고 픽셀을 다시 읽기",
        desc: '2D 그래픽 · 차트 · 이미지 편집의 기본입니다. 캔버스 지문 방지 기능이 켜져 있으면 읽은 픽셀에 잡음이 섞일 수 있습니다.',
        ref: MDN + 'API/CanvasRenderingContext2D',
        run: () => {
          const c = document.createElement('canvas');
          c.width = c.height = 4;
          const ctx = c.getContext('2d');
          if (!ctx) return typeof CanvasRenderingContext2D === 'undefined' ? unsup() : fail('Fail', '2D 컨텍스트를 만들지 못했습니다.');
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, 4, 4);
          const d = ctx.getImageData(1, 1, 1, 1).data;
          return d[0] > 200 && d[1] < 50 && d[2] < 50
            ? pass('Pass', '그리기 · 픽셀 읽기 성공')
            : pass('Pass', '그리기는 성공했지만 읽은 픽셀 값이 달랐습니다. 캔버스 지문 방지 기능이 켜져 있을 수 있습니다.');
        },
      },
      {
        id: 'webgl1',
        name: 'WebGL 1.0',
        method: "getContext('webgl') 컨텍스트 생성 후 VERSION · MAX_TEXTURE_SIZE 조회",
        desc: 'GPU 가속 3D 그래픽 API입니다. API는 있어도 하드웨어 가속이 꺼져 있으면 컨텍스트 생성에 실패합니다.',
        ref: MDN + 'API/WebGL_API',
        run: () => glCheck('webgl'),
      },
      {
        id: 'webgl2',
        name: 'WebGL 2.0',
        method: "getContext('webgl2') 컨텍스트 생성 후 VERSION · MAX_TEXTURE_SIZE 조회",
        desc: 'OpenGL ES 3.0 기반으로 WebGL 1보다 많은 기능(3D 텍스처, 인스턴싱 등)을 제공합니다.',
        ref: MDN + 'API/WebGL2RenderingContext',
        run: () => glCheck('webgl2'),
      },
      {
        id: 'gpu-renderer',
        name: 'GPU Renderer',
        method: 'WEBGL_debug_renderer_info 확장의 UNMASKED_RENDERER_WEBGL, 없으면 gl.RENDERER',
        desc: '브라우저가 쓰는 GPU 이름입니다. 개인정보 보호 설정에 따라 일반화된 이름이나 비공개로 나올 수 있습니다.',
        ref: MDN + 'API/WEBGL_debug_renderer_info',
        run: () => {
          const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
          if (!gl) return na('WebGL 컨텍스트가 없어 확인할 수 없습니다.');
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
          const v = String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          if (!r || /^(WebKit WebGL|Mozilla|Generic Renderer)$/i.test(r)) return info('비공개', '개인정보 보호 설정으로 브라우저가 실제 GPU 이름을 숨겼습니다.');
          return info(r, 'Vendor: ' + v);
        },
      },
      {
        id: 'webgpu',
        name: 'WebGPU',
        method: 'navigator.gpu 존재 → requestAdapter() → adapter.requestDevice() 순서로 실제 생성',
        desc: '차세대 GPU API로 3D와 GPU 연산(머신러닝 등)을 지원합니다. API가 있어도 GPU · 드라이버가 차단 목록에 있으면 어댑터를 얻지 못합니다. 지원하지 않는다고 나쁜 브라우저는 아닙니다.',
        ref: MDN + 'API/WebGPU_API',
        timeout: 6000,
        run: async () => {
          const gpu = N().gpu;
          if (!gpu) return missing('이 브라우저는 아직 WebGPU를 제공하지 않습니다.');
          const adapter = await withTimeout<any>(gpu.requestAdapter(), 4000);
          if (!adapter) return fail('Adapter 없음', 'API는 있지만 GPU 어댑터를 얻지 못했습니다. GPU 차단 목록 · 드라이버 · 플래그 설정 때문일 수 있습니다.');
          const device = await withTimeout<any>(adapter.requestDevice(), 4000);
          const inf = adapter.info || {};
          device?.destroy?.();
          const label = [inf.vendor, inf.architecture].filter(Boolean).join(' · ');
          return pass(label || 'Pass', 'Adapter와 Device 생성 성공');
        },
      },
      {
        id: 'offscreen-canvas',
        name: 'OffscreenCanvas',
        method: "new OffscreenCanvas(2, 2).getContext('2d')",
        desc: '화면에 붙이지 않은 캔버스로, 워커에서 그래픽을 그려 메인 스레드 부담을 줄일 수 있습니다.',
        ref: MDN + 'API/OffscreenCanvas',
        run: () => {
          if (typeof W().OffscreenCanvas !== 'function') return unsup();
          const c = new OffscreenCanvas(2, 2);
          return c.getContext('2d') ? pass('Pass', '2D 컨텍스트 생성 성공') : fail('Fail', '컨텍스트를 만들지 못했습니다.');
        },
      },
      {
        id: 'cpu-threads',
        name: 'Hardware Concurrency',
        method: 'navigator.hardwareConcurrency',
        desc: '브라우저가 알려 주는 논리 프로세서 수입니다. 실제 물리 코어 수를 보장하지 않고, 개인정보 보호를 위해 값을 줄여 알려 주는 브라우저도 있습니다.',
        ref: MDN + 'API/Navigator/hardwareConcurrency',
        run: () => (navigator.hardwareConcurrency ? info(`${navigator.hardwareConcurrency} threads`, '논리 프로세서 수 (물리 코어 수와 다를 수 있음)') : unsup()),
      },
      {
        id: 'device-memory',
        name: 'Device Memory',
        method: 'navigator.deviceMemory',
        desc: '실제 RAM 용량이 아니라 0.25 · 0.5 · 1 · 2 · 4 · 8처럼 반올림한 근사값입니다. Firefox · Safari는 제공하지 않습니다.',
        ref: MDN + 'API/Navigator/deviceMemory',
        run: () => {
          const m = N().deviceMemory;
          return m ? info(`≈ ${m} GB`, '브라우저가 알려 주는 근사값 (상한이 있어 실제보다 작게 보일 수 있음)') : missing('Firefox · Safari는 이 값을 제공하지 않습니다.');
        },
      },
    ],
  },

  /* ---------------- D. Storage ---------------- */
  {
    id: 'storage',
    name: 'Storage',
    ko: '브라우저 저장소',
    checks: [
      {
        id: 'cookies',
        name: 'Cookies',
        method: 'navigator.cookieEnabled 확인 후 고유 이름의 테스트 쿠키를 쓰고 읽은 뒤 즉시 삭제',
        desc: 'JavaScript로 쓸 수 있는 쿠키만 확인합니다. 로그인 세션 등에 쓰이는 HttpOnly 쿠키는 JavaScript에서 보이지 않으므로 이 검사와 관계없습니다.',
        ref: MDN + 'API/Document/cookie',
        run: () => {
          if (!navigator.cookieEnabled) return blocked('Disabled', '브라우저 설정에서 쿠키가 꺼져 있습니다.');
          const k = 'bd_fc_' + rand();
          document.cookie = `${k}=1; path=/; SameSite=Lax`;
          const ok = document.cookie.split('; ').includes(`${k}=1`);
          document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
          return ok ? pass('Enabled', '테스트 쿠키를 쓰고 읽은 뒤 바로 지웠습니다.') : fail('Disabled', '쿠키를 썼지만 다시 읽지 못했습니다. 정책이나 확장 프로그램이 막았을 수 있습니다.');
        },
      },
      {
        id: 'local-storage',
        name: 'Local Storage',
        method: '고유 키로 setItem → getItem → removeItem',
        desc: '브라우저를 닫아도 남는 키-값 저장소입니다(보통 사이트당 5MB 안팎). 이 사이트는 연비 계산기의 유가처럼 작은 설정을 여기에 기억합니다.',
        ref: MDN + 'API/Window/localStorage',
        run: () => webStorage('localStorage'),
      },
      {
        id: 'session-storage',
        name: 'Session Storage',
        method: '고유 키로 setItem → getItem → removeItem',
        desc: '탭을 닫으면 사라지는 키-값 저장소입니다.',
        ref: MDN + 'API/Window/sessionStorage',
        run: () => webStorage('sessionStorage'),
      },
      {
        id: 'indexeddb',
        name: 'IndexedDB',
        method: '임시 데이터베이스 생성 → 저장소 생성 → put · get → 데이터베이스 삭제',
        desc: '구조화된 대용량 데이터를 브라우저에 저장하는 데이터베이스입니다. 오프라인 웹앱에서 주로 씁니다.',
        ref: MDN + 'API/IndexedDB_API',
        run: async () => {
          if (!W().indexedDB) return unsup();
          const name = tmpKey();
          const db = await withTimeout(
            new Promise<IDBDatabase>((res, rej) => {
              const r = indexedDB.open(name, 1);
              r.onupgradeneeded = () => r.result.createObjectStore('t');
              r.onsuccess = () => res(r.result);
              r.onerror = () => rej(r.error);
              r.onblocked = () => rej(new Error('blocked'));
            }),
            3000,
          );
          try {
            const v = await withTimeout(
              new Promise<unknown>((res, rej) => {
                const tx = db.transaction('t', 'readwrite');
                const st = tx.objectStore('t');
                st.put('ok', 'k');
                const g = st.get('k');
                g.onsuccess = () => res(g.result);
                tx.onerror = () => rej(tx.error);
              }),
              3000,
            );
            return v === 'ok' ? pass('Pass', '데이터베이스 생성 · 쓰기 · 읽기 · 삭제 성공') : fail('Fail', '저장한 값을 다시 읽지 못했습니다.');
          } finally {
            db.close();
            indexedDB.deleteDatabase(name);
          }
        },
      },
      {
        id: 'cache-api',
        name: 'Cache API',
        method: '임시 캐시 open → put → match → 캐시 삭제',
        desc: '요청 · 응답 쌍을 저장하는 저장소로, 서비스 워커의 오프라인 캐시에 쓰입니다. HTTPS에서만 쓸 수 있습니다.',
        ref: MDN + 'API/Cache',
        run: async () => {
          if (!('caches' in window)) return missing();
          const name = tmpKey();
          try {
            const c = await caches.open(name);
            const url = location.origin + '/__' + name;
            await c.put(url, new Response('ok'));
            const m = await c.match(url);
            const t = m ? await m.text() : null;
            return t === 'ok' ? pass('Pass', '캐시 생성 · 저장 · 조회 · 삭제 성공') : fail('Fail', '저장한 응답을 다시 읽지 못했습니다.');
          } finally {
            await caches.delete(name).catch(() => undefined);
          }
        },
      },
      {
        id: 'storage-estimate',
        name: 'Storage Estimate',
        method: 'navigator.storage.estimate()',
        desc: '이 사이트가 쓰고 있는 저장 공간과 쓸 수 있는 최대 공간(할당량)입니다. 보안상 정확한 값이 아닌 근사값을 돌려줍니다.',
        ref: MDN + 'API/StorageManager/estimate',
        run: async () => {
          if (!navigator.storage?.estimate) return missing();
          const { usage = 0, quota = 0 } = await navigator.storage.estimate();
          return info(`${bytes(usage)} / ${bytes(quota)}`, '사용량 / 할당량 (근사값)');
        },
      },
      {
        id: 'storage-persist',
        name: 'Storage Persistence',
        method: 'navigator.storage.persisted() (영구 저장 권한은 요청하지 않음)',
        desc: 'Granted이면 디스크 공간이 부족해도 브라우저가 이 사이트 데이터를 자동으로 지우지 않습니다. 대부분의 사이트는 Not Granted가 정상입니다.',
        ref: MDN + 'API/StorageManager/persisted',
        run: async () => {
          if (!navigator.storage?.persisted) return missing();
          const p = await navigator.storage.persisted();
          return p ? pass('Granted', '영구 저장소로 지정되어 있습니다.') : info('Not Granted', '공간이 부족하면 브라우저가 데이터를 지울 수 있는 기본 상태입니다.');
        },
      },
      {
        id: 'opfs',
        name: 'OPFS',
        method: 'navigator.storage.getDirectory() → 임시 파일 생성 → 삭제',
        desc: 'Origin Private File System. 사이트 전용 가상 파일 시스템으로, SQLite WASM 같은 고성능 저장에 쓰입니다.',
        ref: MDN + 'API/File_System_API/Origin_private_file_system',
        run: async () => {
          if (!navigator.storage?.getDirectory) return missing();
          const root = await navigator.storage.getDirectory();
          const n = tmpKey() + '.txt';
          await root.getFileHandle(n, { create: true });
          await root.removeEntry(n);
          return pass('Pass', '임시 파일 생성 · 삭제 성공');
        },
      },
    ],
  },

  /* ---------------- E. Security & Crypto ---------------- */
  {
    id: 'security',
    name: 'Security & Crypto',
    ko: '보안 및 암호화',
    checks: [
      {
        id: 'secure-context',
        name: 'Secure Context',
        method: 'window.isSecureContext',
        desc: 'HTTPS(또는 localhost)로 열린 페이지인지 확인합니다. 보안 컨텍스트가 아니면 Web Crypto · Service Worker · Clipboard 등 여러 API가 막힙니다.',
        ref: MDN + 'Security/Secure_Contexts',
        run: () => (isSecureContext ? pass('Yes', `${location.protocol.replace(':', '')} 로 열린 보안 컨텍스트`) : fail('No', 'HTTPS가 아니어서 일부 API가 제한됩니다.')),
      },
      {
        id: 'web-crypto',
        name: 'Web Crypto',
        method: 'crypto.subtle 존재 확인',
        desc: '해시 · 암호화 · 서명 · 키 생성을 브라우저 안에서 안전하게 처리하는 표준 API입니다. 이 사이트의 JWT 서명 검증도 이것을 씁니다.',
        ref: MDN + 'API/Web_Crypto_API',
        run: () => (crypto?.subtle ? pass('Pass', 'crypto.subtle 사용 가능') : missing()),
      },
      {
        id: 'random-uuid',
        name: 'Random UUID',
        method: 'crypto.randomUUID() 실행 후 UUID v4 형식 확인',
        desc: '암호학적으로 안전한 UUID v4를 만듭니다. 보안 컨텍스트에서만 제공됩니다.',
        ref: MDN + 'API/Crypto/randomUUID',
        run: () => {
          if (typeof crypto?.randomUUID !== 'function') return missing();
          const u = crypto.randomUUID();
          return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u) ? pass('Pass', '생성 예: ' + u) : fail('Fail', '형식이 올바르지 않습니다: ' + u);
        },
      },
      {
        id: 'random-values',
        name: 'Random Values',
        method: 'crypto.getRandomValues(new Uint8Array(16))',
        desc: '암호학적으로 안전한 난수를 만듭니다. HTTP 페이지에서도 쓸 수 있습니다.',
        ref: MDN + 'API/Crypto/getRandomValues',
        run: () => {
          if (typeof crypto?.getRandomValues !== 'function') return unsup();
          const a = crypto.getRandomValues(new Uint8Array(16));
          return a.some((b) => b !== 0) ? pass('Pass', '16바이트 난수 생성 성공') : fail('Fail', '모든 바이트가 0입니다.');
        },
      },
      {
        id: 'sha256',
        name: 'SHA-256',
        method: 'crypto.subtle.digest("SHA-256", "abc") 결과를 표준 테스트 벡터와 비교',
        desc: '파일 무결성 확인 · 해시 비교에 쓰는 SHA-256을 브라우저가 올바르게 계산하는지 봅니다.',
        ref: MDN + 'API/SubtleCrypto/digest',
        run: async () => {
          if (!crypto?.subtle) return missing();
          const h = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('abc')));
          return h === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' ? pass('Pass', '테스트 벡터와 일치') : fail('Fail', '해시 값이 표준 값과 다릅니다: ' + h);
        },
      },
      {
        id: 'aes-gcm',
        name: 'AES-GCM',
        method: '256비트 키 생성 → encrypt → decrypt 후 원문 비교',
        desc: '대칭키 인증 암호화 방식입니다. 브라우저에서 데이터를 암호화해 저장 · 전송할 때 씁니다.',
        ref: MDN + 'API/SubtleCrypto/encrypt',
        run: async () => {
          if (!crypto?.subtle) return missing();
          const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('bluedove'));
          const pt = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
          return pt === 'bluedove' ? pass('Pass', '256비트 키 암호화 · 복호화 성공') : fail('Fail', '복호화 결과가 원문과 다릅니다.');
        },
      },
      {
        id: 'permissions',
        name: 'Permissions API',
        method: 'navigator.permissions.query() 존재 확인 (권한은 요청하지 않음)',
        desc: '카메라 · 위치 · 알림 같은 권한의 현재 상태(허용 · 거부 · 요청 전)를 읽는 API입니다. 지원 여부와 실제 권한 상태는 별개이며, 이 도구는 권한을 요청하지 않습니다.',
        ref: MDN + 'API/Permissions_API',
        run: async () => {
          if (!navigator.permissions?.query) return unsup();
          const n = await perm('notifications');
          return pass('Supported', '예: 알림 권한 상태 — ' + PERM_KO[n]);
        },
      },
    ],
  },

  /* ---------------- F. Network & Connectivity ---------------- */
  {
    id: 'network',
    name: 'Network & Connectivity',
    ko: '네트워크 API',
    checks: [
      {
        id: 'online',
        name: 'Online Status',
        method: 'navigator.onLine',
        desc: '네트워크 인터페이스가 연결되어 있는지에 가까운 정보입니다. Online이어도 실제 인터넷 연결을 보장하지는 않습니다.',
        ref: MDN + 'API/Navigator/onLine',
        run: () => info(navigator.onLine ? 'Online' : 'Offline', '실제 인터넷 연결 성공을 뜻하지는 않습니다.'),
      },
      {
        id: 'netinfo',
        name: 'Network Information',
        method: 'navigator.connection 존재 확인',
        desc: '연결 종류와 대략적인 속도를 알려 주는 API입니다. Chromium 계열에서만 지원해서 Firefox · Safari에서 Unsupported가 나오는 것은 정상입니다.',
        ref: MDN + 'API/Network_Information_API',
        run: () => {
          const c = N().connection;
          return c ? pass('Available', c.type ? '연결 종류: ' + c.type : undefined) : unsup('Firefox · Safari는 지원하지 않습니다. 정상입니다.');
        },
      },
      {
        id: 'effective-type',
        name: 'Effective Type',
        method: 'navigator.connection.effectiveType',
        desc: '최근 측정한 속도를 바탕으로 한 체감 연결 등급(slow-2g · 2g · 3g · 4g)입니다. 실제 망 종류(LTE · 5G · Wi-Fi)와는 다를 수 있습니다.',
        ref: MDN + 'API/NetworkInformation/effectiveType',
        run: () => {
          const c = N().connection;
          return c?.effectiveType ? info(c.effectiveType) : na('Network Information API가 없어 해당하지 않습니다.');
        },
      },
      {
        id: 'downlink',
        name: 'Downlink',
        method: 'navigator.connection.downlink',
        desc: '추정 다운로드 속도입니다. Chrome은 개인정보 보호를 위해 25kbps 단위로 반올림하고 최대 10Mbps로 잘라서 알려 줍니다.',
        ref: MDN + 'API/NetworkInformation/downlink',
        run: () => {
          const c = N().connection;
          return c?.downlink != null ? info(`${c.downlink} Mbps`, '추정값 (Chrome은 최대 10Mbps로 표시)') : na('Network Information API가 없어 해당하지 않습니다.');
        },
      },
      {
        id: 'rtt',
        name: 'RTT',
        method: 'navigator.connection.rtt',
        desc: '서버와 한 번 주고받는 데 걸리는 추정 왕복 시간입니다. 25ms 단위로 반올림된 값입니다.',
        ref: MDN + 'API/NetworkInformation/rtt',
        run: () => {
          const c = N().connection;
          return c?.rtt != null ? info(`${c.rtt} ms`, '추정값 (25ms 단위)') : na('Network Information API가 없어 해당하지 않습니다.');
        },
      },
      {
        id: 'webrtc',
        name: 'WebRTC',
        method: 'RTCPeerConnection 생성 → createOffer()로 SDP 생성 → 연결 종료',
        desc: '서버를 거치지 않는 P2P 음성 · 영상 · 데이터 통신입니다. 화상회의에 쓰입니다. 확장 프로그램이 IP 노출 방지를 위해 막는 경우도 있습니다.',
        ref: MDN + 'API/WebRTC_API',
        run: async () => {
          if (typeof W().RTCPeerConnection !== 'function') return unsup();
          const pc = new RTCPeerConnection();
          try {
            pc.createDataChannel('bd');
            const offer = await withTimeout(pc.createOffer(), 3000);
            return offer.sdp ? pass('Pass', 'Offer(SDP) 생성 성공') : fail('Fail', 'SDP가 비어 있습니다.');
          } finally {
            pc.close();
          }
        },
      },
      {
        id: 'datachannel',
        name: 'WebRTC Data Channel',
        method: 'RTCPeerConnection.createDataChannel() 생성',
        desc: 'WebRTC로 텍스트 · 파일 같은 임의의 데이터를 주고받는 채널입니다.',
        ref: MDN + 'API/RTCDataChannel',
        run: () => {
          if (typeof W().RTCPeerConnection !== 'function') return unsup();
          const pc = new RTCPeerConnection();
          try {
            const dc = pc.createDataChannel('bd');
            return dc ? pass('Pass', 'readyState: ' + dc.readyState) : fail('Fail');
          } finally {
            pc.close();
          }
        },
      },
    ],
  },

  /* ---------------- G. Device & Sensors ---------------- */
  {
    id: 'device',
    name: 'Device & Sensors',
    ko: '디바이스 기능',
    checks: [
      {
        id: 'touch-events',
        name: 'Touch Events',
        method: "'ontouchstart' in window, TouchEvent, maxTouchPoints",
        desc: '터치 화면의 손가락 입력 이벤트입니다. 터치 화면이 없는 데스크톱에서는 해당하지 않습니다.',
        ref: MDN + 'API/Touch_events',
        run: () => {
          const has = 'ontouchstart' in window || typeof W().TouchEvent !== 'undefined';
          if (navigator.maxTouchPoints === 0) return na('터치 화면이 없는 환경이라 해당하지 않습니다.');
          return has ? pass('Supported', `최대 ${navigator.maxTouchPoints}점 동시 터치`) : unsup();
        },
      },
      {
        id: 'pointer-events',
        name: 'Pointer Events',
        method: 'PointerEvent 생성자 + matchMedia("(pointer: …)") · ("(hover: …)")',
        desc: '마우스 · 터치 · 펜 입력을 하나의 이벤트 모델로 다룹니다. 주 입력 장치의 정밀도와 호버 가능 여부도 함께 보여 줍니다.',
        ref: MDN + 'API/Pointer_events',
        run: () => {
          if (typeof W().PointerEvent !== 'function') return unsup();
          const pointer = mq('(pointer: coarse)') ? '손가락(coarse)' : mq('(pointer: fine)') ? '마우스 · 펜(fine)' : '없음';
          return pass('Pass', `주 입력: ${pointer} · 호버: ${mq('(hover: hover)') ? '가능' : '불가'}`);
        },
      },
      {
        id: 'geolocation',
        name: 'Geolocation',
        method: 'navigator.geolocation 존재 + Permissions API로 권한 상태 조회 (위치는 요청하지 않음)',
        desc: '기기의 현재 위치를 얻는 API입니다. 실제 위치를 읽으려면 사용자 동의가 필요하며, 이 검사는 위치를 요청하지 않습니다.',
        ref: MDN + 'API/Geolocation_API',
        run: async () => {
          if (!('geolocation' in navigator)) return unsup();
          if (!isSecureContext) return blocked('API 지원', INSECURE);
          const p = await perm('geolocation');
          if (p === 'denied') return blocked('권한 거부됨', '이 사이트의 위치 권한이 거부되어 있습니다.');
          return pass('API 지원', '위치 권한: ' + PERM_KO[p]);
        },
      },
      {
        id: 'device-orientation',
        name: 'Device Orientation',
        method: 'DeviceOrientationEvent 존재 + 기기 종류 (센서 값은 읽지 않음)',
        desc: '기기의 기울기(alpha · beta · gamma)를 알려 줍니다. 데스크톱 브라우저도 API는 있지만 센서가 없어 N/A로 표시합니다.',
        ref: MDN + 'API/DeviceOrientationEvent',
        run: (env) => sensor('DeviceOrientationEvent', env),
      },
      {
        id: 'device-motion',
        name: 'Device Motion',
        method: 'DeviceMotionEvent 존재 + 기기 종류 (센서 값은 읽지 않음)',
        desc: '가속도 · 회전 속도를 알려 줍니다. 흔들기 동작 · 걸음 수 등에 쓰입니다.',
        ref: MDN + 'API/DeviceMotionEvent',
        run: (env) => sensor('DeviceMotionEvent', env),
      },
      {
        id: 'vibration',
        name: 'Vibration',
        method: 'navigator.vibrate 존재 확인 (진동은 실행하지 않음)',
        desc: '기기를 진동시키는 API입니다. Safari(iOS 포함)는 지원하지 않고, 데스크톱은 진동 장치가 없어 해당하지 않습니다.',
        ref: MDN + 'API/Vibration_API',
        run: (env) => {
          if (typeof N().vibrate !== 'function') return unsup('Safari(iOS 포함)는 지원하지 않습니다.');
          if (env.deviceType === 'Desktop') return na('API는 있지만 진동 장치가 없는 데스크톱 환경입니다.', 'N/A (Desktop)');
          return pass('API 지원', '진동은 실행하지 않았습니다.');
        },
      },
      {
        id: 'battery',
        name: 'Battery Status',
        method: 'navigator.getBattery()',
        desc: '배터리 잔량과 충전 상태를 알려 줍니다. 개인정보 보호 문제로 Firefox · Safari는 제공하지 않습니다. 배터리가 없는 데스크톱은 100% · 충전 중으로 보입니다.',
        ref: MDN + 'API/Battery_Status_API',
        run: async () => {
          if (typeof N().getBattery !== 'function') return missing('Firefox · Safari는 지원하지 않습니다.');
          const b = await withTimeout<any>(N().getBattery(), 2000);
          return pass(`${Math.round(b.level * 100)}% · ${b.charging ? '충전 중' : '배터리 사용'}`, '배터리가 없는 데스크톱은 100% · 충전 중으로 표시됩니다.');
        },
      },
      {
        id: 'gamepad',
        name: 'Gamepad',
        method: 'navigator.getGamepads()',
        desc: '게임패드 · 조이스틱 입력을 읽습니다. 보안상 게임패드 버튼을 한 번 누르기 전에는 연결된 패드가 보이지 않는 브라우저가 많습니다.',
        ref: MDN + 'API/Gamepad_API',
        run: () => {
          if (typeof navigator.getGamepads !== 'function') return missing();
          const n = Array.from(navigator.getGamepads()).filter(Boolean).length;
          return pass('API 지원', `현재 인식된 게임패드 ${n}개 (버튼을 눌러야 보이는 경우가 많습니다)`);
        },
      },
    ],
  },

  /* ---------------- H. Media & Accessibility ---------------- */
  {
    id: 'media',
    name: 'Media & Accessibility',
    ko: '미디어 및 접근성',
    checks: [
      {
        id: 'audio',
        name: 'Audio Playback',
        method: 'HTMLAudioElement.canPlayType()으로 주요 포맷 확인 (소리는 내지 않음)',
        desc: '브라우저가 재생할 수 있다고 답한 오디오 포맷입니다. canPlayType은 “probably / maybe”로 답하므로 실제 파일에 따라 다를 수 있습니다.',
        ref: MDN + 'API/HTMLMediaElement/canPlayType',
        run: () => {
          if (typeof W().HTMLAudioElement !== 'function') return unsup();
          const list = canPlay(document.createElement('audio'), [
            ['MP3', 'audio/mpeg'],
            ['AAC', 'audio/mp4; codecs="mp4a.40.2"'],
            ['Ogg Vorbis', 'audio/ogg; codecs="vorbis"'],
            ['Opus', 'audio/ogg; codecs="opus"'],
            ['FLAC', 'audio/flac'],
            ['WAV', 'audio/wav'],
          ]);
          return list.length ? pass(list.join(' · '), '재생 가능하다고 답한 포맷') : fail('Fail', '재생 가능한 오디오 포맷이 없습니다.');
        },
      },
      {
        id: 'video',
        name: 'Video Playback',
        method: 'HTMLVideoElement.canPlayType()으로 주요 코덱 확인',
        desc: 'H.264는 거의 모든 브라우저가 지원하고, HEVC(H.265) · AV1은 브라우저 · 운영체제 · 하드웨어 디코더에 따라 다릅니다.',
        ref: MDN + 'Media/Formats/Video_codecs',
        run: () => {
          if (typeof W().HTMLVideoElement !== 'function') return unsup();
          const list = canPlay(document.createElement('video'), [
            ['H.264', 'video/mp4; codecs="avc1.42E01E"'],
            ['HEVC', 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
            ['VP8', 'video/webm; codecs="vp8"'],
            ['VP9', 'video/webm; codecs="vp9"'],
            ['AV1', 'video/mp4; codecs="av01.0.05M.08"'],
          ]);
          return list.length ? pass(list.join(' · '), '재생 가능하다고 답한 코덱') : fail('Fail', '재생 가능한 비디오 코덱이 없습니다.');
        },
      },
      {
        id: 'media-recorder',
        name: 'MediaRecorder',
        method: 'MediaRecorder.isTypeSupported()로 녹화 가능한 형식 확인',
        desc: '카메라 · 마이크 · 화면을 녹화해 파일로 만드는 API입니다. 이 검사는 실제로 녹화하지 않습니다.',
        ref: MDN + 'API/MediaRecorder',
        run: () => {
          const MR = W().MediaRecorder;
          if (typeof MR !== 'function') return unsup();
          const list = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/ogg'].filter((t) => MR.isTypeSupported?.(t));
          return list.length ? pass(list.join(' · '), '녹화 가능한 컨테이너 형식') : fail('Fail', 'API는 있지만 지원하는 녹화 형식이 없습니다.');
        },
      },
      {
        id: 'web-audio',
        name: 'Web Audio',
        method: 'AudioContext 생성 → sampleRate 확인 → close() (소리는 내지 않음)',
        desc: '소리를 합성 · 가공 · 분석하는 API입니다. 게임 · 음악 앱 · 시각화에 쓰입니다.',
        ref: MDN + 'API/Web_Audio_API',
        run: async () => {
          const Ctor = W().AudioContext || W().webkitAudioContext;
          if (!Ctor) return unsup();
          const ctx = new Ctor();
          const sr = ctx.sampleRate;
          await ctx.close?.();
          return pass(`${sr} Hz`, '오디오 컨텍스트 생성 성공 (샘플레이트)');
        },
      },
      {
        id: 'media-devices',
        name: 'MediaDevices',
        method: 'navigator.mediaDevices.getUserMedia 존재 + 카메라 · 마이크 권한 상태 조회 (장치를 켜거나 권한을 요청하지 않음)',
        desc: '카메라 · 마이크에 접근하는 API입니다. 지원 여부와 권한 상태만 보고 장치는 켜지 않습니다. 권한이 거부되어 있으면 BLOCKED로 표시합니다.',
        ref: MDN + 'API/MediaDevices/getUserMedia',
        run: async () => {
          if (!navigator.mediaDevices?.getUserMedia) return missing();
          const [cam, mic] = await Promise.all([perm('camera'), perm('microphone')]);
          const note = `카메라 권한: ${PERM_KO[cam]} · 마이크 권한: ${PERM_KO[mic]}`;
          if (cam === 'denied' || mic === 'denied') return blocked('권한 거부됨', note);
          return pass('API 지원', note);
        },
      },
      {
        id: 'clipboard',
        name: 'Clipboard',
        method: 'navigator.clipboard.writeText / readText 존재 확인 (읽기 · 쓰기는 하지 않음)',
        desc: '복사 · 붙여넣기를 다루는 비동기 API입니다. 보안 컨텍스트가 필요하고, 실제 쓰기 · 읽기에는 사용자 동작이나 권한이 필요합니다.',
        ref: MDN + 'API/Clipboard_API',
        run: () => {
          const cb = navigator.clipboard;
          if (!cb?.writeText) return missing();
          return pass('API 지원', `쓰기 지원 · 읽기 ${typeof cb.readText === 'function' ? '지원' : '미지원'} (실제로 실행하지는 않음)`);
        },
      },
      {
        id: 'fullscreen',
        name: 'Fullscreen',
        method: 'document.fullscreenEnabled (webkit 접두어 포함)',
        desc: '요소를 전체 화면으로 띄우는 API입니다. iPhone Safari는 요소 전체 화면을 지원하지 않고 동영상만 전체 화면으로 재생합니다.',
        ref: MDN + 'API/Fullscreen_API',
        run: (env) => {
          const d = document as any;
          const fe: boolean | undefined = d.fullscreenEnabled ?? d.webkitFullscreenEnabled;
          if (fe === undefined || (env.isIPhone && !fe)) return unsup('iPhone Safari는 동영상만 전체 화면으로 재생할 수 있습니다.');
          return fe ? pass('Enabled', '전체 화면으로 전환하지는 않았습니다.') : blocked('Disabled', 'iframe 권한 정책 등으로 전체 화면이 막혀 있습니다.');
        },
      },
      {
        id: 'pip',
        name: 'Picture-in-Picture',
        method: 'document.pictureInPictureEnabled',
        desc: '동영상을 작은 떠 있는 창으로 보는 기능입니다. Firefox는 자체 PiP 버튼만 제공하고 웹 API는 지원하지 않습니다.',
        ref: MDN + 'API/Picture-in-Picture_API',
        run: () => {
          if (!('pictureInPictureEnabled' in document)) return unsup('Firefox는 자체 PiP 버튼만 있고 웹 API는 없습니다.');
          return (document as any).pictureInPictureEnabled ? pass('Enabled') : blocked('Disabled', '권한 정책이나 사용자 설정으로 꺼져 있습니다.');
        },
      },
      {
        id: 'reduced-motion',
        name: 'Reduced Motion',
        method: 'matchMedia("(prefers-reduced-motion: reduce)")',
        desc: '운영체제에서 “동작 줄이기”를 켰는지 알려 줍니다. 켜져 있으면 이 사이트는 애니메이션 · 전환 효과를 줄입니다.',
        ref: MDN + 'CSS/@media/prefers-reduced-motion',
        run: () => info(mq('(prefers-reduced-motion: reduce)') ? 'Reduce' : 'No Preference'),
      },
      {
        id: 'color-scheme',
        name: 'Color Scheme',
        method: 'matchMedia("(prefers-color-scheme: dark)")',
        desc: '운영체제 · 브라우저의 라이트 / 다크 모드 설정입니다.',
        ref: MDN + 'CSS/@media/prefers-color-scheme',
        run: () => info(mq('(prefers-color-scheme: dark)') ? 'Dark' : 'Light'),
      },
      {
        id: 'forced-colors',
        name: 'Forced Colors',
        method: 'matchMedia("(forced-colors: active)")',
        desc: 'Windows 고대비 모드처럼 운영체제가 색상을 강제로 바꾸는 모드인지 알려 줍니다.',
        ref: MDN + 'CSS/@media/forced-colors',
        run: () => (mq('(forced-colors: active)') ? info('Active', '고대비 등 강제 색상 모드가 켜져 있습니다.') : info('None')),
      },
    ],
  },
];

export const TOTAL_CHECKS = CATEGORIES.reduce((n, c) => n + c.checks.length, 0);

/** 검사 하나 실행 (시간 제한 + 예외 → 결과 변환) */
export async function runCheck(check: Check, env: Env): Promise<CheckResult> {
  try {
    return await withTimeout(Promise.resolve().then(() => check.run(env)), check.timeout ?? 5000);
  } catch (e) {
    return fromError(e);
  }
}
