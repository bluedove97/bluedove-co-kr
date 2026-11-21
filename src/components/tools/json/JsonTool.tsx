'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { copyText, download, toast } from '@/utils/browser';
import { formatBytes, highlightJson, sortDeep } from '@/utils/format';
import { EMPTY_STATUS, type Status } from '@/types/common';

const HIGHLIGHT_LIMIT = 1024 * 1024;
const SAMPLE =
  '{"site":"Bluedove\'s Developer Playground","year":2026,"tools":[{"id":"json","category":"developer","free":true},{"id":"age","category":"daily","free":true}],"owner":{"name":"bluedove","since":2004,"cka":true},"server":null}';

type Mode = 'format' | 'minify' | 'validate';
type Stats = { size: string; type: string; keys: string; depth: string };

function analyze(v: unknown) {
  let keys = 0;
  let maxDepth = 0;
  (function walk(x: unknown, d: number) {
    if (d > maxDepth) maxDepth = d;
    if (Array.isArray(x)) x.forEach((y) => walk(y, d + 1));
    else if (x && typeof x === 'object') {
      const ks = Object.keys(x);
      keys += ks.length;
      ks.forEach((k) => walk((x as Record<string, unknown>)[k], d + 1));
    }
  })(v, 0);
  const type = v === null ? 'null' : Array.isArray(v) ? 'array[' + v.length + ']' : typeof v;
  return { keys, depth: maxDepth, type };
}

/** 브라우저마다 다른 오류 메시지에서 위치를 뽑아 줄/칸 계산 */
function errorLocation(msg: string, text: string): { line: number; col: number } | null {
  let m = /line (\d+) column (\d+)/i.exec(msg);
  if (m) return { line: +m[1], col: +m[2] };
  m = /position (\d+)/i.exec(msg);
  if (m) {
    const before = text.slice(0, +m[1]).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }
  if (/end of (JSON )?input|unexpected end/i.test(msg)) {
    const lines = text.split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  }
  return null;
}

export default function JsonTool() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState('2');
  const [sortKeys, setSortKeys] = useState(false);
  const [result, setResult] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [stats, setStats] = useState<Stats | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function run(mode: Mode, text = input, opt = { indent, sortKeys }) {
    if (!text.trim()) {
      setStatus({ kind: '', text: 'JSON을 입력하세요.' });
      setResult('');
      setInvalid(false);
      setStats(null);
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (e) {
      const message = (e as Error).message;
      const loc = errorLocation(message, text);
      let detail: ReactNode = null;
      if (loc) {
        const line = text.split('\n')[loc.line - 1] || '';
        const start = Math.max(0, loc.col - 40);
        const snippet = line.slice(start, loc.col + 40);
        const caret = ' '.repeat(Math.max(0, loc.col - start - 1)) + '^';
        detail = (
          <>
            <br />
            <span className="mono">
              {loc.line}번째 줄, {loc.col}번째 칸
            </span>
            <pre className="mono" style={{ margin: '8px 0 0', whiteSpace: 'pre', overflowX: 'auto' }}>
              {snippet + '\n' + caret}
            </pre>
          </>
        );
      }
      setInvalid(true);
      setStatus({
        kind: 'err',
        text: (
          <div>
            <strong>JSON 문법 오류</strong> — {message}
            {detail}
          </div>
        ),
      });
      setStats(null);
      return;
    }
    setInvalid(false);
    const v = opt.sortKeys ? sortDeep(value) : value;
    if (mode === 'format') setResult(JSON.stringify(v, null, opt.indent === 'tab' ? '\t' : Number(opt.indent)));
    else if (mode === 'minify') setResult(JSON.stringify(v));

    const info = analyze(value);
    setStatus({ kind: 'ok', text: '올바른 JSON입니다.' });
    setStats({
      size: formatBytes(new Blob([text]).size),
      type: info.type,
      keys: info.keys.toLocaleString(),
      depth: String(info.depth),
    });
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function onInput(v: string) {
    setInput(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run('validate', v), 250);
  }

  return (
    <section className="tool">
      <div className="wrap">
        <div className="toolbar" role="group" aria-label="JSON 작업">
          <button className="btn" type="button" onClick={() => run('format')}>
            정렬하기
          </button>
          <button className="btn btn-outline" type="button" onClick={() => run('minify')}>
            한 줄로 압축
          </button>
          <label className="inline-field">
            들여쓰기
            <select
              className="select select-sm"
              value={indent}
              onChange={(e) => {
                setIndent(e.target.value);
                if (result) run('format', input, { indent: e.target.value, sortKeys });
              }}
            >
              <option value="2">2칸</option>
              <option value="4">4칸</option>
              <option value="tab">탭</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => {
                setSortKeys(e.target.checked);
                if (result) run('format', input, { indent, sortKeys: e.target.checked });
              }}
            />{' '}
            키 이름순 정렬
          </label>
        </div>

        <div className="grid-2">
          <div className="field">
            <div className="pane-head">
              <label className="label" htmlFor="json-in">
                입력
              </label>
              <div className="btn-row">
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setInput(SAMPLE);
                    run('format', SAMPLE);
                    inputRef.current?.focus();
                  }}
                >
                  예시 넣기
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setInput('');
                    run('validate', '');
                    inputRef.current?.focus();
                  }}
                >
                  지우기
                </button>
              </div>
            </div>
            <textarea
              id="json-in"
              ref={inputRef}
              className="textarea code-area"
              rows={18}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder='{"name":"bluedove","tools":["json","yaml"]}'
              value={input}
              aria-invalid={invalid || undefined}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  run('format');
                }
              }}
            />
          </div>
          <div className="field">
            <div className="pane-head">
              <span className="label" id="json-out-label">
                결과
              </span>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(result)}>
                  복사
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    if (!result) {
                      toast('먼저 정렬하거나 압축하세요');
                      return;
                    }
                    download(result, 'formatted.json', 'application/json');
                  }}
                >
                  .json 저장
                </button>
              </div>
            </div>
            {result.length <= HIGHLIGHT_LIMIT ? (
              <pre className="output" tabIndex={0} aria-labelledby="json-out-label" dangerouslySetInnerHTML={{ __html: highlightJson(result) }} />
            ) : (
              <pre className="output" tabIndex={0} aria-labelledby="json-out-label">
                {result}
              </pre>
            )}
          </div>
        </div>

        <StatusBox status={status} style={{ marginTop: 16 }} />
        <div className="stat-row" style={{ marginTop: 16 }} hidden={!stats}>
          <div className="stat">
            <div className="stat-label">크기</div>
            <div className="stat-value">{stats?.size ?? '-'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">최상위 타입</div>
            <div className="stat-value">{stats?.type ?? '-'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">키 개수(전체)</div>
            <div className="stat-value">{stats?.keys ?? '-'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">최대 깊이</div>
            <div className="stat-value">{stats?.depth ?? '-'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
