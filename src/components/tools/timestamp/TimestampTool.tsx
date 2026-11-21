'use client';

import { useEffect, useRef, useState } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { copyText } from '@/utils/browser';
import { nowLocalInput, offsetLabel, partsIn, wallToEpoch } from '@/utils/timezone';
import { EMPTY_STATUS, type Status } from '@/types/common';

const ZONES: [string, string][] = [
  ['Asia/Seoul', '한국 (KST, UTC+9)'],
  ['UTC', 'UTC'],
  ['Asia/Tokyo', '도쿄'],
  ['Asia/Shanghai', '베이징·상하이'],
  ['Asia/Singapore', '싱가포르'],
  ['Asia/Kolkata', '인도'],
  ['Europe/London', '런던'],
  ['Europe/Paris', '파리'],
  ['Europe/Berlin', '베를린'],
  ['America/New_York', '뉴욕 (미 동부)'],
  ['America/Chicago', '시카고 (미 중부)'],
  ['America/Denver', '덴버 (미 산악)'],
  ['America/Los_Angeles', 'LA (미 서부)'],
  ['Australia/Sydney', '시드니'],
];

type Unit = 'auto' | 's' | 'ms' | 'us' | 'ns';
const UNIT_NAMES: Record<string, string> = { s: '초', ms: '밀리초', us: '마이크로초', ns: '나노초' };
type Row = [string, string];

