import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import UuidTool from '@/components/tools/uuid/UuidTool';
import Guide from '@/components/tools/uuid/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/uuid/",
  "title": "UUID Generator — UUID v4 생성기, 대량 생성 · 하이픈 제거 | Bluedove",
  "description": "UUID v4 생성기. 브라우저 Web Crypto로 UUID를 1~100개 한 번에 만들고 하이픈 표시/제거, 개별 복사와 전체 복사를 지원합니다. 생성한 값은 서버로 전송되지 않습니다.",
  "keywords": [
    "UUID 생성기",
    "UUID Generator",
    "UUID v4",
    "GUID 생성",
    "랜덤 UUID",
    "UUID 대량 생성",
    "UUID 하이픈 제거",
    "uuid online"
  ],
  "faq": [
    {
      "q": "UUID v4가 중복될 가능성은 없나요?",
      "a": "이론적으로는 있지만 무시할 수 있을 만큼 작습니다. 무작위 비트가 122개라 약 5.3×10³⁶가지 값이 나올 수 있고, 10억 개를 만들어도 하나라도 겹칠 확률은 약 10¹⁹분의 1 (0.00000000000000001%)입니다."
    },
    {
      "q": "하이픈을 빼도 같은 UUID인가요?",
      "a": "네. 하이픈은 읽기 쉽게 끊어 놓은 표기일 뿐 값은 같습니다. 다만 데이터베이스 UUID 타입이나 라이브러리가 하이픈이 있는 36자 형식만 받는 경우가 있으니 저장할 곳의 형식을 확인하세요."
    },
    {
      "q": "GUID와 UUID는 다른가요?",
      "a": "GUID는 마이크로소프트가 쓰는 이름이고 형식은 UUID와 같습니다. .NET의 Guid.NewGuid()도 버전 4 UUID를 만듭니다."
    },
    {
      "q": "UUID를 비밀번호나 보안 토큰으로 써도 되나요?",
      "a": "Web Crypto로 만든 v4는 예측이 어렵지만 UUID는 원래 식별용이라 형식이 공개되어 있고 엔트로피도 122비트로 고정입니다. 인증 토큰처럼 보안이 중요한 값은 목적에 맞는 토큰 생성 방식을 쓰는 것이 좋습니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/url/",
    "/developer/timestamp/",
    "/developer/diff/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>UUID v4를 1~100개까지 한 번에 만듭니다. 하이픈을 넣거나 빼고, 하나씩 또는 전체를 복사할 수 있습니다.<br />브라우저의 Web Crypto로 생성하며 서버로 전송하지 않습니다.</>}
      guide={<Guide />}
    >
      <UuidTool />
    </ToolLayout>
  );
}
