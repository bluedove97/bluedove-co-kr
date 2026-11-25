import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import LottoTool from '@/components/tools/lotto/LottoTool';
import Guide from '@/components/tools/lotto/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/daily/lotto/",
  "title": "로또 확률 계산기 — 로또 6/45 모의 구매 · 당첨 확률 시뮬레이터 | Bluedove",
  "description": "로또 6/45 당첨 확률 계산기. 가상 당첨 번호에 원하는 금액만큼 자동 번호를 사 보고 1등~5등 당첨 횟수, 이론상 기대 횟수, 추정 당첨금과 수익률을 바로 확인하는 모의 구매 시뮬레이터입니다.",
  "keywords": [
    "로또 확률 계산기",
    "로또 당첨 확률",
    "로또 시뮬레이터",
    "로또 모의 구매",
    "로또 6/45",
    "로또 1등 확률",
    "로또 기댓값",
    "로또 수익률",
    "자동 번호 생성"
  ],
  "faq": [
    {
      "q": "로또 1등 당첨 확률은 얼마인가요?",
      "a": "45개 숫자 중 6개를 고르는 조합 수는 8,145,060가지이므로 1게임으로 1등에 당첨될 확률은 1/8,145,060(약 0.0000123%)입니다."
    },
    {
      "q": "2등과 3등은 무엇이 다른가요?",
      "a": "둘 다 당첨 번호 6개 중 5개를 맞힌 경우입니다. 남은 1개 번호가 보너스 번호와 같으면 2등(1/1,357,510), 아니면 3등(1/35,724)입니다."
    },
    {
      "q": "이 계산기에서 나온 당첨금은 실제와 같나요?",
      "a": "4등 50,000원과 5등 5,000원은 고정 금액이지만 1~3등은 회차별 판매액과 당첨자 수에 따라 달라집니다. 이 페이지는 최근 평균 수준의 추정치(세전)를 사용합니다."
    },
    {
      "q": "구매한 번호나 결과가 저장되나요?",
      "a": "아니요. 모든 계산은 브라우저 안에서만 이루어지고 어디에도 저장되지 않습니다. 페이지를 새로 고치면 당첨 번호와 결과가 모두 새로 시작됩니다."
    }
  ],
  "related": [
    "/daily/age/",
    "/daily/fuel/",
    "/daily/qr/",
    "/daily/overseas/",
    "/developer/uuid/",
    "/playground/browser/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>가상의 로또 6/45 당첨 번호가 정해져 있습니다.<br/>원하는 금액만큼 자동 번호를 사고 0.05초에 1게임씩 추첨해 등수별 당첨 횟수와 이론상 확률, 추정 당첨금과 수익률을 보여 줍니다. 당연히 실제 돈은 들지 않습니다. <br/> 하지만, 로또 구매시 현실적인 당첨 확률을 알 수 있습니다.(💊빨간약)</>}
      guide={<Guide />}
    >
      <LottoTool />
    </ToolLayout>
  );
}
