/* /playground/features/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
import { CATEGORIES } from './checks';

export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li><strong>검사 시작</strong>을 누르면 8개 카테고리, 70여 개 항목을 차례로 검사합니다. 보통 1~3초면 끝납니다.</li>
        <li>위쪽 요약에서 브라우저 · 운영체제 · 화면 정보와 상태별 항목 수를 확인합니다.</li>
        <li>카테고리를 누르면 항목별 결과가 펼쳐지고, 항목을 다시 누르면 검사 방법 · 결과 이유 · 설명 · MDN 문서 링크가 나옵니다. <strong>문제 항목만</strong>을 고르면 FAIL · UNSUPPORTED · BLOCKED만 모아 볼 수 있습니다.</li>
        <li><strong>JSON 다운로드</strong>로 전체 결과를 파일로 저장해 버그 리포트에 첨부하거나 다른 브라우저 결과와 비교할 수 있습니다.</li>
      </ol>
      <p>단순히 API가 있는지만 보지 않고, 가능한 항목은 실제로 만들어 보거나 간단한 작업을 실행합니다. 예를 들어 Web Worker는 메시지를 주고받아 보고, WebAssembly는 작은 모듈을 컴파일해 2 + 3을 계산하고, IndexedDB는 임시 데이터베이스를 만들어 쓰고 읽은 뒤 지웁니다.</p>

      <h3>결과 상태의 의미</h3>
      <ul>
        <li><strong>PASS</strong>: API가 있고 실제 실행도 성공했습니다.</li>
        <li><strong>FAIL</strong>: API는 있지만 실행에 실패했습니다. 하드웨어 가속 꺼짐, 드라이버 문제 등이 원인일 수 있습니다.</li>
        <li><strong>UNSUPPORTED</strong>: 이 브라우저가 해당 API를 제공하지 않습니다.</li>
        <li><strong>BLOCKED</strong>: 권한 거부, 보안 컨텍스트(HTTPS) 아님, 권한 정책 때문에 쓸 수 없습니다. 브라우저 기능이 고장 난 FAIL과는 다른 문제입니다.</li>
        <li><strong>N/A</strong>: 이 환경에는 해당하지 않습니다. 예를 들어 데스크톱의 기울기 센서 · 진동, 터치 화면이 없는 PC의 터치 이벤트가 여기에 속합니다.</li>
        <li><strong>INFO</strong>: 화면 크기 · CPU 스레드 수 · 네트워크 속도처럼 합격 / 불합격이 아닌 수치와 환경 정보입니다.</li>
      </ul>
      <p>WebGPU를 지원하지 않는다고 나쁜 브라우저는 아닙니다. 브라우저마다 기능을 구현하는 시점과 정책이 달라서, 이 도구는 하나의 총점 대신 상태별 개수와 카테고리별 지원 범위를 보여 줍니다.</p>

      <h3>검사 카테고리</h3>
      <ul>
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong> ({c.ko}): {c.checks.map((x) => x.name).join(', ')}
          </li>
        ))}
      </ul>

      <h3>개인정보와 권한</h3>
      <p>모든 검사는 이 브라우저 안에서만 실행되고 결과는 서버로 전송되지 않습니다. 카메라 · 마이크 · 위치 · 알림 권한은 요청하지 않고 Permissions API로 현재 상태만 읽습니다. 쿠키 · 로컬 스토리지 · IndexedDB · Cache · OPFS 검사에는 임의의 고유 이름을 쓰고, 검사가 끝나면 바로 지웁니다.</p>

      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>FAIL과 BLOCKED는 어떻게 다른가요?</summary><p>FAIL은 API가 있는데 실행이 실패한 경우(예: WebGL 컨텍스트 생성 실패)이고, BLOCKED는 사용자가 권한을 거부했거나 HTTPS가 아니어서 브라우저가 기능을 막은 경우입니다. BLOCKED는 설정을 바꾸면 쓸 수 있는 경우가 많습니다.</p></details>
        <details><summary>CPU 스레드 수와 메모리가 실제와 다르게 나와요.</summary><p>hardwareConcurrency는 논리 프로세서 수라서 물리 코어 수와 다를 수 있고, deviceMemory는 0.25~8GB처럼 반올림한 근사값이며 상한이 있습니다. 개인정보 보호를 위해 브라우저가 일부러 값을 줄여 알려 주기도 합니다.</p></details>
        <details><summary>Network Information이 UNSUPPORTED로 나옵니다.</summary><p>Network Information API는 Chrome · Edge 같은 Chromium 계열에서만 지원합니다. Firefox · Safari에서 UNSUPPORTED가 나오는 것은 정상이며, 이때 Effective Type · Downlink · RTT는 N/A로 표시됩니다.</p></details>
        <details><summary>Windows 11인데 Windows 10/11로 나와요.</summary><p>Windows 10과 11은 User-Agent 문자열이 같습니다. Chrome · Edge는 Client Hints로 구분할 수 있지만 Firefox는 Client Hints를 제공하지 않아 둘을 구분할 수 없습니다.</p></details>
        <details><summary>검사하면 카메라나 위치 권한 창이 뜨나요?</summary><p>뜨지 않습니다. 이 도구는 권한을 요청하지 않고 지원 여부와 현재 권한 상태(허용 · 거부 · 요청 전)만 읽습니다. 장치를 켜거나 위치를 가져오지도 않습니다.</p></details>
      </div>
    </>
  );
}
