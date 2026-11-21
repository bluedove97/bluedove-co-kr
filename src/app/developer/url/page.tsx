import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import UrlTool from '@/components/tools/url/UrlTool';
import Guide from '@/components/tools/url/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/url/",
  "title": "URL Encoder / Decoder — URL 인코딩·디코딩, 쿼리스트링 분석 | Bluedove",
  "description": "온라인 URL 인코더·디코더. encodeURIComponent·encodeURI 방식 선택, 한글 URL 디코딩, 쿼리스트링 파라미터 표 분석을 지원합니다. 입력값은 브라우저에서만 처리됩니다.",
  "keywords": [
    "URL Encoder",
    "URL Decoder",
    "URL 인코딩",
    "URL 디코딩",
    "퍼센트 인코딩",
    "encodeURIComponent",
    "한글 URL 변환",
    "쿼리스트링 분석"
  ],
  "faq": [
    {
      "q": "encodeURIComponent와 encodeURI는 무엇이 다른가요?",
      "a": "encodeURIComponent는 / ? & = # 같은 구분 문자까지 모두 인코딩해서 쿼리 값 하나를 넣을 때 씁니다. encodeURI는 URL 구조를 이루는 문자는 남기고 한글·공백 등만 인코딩해서 URL 전체를 다룰 때 씁니다."
    },
    {
      "q": "공백을 + 로 바꾸고 싶어요.",
      "a": "'공백을 + 로' 옵션을 켜면 HTML 폼 전송(application/x-www-form-urlencoded) 방식처럼 공백이 + 로 인코딩됩니다. 디코딩할 때도 + 를 공백으로 바꿉니다."
    },
    {
      "q": "잘못된 % 시퀀스가 있으면 어떻게 되나요?",
      "a": "%E3%8 처럼 깨진 시퀀스가 있으면 디코딩 오류와 함께 문제 위치를 알려 줍니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/timestamp/",
    "/developer/image/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>한글이나 특수문자가 들어간 값을 퍼센트 인코딩하고 인코딩된 URL을 읽을 수 있게 되돌립니다. URL을 넣으면 도메인, 경로, 쿼리 파라미터로 나눠 보여 줍니다.</>}
      guide={<Guide />}
    >
      <UrlTool />
    </ToolLayout>
  );
}
