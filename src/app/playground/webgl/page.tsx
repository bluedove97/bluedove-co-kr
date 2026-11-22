import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import WebglTool from '@/components/tools/webgl/WebglTool';
import Guide from '@/components/tools/webgl/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/playground/webgl/",
  "title": "브라우저 GPU 벤치마크 — WebGL Benchmark 그래픽 성능 테스트 | Bluedove",
  "description": "브라우저에서 바로 하는 WebGL 2.0 GPU 벤치마크. 3D 렌더링 · 파티클 · 셰이더 · 지오메트리 4가지 테스트로 평균 FPS, 1% Low FPS, Frame Time을 측정하고 10,000점 만점 점수와 GPU 정보를 보여 줍니다. 설치 · 업로드 없음.",
  "keywords": [
    "GPU 벤치마크",
    "WebGL 벤치마크",
    "브라우저 GPU 테스트",
    "그래픽카드 성능 테스트",
    "WebGL 2.0",
    "FPS 측정",
    "Three.js 벤치마크",
    "1% Low FPS",
    "GPU 정보 확인"
  ],
  "faq": [
    {
      "q": "GPU Renderer가 N/A로 나와요.",
      "a": "GPU 모델명은 WEBGL_debug_renderer_info 확장으로 읽는데, 일부 브라우저는 개인정보 보호(핑거프린팅 방지)를 위해 이 확장을 막거나 값을 흐리게 줍니다. 이 경우 임의의 모델명을 추측하지 않고 N/A로 표시합니다."
    },
    {
      "q": "같은 컴퓨터인데 점수가 매번 조금씩 달라요.",
      "a": "GPU 클럭 · 발열 · 전원 모드, 다른 탭이나 프로그램의 부하, 브라우저 버전에 따라 측정값이 흔들립니다. Full Benchmark는 기준 단계를 3번 재서 중앙값을 쓰므로 편차가 줄어들지만, 노트북은 전원을 연결하고 다른 작업을 닫은 뒤 측정하는 것이 좋습니다."
    },
    {
      "q": "120Hz 모니터에서 FPS가 120에서 멈춰요.",
      "a": "브라우저는 화면 주사율보다 빠르게 그리지 않습니다(vsync). Quick Test와 단계별 측정의 FPS는 그래서 주사율에서 멈춥니다. Full Benchmark는 한 프레임에 같은 장면을 여러 번 그려 주사율 아래로 내린 뒤 처리량으로 점수를 계산하므로, 60Hz · 120Hz 모니터에 상관없이 같은 방식으로 비교됩니다."
    },
    {
      "q": "WebGL 1.0만 지원한다고 나오면 어떻게 하나요?",
      "a": "브라우저를 최신 버전으로 올리고 설정에서 하드웨어 가속을 켜 보세요. 그래도 WebGL 2.0을 쓸 수 없으면 GPU나 드라이버가 지원하지 않는 경우라 이 벤치마크는 실행할 수 없습니다."
    },
    {
      "q": "측정 중에 화면이 멈추거나 느려져도 괜찮나요?",
      "a": "부하를 낮은 단계부터 올리고, 5fps 아래로 떨어지면 더 올리지 않도록 설계했습니다. 그래도 저사양 기기에서는 잠깐 버벅일 수 있으며, 언제든 중단 버튼으로 멈출 수 있습니다."
    }
  ],
  "related": [
    "/playground/browser/",
    "/playground/features/",
    "/developer/json/",
    "/developer/image/",
    "/daily/qr/",
    "/developer/uuid/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>WebGL 2.0으로 3D 렌더링 · 파티클 · 셰이더 · 지오메트리 부하를 걸어 이 브라우저의 GPU 그래픽 성능을 측정합니다. 평균 FPS · 1% Low FPS · Frame Time과 10,000점 만점의 상대 점수를 보여 줍니다. <br/> 모든 측정은 이 브라우저 안에서만 실행되며 결과는 서버로 전송되지 않습니다. <br/>점수는 특정 테스트에 대한 상대적인 성능 지표이며 GPU 등급이나 시장 순위가 아닙니다.  </>}
      guide={<Guide />}
    >
      <WebglTool />
    </ToolLayout>
  );
}
