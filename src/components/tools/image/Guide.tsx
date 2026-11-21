/* /developer/image/ — 사용 방법 · 설명 · FAQ (SEO 본문) */
export default function Guide() {
  return (
    <>
      <h2 id="guide-title">사용 방법</h2>
      <ol>
        <li>왼쪽에서 출력 포맷(WebP, JPG, PNG)과 화질을 고릅니다. 필요하면 최대 가로·세로 크기도 정합니다.</li>
        <li>이미지를 끌어다 놓거나 눌러서 선택합니다. 여러 장을 한꺼번에 넣어도 됩니다.</li>
        <li>목록에서 원본 대비 줄어든 용량을 확인하고 하나씩, 또는 <strong>모두 다운로드</strong>로 받습니다. 옵션을 바꾸면 자동으로 다시 변환합니다.</li>
      </ol>
      <h3>어떤 포맷을 고를까</h3>
      <ul>
        <li><strong>WebP</strong>: 같은 화질에서 JPG보다 25~35% 작고 투명 배경도 지원합니다. 웹사이트 이미지에 가장 무난합니다.</li>
        <li><strong>JPG</strong>: 사진에 적합하고 어디서나 열립니다. 투명 영역은 지정한 배경색으로 채웁니다.</li>
        <li><strong>PNG</strong>: 무손실이라 로고, 스크린샷, 글자가 많은 이미지에 맞습니다. 사진은 용량이 커집니다.</li>
      </ul>
      <h3>처리 방식</h3>
      <p>지원하는 브라우저에서는 Web Worker 안의 OffscreenCanvas로 변환해서 큰 이미지를 여러 장 처리해도 화면이 멈추지 않습니다. 지원하지 않으면 일반 Canvas로 처리합니다. 어느 쪽이든 이미지 데이터는 네트워크로 나가지 않습니다. 다시 인코딩하면서 EXIF 메타데이터(촬영 위치 등)는 빠집니다.</p>
      <h3>자주 묻는 질문</h3>
      <div className="faq">
        <details><summary>이미지가 서버에 업로드되나요?</summary><p>아니요. 선택한 이미지는 브라우저 메모리에서만 읽고 Canvas API(가능하면 Web Worker의 OffscreenCanvas)로 다시 인코딩합니다. 네트워크로 전송되는 데이터가 없으므로 인터넷을 끊은 상태에서도 동작합니다.</p></details>
        <details><summary>PNG는 화질 슬라이더가 왜 적용되지 않나요?</summary><p>PNG는 무손실 포맷이라 브라우저 인코더가 화질 값을 받지 않습니다. PNG 용량을 크게 줄이려면 WebP나 JPG로 변환하거나 해상도를 줄이세요.</p></details>
        <details><summary>압축하면 오히려 용량이 커질 수 있나요?</summary><p>이미 잘 압축된 파일이면 그럴 수 있습니다. 결과가 원본보다 크면 표시해 드리니 화질을 낮추거나 다른 포맷을 골라 보세요.</p></details>
      </div>
    </>
  );
}
