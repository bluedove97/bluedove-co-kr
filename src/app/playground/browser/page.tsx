import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import BrowserTool from '@/components/tools/browser/BrowserTool';
import Guide from '@/components/tools/browser/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/playground/browser/",
  "title": "브라우저 성능 테스트 — 어항 물고기 FPS 벤치마크 | Bluedove",
  "description": "어항 물고기로 하는 브라우저 성능 테스트(벤치마크). 시작하면 0.1초마다 SVG 물고기를 1마리씩 늘리며 실시간 FPS와 프레임 시간을 측정하고 FPS 20 미만이 10초 이어지면 최종 점수를 보여 줍니다.",
  "keywords": [
    "브라우저 성능 테스트",
    "브라우저 벤치마크",
    "FPS 테스트",
    "렌더링 성능",
    "SVG 애니메이션 성능",
    "컴퓨터 성능 테스트",
    "어항 테스트",
    "웹 벤치마크"
  ],
  "faq": [
    {
      "q": "점수는 어떻게 매겨지나요?",
      "a": "FPS가 20 미만으로 10초 동안 계속 유지되면 테스트가 끝나고 그 시점의 물고기 수가 점수가 됩니다. 중간에 FPS가 20 이상으로 회복되면 10초 카운트다운은 처음부터 다시 시작합니다."
    },
    {
      "q": "다른 탭으로 가면 어떻게 되나요?",
      "a": "브라우저는 보이지 않는 탭의 애니메이션을 멈추기 때문에, 탭이 숨겨지면 측정을 일시정지하고 카운트다운을 초기화합니다."
    },
    {
      "q": "점수가 기기마다 다른 이유는요?",
      "a": "CPU·GPU 성능, 화면 해상도와 주사율, 브라우저 종류, 절전 모드, 확장 프로그램 등에 따라 렌더링 성능이 달라집니다. 같은 기기에서 브라우저끼리 비교해 보는 것도 재미있습니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/url/",
    "/developer/timestamp/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>시작하기를 누르면 어항의 물고기가 0.1초마다 한 마리씩 늘어나며 브라우저가 얼마나 버티는지 봅니다. FPS가 20 아래로 떨어진 채 10초가 지나면 그때의 물고기 수가 최종 점수가 됩니다.</>}
      guide={<Guide />}
    >
      <BrowserTool />
    </ToolLayout>
  );
}