function fmt(ms: number, tz: string): string {
  return new Date(ms).toLocaleString('ko-KR', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
function relative(ms: number): string {
  const diff = (ms - Date.now()) / 1000;
  const a = Math.abs(diff);
  let t: string;
  if (a < 60) t = Math.round(a) + '초';
  else if (a < 3600) t = Math.round(a / 60) + '분';
  else if (a < 86400) t = Math.round(a / 3600) + '시간';
  else if (a < 86400 * 365) t = Math.round(a / 86400) + '일';
  else t = (a / 86400 / 365.2425).toFixed(1) + '년';
  return a < 1 ? '지금' : diff > 0 ? t + ' 후' : t + ' 전';
}
function isoInZone(ms: number, tz: string): string {
  const p = partsIn(ms, tz);
  const off = offsetLabel(ms, tz).replace('UTC', '');
  const msPart = String((((ms % 1000) + 1000) % 1000) | 0).padStart(3, '0');
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + ':' + p.second + '.' + msPart + off;
}

function CopyRows({ rows }: { rows: Row[] }) {
  return (
    <table className="kv" style={{ marginTop: 12 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th>{k}</th>
            <td>
              <div className="copy-cell">
                <span className="mono">{v}</span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => copyText(v)}>
                  복사
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 현재 시각 (0.2초마다 갱신) — 폼 전체가 다시 그려지지 않도록 분리 */
function NowBox() {
  const [now, setNow] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (!pausedRef.current) setNow(Date.now());
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface now-box" aria-label="현재 Unix 타임스탬프">
      <div className="now-row">
        <div>
          <div className="stat-label">현재 Unix 타임스탬프 (초)</div>
          <div className="now-value mono">{now === null ? '-' : Math.floor(now / 1000)}</div>
        </div>
        <div>
          <div className="stat-label">밀리초</div>
          <div className="now-value now-ms mono">{now === null ? '-' : now}</div>
        </div>
        <div>
          <div className="stat-label">한국 시간 (KST)</div>
          <div className="now-kst">{now === null ? '-' : fmt(now, 'Asia/Seoul')}</div>
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => copyText(now === null ? '' : String(Math.floor(now / 1000)))}>
          초 복사
        </button>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => copyText(now === null ? '' : String(now))}>
          밀리초 복사
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-pressed={paused}
          onClick={() => {
            pausedRef.current = !paused;
            setPaused(!paused);
          }}
        >
          {paused ? '다시 시작' : '멈춤'}
        </button>
      </div>
    </div>
  );
}

export default function TimestampTool() {
  const [localTz, setLocalTz] = useState('');

  /* ---------- timestamp → date ---------- */
  const [tsIn, setTsIn] = useState('');
  const [unit, setUnit] = useState<Unit>('auto');
  const [tsInvalid, setTsInvalid] = useState(false);
  const [tsStatus, setTsStatus] = useState<Status>(EMPTY_STATUS);
  const [tsRows, setTsRows] = useState<Row[]>([]);

  function tsToDate(value = tsIn, u: Unit = unit) {
    const raw = value.trim().replace(/[,_\s]/g, '');
    setTsRows([]);
    if (!raw) return setTsStatus({ kind: 'warn', text: '타임스탬프를 입력하세요.' });
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      setTsInvalid(true);
      return setTsStatus({ kind: 'err', text: '숫자만 입력하세요.' });
    }
    setTsInvalid(false);
    let real = u;
    const digits = raw.replace(/^-/, '').split('.')[0].length;
    if (real === 'auto') real = digits <= 11 ? 's' : digits <= 14 ? 'ms' : digits <= 17 ? 'us' : 'ns';
    let ms: number;
    if (real === 's') ms = parseFloat(raw) * 1000;
    else if (real === 'ms') ms = parseFloat(raw);
    else {
      const big = BigInt(raw.split('.')[0]);
      ms = Number(big / (real === 'us' ? BigInt(1000) : BigInt(1000000)));
    }
    if (!isFinite(ms) || Math.abs(ms) > 8.64e15) return setTsStatus({ kind: 'err', text: '표현할 수 있는 날짜 범위를 벗어났습니다.' });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTsStatus({ kind: 'ok', text: UNIT_NAMES[real] + ' 단위로 해석했습니다' + (u === 'auto' ? ' (자동 감지)' : '') + ' · ' + relative(ms) });
    const rows: Row[] = [
      ['한국 시간 (KST)', fmt(ms, 'Asia/Seoul')],
      ['UTC', fmt(ms, 'UTC')],
    ];
    if (tz && tz !== 'Asia/Seoul' && tz !== 'UTC') rows.push(['내 시간대 (' + tz + ')', fmt(ms, tz)]);
    rows.push(
      ['ISO 8601 (UTC)', new Date(ms).toISOString()],
      ['ISO 8601 (KST)', isoInZone(ms, 'Asia/Seoul')],
      ['RFC 7231', new Date(ms).toUTCString()],
      ['초', String(Math.floor(ms / 1000))],
      ['밀리초', String(Math.round(ms))],
    );
    setTsRows(rows);
  }

  /* ---------- date → timestamp ---------- */
  const [dtIn, setDtIn] = useState('');
  const [dtTz, setDtTz] = useState('Asia/Seoul');
  const [dtStatus, setDtStatus] = useState<Status>(EMPTY_STATUS);
  const [dtRows, setDtRows] = useState<Row[]>([]);

  function dateToTs(v = dtIn, tz = dtTz) {
    setDtRows([]);
    const m = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(v);
    if (!m) return setDtStatus({ kind: 'warn', text: '날짜와 시각을 선택하세요.' });
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    const epoch = wallToEpoch(wall, tz);
    setDtStatus({ kind: 'ok', text: tz + ' (' + offsetLabel(epoch, tz) + ') 기준으로 변환했습니다.' });
    setDtRows([
      ['초', String(Math.floor(epoch / 1000))],
      ['밀리초', String(epoch)],
      ['ISO 8601 (UTC)', new Date(epoch).toISOString()],
      ['한국 시간 (KST)', fmt(epoch, 'Asia/Seoul')],
    ]);
  }

  // 초기값 (클라이언트에서만 — 빌드 시점 시각이 HTML 에 박히지 않도록)
  useEffect(() => {
    setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    const s = String(Math.floor(Date.now() / 1000));
    setTsIn(s);
    tsToDate(s, 'auto');
    const d = nowLocalInput('Asia/Seoul');
    setDtIn(d);
    dateToTs(d, 'Asia/Seoul');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoneOptions = ZONES.map(([v, l]) => ({ value: v, label: l + ' — ' + v }));
  if (localTz && !ZONES.some((z) => z[0] === localTz)) zoneOptions.push({ value: localTz, label: '브라우저 시간대 — ' + localTz });

  return (
    <section className="tool">
      <div className="wrap stack" style={{ gap: 32 }}>
        <NowBox />

        <div className="grid-2">
          <div>
            <h2 className="subhead" style={{ marginBottom: 12 }}>
              타임스탬프 → 날짜
            </h2>
            <div className="field">
              <label className="label" htmlFor="ts-in">
                Unix 타임스탬프
              </label>
              <div className="input-group">
                <input
                  id="ts-in"
                  className="input mono"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1763683200"
                  value={tsIn}
                  aria-invalid={tsInvalid || undefined}
                  onChange={(e) => {
                    setTsIn(e.target.value);
                    if (e.target.value.trim().length >= 9) tsToDate(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') tsToDate();
                  }}
                />
                <select
                  className="select"
                  style={{ flex: '0 0 120px' }}
                  aria-label="단위"
                  value={unit}
                  onChange={(e) => {
                    const u = e.target.value as Unit;
                    setUnit(u);
                    if (tsIn.trim()) tsToDate(tsIn, u);
                  }}
                >
                  <option value="auto">자동</option>
                  <option value="s">초</option>
                  <option value="ms">밀리초</option>
                  <option value="us">마이크로초</option>
                  <option value="ns">나노초</option>
                </select>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn" type="button" onClick={() => tsToDate()}>
                변환
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  const s = String(Math.floor(Date.now() / 1000));
                  setTsIn(s);
                  setUnit('auto');
                  tsToDate(s, 'auto');
                }}
              >
                지금
              </button>
            </div>
            <StatusBox status={tsStatus} style={{ marginTop: 12 }} />
            <CopyRows rows={tsRows} />
          </div>

          <div>
            <h2 className="subhead" style={{ marginBottom: 12 }}>
              날짜 → 타임스탬프
            </h2>
            <div className="field">
              <label className="label" htmlFor="dt-in">
                날짜와 시각
              </label>
              <input
                id="dt-in"
                className="input"
                type="datetime-local"
                step={1}
                value={dtIn}
                onChange={(e) => {
                  setDtIn(e.target.value);
                  dateToTs(e.target.value);
                }}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label" htmlFor="dt-tz">
                기준 시간대
              </label>
              <select
                id="dt-tz"
                className="select"
                value={dtTz}
                onChange={(e) => {
                  setDtTz(e.target.value);
                  if (dtIn) dateToTs(dtIn, e.target.value);
                }}
              >
                {zoneOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn" type="button" onClick={() => dateToTs()}>
                변환
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  const d = nowLocalInput(dtTz);
                  setDtIn(d);
                  dateToTs(d);
                }}
              >
                지금
              </button>
            </div>
            <StatusBox status={dtStatus} style={{ marginTop: 12 }} />
            <CopyRows rows={dtRows} />
          </div>
        </div>
      </div>
    </section>
  );
}
