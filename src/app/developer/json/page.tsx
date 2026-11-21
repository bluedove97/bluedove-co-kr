import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import JsonTool from '@/components/tools/json/JsonTool';
import Guide from '@/components/tools/json/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/json/",
  "title": "JSON Formatter / Validator — JSON 정렬·검증·압축 | Bluedove",
  "description": "온라인 JSON 포매터·검증기. JSON을 들여쓰기로 정렬(Pretty Print)하거나 한 줄로 압축(Minify)하고 문법 오류 위치를 줄·칸 단위로 알려 줍니다. 데이터는 서버로 전송되지 않습니다.",
  "keywords": [
    "JSON Formatter",
    "JSON Validator",
    "JSON 정렬",
    "JSON 검증",
    "JSON 포맷",
    "JSON beautify",
    "JSON minify",
    "JSON 압축",
    "JSON 문법 오류"
  ],
  "faq": [
    {
      "q": "입력한 JSON이 서버로 전송되나요?",
      "a": "아니요. 정렬과 검증은 브라우저의 JSON.parse로 처리하며 네트워크 요청을 보내지 않습니다. 민감한 설정 파일도 안심하고 붙여넣어도 됩니다."
    },
    {
      "q": "주석이나 끝에 붙은 쉼표(trailing comma)도 허용되나요?",
      "a": "표준 JSON(RFC 8259)은 주석과 trailing comma를 허용하지 않으므로 오류로 표시합니다. 오류 메시지에 나온 줄·칸 위치를 보고 고치면 됩니다."
    },
    {
      "q": "아주 큰 JSON도 처리할 수 있나요?",
      "a": "브라우저 메모리가 허용하는 범위라면 수 MB 단위도 처리됩니다. 다만 구문 강조는 1MB가 넘으면 꺼서 화면이 멈추지 않게 했습니다."
    }
  ],
  "related": [
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/url/",
    "/developer/timestamp/",
    "/developer/image/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>JSON을 보기 좋게 정렬하고 문법 오류가 있으면 몇 번째 줄 몇 번째 글자인지 알려 줍니다.<br />한 줄 압축과 키 정렬도 할 수 있습니다.</>}
      guide={<Guide />}
    >
      <JsonTool />
    </ToolLayout>
  );
}
