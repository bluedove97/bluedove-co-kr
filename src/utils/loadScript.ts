/* public/ 의 전역(UMD) 스크립트를 한 번만 로드 — 클라이언트 라우팅으로 다시 들어와도 중복 로드하지 않음 */

const cache = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const hit = cache.get(src);
  if (hit) return hit;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // 순서 보장 (pixi → pixi-spine)
    el.onload = () => resolve();
    el.onerror = () => {
      cache.delete(src);
      el.remove();
      reject(new Error('스크립트를 불러오지 못했습니다: ' + src));
    };
    document.head.appendChild(el);
  });
  cache.set(src, p);
  return p;
}
