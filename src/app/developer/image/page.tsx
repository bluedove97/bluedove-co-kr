import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import ImageTool from '@/components/tools/image/ImageTool';
import Guide from '@/components/tools/image/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/developer/image/",
  "title": "이미지 압축 · 변환 — JPG, PNG, WebP 용량 줄이기 | Bluedove",
  "description": "업로드 없는 온라인 이미지 압축·변환기. JPG·PNG·WebP 포맷 변환, 화질 조절, 크기 줄이기, 여러 장 한 번에 처리. 이미지는 서버로 전송되지 않고 브라우저 Canvas API와 Web Worker로만 처리됩니다.",
  "keywords": [
    "이미지 압축",
    "이미지 용량 줄이기",
    "사진 용량 줄이기",
    "JPG 압축",
    "PNG 압축",
    "WebP 변환",
    "PNG to WebP",
    "JPG to WebP",
    "이미지 변환",
    "이미지 리사이즈"
  ],
  "faq": [
    {
      "q": "이미지가 서버에 업로드되나요?",
      "a": "아니요. 선택한 이미지는 브라우저 메모리에서만 읽고 Canvas API(가능하면 Web Worker의 OffscreenCanvas)로 다시 인코딩합니다. 네트워크로 전송되는 데이터가 없으므로 인터넷을 끊은 상태에서도 동작합니다."
    },
    {
      "q": "PNG는 화질 슬라이더가 왜 적용되지 않나요?",
      "a": "PNG는 무손실 포맷이라 브라우저 인코더가 화질 값을 받지 않습니다. PNG 용량을 크게 줄이려면 WebP나 JPG로 변환하거나 해상도를 줄이세요."
    },
    {
      "q": "압축하면 오히려 용량이 커질 수 있나요?",
      "a": "이미 잘 압축된 파일이면 그럴 수 있습니다. 결과가 원본보다 크면 표시해 드리니 화질을 낮추거나 다른 포맷을 골라 보세요."
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
      heroDesc={<>JPG, PNG, WebP 이미지의 용량을 줄이고 포맷을 바꿉니다. 이미지는 서버로 업로드되지 않고 브라우저의 Canvas API와 Web Worker로만 처리합니다.</>}
      guide={<Guide />}
    >
      <ImageTool />
    </ToolLayout>
  );
}
