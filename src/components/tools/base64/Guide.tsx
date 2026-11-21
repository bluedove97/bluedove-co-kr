/* /developer/base64/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li><strong>텍스트</strong> 탭에서 내용을 입력하고 <strong>인코딩</strong> 또는 <strong>디코딩</strong>을 누릅니다. '입력하면서 변환'을 켜 두면 마지막으로 누른 방향으로 바로 바뀝니다.</li>
        <li>JWT나 URL 파라미터에 쓸 값이면 <strong>URL-safe</strong>를 켜세요.</li>
        <li><strong>파일 → Base64</strong> 탭에서는 이미지나 폰트를 Data URL로 바꿔 HTML·CSS에 바로 넣을 수 있습니다.</li>
      </ol>
      <h3>Base64란</h3>
      <p>Base64는 바이너리 데이터를 A–Z, a–z, 0–9, +, / 64개 문자로 표현하는 인코딩입니다. 3바이트를 4글자로 바꾸기 때문에 결과는 원본보다 약 33% 커집니다. 이메일 첨부, Data URL, HTTP Basic 인증 헤더, JWT 등에 쓰입니다.</p>
      <p>Base64는 <strong>암호화가 아닙니다.</strong> 누구나 디코딩할 수 있으니 비밀번호나 개인정보를 숨기는 용도로 쓰면 안 됩니다.</p>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>한글이 깨지지 않나요?</summary><p>텍스트를 UTF-8 바이트로 바꾼 뒤 인코딩하므로 한글과 이모지도 그대로 복원됩니다. btoa()를 바로 쓰면 생기는 오류가 없습니다.</p></details>
        <details><summary>URL-safe Base64는 무엇인가요?</summary><p>URL에 넣을 때 문제가 되는 + 와 / 를 - 와 _ 로 바꾸고 끝의 = 패딩을 뺀 형식입니다. JWT도 이 형식을 씁니다. 디코딩할 때는 두 형식을 자동으로 인식합니다.</p></details>
        <details><summary>파일을 Base64로 바꿀 수 있나요?</summary><p>네. 파일을 선택하면 Data URL(data:image/png;base64,...) 형식으로 바꿔 줍니다. 파일은 업로드되지 않고 브라우저에서 읽기만 합니다.</p></details>
      </div>
    </>
  );
}
