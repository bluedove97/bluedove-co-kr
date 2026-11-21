/* /developer/url/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>쿼리스트링 값 하나를 넣을 때는 <strong>encodeURIComponent</strong>, URL 전체를 다룰 때는 <strong>encodeURI</strong>를 고릅니다.</li>
        <li>값을 입력하고 <strong>인코딩</strong> 또는 <strong>디코딩</strong>을 누릅니다.</li>
        <li><strong>URL 분석</strong> 탭에서는 URL을 프로토콜, 호스트, 포트, 경로, 해시와 쿼리 파라미터로 나눠 디코딩된 값으로 보여 줍니다.</li>
      </ol>
      <h3>URL 인코딩(퍼센트 인코딩)이란</h3>
      <p>URL에는 영문, 숫자, 일부 기호만 쓸 수 있습니다. 한글이나 공백, <code>&amp;</code> <code>?</code> 같은 예약 문자를 값으로 넣으려면 UTF-8 바이트를 <code>%XX</code> 형태로 바꿔야 합니다. 예를 들어 '한글'은 <code>%ED%95%9C%EA%B8%80</code>이 됩니다.</p>
      <h3>방식별 인코딩하지 않는 문자</h3>
      <ul>
        <li><strong>encodeURIComponent</strong>: <code>A-Z a-z 0-9 - _ . ! ~ * ' ( )</code></li>
        <li><strong>encodeURI</strong>: 위 문자에 더해 <code>; , / ? : @ &amp; = + $ #</code></li>
      </ul>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>encodeURIComponent와 encodeURI는 무엇이 다른가요?</summary><p>encodeURIComponent는 / ? &amp; = # 같은 구분 문자까지 모두 인코딩해서 쿼리 값 하나를 넣을 때 씁니다. encodeURI는 URL 구조를 이루는 문자는 남기고 한글·공백 등만 인코딩해서 URL 전체를 다룰 때 씁니다.</p></details>
        <details><summary>공백을 + 로 바꾸고 싶어요.</summary><p>'공백을 + 로' 옵션을 켜면 HTML 폼 전송(application/x-www-form-urlencoded) 방식처럼 공백이 + 로 인코딩됩니다. 디코딩할 때도 + 를 공백으로 바꿉니다.</p></details>
        <details><summary>잘못된 % 시퀀스가 있으면 어떻게 되나요?</summary><p>%E3%8 처럼 깨진 시퀀스가 있으면 디코딩 오류와 함께 문제 위치를 알려 줍니다.</p></details>
      </div>
    </>
  );
}
