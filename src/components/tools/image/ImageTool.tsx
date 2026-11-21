'use client';

/* 이미지 압축 · 변환 (Canvas API / Web Worker, 서버 전송 없음) */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Segmented from '@/components/common/Segmented';
import { useDropzone } from '@/hooks/useDropzone';
import { download, toast } from '@/utils/browser';
import { formatBytes } from '@/utils/format';

const MAX_FILE = 50 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const WORKER_URL = '/js/image-worker.js';

type Fmt = 'image/webp' | 'image/jpeg' | 'image/png';
type Opts = { type: Fmt; quality: number; maxW: number; maxH: number; bg: string };
type Job = Opts & { id: string; file: File };
type ConvertResult = { ok: true; blob: Blob; w: number; h: number; ow: number; oh: number } | { ok: false; error: string };
type Item = {
  id: number;
  file: File;
  url: string;
  state: 'working' | 'done' | 'error';
  outBlob?: Blob;
  requested?: string;
  w?: number;
  h?: number;
  ow?: number;
  oh?: number;
  error?: string;
};

function fit(w: number, h: number, maxW: number, maxH: number) {
  let r = 1;
  if (maxW && w > maxW) r = Math.min(r, maxW / w);
  if (maxH && h > maxH) r = Math.min(r, maxH / h);
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

/** 메인 스레드 변환 (Worker 미지원·실패 시) */
function convertMain(job: Job): Promise<ConvertResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(job.file);
    img.onload = () => {
      const s = fit(img.naturalWidth, img.naturalHeight, job.maxW, job.maxH);
      const c = document.createElement('canvas');
      c.width = s.w;
      c.height = s.h;
      const ctx = c.getContext('2d')!;
      if (job.type === 'image/jpeg') {
        ctx.fillStyle = job.bg;
        ctx.fillRect(0, 0, s.w, s.h);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, s.w, s.h);
      URL.revokeObjectURL(url);
      c.toBlob(
        (blob) => {
          if (!blob) resolve({ ok: false, error: '인코딩 실패' });
          else resolve({ ok: true, blob, w: s.w, h: s.h, ow: img.naturalWidth, oh: img.naturalHeight });
        },
        job.type,
        job.quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: '이미지를 읽을 수 없습니다' });
    };
    img.src = url;
  });
}

function outName(it: Item): string {
  const base = it.file.name.replace(/\.[^.]+$/, '') || 'image';
  return base + '.' + (EXT[it.outBlob!.type] || 'img');
}

function ItemRow({ it, onRemove }: { it: Item; onRemove: () => void }) {
  let meta: ReactNode;
  let dim = '';
  if (it.state === 'working') meta = formatBytes(it.file.size) + ' → 변환 중…';
  else if (it.state === 'error') meta = '변환 실패: ' + it.error;
  else {
    const out = it.outBlob!;
    const saved = 1 - out.size / it.file.size;
    const pct = Math.round(Math.abs(saved) * 100);
    meta = (
      <>
        {formatBytes(it.file.size)} → <b>{formatBytes(out.size)}</b>{' '}
        <span className={'img-saving ' + (saved >= 0 ? 'down' : 'up')}>
          {saved >= 0 ? '−' : '+'}
          {pct}%
        </span>
      </>
    );
    const typeNote =
      out.type !== it.requested
        ? ' · 이 브라우저는 ' + (EXT[it.requested!] || '').toUpperCase() + ' 인코딩을 지원하지 않아 ' + (EXT[out.type] || out.type).toUpperCase() + '로 저장'
        : '';
    dim =
      it.ow + '×' + it.oh + (it.ow !== it.w || it.oh !== it.h ? ' → ' + it.w + '×' + it.h : '') + ' · ' + (EXT[out.type] || '').toUpperCase() + typeNote + (saved < 0 ? ' · 원본보다 커졌습니다' : '');
  }
  return (
    <li className="img-item">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="img-thumb" src={it.url} alt={it.file.name + ' 미리보기'} />
      <div style={{ minWidth: 0 }}>
        <div className="img-name">{it.file.name}</div>
        <div className="img-meta">{meta}</div>
        <div className="img-meta img-dim">{dim}</div>
      </div>
      <div className="img-actions">
        <button className="btn btn-sm" type="button" disabled={it.state !== 'done'} onClick={() => it.outBlob && download(it.outBlob, outName(it))}>
          다운로드
        </button>
        <button className="btn btn-ghost btn-sm" type="button" aria-label="목록에서 삭제" onClick={onRemove}>
          삭제
        </button>
      </div>
    </li>
  );
}

