/* /developer/timestamp/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>맨 위에서 현재 Unix 타임스탬프를 실시간으로 보고 복사할 수 있습니다.</li>
        <li><strong>타임스탬프 → 날짜</strong>: 숫자를 넣으면 자릿수로 초·밀리초를 판단해서 한국 시간, UTC, ISO 8601로 보여 줍니다.</li>
        <li><strong>날짜 → 타임스탬프</strong>: 날짜와 시각, 기준 시간대를 고르면 초와 밀리초 값을 계산합니다.</li>
      </ol>
      <h3>Unix 타임스탬프란</h3>
      <p>1970년 1월 1일 00:00:00 UTC(Unix Epoch)부터 흐른 시간을 초 단위로 센 값입니다. 시간대와 무관한 하나의 숫자라서 서버 간 시각을 주고받거나 데이터베이스에 저장할 때 많이 씁니다. 자바스크립트의 <code>Date.now()</code>와 자바의 <code>System.currentTimeMillis()</code>는 밀리초를, 리눅스의 <code>date +%s</code>는 초를 돌려줍니다.</p>
      <h3>언어별 현재 타임스탬프</h3>
      <ul>
        <li>JavaScript: <code>Math.floor(Date.now() / 1000)</code></li>
        <li>Java: <code>Instant.now().getEpochSecond()</code></li>
        <li>Python: <code>int(time.time())</code></li>
        <li>MySQL: <code>UNIX_TIMESTAMP()</code> · PostgreSQL: <code>extract(epoch from now())</code></li>
      </ul>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>초 단위인지 밀리초 단위인지 어떻게 구분하나요?</summary><p>자릿수로 자동 판단합니다. 10자리 안팎은 초, 13자리는 밀리초, 16자리는 마이크로초, 19자리는 나노초로 봅니다. 직접 단위를 골라도 됩니다.</p></details>
        <details><summary>시간대는 어떻게 적용되나요?</summary><p>타임스탬프는 시간대와 무관한 절대 시각입니다. 결과는 한국 시간(Asia/Seoul), UTC, 그리고 선택한 시간대로 함께 보여 줍니다.</p></details>
        <details><summary>2038년 문제란 무엇인가요?</summary><p>부호 있는 32비트 정수로 초를 저장하면 2038-01-19 03:14:07 UTC(2147483647)를 넘을 때 값이 넘칩니다. 이 도구는 64비트 범위로 계산하므로 그 이후 날짜도 변환됩니다.</p></details>
      </div>
    </>
  );
}
