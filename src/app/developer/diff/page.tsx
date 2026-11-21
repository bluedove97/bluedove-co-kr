import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import DiffTool from '@/components/tools/diff/DiffTool';
import Guide from '@/components/tools/diff/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/diff/",
  "title": "텍스트 비교(Diff) · 줄 정렬 · 글자 수 세기 | Bluedove",
  "description": "온라인 텍스트 비교(Diff) 도구. 두 문서의 추가·삭제·변경 줄 표시, 공백·대소문자 무시 옵션, 줄 단위 정렬·중복 제거·역순, 글자 수(공백 포함/제외)·단어·줄·바이트 수 계산을 지원합니다.",
  "keywords": [
    "텍스트 비교",
    "Diff",
    "문서 비교",
    "코드 비교",
    "줄 정렬",
    "중복 줄 제거",
    "글자 수 세기",
    "글자수 계산",
    "바이트 수 계산",
    "공백 제외 글자수"
  ],
  "faq": [
    {
      "q": "어떤 알고리즘으로 비교하나요?",
      "a": "git diff 등에서 쓰는 Myers 차이 알고리즘으로 최소 편집 단위를 찾고 바뀐 줄 안에서는 글자 단위로 다시 비교해 달라진 부분을 강조합니다."
    },
    {
      "q": "글자 수에서 바이트는 어떻게 계산하나요?",
      "a": "UTF-8 기준입니다. 영문·숫자는 1바이트, 한글은 3바이트, 이모지는 대부분 4바이트로 셉니다. EUC-KR(한글 2바이트) 기준 값도 함께 보여 줍니다."
    },
    {
      "q": "비교할 텍스트가 저장되나요?",
      "a": "저장하지 않습니다. 페이지를 닫으면 사라지며 서버로도 전송되지 않습니다."
    }
  ],
  "related": [
    "/developer/json/",
    "/developer/yaml/",
    "/developer/base64/",
    "/developer/jwt/",
    "/developer/url/",
    "/developer/timestamp/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>두 텍스트에서 바뀐 줄을 찾아 보여 줍니다(Diff). 줄을 정렬하거나 중복을 지우고 글자 수와 바이트 수도 셉니다.</>}
      guide={<Guide />}
    >
      <DiffTool />
    </ToolLayout>
  );
}
