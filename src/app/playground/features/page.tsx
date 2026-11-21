import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import FeaturesTool from '@/components/tools/features/FeaturesTool';
import Guide from '@/components/tools/features/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/playground/features/",
  "title": "브라우저 기능 진단 — 웹 API 지원 여부 검사 (WebGPU · WebGL · 저장소 · 암호화) | Bluedove",
  "description": "지금 쓰는 브라우저가 어떤 웹 기술을 지원하는지 진단합니다. WebGL · WebGPU · Web Worker · WebAssembly · IndexedDB · Web Crypto · WebRTC 등 70여 개 항목을 실제로 실행해 PASS · FAIL · UNSUPPORTED · BLOCKED · N/A로 보여 주고 JSON으로 저장합니다.",
  "keywords": [
    "브라우저 기능 진단",
    "브라우저 기능 검사",
    "브라우저 호환성 테스트",
    "웹 API 지원 여부",
    "WebGPU 지원 확인",
    "WebGL 테스트",
    "브라우저 지원 확인",
    "browser feature detection",
    "브라우저 정보 확인"
  ],
  "faq": [
    {
      "q": "FAIL과 BLOCKED는 어떻게 다른가요?",
      "a": "FAIL은 API가 있는데 실행이 실패한 경우(예: WebGL 컨텍스트 생성 실패)이고, BLOCKED는 사용자가 권한을 거부했거나 HTTPS가 아니어서 브라우저가 기능을 막은 경우입니다. BLOCKED는 설정을 바꾸면 쓸 수 있는 경우가 많습니다."
    },
    {
      "q": "CPU 스레드 수와 메모리가 실제와 다르게 나와요.",
      "a": "hardwareConcurrency는 논리 프로세서 수라서 물리 코어 수와 다를 수 있고, deviceMemory는 0.25~8GB처럼 반올림한 근사값이며 상한이 있습니다. 개인정보 보호를 위해 브라우저가 일부러 값을 줄여 알려 주기도 합니다."
    },
    {
      "q": "Network Information이 UNSUPPORTED로 나옵니다.",
      "a": "Network Information API는 Chrome · Edge 같은 Chromium 계열에서만 지원합니다. Firefox · Safari에서 UNSUPPORTED가 나오는 것은 정상이며, 이때 Effective Type · Downlink · RTT는 N/A로 표시됩니다."
    },
    {
      "q": "Windows 11인데 Windows 10/11로 나와요.",
      "a": "Windows 10과 11은 User-Agent 문자열이 같습니다. Chrome · Edge는 Client Hints로 구분할 수 있지만 Firefox는 Client Hints를 제공하지 않아 둘을 구분할 수 없습니다."
    },
    {
      "q": "검사하면 카메라나 위치 권한 창이 뜨나요?",
      "a": "뜨지 않습니다. 이 도구는 권한을 요청하지 않고 지원 여부와 현재 권한 상태(허용 · 거부 · 요청 전)만 읽습니다. 장치를 켜거나 위치를 가져오지도 않습니다."
    }
  ],
  "related": [
    "/playground/browser/",
    "/developer/uuid/",
    "/developer/jwt/",
    "/developer/image/",
    "/developer/json/",
    "/daily/qr/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>지금 쓰는 브라우저가 어떤 웹 기술을 지원하고 실제로 쓸 수 있는지 진단합니다. 8개 카테고리 70여 개 항목을 직접 실행해 보고 PASS · FAIL · UNSUPPORTED · BLOCKED · N/A로 알려 줍니다.<br />권한은 요청하지 않으며 결과는 서버로 전송되지 않습니다.</>}
      guide={<Guide />}
    >
      <FeaturesTool />
    </ToolLayout>
  );
}
