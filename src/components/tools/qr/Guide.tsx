/* /daily/qr/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li><strong>QR 코드 종류</strong> 선택상자에서 URL/텍스트, Wi-Fi 접속, 연락처(vCard), 전화/문자/이메일 중 하나를 고릅니다.</li>
        <li>종류에 맞게 바뀐 양식을 채우고 <strong>QR 코드 생성</strong>을 누릅니다.</li>
        <li>크기 · 여백 · 전경/배경 색상 · 오류 정정 레벨을 바꾸면 미리보기에 바로 반영됩니다.</li>
        <li><strong>PNG 다운로드</strong>는 화면·메신저용, <strong>SVG 다운로드</strong>는 인쇄물·현수막처럼 크게 키워야 할 때 씁니다.</li>
      </ol>
      <p>입력한 내용과 만든 QR 코드는 서버로 전송되지 않습니다. 모든 처리가 이 브라우저 안에서 끝나므로 Wi-Fi 비밀번호나 연락처를 넣어도 외부에 남지 않습니다.</p>

      <h3>종류별로 만들어지는 내용</h3>
      <ul>
        <li><strong>URL / 텍스트</strong>: 입력한 글자를 그대로 담습니다. https:// 로 시작하는 주소는 스캔하면 바로 브라우저가 열립니다.</li>
        <li><strong>Wi-Fi 접속</strong>: <code>WIFI:T:WPA;S:이름;P:비밀번호;;</code> 형식으로 만들어 스마트폰 카메라로 찍으면 바로 접속을 제안합니다. 매장·사무실·숙소 안내문에 많이 씁니다.</li>
        <li><strong>연락처 (vCard)</strong>: 이름·회사·전화·이메일을 vCard 3.0 형식으로 담아 스캔 한 번에 주소록에 저장할 수 있습니다. 명함 뒷면에 넣기 좋습니다.</li>
        <li><strong>전화 / 문자 / 이메일</strong>: <code>tel:</code>, <code>SMSTO:</code>, <code>mailto:</code> 형식으로 전화 걸기, 미리 채운 문자 보내기, 제목·본문이 들어간 메일 쓰기 화면을 엽니다.</li>
      </ul>

      <h3>출력 옵션</h3>
      <ul>
        <li><strong>크기</strong>: 내려받는 이미지의 가로·세로 픽셀입니다. 인쇄용이면 512px 이상이나 SVG를 권합니다.</li>
        <li><strong>여백</strong>: QR 둘레의 빈 공간(quiet zone)을 모듈 칸 수로 정합니다. 표준 권장값은 4칸이고, 너무 줄이면 주변 그림과 섞여 인식이 떨어집니다.</li>
        <li><strong>전경/배경 색상</strong>: 어두운 전경과 밝은 배경, 충분한 대비를 지키세요. 대비가 3:1보다 낮거나 색이 반전되면 경고를 보여 줍니다.</li>
        <li><strong>오류 정정 레벨</strong>: L(7%) · M(15%) · Q(25%) · H(30%)는 QR 일부가 가려지거나 더러워져도 복원할 수 있는 비율입니다. 높일수록 튼튼하지만 패턴이 촘촘해집니다.</li>
      </ul>

      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>만든 QR 코드에 유효 기간이 있나요?</summary><p>없습니다. 이 도구는 내용을 QR 이미지에 직접 담는 정적 QR 코드를 만들기 때문에 중간 서버가 없고, 이미지를 지우지 않는 한 계속 쓸 수 있습니다. 대신 만든 뒤에는 내용을 바꿀 수 없으니 새로 만들어야 합니다.</p></details>
        <details><summary>Wi-Fi QR 코드는 아이폰과 안드로이드에서 모두 되나요?</summary><p>네. iOS 11 이상 기본 카메라와 안드로이드 기본 카메라·Google 렌즈 모두 WIFI: 형식을 읽어 접속을 제안합니다. 비밀번호와 보안 방식(WPA/WEP)을 공유기 설정과 똑같이 넣어야 합니다.</p></details>
        <details><summary>스캔이 잘 안 될 때는 어떻게 하나요?</summary><p>전경은 어둡게, 배경은 밝게 하고 여백을 4칸 이상 두세요. 내용이 길면 패턴이 촘촘해지므로 URL을 줄이거나 오류 정정 레벨을 L·M으로 낮추면 인식이 쉬워집니다. 인쇄할 때는 최소 2cm 이상 크기로 출력하세요.</p></details>
        <details><summary>QR 코드에 얼마나 많은 글자를 넣을 수 있나요?</summary><p>오류 정정 레벨 L 기준으로 최대 2,953 byte까지 담을 수 있습니다. 한글은 UTF-8에서 한 글자가 3 byte라 약 980자 정도입니다. 레벨을 높일수록 담을 수 있는 양은 줄어듭니다.</p></details>
        <details><summary>PNG와 SVG 중 무엇을 받아야 하나요?</summary><p>웹페이지·메신저·문서에 붙일 때는 PNG, 명함·포스터·현수막처럼 인쇄하거나 크게 확대할 때는 깨지지 않는 벡터 형식인 SVG가 좋습니다.</p></details>
      </div>
    </>
  );
}
