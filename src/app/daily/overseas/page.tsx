import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import OverseasTool from '@/components/tools/overseas/OverseasTool';
import Guide from '@/components/tools/overseas/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/daily/overseas/",
  "title": "해외시간 계산기 — 한국 시간 vs 세계 주요 도시 시차 | Bluedove",
  "description": "세계 시간 계산기. 현재 한국 시간(KST)과 뉴욕·런던·파리·도쿄·시드니 등 세계 주요 도시의 현지 시각, 시차, 서머타임(DST) 적용 여부를 실시간으로 보여 주고 회의 시간을 환산합니다.",
  "keywords": [
    "해외시간",
    "세계시간",
    "시차 계산기",
    "한국 미국 시차",
    "뉴욕 시간",
    "런던 시간",
    "현지 시간",
    "서머타임",
    "회의 시간 변환",
    "세계 시계"
  ],
  "faq": [
    {
      "q": "서머타임(일광절약시간)도 반영되나요?",
      "a": "네. 브라우저에 내장된 IANA 시간대 데이터베이스(Intl API)를 사용하므로 미국·유럽·호주 등의 서머타임 시작·종료가 자동으로 반영됩니다."
    },
    {
      "q": "추가한 도시는 저장되나요?",
      "a": "선택한 도시 목록은 이 브라우저의 localStorage에만 저장되어 다음에 방문해도 유지됩니다. 서버에는 저장되지 않습니다."
    },
    {
      "q": "한국과 미국 동부의 시차는 얼마인가요?",
      "a": "뉴욕은 서머타임 기간(3월~11월)에는 한국보다 13시간, 그 외 기간에는 14시간 늦습니다. 위 표에서 오늘 날짜 기준 시차를 바로 확인할 수 있습니다."
    }
  ],
  "related": [
    "/daily/age/",
    "/daily/fuel/",
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
      heroDesc={<>지금 한국 시간과 세계 주요 도시의 현재 시각, 시차를 한눈에 봅니다. 한국 시간 기준으로 특정 시각이 현지에서 몇 시인지도 계산합니다.</>}
      guide={<Guide />}
    >
      <OverseasTool />
    </ToolLayout>
  );
}
