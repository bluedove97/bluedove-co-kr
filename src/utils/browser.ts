/* 브라우저 전용 공통 유틸 (기존 js/site.js 의 BD.* 이관) — 클라이언트 컴포넌트에서만 호출 */

/* ---------- Toast ---------- */
let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string): void {
  if (!toastEl || !toastEl.isConnected) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  // 다음 프레임에 show 를 붙여야 처음 생성된 경우에도 전환 효과가 동작
  requestAnimationFrame(() => toastEl?.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl?.classList.remove('show'), 1800);
}

/* ---------- Clipboard ---------- */
export async function copyText(text: string | null | undefined): Promise<boolean> {
  if (text == null || text === '') {
    toast('복사할 내용이 없습니다');
    return false;
  }
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  };
  let ok: boolean;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallback();
    }
  } else {
    ok = fallback();
  }
  toast(ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다');
  return ok;
}

/* ---------- Download ---------- */
export function download(data: Blob | string, filename: string, type?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- localStorage (bd: 접두어) ---------- */
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem('bd:' + k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown): void {
    try {
      localStorage.setItem('bd:' + k, JSON.stringify(v));
    } catch {
      /* noop */
    }
  },
};
