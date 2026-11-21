'use client';

import { useRef, useState } from 'react';
import Segmented from '@/components/common/Segmented';
import StatusBox from '@/components/common/StatusBox';
import { TabList, tabPanelProps } from '@/components/common/Tabs';
import { copyText } from '@/utils/browser';
import { EMPTY_STATUS, type Status } from '@/types/common';

type Tab = 'codec' | 'parse';
type Method = 'component' | 'uri';
type Parsed = { parts: [string, string][]; params: [string, string][] };

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

export default function UrlTool() {
  const [tab, setTab] = useState<Tab>('codec');

  /* ---------- encode / decode ---------- */
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [method, setMethod] = useState<Method>('component');
  const [plus, setPlus] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const lastMode = useRef<'encode' | 'decode'>('encode');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function encode(t = input, m = method, p = plus) {
    lastMode.current = 'encode';
    let r = m === 'uri' ? encodeURI(t) : encodeURIComponent(t);
    if (p) r = r.replace(/%20/g, '+');
    setOutput(r);
    setInvalid(false);
    setStatus({ kind: 'ok', text: '인코딩 완료 · ' + t.length + '자 → ' + r.length + '자' });
  }

  function decode(t = input, m = method, p = plus) {
    lastMode.current = 'decode';
    if (p) t = t.replace(/\+/g, ' ');
    try {
      setOutput(m === 'uri' ? decodeURI(t) : decodeURIComponent(t));
      setInvalid(false);
      setStatus({ kind: 'ok', text: '디코딩 완료' });
    } catch {
      // 깨진 % 시퀀스 위치 찾기
      let pos = -1;
      let mm: RegExpExecArray | null;
      const re = /%[0-9A-Fa-f]{2}|%/g;
      while ((mm = re.exec(t))) {
        const seq = t.slice(mm.index).match(/^(%[0-9A-Fa-f]{2})+/);
        try {
          if (!seq) throw 0;
          decodeURIComponent(seq[0]);
          re.lastIndex = mm.index + seq[0].length;
        } catch {
          pos = mm.index;
          break;
        }
      }
      setOutput('');
      setInvalid(true);
      setStatus({ kind: 'err', text: '디코딩 실패 — 잘못된 % 시퀀스' + (pos >= 0 ? ' (' + (pos + 1) + '번째 글자 근처: "' + t.slice(pos, pos + 9) + '")' : '') });
    }
  }

  function rerun(t: string, m: Method, p: boolean) {
    if (!t) return;
    if (lastMode.current === 'encode') encode(t, m, p);
    else decode(t, m, p);
  }

  /* ---------- parser ---------- */
  const [parseIn, setParseIn] = useState('');
  const [pstatus, setPstatus] = useState<Status>(EMPTY_STATUS);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  function parse() {
    const raw = parseIn.trim();
    if (!raw) {
      setPstatus({ kind: 'warn', text: 'URL을 입력하세요.' });
      setParsed(null);
      return;
    }
    let u: URL;
    let prefixed = false;
    try {
      u = new URL(raw);
    } catch {
      try {
        u = new URL('https://' + raw);
        prefixed = true;
      } catch {
        setPstatus({ kind: 'err', text: '올바른 URL 형식이 아닙니다.' });
        setParsed(null);
        return;
      }
    }
    setPstatus(prefixed ? { kind: 'warn', text: '프로토콜이 없어 https:// 를 붙여 분석했습니다.' } : { kind: 'ok', text: '분석 완료' });
    const parts: [string, string][] = [
      ['protocol', u.protocol],
      ['host', u.hostname],
      ['port', u.port || '(기본 ' + (u.protocol === 'https:' ? '443' : u.protocol === 'http:' ? '80' : '-') + ')'],
      ['origin', u.origin],
      ['pathname', safeDecode(u.pathname)],
      ['search', u.search],
      ['hash', safeDecode(u.hash)],
    ];
    if (u.username) parts.push(['username', u.username]);
    const params: [string, string][] = [];
    u.searchParams.forEach((v, k) => params.push([k, v]));
    setParsed({ parts, params });
  }

  return (
    <section className="tool">
      <div className="wrap">
        <TabList
          base="url"
          label="URL 도구"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'codec', label: '인코딩 / 디코딩' },
            { id: 'parse', label: 'URL 분석' },
          ]}
        />

        <div {...tabPanelProps('url', 'codec', tab)}>
          <div className="toolbar">
            <Segmented
              name="method"
              label="인코딩 방식"
              value={method}
              onChange={(v) => {
                setMethod(v);
                rerun(input, v, plus);
              }}
              options={[
                { value: 'component', label: 'encodeURIComponent' },
                { value: 'uri', label: 'encodeURI' },
              ]}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={plus}
                onChange={(e) => {
                  setPlus(e.target.checked);
                  rerun(input, method, e.target.checked);
                }}
              />{' '}
              공백을 + 로
            </label>
          </div>
          <div className="grid-2">
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="url-in">
                  입력
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setInput('');
                    setOutput('');
                    setStatus(EMPTY_STATUS);
                    setInvalid(false);
                    inputRef.current?.focus();
                  }}
                >
                  지우기
                </button>
              </div>
              <textarea
                id="url-in"
                ref={inputRef}
                className="textarea code-area"
                rows={10}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                placeholder="https://bluedove.co.kr/검색?q=개발 도구&page=1"
                value={input}
                aria-invalid={invalid || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setInput(v);
                  if (v) rerun(v, method, plus);
                  else {
                    setOutput('');
                    setStatus(EMPTY_STATUS);
                  }
                }}
              />
            </div>
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="url-out">
                  결과
                </label>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(output)}>
                  복사
                </button>
              </div>
              <textarea id="url-out" className="textarea code-area" rows={10} readOnly spellCheck={false} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} value={output} />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => encode()}>
              인코딩
            </button>
            <button className="btn" type="button" onClick={() => decode()}>
              디코딩
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setInput(output);
                if (lastMode.current === 'encode') decode(output);
                else encode(output);
              }}
            >
              결과 ↔ 입력
            </button>
          </div>
          <StatusBox status={status} style={{ marginTop: 16 }} />
        </div>

        <div {...tabPanelProps('url', 'parse', tab)}>
          <div className="field">
            <label className="label" htmlFor="parse-in">
              분석할 URL
            </label>
            <div className="input-group">
              <input
                id="parse-in"
                className="input mono"
                type="url"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                placeholder="https://example.com:8080/path/페이지?utm_source=blog&q=%ED%95%9C%EA%B8%80#top"
                value={parseIn}
                onChange={(e) => setParseIn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    parse();
                  }
                }}
              />
              <button className="btn" type="button" onClick={parse}>
                분석
              </button>
            </div>
          </div>
          <StatusBox status={pstatus} style={{ marginTop: 12 }} />
          {parsed && (
            <div style={{ marginTop: 20 }}>
              <div className="grid-2">
                <div>
                  <h2 className="subhead" style={{ fontSize: 18, marginBottom: 8 }}>
                    구성 요소
                  </h2>
                  <table className="kv">
                    <tbody>
                      {parsed.parts.map(([k, v]) => (
                        <tr key={k}>
                          <th>{k}</th>
                          <td className="mono">{v === '' ? '(없음)' : v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h2 className="subhead" style={{ fontSize: 18, marginBottom: 8 }}>
                    쿼리 파라미터 <span className="meta">{parsed.params.length ? '(' + parsed.params.length + '개)' : ''}</span>
                  </h2>
                  <table className="kv">
                    <tbody>
                      {parsed.params.length ? (
                        parsed.params.map(([k, v], i) => (
                          <tr key={i}>
                            <th className="mono">{k}</th>
                            <td>
                              <div className="copy-cell">
                                <span className="mono">{v}</span>
                                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(v)}>
                                  복사
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <th></th>
                          <td>쿼리 파라미터가 없습니다.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
