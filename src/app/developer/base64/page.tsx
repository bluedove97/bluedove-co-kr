import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import Base64Tool from '@/components/tools/base64/Base64Tool';
import Guide from '@/components/tools/base64/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/base64/",
  "title": "Base64 Encoder / Decoder — 한글 지원 Base64 인코딩·디코딩 | Bluedove",
  "description": "온라인 Base64 인코더·디코더. 한글(UTF-8) 텍스트, URL-safe Base64, 이미지·파일의 Data URL 변환을 지원합니다. 모든 변환은 브라우저 안에서만 이루어집니다.",
  "keywords": [
    "Base64 Encoder",
    "Base64 Decoder",
    "Base64 인코딩",
    "Base64 디코딩",
    "Base64 변환",
    "한글 Base64",
    "URL safe Base64",
    "이미지 Base64",
    "Data URL"
  ],
  "faq": [
    {
      "q": "한글이 깨지지 않나요?",
      "a": "텍스트를 UTF-8 바이트로 바꾼 뒤 인코딩하므로 한글과 이모지도 그대로 복원됩니다. btoa()를 바로 쓰면 생기는 오류가 없습니다."
    },
    {
      "q": "URL-safe Base64는 무엇인가요?",
      "a": "URL에 넣을 때 문제가 되는 + 와 / 를 - 와 _ 로 바꾸고 끝의 = 패딩을 뺀 형식입니다. JWT도 이 형식을 씁니다. 디코딩할 때는 두 형식을 자동으로 인식합니다."
    },
    {
      "q": "파일을 Base64로 바꿀 수 있나요?",
      "a": "네. 파일을 선택하면 Data URL(data:image/png;base64,...) 형식으로 바꿔 줍니다. 파일은 업로드되지 않고 브라우저에서 읽기만 합니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
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
      heroDesc={<>텍스트나 파일을 Base64로 인코딩하고 Base64 문자열을 원래 텍스트로 되돌립니다.<br />한글은 UTF-8로 처리하고 URL-safe 형식도 지원합니다.</>}
      guide={<Guide />}
    >
      <Base64Tool />
    </ToolLayout>
  );
}
