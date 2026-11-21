import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import FuelTool from '@/components/tools/fuel/FuelTool';
import Guide from '@/components/tools/fuel/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/daily/fuel/",
  "title": "연비 계산기 — km/L 연비, 주유 금액당 주행거리 | Bluedove",
  "description": "자동차 연비 계산기. 주행거리와 주유량으로 실연비(km/L, L/100km)를 계산하고 주유 금액·리터당 유가로 금액당 주행거리와 km당 연료비, 예상 주유비를 계산합니다.",
  "keywords": [
    "연비 계산기",
    "자동차 연비",
    "실연비 계산",
    "km/L 계산",
    "주유비 계산",
    "기름값 계산",
    "km당 연료비",
    "L/100km",
    "주행거리 계산"
  ],
  "faq": [
    {
      "q": "실연비는 어떻게 재는 게 정확한가요?",
      "a": "가득 주유한 뒤 트립 미터를 0으로 맞추고 다음에 다시 가득 주유할 때 넣은 기름 양(L)과 그동안 달린 거리(km)를 넣으면 가장 정확합니다(만땅법)."
    },
    {
      "q": "L/100km는 무엇인가요?",
      "a": "100km를 달리는 데 필요한 연료량으로 유럽에서 주로 씁니다. 100 ÷ (km/L) 로 바꿀 수 있습니다."
    },
    {
      "q": "금액 기준 계산은 어디에 쓰나요?",
      "a": "주유 영수증 금액과 리터당 가격만 알면 넣은 기름 양을 역산해서 연비를 구할 수 있고 km당 연료비로 출퇴근 비용을 비교할 수 있습니다."
    }
  ],
  "related": [
    "/daily/overseas/",
    "/daily/age/",
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>주행거리와 주유량으로 내 차의 실제 연비(km/L)를 계산하고 주유 금액과 유가로 1원·1만 원당 몇 km를 달렸는지, km당 연료비는 얼마인지 알려 줍니다.</>}
      guide={<Guide />}
    >
      <FuelTool />
    </ToolLayout>
  );
}
