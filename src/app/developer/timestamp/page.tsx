import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import TimestampTool from '@/components/tools/timestamp/TimestampTool';
import Guide from '@/components/tools/timestamp/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/timestamp/",
  "title": "Timestamp Converter — Unix 타임스탬프 ↔ 날짜 변환 | Bluedove",
  "description": "Unix Timestamp 변환기. 초·밀리초·마이크로초 자동 인식, 한국 시간(KST)·UTC·ISO 8601·상대 시간 표시, 날짜를 타임스탬프로 역변환, 실시간 현재 epoch 확인을 지원합니다.",
  "keywords": [
    "Timestamp Converter",
    "Unix Timestamp",
    "타임스탬프 변환",
    "epoch 변환",
    "유닉스 시간",
    "밀리초 변환",
    "timestamp to date",
    "date to timestamp",
    "KST UTC 변환"
  ],
  "faq": [
    {
      "q": "초 단위인지 밀리초 단위인지 어떻게 구분하나요?",
      "a": "자릿수로 자동 판단합니다. 10자리 안팎은 초, 13자리는 밀리초, 16자리는 마이크로초, 19자리는 나노초로 봅니다. 직접 단위를 골라도 됩니다."
    },
    {
      "q": "시간대는 어떻게 적용되나요?",
      "a": "타임스탬프는 시간대와 무관한 절대 시각입니다. 결과는 한국 시간(Asia/Seoul), UTC, 그리고 선택한 시간대로 함께 보여 줍니다."
    },
    {
      "q": "2038년 문제란 무엇인가요?",
      "a": "부호 있는 32비트 정수로 초를 저장하면 2038-01-19 03:14:07 UTC(2147483647)를 넘을 때 값이 넘칩니다. 이 도구는 64비트 범위로 계산하므로 그 이후 날짜도 변환됩니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/url/",
    "/developer/image/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>Unix 타임스탬프(초·밀리초)를 날짜와 시각으로, 날짜를 타임스탬프로 바꿉니다. 한국 시간(KST), UTC, ISO 8601을 한 번에 볼 수 있습니다.</>}
      guide={<Guide />}
    >
      <TimestampTool />
    </ToolLayout>
  );
}
