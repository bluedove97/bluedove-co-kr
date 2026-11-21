/* 순수 함수 유틸 (서버·클라이언트 공용) */

export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function formatBytes(n: number): string {
  if (!isFinite(n)) return '-';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

/** JSON 구문 강조 HTML (이미 정렬된 문자열 대상, 결과는 escape 된 안전한 HTML) */
export function highlightJson(json: string): string {
  const esc = escapeHtml(json);
  return esc.replace(
    /(&quot;(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[{}\[\],]/g,
    (m, str?: string, colon?: string, bool?: string) => {
      if (str) return colon ? '<span class="tok-key">' + str + '</span><span class="tok-punc">' + colon + '</span>' : '<span class="tok-str">' + str + '</span>';
      if (bool) return '<span class="tok-bool">' + m + '</span>';
      if (m === 'null') return '<span class="tok-null">null</span>';
      if (/^[{}\[\],]$/.test(m)) return '<span class="tok-punc">' + m + '</span>';
      return '<span class="tok-num">' + m + '</span>';
    },
  );
}

/** 객체 키를 재귀적으로 정렬 */
export function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o: Record<string, unknown> = {};
    Object.keys(v as object)
      .sort()
      .forEach((k) => {
        o[k] = sortDeep((v as Record<string, unknown>)[k]);
      });
    return o;
  }
  return v;
}
