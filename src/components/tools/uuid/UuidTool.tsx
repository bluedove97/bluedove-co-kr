'use client';

/* UUID v4 Generator — Web Crypto(crypto.randomUUID / getRandomValues) 로 브라우저에서 생성 */

import { useEffect, useState, type FormEvent } from 'react';
import { copyText, toast } from '@/utils/browser';

const MIN = 1;
const MAX = 100;

/** RFC 9562 UUID v4. randomUUID 는 보안 컨텍스트(https/localhost)에서만 있으므로 getRandomValues 로 대체 */
function uuidv4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, Math.round(n)));

export default function UuidTool() {
  const [countText, setCountText] = useState('5');
  const [hyphen, setHyphen] = useState(true);
  const [list, setList] = useState<string[]>([]);

  function generate(n: number) {
    setList(Array.from({ length: n }, uuidv4));
  }

  // 빌드 시점 값이 정적 HTML 에 박히지 않도록 첫 생성은 마운트 후에
  useEffect(() => {
    generate(5);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = parseInt(countText, 10);
    if (!Number.isFinite(v)) {
      toast(`${MIN}~${MAX} 사이 숫자를 입력하세요`);
      document.getElementById('uuid-count')?.focus();
      return;
    }
    const n = clamp(v);
    if (n !== v) toast(`${MIN}~${MAX}개까지 만들 수 있어 ${n}개로 맞췄습니다`);
    setCountText(String(n));
    generate(n);
  }

  const view = (u: string) => (hyphen ? u : u.replace(/-/g, ''));
  const shown = list.map(view);

  return (
    <section className="tool">
      <div className="wrap">
        <form className="uuid-controls" noValidate onSubmit={onSubmit}>
          <div className="field uuid-count">
            <label className="label" htmlFor="uuid-count">
              생성 개수 <span className="hint">(1~100)</span>
            </label>
            <div className="input-group">
              <input
                className="input"
                id="uuid-count"
                type="number"
                inputMode="numeric"
                min={MIN}
                max={MAX}
                step={1}
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
              />
              <div className="uuid-presets" role="group" aria-label="빠른 개수 선택">
                {[1, 10, 50, 100].map((n) => (
                  <button
                    key={n}
                    className="btn btn-outline btn-sm"
                    type="button"
                    aria-pressed={countText === String(n)}
                    onClick={() => {
                      setCountText(String(n));
                      generate(n);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="check uuid-hyphen">
            <input type="checkbox" checked={hyphen} onChange={(e) => setHyphen(e.target.checked)} /> 하이픈(-) 표시
          </label>
          <div className="btn-row">
            <button className="btn" type="submit">
              UUID 생성
            </button>
            <button className="btn btn-outline" type="button" disabled={!shown.length} onClick={() => copyText(shown.join('\n'))}>
              전체 복사
            </button>
          </div>
        </form>

        <div className="pane-head" style={{ marginTop: 20 }}>
          <span className="label">
            결과 <span className="hint mono">{shown.length}개 · {hyphen ? '36' : '32'}자</span>
          </span>
        </div>
        <ol className="uuid-list" aria-live="polite">
          {shown.map((u, i) => (
            <li key={list[i]}>
              <span className="uuid-no mono" aria-hidden="true">
                {i + 1}
              </span>
              <code className="uuid-val">{u}</code>
              <button className="btn btn-ghost btn-sm" type="button" aria-label={`${i + 1}번 UUID 복사`} onClick={() => copyText(u)}>
                복사
              </button>
            </li>
          ))}
        </ol>
        <p className="meta" style={{ marginTop: 12 }}>
          UUID는 브라우저의 암호학적 난수 생성기(Web Crypto)로 만들며 서버로 전송되거나 저장되지 않습니다.
        </p>
      </div>
    </section>
  );
}
