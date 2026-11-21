import type { Metadata } from 'next';
import ToolLayout from '@/components/layout/ToolLayout';
import QrTool from '@/components/tools/qr/QrTool';
import Guide from '@/components/tools/qr/Guide';
import { toolMetadata, type ToolPageInfo } from '@/lib/seo';

const PAGE: ToolPageInfo = {
  "href": "/daily/qr/",
  "title": "QR 코드 만들기 — URL · Wi-Fi · 연락처 QR 무료 생성 | Bluedove",
  "description": "무료 QR 코드 생성기. URL·텍스트, Wi-Fi 접속, 연락처(vCard), 전화·문자·이메일 QR 코드를 만들고 크기·여백·색상·오류 정정 레벨을 조절해 PNG·SVG로 저장합니다. 입력 내용은 서버로 전송되지 않습니다.",
  "keywords": [
    "QR 코드 만들기",
    "QR 코드 생성기",
    "무료 QR 코드",
    "와이파이 QR 코드",
    "Wi-Fi QR",
    "명함 QR 코드",
    "vCard QR",
    "URL QR 코드",
    "QR 코드 SVG"
  ],
  "faq": [
    {
      "q": "만든 QR 코드에 유효 기간이 있나요?",
      "a": "없습니다. 이 도구는 내용을 QR 이미지에 직접 담는 정적 QR 코드를 만들기 때문에 중간 서버가 없고, 이미지를 지우지 않는 한 계속 쓸 수 있습니다. 대신 만든 뒤에는 내용을 바꿀 수 없으니 새로 만들어야 합니다."
    },
    {
      "q": "Wi-Fi QR 코드는 아이폰과 안드로이드에서 모두 되나요?",
      "a": "네. iOS 11 이상 기본 카메라와 안드로이드 기본 카메라·Google 렌즈 모두 WIFI: 형식을 읽어 접속을 제안합니다. 비밀번호와 보안 방식(WPA/WEP)을 공유기 설정과 똑같이 넣어야 합니다."
    },
    {
      "q": "스캔이 잘 안 될 때는 어떻게 하나요?",
      "a": "전경은 어둡게, 배경은 밝게 하고 여백을 4칸 이상 두세요. 내용이 길면 패턴이 촘촘해지므로 URL을 줄이거나 오류 정정 레벨을 L·M으로 낮추면 인식이 쉬워집니다. 인쇄할 때는 최소 2cm 이상 크기로 출력하세요."
    },
    {
      "q": "QR 코드에 얼마나 많은 글자를 넣을 수 있나요?",
      "a": "오류 정정 레벨 L 기준으로 최대 2,953 byte까지 담을 수 있습니다. 한글은 UTF-8에서 한 글자가 3 byte라 약 980자 정도입니다. 레벨을 높일수록 담을 수 있는 양은 줄어듭니다."
    },
    {
      "q": "PNG와 SVG 중 무엇을 받아야 하나요?",
      "a": "웹페이지·메신저·문서에 붙일 때는 PNG, 명함·포스터·현수막처럼 인쇄하거나 크게 확대할 때는 깨지지 않는 벡터 형식인 SVG가 좋습니다."
    }
  ],
  "related": [
    "/developer/url/",
    "/developer/image/",
    "/daily/overseas/",
    "/daily/age/",
    "/daily/fuel/",
    "/developer/base64/"
  ]
};

export const metadata: Metadata = toolMetadata(PAGE);

export default function Page() {
  return (
    <ToolLayout
      page={PAGE}
      heroDesc={<>링크, Wi-Fi 접속 정보, 명함 연락처, 전화·문자·이메일을 QR 코드로 만듭니다. 크기와 색상을 바꿔 PNG·SVG로 내려받을 수 있고, 입력한 내용은 서버로 전송되지 않습니다.</>}
      guide={<Guide />}
    >
      <QrTool />
    </ToolLayout>
  );
}
