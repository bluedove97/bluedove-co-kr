/* /playground/webgl/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
import { BENCH_VERSION, MAX_PASSES, MAX_SCORE, ROUNDS, TEST_H, TEST_ORDER, TEST_W, TESTS, fmtInt } from './bench';

export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>페이지를 열면 브라우저 · 운영체제 · WebGL 버전 · GPU 정보와 함께 3D 미리보기가 바로 실행됩니다.</li>
        <li>
          <strong>Full Benchmark</strong>(약 1분 30초)를 누르면 4개 테스트를 차례로 실행합니다. 테스트마다 워밍업(약 1.5초) → 부하 단계 측정(단계당 약 2초) → 기준 단계 {ROUNDS}회 반복 측정 순서로 진행하고, {ROUNDS}회 중 가운데 값(중앙값)으로 {fmtInt(MAX_SCORE)}점 만점의 종합 점수와 테스트별 점수를 계산합니다.
        </li>
        <li>
          <strong>Quick Test</strong>(약 10초)는 3D 렌더링 테스트만 돌려 평균 FPS · 1% Low FPS · Frame Time을 빠르게 확인합니다.
        </li>
        <li>
          <strong>Benchmark Modes</strong>에서 테스트 하나를 골라 <strong>단계별 측정</strong>을 누르면 낮은 부하부터 높은 부하까지 올리며 단계별 FPS 변화를 표로 보여 줍니다.
        </li>
        <li>언제든 <strong>중단</strong>을 누를 수 있고, 결과는 <strong>Copy Result</strong> · <strong>Download JSON</strong>으로 저장할 수 있습니다.</li>
      </ol>

      <h3>4가지 테스트</h3>
      <ul>
        {TEST_ORDER.map((id) => {
          const d = TESTS[id];
          return (
            <li key={id}>
              <strong>{d.name}</strong> ({d.ko}, 가중치 {Math.round(d.weight * 100)}%): {d.desc} 채점 부하는 {d.fmt(d.scoreLevel)}이고, 이 부하를 한 프레임에 {d.refPasses}번 반복해 60fps로 그리면 만점입니다.
            </li>
          );
        })}
      </ul>
      <p>
        3D Rendering은 개별 Mesh(오브젝트마다 Draw Call 1회)와 Instanced Rendering(종류별 1회)을 골라 비교할 수 있습니다. 개별 Mesh 방식은 CPU의 Draw Call 처리 비용이 크게 섞이므로, 종합 점수에는 GPU 부하가 중심인 Instanced 방식을 씁니다. Geometry Stress도 메시 개수가 늘수록 Draw Call이 함께 늘어 CPU 부담이 일부 섞입니다.
      </p>

      <h3>점수 계산 방식</h3>
      <p>
        FPS에 그대로 비례하는 점수가 아닙니다. 테스트마다 고정된 작업량(채점 부하)을 정해 두고, 같은 시간에 그 작업을 얼마나 많이 처리하는지(처리량)를 기준과 비교합니다.
      </p>
      <ul>
        <li>
          브라우저는 디스플레이 주사율(60Hz · 120Hz 등)보다 빠르게 그리지 않아서, 빠른 GPU끼리는 FPS 차이가 드러나지 않습니다. 그래서 워밍업에서 한 프레임에 같은 장면을 여러 번(1 · 2 · 4 … 최대 {MAX_PASSES}번, pass) 그리도록 늘려 Frame Time이 주사율 간격보다 길어지게 만든 뒤 측정합니다.
        </li>
        <li>처리량 = 작업량 × 반복 횟수 ÷ 평균 Frame Time</li>
        <li>
          테스트 점수 = 가중치 × {fmtInt(MAX_SCORE)} × min(1, 처리량 ÷ 기준 처리량). 기준 처리량은 테스트마다 정한 횟수만큼 채점 부하를 반복해 60fps(16.67ms)로 그리는 수준이며, 최상위 데스크톱 GPU에서 만점에 가깝도록 잡은 임시 기준입니다.
        </li>
        <li>렌더링 해상도는 화면 크기 · 픽셀 밀도와 상관없이 {TEST_W}×{TEST_H}로 고정하고, 기준 단계는 회당 같은 시간으로 {ROUNDS}번 측정해 중앙값을 씁니다. 한 번 튀는 측정값이 점수를 흔들지 않도록 하기 위해서입니다.</li>
        <li>부하 단계 측정(반복 렌더링 없음)은 점수에 들어가지 않고, 부하가 늘 때 FPS가 어떻게 떨어지는지 결과의 &quot;부하 단계별 FPS&quot; 표로 보여 줍니다.</li>
        <li>워밍업에서 5fps 아래로 떨어지면 기기를 보호하려고 채점 부하를 낮추고 반복 렌더링도 하지 않으며, 그만큼 점수가 줄어듭니다.</li>
      </ul>
      <p>
        점수는 이 사이트의 고정 테스트 조건에서 계산한 <strong>상대적인 성능 지표</strong>입니다. 기준이 충분히 검증되지 않았기 때문에 GPU 등급이나 시장 전체 순위는 표시하지 않습니다. 테스트 조건이나 Three.js 버전이 바뀌면 벤치마크 버전(현재 v{BENCH_VERSION})을 올리고, 결과 JSON에 Three.js 버전과 함께 기록합니다.
      </p>

      <h3>측정 지표</h3>
      <ul>
        <li><strong>Average FPS</strong>: 측정 구간의 프레임 수 ÷ 시간입니다.</li>
        <li><strong>1% Low FPS</strong>: 프레임 간격을 모두 기록한 뒤, 가장 느린 1% 프레임의 평균 간격으로 계산합니다. 끊김(스터터)을 보여 줍니다.</li>
        <li><strong>Frame Time · 분산</strong>: requestAnimationFrame 콜백 사이 간격(ms)과 그 표준편차입니다. CPU · GPU · 브라우저 합성까지 포함한 시간이라 GPU 처리 시간과는 다릅니다.</li>
        <li><strong>GPU Time</strong>: EXT_disjoint_timer_query_webgl2 확장을 지원하는 브라우저에서만 GPU가 실제로 그리는 데 쓴 시간을 따로 잽니다. 지원하지 않으면 추정하지 않고 N/A로 둡니다.</li>
        <li><strong>Triangle Count · Draw Calls</strong>: 한 프레임에 그린 삼각형 수와 렌더링 호출 횟수입니다(Three.js renderer.info).</li>
      </ul>

      <h3>지원 환경과 측정 제한</h3>
      <p>
        WebGL 2.0이 필요합니다. WebGL 1.0만 지원하는 구형 기기나 브라우저에서는 정보만 보여 주고 측정은 실행하지 않습니다. 테스트 중 다른 탭으로 가면 브라우저가 화면 갱신을 멈추므로 그 구간은 측정에서 빼고 결과에 경고를 남깁니다. 드라이버 문제나 메모리 부족으로 WebGL 컨텍스트를 잃으면 테스트를 중단하고, 브라우저가 컨텍스트를 복구하면 미리보기를 다시 그립니다.
      </p>
      <p>모든 렌더링과 계산은 이 브라우저 안에서만 실행되며, 측정 결과와 GPU 정보는 서버로 전송되지 않습니다.</p>

      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details>
          <summary>GPU Renderer가 N/A로 나와요.</summary>
          <p>GPU 모델명은 WEBGL_debug_renderer_info 확장으로 읽는데, 일부 브라우저는 개인정보 보호(핑거프린팅 방지)를 위해 이 확장을 막거나 값을 흐리게 줍니다. 이 경우 임의의 모델명을 추측하지 않고 N/A로 표시합니다.</p>
        </details>
        <details>
          <summary>같은 컴퓨터인데 점수가 매번 조금씩 달라요.</summary>
          <p>GPU 클럭 · 발열 · 전원 모드, 다른 탭이나 프로그램의 부하, 브라우저 버전에 따라 측정값이 흔들립니다. Full Benchmark는 기준 단계를 {ROUNDS}번 재서 중앙값을 쓰므로 편차가 줄어들지만, 노트북은 전원을 연결하고 다른 작업을 닫은 뒤 측정하는 것이 좋습니다.</p>
        </details>
        <details>
          <summary>120Hz 모니터에서 FPS가 120에서 멈춰요.</summary>
          <p>브라우저는 화면 주사율보다 빠르게 그리지 않습니다(vsync). Quick Test와 단계별 측정의 FPS는 그래서 주사율에서 멈춥니다. Full Benchmark는 한 프레임에 같은 장면을 여러 번 그려 주사율 아래로 내린 뒤 처리량으로 점수를 계산하므로, 60Hz · 120Hz 모니터에 상관없이 같은 방식으로 비교됩니다.</p>
        </details>
        <details>
          <summary>WebGL 1.0만 지원한다고 나오면 어떻게 하나요?</summary>
          <p>브라우저를 최신 버전으로 올리고 설정에서 하드웨어 가속을 켜 보세요. 그래도 WebGL 2.0을 쓸 수 없으면 GPU나 드라이버가 지원하지 않는 경우라 이 벤치마크는 실행할 수 없습니다.</p>
        </details>
        <details>
          <summary>측정 중에 화면이 멈추거나 느려져도 괜찮나요?</summary>
          <p>부하를 낮은 단계부터 올리고, 5fps 아래로 떨어지면 더 올리지 않도록 설계했습니다. 그래도 저사양 기기에서는 잠깐 버벅일 수 있으며, 언제든 중단 버튼으로 멈출 수 있습니다.</p>
        </details>
      </div>
    </>
  );
}
