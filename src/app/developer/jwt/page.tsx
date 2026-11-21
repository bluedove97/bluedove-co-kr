import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import JwtTool from '@/components/tools/jwt/JwtTool';
import Guide from '@/components/tools/jwt/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/jwt/",
  "title": "JWT Decoder — JWT 토큰 디코딩·서명 검증 | Bluedove",
  "description": "온라인 JWT 디코더. JSON Web Token의 Header·Payload 파싱, exp/iat/nbf 만료 시간 확인, HS256·RS256·ES256·PS256 서명 검증을 지원합니다. 토큰과 키는 서버로 전송되지 않고 Web Crypto API로 브라우저에서 검증합니다.",
  "keywords": [
    "JWT Decoder",
    "JWT 디코더",
    "JWT 검증",
    "JWT 파싱",
    "JSON Web Token",
    "JWT 서명 검증",
    "HS256",
    "RS256",
    "ES256",
    "JWT exp 확인"
  ],
  "faq": [
    {
      "q": "토큰을 붙여넣어도 안전한가요?",
      "a": "토큰과 키는 이 페이지 밖으로 나가지 않습니다. 디코딩과 서명 검증은 브라우저 내장 Web Crypto API로 처리합니다. 그래도 운영 환경 토큰은 만료된 것이나 테스트용을 쓰는 편이 좋습니다."
    },
    {
      "q": "어떤 알고리즘을 검증할 수 있나요?",
      "a": "HS256/384/512(공유 비밀키), RS256/384/512와 PS256/384/512(RSA 공개키), ES256/384/512(EC 공개키)를 지원합니다. 공개키는 PEM(-----BEGIN PUBLIC KEY-----) 또는 JWK(JSON) 형식으로 넣으면 됩니다."
    },
    {
      "q": "디코딩이 된다고 토큰이 유효한 건가요?",
      "a": "아니요. JWT의 Header와 Payload는 단순 Base64URL 인코딩이라 누구나 읽을 수 있습니다. 위조 여부는 서명 검증을 통과해야 알 수 있습니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
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
      heroDesc={<>JWT를 붙여넣으면 Header와 Payload를 풀어 보여 주고 exp·iat·nbf를 날짜로 바꿔 만료 여부를 알려 줍니다. 비밀키나 공개키를 넣으면 서명도 검증합니다.</>}
      guide={<Guide />}
    >
      <JwtTool />
    </ToolLayout>
  );
}
