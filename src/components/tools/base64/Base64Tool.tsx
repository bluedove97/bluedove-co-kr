'use client';

import { useRef, useState } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { TabList, tabPanelProps } from '@/components/common/Tabs';
import { useDropzone } from '@/hooks/useDropzone';
import { copyText, toast } from '@/utils/browser';
import { formatBytes } from '@/utils/format';
import { EMPTY_STATUS, type Status } from '@/types/common';

const MAX = 20 * 1024 * 1024;
const enc = new TextEncoder();

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  let clean = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const bad = clean.match(/[^A-Za-z0-9+/=]/);
  if (bad) throw new Error('Base64에 쓸 수 없는 문자 "' + bad[0] + '"가 있습니다.');
  clean = clean.replace(/=+$/, '');
  if (clean.length % 4 === 1) throw new Error('길이가 올바르지 않습니다. 문자가 빠졌거나 잘렸을 수 있습니다.');
  while (clean.length % 4) clean += '=';
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type Tab = 'text' | 'file';
type Mode = 'encode' | 'decode';
type FileInfo = { name: string; mime: string; size: number; b64: string };

export default function Base64Tool() {
  const [tab, setTab] = useState<Tab>('text');

  /* ---------- 텍스트 ---------- */
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [outMeta, setOutMeta] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [live, setLive] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const mode = useRef<Mode>('encode');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function run(m?: Mode, text = input, safe = urlSafe) {
    if (m) mode.current = m;
    if (!text) {
      setOutput('');
      setOutMeta('');
      setStatus(EMPTY_STATUS);
      return;
    }
    try {
      let out: string;
      if (mode.current === 'encode') {
        out = bytesToB64(enc.encode(text));
        if (safe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        setStatus({ kind: 'ok', text: '인코딩 완료' + (safe ? ' (URL-safe)' : '') });
      } else {
        const bytes = b64ToBytes(text);
        let fatal = true;
        try {
          out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch {
          fatal = false;
          out = new TextDecoder('utf-8').decode(bytes);
        }
        if (fatal) setStatus({ kind: 'ok', text: '디코딩 완료 (UTF-8)' });
        else setStatus({ kind: 'warn', text: '디코딩은 됐지만 UTF-8 텍스트가 아닌 바이너리 데이터로 보입니다. 깨진 글자는 �로 표시됩니다.' });
      }
      setOutput(out);
      setOutMeta(out.length.toLocaleString() + '자');
      setInvalid(false);
    } catch (e) {
      setOutput('');
      setInvalid(true);
      setStatus({ kind: 'err', text: '디코딩 실패 — ' + (e as Error).message });
    }
  }

  /* ---------- 파일 ---------- */
  const [file, setFile] = useState<FileInfo | null>(null);
  const [withPrefix, setWithPrefix] = useState(true);
  const fileInRef = useRef<HTMLInputElement>(null);
  const fileOut = file ? (withPrefix ? 'data:' + file.mime + ';base64,' + file.b64 : file.b64) : '';

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX) {
      toast('20MB 이하 파일만 변환할 수 있습니다');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      setFile({ name: f.name, mime: f.type || 'application/octet-stream', size: f.size, b64: bytesToB64(bytes) });
    };
    reader.onerror = () => toast('파일을 읽지 못했습니다');
    reader.readAsArrayBuffer(f);
  }

  const drop = useDropzone((files) => handleFile(files[0]), fileInRef);

  return (
    <section className="tool">
      <div className="wrap">
        <TabList
          base="b64"
          label="Base64 모드"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'text', label: '텍스트' },
            { id: 'file', label: '파일 → Base64' },
          ]}
        />

        <div {...tabPanelProps('b64', 'text', tab)}>
          <div className="toolbar">
            <button className="btn" type="button" onClick={() => run('encode')}>
              인코딩
            </button>
            <button className="btn" type="button" onClick={() => run('decode')}>
              디코딩
            </button>
            <button
              className="btn btn-outline"
              type="button"
              title="결과를 입력으로 옮기기"
              onClick={() => {
                setInput(output);
                run(mode.current === 'encode' ? 'decode' : 'encode', output);
              }}
            >
              결과 ↔ 입력
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => {
                  setUrlSafe(e.target.checked);
                  if (mode.current === 'encode') run(undefined, input, e.target.checked);
                }}
              />{' '}
              URL-safe (- _ , 패딩 없음)
            </label>
            <label className="check">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> 입력하면서 변환
            </label>
          </div>
          <div className="grid-2">
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="b64-in">
                  입력
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setInput('');
                    run(undefined, '');
                    inputRef.current?.focus();
                  }}
                >
                  지우기
                </button>
              </div>
              <textarea
                id="b64-in"
                ref={inputRef}
                className="textarea code-area"
                rows={14}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                placeholder="Hello, 블루도브!"
                value={input}
                aria-invalid={invalid || undefined}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (live) run(undefined, e.target.value);
                }}
              />
              <span className="hint">
                {input.length.toLocaleString()}자 · {formatBytes(enc.encode(input).length)}
              </span>
            </div>
            <div className="field">
              <div className="pane-head">
                <label className="label" htmlFor="b64-out">
                  결과
                </label>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(output)}>
                  복사
                </button>
              </div>
              <textarea id="b64-out" className="textarea code-area" rows={14} readOnly spellCheck={false} value={output} />
              <span className="hint">{outMeta || ' '}</span>
            </div>
          </div>
          <StatusBox status={status} style={{ marginTop: 16 }} />
        </div>

        <div {...tabPanelProps('b64', 'file', tab)}>
          <div className="notice" style={{ marginBottom: 16 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <p>
              파일은 <strong>서버로 업로드되지 않습니다.</strong> 브라우저의 FileReader로 읽어서 이 화면에서만 변환합니다.
            </p>
          </div>
          <label className={'dropzone' + (drop.over ? ' is-over' : '')} tabIndex={0} htmlFor="b64-file-in" {...drop.handlers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 16V4m0 0-4 4m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <strong>파일을 끌어다 놓거나 눌러서 선택</strong>
            <span className="meta">최대 20MB · 이미지는 미리보기 표시</span>
            <input
              type="file"
              id="b64-file-in"
              ref={fileInRef}
              className="sr-only"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {file && (
            <div style={{ marginTop: 20 }}>
              <div className="stat-row" style={{ marginBottom: 16 }}>
                <div className="stat">
                  <div className="stat-label">파일</div>
                  <div className="stat-value" style={{ fontSize: 15 }}>
                    {file.name}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">MIME</div>
                  <div className="stat-value" style={{ fontSize: 15 }}>
                    {file.mime}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">원본 크기</div>
                  <div className="stat-value">{formatBytes(file.size)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Base64 길이</div>
                  <div className="stat-value">{fileOut.length.toLocaleString()}</div>
                </div>
              </div>
              <div className="toolbar">
                <label className="check">
                  <input type="checkbox" checked={withPrefix} onChange={(e) => setWithPrefix(e.target.checked)} /> data: 접두어 포함 (Data URL)
                </label>
                <span className="spacer"></span>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => copyText(fileOut)}>
                  복사
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => copyText("background-image: url('data:" + file.mime + ';base64,' + file.b64 + "');")}
                >
                  CSS background로 복사
                </button>
              </div>
              {/^image\//.test(file.mime) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={'data:' + file.mime + ';base64,' + file.b64}
                  alt="선택한 이미지 미리보기"
                  style={{ maxHeight: 200, borderRadius: 12, marginBottom: 12 }}
                />
              )}
              <textarea
                className="textarea code-area"
                rows={8}
                readOnly
                spellCheck={false}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                aria-label="파일 Base64 결과"
                value={fileOut}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
