import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import YamlTool from '@/components/tools/yaml/YamlTool';
import Guide from '@/components/tools/yaml/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/yaml/",
  "title": "JSON ↔ YAML 변환기 — JSON to YAML, YAML to JSON | Bluedove",
  "description": "JSON을 YAML로, YAML을 JSON으로 변환하는 온라인 도구. 들여쓰기 설정, 다중 문서(---) YAML 지원, 오류 위치 표시. 쿠버네티스·docker-compose 설정 변환에 유용하며 데이터는 브라우저에서만 처리됩니다.",
  "keywords": [
    "JSON to YAML",
    "YAML to JSON",
    "JSON YAML 변환",
    "YAML 변환기",
    "YAML 파서",
    "쿠버네티스 YAML",
    "docker-compose YAML"
  ],
  "faq": [
    {
      "q": "여러 문서가 들어 있는 YAML(--- 구분)도 변환되나요?",
      "a": "네. 문서가 2개 이상이면 JSON 배열로 변환합니다. 반대로 JSON 배열을 YAML로 바꿀 때 '배열을 여러 문서로 나누기'를 켜면 --- 로 구분된 다중 문서가 됩니다."
    },
    {
      "q": "YAML 앵커(&)와 별칭(*)도 지원하나요?",
      "a": "네. YAML을 읽을 때 앵커와 별칭을 풀어서 JSON 값으로 펼칩니다."
    },
    {
      "q": "어떤 라이브러리를 사용하나요?",
      "a": "검증된 오픈소스 파서 js-yaml(MIT 라이선스)을 사이트에 직접 포함해서 사용합니다. 외부 CDN이나 서버를 거치지 않습니다."
    }
  ],
  "related": [
    "/developer/json/",
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
      heroDesc={<>JSON을 YAML로, YAML을 JSON으로 바꿉니다.<br />쿠버네티스 매니페스트나 docker-compose 파일, CI 설정, springboot의 설정을 옮길 때 편합니다.</>}
      guide={<Guide />}
    >
      <YamlTool />
    </ToolLayout>
  );
}
