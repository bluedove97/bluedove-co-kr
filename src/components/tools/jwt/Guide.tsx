/* /developer/jwt/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>JWT를 붙여넣으면 바로 Header와 Payload를 풀어서 보여 줍니다. <code>Bearer </code> 접두어가 붙어 있어도 됩니다.</li>
        <li>클레임 표에서 <code>exp</code>(만료), <code>iat</code>(발급), <code>nbf</code>(유효 시작)를 한국 시간으로 확인합니다.</li>
        <li>서명을 확인하려면 키를 넣고 <strong>서명 검증</strong>을 누릅니다. HS 계열은 공유 비밀키, RS·PS·ES 계열은 공개키(PEM 또는 JWK)를 넣습니다.</li>
      </ol>
      <h3>JWT 구조</h3>
      <p>JWT는 점(.)으로 구분된 세 부분으로 이루어집니다. <strong>Header</strong>에는 서명 알고리즘(alg)과 토큰 타입이, <strong>Payload</strong>에는 사용자 ID·권한·만료 시각 같은 클레임이, <strong>Signature</strong>에는 앞의 두 부분을 키로 서명한 값이 들어갑니다. 앞의 두 부분은 Base64URL로 인코딩만 되어 있어서 암호화되지 않습니다.</p>
      <h3>주요 등록 클레임</h3>
      <ul>
        <li><strong>iss</strong> 발급자 · <strong>sub</strong> 주체(사용자) · <strong>aud</strong> 대상</li>
        <li><strong>exp</strong> 만료 시각 · <strong>nbf</strong> 이 시각 전에는 무효 · <strong>iat</strong> 발급 시각 (모두 Unix 초)</li>
        <li><strong>jti</strong> 토큰 고유 ID (재사용 방지)</li>
      </ul>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>토큰을 붙여넣어도 안전한가요?</summary><p>토큰과 키는 이 페이지 밖으로 나가지 않습니다. 디코딩과 서명 검증은 브라우저 내장 Web Crypto API로 처리합니다. 그래도 운영 환경 토큰은 만료된 것이나 테스트용을 쓰는 편이 좋습니다.</p></details>
        <details><summary>어떤 알고리즘을 검증할 수 있나요?</summary><p>HS256/384/512(공유 비밀키), RS256/384/512와 PS256/384/512(RSA 공개키), ES256/384/512(EC 공개키)를 지원합니다. 공개키는 PEM(-----BEGIN PUBLIC KEY-----) 또는 JWK(JSON) 형식으로 넣으면 됩니다.</p></details>
        <details><summary>디코딩이 된다고 토큰이 유효한 건가요?</summary><p>아니요. JWT의 Header와 Payload는 단순 Base64URL 인코딩이라 누구나 읽을 수 있습니다. 위조 여부는 서명 검증을 통과해야 알 수 있습니다.</p></details>
      </div>
    </>
  );
}
