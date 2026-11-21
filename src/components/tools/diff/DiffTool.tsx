'use client';

/* 텍스트 비교(Myers diff) · 줄 정렬 · 글자 수 */

import { useRef, useState } from 'react';
import Segmented from '@/components/common/Segmented';
import StatusBox from '@/components/common/StatusBox';
import { TabList, tabPanelProps } from '@/components/common/Tabs';
import { copyText } from '@/utils/browser';
import { diffSeq, intern, renderDiffTable, splitLines } from '@/utils/diff';
import { EMPTY_STATUS, type Status } from '@/types/common';

type Tab = 'diff' | 'sort' | 'count';
type View = 'split' | 'unified';
type DiffOpts = { ignWs: boolean; ignCase: boolean; only: boolean; view: View };

const SAMPLE_A = 'server:\n  port: 8080\n  host: localhost\nlogging:\n  level: INFO\nfeatures:\n  - json\n  - yaml\n  - base64\n';
const SAMPLE_B = 'server:\n  port: 9090\n  host: 0.0.0.0\nlogging:\n  level: INFO\n  file: /var/log/app.log\nfeatures:\n  - json\n  - base64\n  - jwt\n';

const enc = new TextEncoder();

/* ---------- 글자 수 ---------- */
function graphemes(s: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('ko', { granularity: 'grapheme' });
    return Array.from(seg.segment(s), (x) => x.segment);
  }
  return Array.from(s);
}

function countText(raw: string) {
  const t = raw.replace(/\r\n?/g, '\n');
  const g = graphemes(t);
  const nows = g.filter((c) => !/^\s+$/.test(c)).length;
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  const lines = t ? t.split('\n').length : 0;
  const utf8 = enc.encode(t).length;
  let euckr = 0;
  let ko = 0;
  let en = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      euckr += 2;
      i++;
      continue;
    }
    euckr += c < 128 ? 1 : 2;
    if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x3131 && c <= 0x318e)) ko++;
    else if (/[A-Za-z0-9]/.test(t[i])) en++;
  }
  const sms = !t
    ? ''
    : euckr <= 90
      ? '문자 메시지: SMS(단문, 90바이트 이하)로 보낼 수 있습니다.'
      : euckr <= 2000
        ? '문자 메시지: 90바이트를 넘어 LMS(장문, 2,000바이트 이하)로 보내야 합니다.'
        : '문자 메시지: 2,000바이트를 넘어 LMS 한 건으로 보낼 수 없습니다.';
  return { all: g.length, nows, words, lines, utf8, euckr, ko, en, sms };
}

/* ---------- 줄 정렬 ---------- */
type SortMode = 'asc' | 'desc' | 'num-asc' | 'num-desc' | 'len-asc' | 'len-desc' | 'reverse' | 'shuffle' | 'none';
type SortOpts = { mode: SortMode; dedupe: boolean; empty: boolean; trim: boolean; icase: boolean };

function sortLines(text: string, o: SortOpts): { out: string; before: number; after: number } {
  let lines = splitLines(text);
  const before = lines.length;
  if (o.trim) lines = lines.map((l) => l.trim());
  if (o.empty) lines = lines.filter((l) => l.trim() !== '');
  if (o.dedupe) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const k = o.icase ? l.toLowerCase() : l;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  const coll = new Intl.Collator('ko', { numeric: true, sensitivity: o.icase ? 'accent' : 'variant' });
  const num = (s: string) => {
    const m = /-?\d+(?:\.\d+)?/.exec(s.replace(/,/g, ''));
    return m ? parseFloat(m[0]) : Infinity;
  };
  switch (o.mode) {
    case 'asc':
      lines.sort(coll.compare);
      break;
    case 'desc':
      lines.sort((a, b) => coll.compare(b, a));
      break;
    case 'num-asc':
      lines.sort((a, b) => num(a) - num(b) || coll.compare(a, b));
      break;
    case 'num-desc':
      lines.sort((a, b) => {
        let x = num(a);
        let y = num(b);
        if (x === Infinity) x = -Infinity;
        if (y === Infinity) y = -Infinity;
        return y - x || coll.compare(a, b);
      });
      break;
    case 'len-asc':
      lines.sort((a, b) => a.length - b.length || coll.compare(a, b));
      break;
    case 'len-desc':
      lines.sort((a, b) => b.length - a.length || coll.compare(a, b));
      break;
    case 'reverse':
      lines.reverse();
      break;
    case 'shuffle':
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      break;
  }
  return { out: lines.join('\n'), before, after: lines.length };
}

