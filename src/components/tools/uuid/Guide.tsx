/* /developer/uuid/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li><strong>생성 개수</strong>에 1~100 사이 숫자를 넣고 <strong>UUID 생성</strong>을 누릅니다. 1 · 10 · 50 · 100 버튼을 누르면 그 개수로 바로 만들어집니다.</li>
        <li><strong>하이픈(-) 표시</strong>를 끄면 <code>550e8400e29b41d4a716446655440000</code>처럼 32자 형식으로 바뀝니다. 다시 생성하지 않아도 지금 목록에 바로 적용됩니다.</li>
        <li>줄마다 있는 <strong>복사</strong>로 하나씩, <strong>전체 복사</strong>로 목록 전체를 한 줄에 하나씩 클립보드에 복사합니다.</li>
      </ol>

      <h3>UUID v4란?</h3>
      <p>UUID(Universally Unique Identifier)는 128비트 식별자로, 중앙 서버 없이도 겹치지 않는 ID를 만들 때 씁니다. 표준 표기는 <code>xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</code> 형태의 16진수 32자리와 하이픈 4개(총 36자)입니다.</p>
      <p>버전 4는 128비트 중 버전(4)과 변형(variant) 표시 6비트를 뺀 <strong>122비트가 무작위</strong>입니다. 세 번째 묶음은 항상 <code>4</code>로 시작하고, 네 번째 묶음은 <code>8 · 9 · a · b</code> 중 하나로 시작합니다.</p>
      <p>이 도구는 브라우저 내장 Web Crypto API(<code>crypto.randomUUID()</code>, 지원하지 않는 환경에서는 <code>crypto.getRandomValues()</code>)로 만들기 때문에 <code>Math.random()</code>보다 예측하기 어렵고, 만든 값은 서버로 전송되지 않습니다.</p>

      <h3>어디에 쓰나요?</h3>
      <ul>
        <li>데이터베이스 기본 키, 테스트 데이터·목(mock) 데이터의 ID</li>
        <li>API 요청 추적용 Request ID, 멱등성 키(Idempotency-Key)</li>
        <li>파일 이름 충돌 방지, 임시 토큰·세션 식별자</li>
      </ul>

      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>UUID v4가 중복될 가능성은 없나요?</summary><p>이론적으로는 있지만 무시할 수 있을 만큼 작습니다. 무작위 비트가 122개라 약 5.3×10³⁶가지 값이 나올 수 있고, 10억 개를 만들어도 하나라도 겹칠 확률은 약 10¹⁹분의 1 (0.00000000000000001%)입니다.</p></details>
        <details><summary>하이픈을 빼도 같은 UUID인가요?</summary><p>네. 하이픈은 읽기 쉽게 끊어 놓은 표기일 뿐 값은 같습니다. 다만 데이터베이스 UUID 타입이나 라이브러리가 하이픈이 있는 36자 형식만 받는 경우가 있으니 저장할 곳의 형식을 확인하세요.</p></details>
        <details><summary>GUID와 UUID는 다른가요?</summary><p>GUID는 마이크로소프트가 쓰는 이름이고 형식은 UUID와 같습니다. .NET의 Guid.NewGuid()도 버전 4 UUID를 만듭니다.</p></details>
        <details><summary>UUID를 비밀번호나 보안 토큰으로 써도 되나요?</summary><p>Web Crypto로 만든 v4는 예측이 어렵지만 UUID는 원래 식별용이라 형식이 공개되어 있고 엔트로피도 122비트로 고정입니다. 인증 토큰처럼 보안이 중요한 값은 목적에 맞는 토큰 생성 방식을 쓰는 것이 좋습니다.</p></details>
      </div>
    </>
  );
}