export default function ImageTool() {
  const [fmt, setFmt] = useState<Fmt>('image/webp');
  const [quality, setQuality] = useState(80);
  const [maxW, setMaxW] = useState('');
  const [maxH, setMaxH] = useState('');
  const [bg, setBg] = useState('#ffffff');
  const [items, setItems] = useState<Item[]>([]);
  const [engine, setEngine] = useState('');

  const itemsRef = useRef<Item[]>([]);
  const optsRef = useRef<Opts>({ type: fmt, quality: quality / 100, maxW: 0, maxH: 0, bg });
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<Record<string, (r: ConvertResult) => void>>({});
  const runToken = useRef(0);
  const seq = useRef(0);
  const fileInRef = useRef<HTMLInputElement>(null);

  const isPng = fmt === 'image/png';
  const mw = parseInt(maxW, 10);
  const mh = parseInt(maxH, 10);
  optsRef.current = { type: fmt, quality: quality / 100, maxW: mw > 0 ? mw : 0, maxH: mh > 0 ? mh : 0, bg };

  function commit(next: Item[]) {
    itemsRef.current = next;
    setItems(next);
  }
  function patch(id: number, p: Partial<Item>) {
    commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  /* ---------- engine ---------- */
  useEffect(() => {
    const canWorker =
      typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'convertToBlob' in OffscreenCanvas.prototype && typeof createImageBitmap === 'function';
    if (canWorker) {
      try {
        const w = new Worker(WORKER_URL);
        w.onmessage = (e) => {
          const cb = pending.current[e.data.id];
          delete pending.current[e.data.id];
          cb?.(e.data);
        };
        w.onerror = () => {
          workerRef.current = null;
        };
        workerRef.current = w;
      } catch {
        workerRef.current = null;
      }
    }
    setEngine(workerRef.current ? '(처리 엔진: Web Worker + OffscreenCanvas)' : '(처리 엔진: Canvas API)');
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      runToken.current++;
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  function convert(job: Job): Promise<ConvertResult> {
    const w = workerRef.current;
    if (!w) return convertMain(job);
    return new Promise((resolve) => {
      pending.current[job.id] = (res) => {
        if (res.ok) resolve(res);
        else convertMain(job).then(resolve); // 워커 실패 시 메인 스레드로 재시도
      };
      w.postMessage(job);
    });
  }

  async function processAll(onlyPending: boolean) {
    const token = ++runToken.current;
    const o = optsRef.current;
    const queue = itemsRef.current.filter((i) => !onlyPending || i.state !== 'done').map((i) => i.id);
    for (const id of queue) {
      if (token !== runToken.current) return;
      const it = itemsRef.current.find((i) => i.id === id);
      if (!it) continue;
      patch(id, { state: 'working' });
      const res = await convert({ id: id + ':' + token, file: it.file, ...o });
      if (token !== runToken.current) return;
      if (!itemsRef.current.some((i) => i.id === id)) continue;
      if (res.ok) patch(id, { state: 'done', outBlob: res.blob, requested: o.type, w: res.w, h: res.h, ow: res.ow, oh: res.oh });
      else patch(id, { state: 'error', error: res.error });
    }
  }

  function addFiles(files: FileList | File[]) {
    const added: Item[] = [];
    Array.from(files).forEach((f) => {
      if (!/^image\//.test(f.type)) return toast(f.name + ': 이미지 파일이 아닙니다');
      if (f.size > MAX_FILE) return toast(f.name + ': 50MB를 넘는 파일은 건너뜁니다');
      added.push({ id: ++seq.current, file: f, url: URL.createObjectURL(f), state: 'working' });
    });
    if (added.length) {
      commit([...itemsRef.current, ...added]);
      processAll(true);
    }
  }

  function removeItem(id: number) {
    const it = itemsRef.current.find((i) => i.id === id);
    if (it) URL.revokeObjectURL(it.url);
    commit(itemsRef.current.filter((i) => i.id !== id));
  }

  /* 클립보드 붙여넣기 */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files: File[] = [];
      Array.from(e.clipboardData?.items || []).forEach((x) => {
        if (x.kind === 'file' && /^image\//.test(x.type)) {
          const f = x.getAsFile();
          if (f) files.push(new File([f], 'pasted-' + Date.now() + '.' + (f.type.split('/')[1] || 'png'), { type: f.type }));
        }
      });
      if (files.length) addFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 옵션이 바뀌면 0.25초 뒤 전체 다시 변환 */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (itemsRef.current.length) processAll(false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fmt, quality, maxW, maxH, bg]);

  const drop = useDropzone((files) => addFiles(files), fileInRef);

  const done = items.filter((i) => i.state === 'done');
  const sumA = done.reduce((s, i) => s + i.file.size, 0);
  const sumB = done.reduce((s, i) => s + i.outBlob!.size, 0);

  return (
    <section className="tool">
      <div className="wrap stack" style={{ gap: 20 }}>
        <div className="notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p>
            <strong>이미지는 서버로 전송되지 않습니다.</strong> 선택한 파일은 이 브라우저 안에서 Canvas API와 Web Worker로만 처리됩니다. 인터넷 연결을 끊어도
            동작합니다. <span className="meta">{engine}</span>
          </p>
        </div>

        <div className="img-layout">
          <div className="surface img-options" role="group" aria-label="변환 옵션">
            <div className="field">
              <span className="label" id="fmt-label">
                출력 포맷
              </span>
              <Segmented
                name="fmt"
                labelledBy="fmt-label"
                value={fmt}
                onChange={setFmt}
                options={[
                  { value: 'image/webp', label: 'WebP' },
                  { value: 'image/jpeg', label: 'JPG' },
                  { value: 'image/png', label: 'PNG' },
                ]}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="quality">
                화질 <span className="mono">{isPng ? '무손실' : quality}</span>
              </label>
              <input type="range" className="range" id="quality" min={10} max={100} step={1} value={quality} disabled={isPng} onChange={(e) => setQuality(Number(e.target.value))} />
              <span className="hint">{isPng ? 'PNG는 무손실 포맷이라 화질 값이 적용되지 않습니다.' : '낮을수록 용량이 작아집니다. 70~85를 추천합니다.'}</span>
            </div>
            <div className="field">
              <span className="label">최대 크기 (px, 비우면 원본 유지)</span>
              <div className="input-group">
                <input className="input" type="number" min={1} inputMode="numeric" placeholder="가로" aria-label="최대 가로 px" value={maxW} onChange={(e) => setMaxW(e.target.value)} />
                <input className="input" type="number" min={1} inputMode="numeric" placeholder="세로" aria-label="최대 세로 px" value={maxH} onChange={(e) => setMaxH(e.target.value)} />
              </div>
              <span className="hint">비율은 유지하고 줄이기만 합니다.</span>
            </div>
            <div className="field">
              <label className="label" htmlFor="bg-color">
                투명 영역 배경 (JPG)
              </label>
              <input className="input" id="bg-color" type="color" value={bg} style={{ padding: 4, height: 44 }} onChange={(e) => setBg(e.target.value)} />
            </div>
          </div>

          <div className="stack">
            <label className={'dropzone' + (drop.over ? ' is-over' : '')} htmlFor="img-file-in" tabIndex={0} {...drop.handlers}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <strong>이미지를 끌어다 놓거나 눌러서 선택</strong>
              <span className="meta">JPG · PNG · WebP · GIF(첫 프레임) · 여러 장 가능 · 클립보드 붙여넣기(Ctrl+V)</span>
              <input
                type="file"
                id="img-file-in"
                ref={fileInRef}
                className="sr-only"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>

            <div className="toolbar" hidden={items.length === 0}>
              <span className="meta">
                {items.length}장 · {done.length ? formatBytes(sumA) + ' → ' + formatBytes(sumB) + ' (' + (sumA ? Math.round((1 - sumB / sumA) * 100) : 0) + '% 절감)' : '변환 중…'}
              </span>
              <span className="spacer"></span>
              <button
                className="btn btn-sm"
                type="button"
                disabled={done.length === 0}
                onClick={() => done.forEach((it, i) => setTimeout(() => download(it.outBlob!, outName(it)), i * 350))}
              >
                모두 다운로드
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
                  commit([]);
                  runToken.current++;
                }}
              >
                모두 지우기
              </button>
            </div>
            <ul className="img-list" aria-live="polite">
              {items.map((it) => (
                <ItemRow key={it.id} it={it} onRemove={() => removeItem(it.id)} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