export default function DiffTool() {
  const [tab, setTab] = useState<Tab>('diff');

  /* ---------- diff ---------- */
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [dopts, setDopts] = useState<DiffOpts>({ ignWs: false, ignCase: false, only: false, view: 'split' });
  const [dstatus, setDstatus] = useState<Status>(EMPTY_STATUS);
  const [diffHtml, setDiffHtml] = useState<string | null>(null);

  function runDiff(ta = a, tb = b, o = dopts) {
    if (!ta && !tb) {
      setDstatus({ kind: 'warn', text: '비교할 텍스트를 입력하세요.' });
      setDiffHtml(null);
      return;
    }
    const A = splitLines(ta);
    const B = splitLines(tb);
    if (A.length + B.length > 60000) {
      setDstatus({ kind: 'err', text: '줄 수가 너무 많습니다 (합계 60,000줄 이하).' });
      return;
    }
    const key = (s: string) => {
      if (o.ignWs) s = s.replace(/\s+/g, ' ').trim();
      if (o.ignCase) s = s.toLowerCase();
      return s;
    };
    const [ia, ib] = intern(A.map(key), B.map(key));
    const t0 = performance.now();
    const ops = diffSeq(ia, ib);
    const ms = performance.now() - t0;
    let add = 0;
    let del = 0;
    ops.forEach((op) => {
      if (op.t === 'ins') add++;
      else if (op.t === 'del') del++;
    });
    if (!add && !del) {
      setDstatus({ kind: 'ok', text: '두 텍스트가 같습니다' + (o.ignWs || o.ignCase ? ' (옵션 기준)' : '') + '. 총 ' + A.length + '줄' });
      setDiffHtml(null);
      return;
    }
    setDstatus({
      kind: '',
      text: (
        <span>
          <b style={{ color: 'var(--diff-add-ink)' }}>+{add}</b> 추가 · <b style={{ color: 'var(--diff-del-ink)' }}>−{del}</b> 삭제 · A {A.length}줄 / B {B.length}줄{' '}
          <span className="meta">({ms.toFixed(1)}ms)</span>
        </span>
      ),
    });
    setDiffHtml(renderDiffTable(A, B, ops, o.view, o.only));
  }

  function changeOpt(p: Partial<DiffOpts>) {
    const next = { ...dopts, ...p };
    setDopts(next);
    if (diffHtml !== null || dstatus.text) runDiff(a, b, next);
  }

  /* ---------- sort ---------- */
  const [sortIn, setSortIn] = useState('');
  const [sortOut, setSortOut] = useState('');
  const [sortMeta, setSortMeta] = useState('');
  const [sopts, setSopts] = useState<SortOpts>({ mode: 'asc', dedupe: true, empty: true, trim: true, icase: false });

  function runSort(text = sortIn, o = sopts) {
    const r = sortLines(text, o);
    setSortOut(r.out);
    setSortMeta('· ' + r.before + '줄 → ' + r.after + '줄');
  }
  function changeSort(p: Partial<SortOpts>) {
    const next = { ...sopts, ...p };
    setSopts(next);
    if (sortIn) runSort(sortIn, next);
  }

  /* ---------- count ---------- */
  const [countIn, setCountIn] = useState('');
  const countRef = useRef<HTMLTextAreaElement>(null);
  const c = countText(countIn);

  return (
    <section className="tool">
      <div className="wrap">
        <TabList
          base="txt"
          label="텍스트 도구"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'diff', label: '텍스트 비교 (Diff)' },
            { id: 'sort', label: '줄 정렬 · 정리' },
            { id: 'count', label: '글자 수 세기' },
          ]}
        />

        {/* DIFF */}
        <div {...tabPanelProps('txt', 'diff', tab)}>
          <div className="grid-2">
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="diff-a">
                  원본 (A)
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setA(SAMPLE_A);
                    setB(SAMPLE_B);
                    runDiff(SAMPLE_A, SAMPLE_B);
                  }}
                >
                  예시
                </button>
              </div>
              <textarea id="diff-a" className="textarea code-area" rows={12} spellCheck={false} autoComplete="off" autoCapitalize="off" value={a} onChange={(e) => setA(e.target.value)} />
            </div>
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="diff-b">
                  변경본 (B)
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setA(b);
                    setB(a);
                    if (diffHtml !== null) runDiff(b, a);
                  }}
                >
                  A ↔ B
                </button>
              </div>
              <textarea id="diff-b" className="textarea code-area" rows={12} spellCheck={false} autoComplete="off" autoCapitalize="off" value={b} onChange={(e) => setB(e.target.value)} />
            </div>
          </div>
          <div className="toolbar">
            <button className="btn" type="button" onClick={() => runDiff()}>
              비교하기
            </button>
            <Segmented
              name="view"
              label="보기 방식"
              value={dopts.view}
              onChange={(v) => changeOpt({ view: v })}
              options={[
                { value: 'split', label: '나란히' },
                { value: 'unified', label: '한 줄로' },
              ]}
            />
            <label className="check">
              <input type="checkbox" checked={dopts.ignWs} onChange={(e) => changeOpt({ ignWs: e.target.checked })} /> 공백 차이 무시
            </label>
            <label className="check">
              <input type="checkbox" checked={dopts.ignCase} onChange={(e) => changeOpt({ ignCase: e.target.checked })} /> 대소문자 무시
            </label>
            <label className="check">
              <input type="checkbox" checked={dopts.only} onChange={(e) => changeOpt({ only: e.target.checked })} /> 바뀐 부분만
            </label>
          </div>
          <StatusBox status={dstatus} />
          {diffHtml !== null && <div className="diff-out" tabIndex={0} aria-label="비교 결과" dangerouslySetInnerHTML={{ __html: diffHtml }} />}
        </div>

        {/* SORT */}
        <div {...tabPanelProps('txt', 'sort', tab)}>
          <div className="toolbar">
            <label className="inline-field">
              정렬
              <select className="select select-sm" value={sopts.mode} onChange={(e) => changeSort({ mode: e.target.value as SortMode })}>
                <option value="asc">가나다·ABC 오름차순</option>
                <option value="desc">가나다·ABC 내림차순</option>
                <option value="num-asc">숫자 작은 순</option>
                <option value="num-desc">숫자 큰 순</option>
                <option value="len-asc">길이 짧은 순</option>
                <option value="len-desc">길이 긴 순</option>
                <option value="reverse">순서 뒤집기</option>
                <option value="shuffle">무작위 섞기</option>
                <option value="none">정렬 안 함</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={sopts.dedupe} onChange={(e) => changeSort({ dedupe: e.target.checked })} /> 중복 줄 제거
            </label>
            <label className="check">
              <input type="checkbox" checked={sopts.empty} onChange={(e) => changeSort({ empty: e.target.checked })} /> 빈 줄 제거
            </label>
            <label className="check">
              <input type="checkbox" checked={sopts.trim} onChange={(e) => changeSort({ trim: e.target.checked })} /> 앞뒤 공백 제거
            </label>
            <label className="check">
              <input type="checkbox" checked={sopts.icase} onChange={(e) => changeSort({ icase: e.target.checked })} /> 대소문자 무시
            </label>
          </div>
          <div className="grid-2">
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="sort-in">
                  입력
                </label>
                <span className="hint">{sortIn ? splitLines(sortIn).length : 0}줄</span>
              </div>
              <textarea id="sort-in" className="textarea code-area" rows={14} spellCheck={false} placeholder="한 줄에 하나씩 입력" value={sortIn} onChange={(e) => setSortIn(e.target.value)} />
            </div>
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="sort-out">
                  결과 <span className="hint">{sortMeta}</span>
                </label>
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(sortOut)}>
                    복사
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSortIn(sortOut)}>
                    입력으로
                  </button>
                </div>
              </div>
              <textarea id="sort-out" className="textarea code-area" rows={14} readOnly spellCheck={false} value={sortOut} />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => runSort()}>
              적용
            </button>
          </div>
        </div>

        {/* COUNT */}
        <div {...tabPanelProps('txt', 'count', tab)}>
          <div className="field">
            <div className="pane-head">
              <label className="label" htmlFor="count-in">
                텍스트
              </label>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setCountIn('');
                  countRef.current?.focus();
                }}
              >
                지우기
              </button>
            </div>
            <textarea
              id="count-in"
              ref={countRef}
              className="textarea"
              rows={10}
              placeholder="자기소개서, 게시글, 문자 메시지 등을 붙여넣으세요."
              value={countIn}
              onChange={(e) => setCountIn(e.target.value)}
            />
          </div>
          <div className="stat-row" style={{ marginTop: 16 }} aria-live="polite">
            {(
              [
                ['글자 수 (공백 포함)', c.all],
                ['글자 수 (공백 제외)', c.nows],
                ['단어', c.words],
                ['줄', c.lines],
                ['UTF-8 바이트', c.utf8],
                ['EUC-KR 바이트 (SMS 기준)', c.euckr],
                ['한글', c.ko],
                ['영문 · 숫자', c.en],
              ] as const
            ).map(([label, v]) => (
              <div className="stat" key={label}>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{v.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginTop: 10 }}>
            {c.sms}
          </p>
        </div>
      </div>
    </section>
  );
}
