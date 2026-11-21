/* /developer/json/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>왼쪽 입력 칸에 JSON을 붙여넣습니다. 입력하는 동안 문법을 바로 검사합니다.</li>
        <li><strong>정렬하기</strong>를 누르면 들여쓰기가 적용된 결과가 오른쪽에 나옵니다. 2칸, 4칸, 탭 중에서 고를 수 있습니다.</li>
        <li><strong>한 줄로 압축</strong>은 공백과 줄바꿈을 모두 지워 API 요청 본문이나 환경 변수에 넣기 좋게 만듭니다.</li>
        <li><strong>키 이름순 정렬</strong>을 켜면 객체의 키를 알파벳순으로 정리해서 두 JSON을 비교하기 쉬워집니다.</li>
      </ol>
      <h3>자주 보는 JSON 오류</h3>
      <ul>
        <li><strong>작은따옴표 사용</strong>: JSON 문자열과 키는 반드시 큰따옴표(")로 감싸야 합니다.</li>
        <li><strong>마지막 쉼표</strong>: <code>[1, 2, 3,]</code> 처럼 마지막 요소 뒤에 쉼표가 있으면 안 됩니다.</li>
        <li><strong>주석</strong>: <code>//</code>, <code>/* */</code> 주석은 표준 JSON에서 허용되지 않습니다.</li>
        <li><strong>따옴표 없는 키</strong>: <code>{'{'}name: "a"{'}'}</code>는 자바스크립트 객체 문법이지 JSON이 아닙니다.</li>
        <li><strong>NaN, Infinity, undefined</strong>: JSON에는 이런 값이 없습니다. <code>null</code>을 쓰세요.</li>
      </ul>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>입력한 JSON이 서버로 전송되나요?</summary><p>아니요. 정렬과 검증은 브라우저의 JSON.parse로 처리하며 네트워크 요청을 보내지 않습니다. 민감한 설정 파일도 안심하고 붙여넣어도 됩니다.</p></details>
        <details><summary>주석이나 끝에 붙은 쉼표(trailing comma)도 허용되나요?</summary><p>표준 JSON(RFC 8259)은 주석과 trailing comma를 허용하지 않으므로 오류로 표시합니다. 오류 메시지에 나온 줄·칸 위치를 보고 고치면 됩니다.</p></details>
        <details><summary>아주 큰 JSON도 처리할 수 있나요?</summary><p>브라우저 메모리가 허용하는 범위라면 수 MB 단위도 처리됩니다. 브라우저 성능에 따라 처리되는 속도가 다를 수 있으며, 구문 강조는 1MB가 넘으면 꺼서 부하를 줄이는 쪽으로 처리했습니다.</p></details>
      </div>
    </>
  );
}
