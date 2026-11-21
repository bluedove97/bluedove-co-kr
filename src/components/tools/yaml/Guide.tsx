/* /developer/yaml/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>JSON을 YAML로 바꾸려면 왼쪽에 JSON을 넣고 <strong>JSON → YAML</strong>을 누릅니다.</li>
        <li>YAML을 JSON으로 바꾸려면 오른쪽에 YAML을 넣고 <strong>YAML → JSON</strong>을 누릅니다.</li>
        <li>문법 오류가 있으면 줄과 칸 위치를 알려 줍니다.</li>
      </ol>
      <h3>JSON과 YAML, 언제 무엇을 쓸까</h3>
      <p>JSON은 기계가 주고받기 좋은 엄격한 형식이라 API 응답과 설정 파일에 널리 쓰입니다. YAML은 들여쓰기로 구조를 나타내고 주석을 달 수 있어서 사람이 직접 고치는 설정 파일에 많이 씁니다. 쿠버네티스 매니페스트, docker-compose, GitHub Actions, GitLab CI가 YAML을 씁니다.</p>
      <h3>변환할 때 알아 둘 점</h3>
      <ul>
        <li>YAML의 <strong>주석(#)</strong>은 JSON에 담을 수 없어서 변환하면 사라집니다.</li>
        <li><code>yes</code>, <code>no</code>, <code>on</code>, <code>off</code>는 YAML 1.2 기준으로 문자열로 처리합니다. 불리언이 필요하면 <code>true</code>/<code>false</code>를 쓰세요.</li>
        <li><code>0755</code>처럼 앞에 0이 붙은 값이나 <code>1.10</code> 같은 버전 문자열은 따옴표로 감싸야 숫자로 바뀌지 않습니다.</li>
      </ul>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>여러 문서가 들어 있는 YAML(--- 구분)도 변환되나요?</summary><p>네. 문서가 2개 이상이면 JSON 배열로 변환합니다. 반대로 JSON 배열을 YAML로 바꿀 때 '배열을 여러 문서로 나누기'를 켜면 --- 로 구분된 다중 문서가 됩니다.</p></details>
        <details><summary>YAML 앵커(&amp;)와 별칭(*)도 지원하나요?</summary><p>네. YAML을 읽을 때 앵커와 별칭을 풀어서 JSON 값으로 펼칩니다.</p></details>
        <details><summary>어떤 라이브러리를 사용하나요?</summary><p>검증된 오픈소스 파서 js-yaml(MIT 라이선스)을 사이트에 직접 포함해서 사용합니다. 외부 CDN이나 서버를 거치지 않습니다.</p></details>
      </div>
    </>
  );
}
