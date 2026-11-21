import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import AgeTool from '@/components/tools/age/AgeTool';
import Guide from '@/components/tools/age/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/daily/age/",
  "title": "만나이 계산기 — 만 나이·연 나이·띠 계산 | Bluedove",
  "description": "만 나이 계산기. 생년월일과 기준일로 만 나이, 연 나이, 띠, 다음 생일 D-day, 살아온 날 수를 계산합니다. 2023년 6월 시행된 만 나이 통일법 기준이며 투표·운전면허·청소년 관람불가 등 나이 기준도 안내합니다.",
  "keywords": [
    "만나이 계산기",
    "만 나이 계산",
    "나이 계산기",
    "연나이",
    "띠 계산",
    "만나이 통일법",
    "생년월일 나이",
    "한국 나이",
    "출생연도 나이"
  ],
  "faq": [
    {
      "q": "만 나이는 어떻게 계산하나요?",
      "a": "기준일 연도에서 태어난 연도를 뺀 뒤, 기준일이 아직 올해 생일 전이면 1을 더 뺍니다. 태어난 날은 0세이고 첫 생일에 1세가 됩니다."
    },
    {
      "q": "연 나이는 언제 쓰나요?",
      "a": "현재 연도에서 출생 연도를 뺀 나이입니다. 병역법, 청소년보호법 등 일부 법률은 생일과 관계없이 연 나이를 기준으로 합니다."
    },
    {
      "q": "2월 29일생은 생일을 언제로 보나요?",
      "a": "윤년이 아닌 해에는 3월 1일이 되어야 한 살을 더 먹는 것으로 계산합니다. (민법의 기간 계산 방식)"
    }
  ],
  "related": [
    "/daily/overseas/",
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
      heroDesc={<>생년월일을 넣으면 오늘(또는 원하는 기준일) 기준 만 나이와 연 나이, 띠를 계산합니다. 다음 생일까지 남은 날도 알려 줍니다.</>}
      guide={<Guide />}
    >
      <AgeTool />
    </ToolLayout>
  );
}
