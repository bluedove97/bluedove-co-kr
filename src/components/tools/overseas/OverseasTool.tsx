'use client';

/* 해외시간 계산기 (Intl API, IANA time zone) */

import { useEffect, useState } from 'react';
import { store, toast } from '@/utils/browser';
import { nowLocalInput, offsetMin, partsIn, wallToEpoch, WEEKDAY_KO as WD, type ZoneParts } from '@/utils/timezone';

const KST = 'Asia/Seoul';

const CITIES: [string, string, string][] = [
  ['America/New_York', '뉴욕', '미국 동부'],
  ['America/Chicago', '시카고', '미국 중부'],
  ['America/Denver', '덴버', '미국 산악'],
  ['America/Los_Angeles', '로스앤젤레스', '미국 서부'],
  ['America/Anchorage', '앵커리지', '미국 알래스카'],
  ['Pacific/Honolulu', '호놀룰루', '미국 하와이'],
  ['America/Toronto', '토론토', '캐나다'],
  ['America/Vancouver', '밴쿠버', '캐나다'],
  ['America/Mexico_City', '멕시코시티', '멕시코'],
  ['America/Sao_Paulo', '상파울루', '브라질'],
  ['America/Argentina/Buenos_Aires', '부에노스아이레스', '아르헨티나'],
  ['Europe/London', '런던', '영국'],
  ['Europe/Paris', '파리', '프랑스'],
  ['Europe/Berlin', '베를린', '독일'],
  ['Europe/Rome', '로마', '이탈리아'],
  ['Europe/Madrid', '마드리드', '스페인'],
  ['Europe/Amsterdam', '암스테르담', '네덜란드'],
  ['Europe/Zurich', '취리히', '스위스'],
  ['Europe/Prague', '프라하', '체코'],
  ['Europe/Istanbul', '이스탄불', '튀르키예'],
  ['Europe/Moscow', '모스크바', '러시아'],
  ['Africa/Cairo', '카이로', '이집트'],
  ['Africa/Johannesburg', '요하네스버그', '남아프리카공화국'],
  ['Asia/Dubai', '두바이', '아랍에미리트'],
  ['Asia/Kolkata', '뉴델리', '인도'],
  ['Asia/Kathmandu', '카트만두', '네팔'],
  ['Asia/Bangkok', '방콕', '태국'],
  ['Asia/Ho_Chi_Minh', '호찌민', '베트남'],
  ['Asia/Jakarta', '자카르타', '인도네시아'],
  ['Asia/Kuala_Lumpur', '쿠알라룸푸르', '말레이시아'],
  ['Asia/Singapore', '싱가포르', '싱가포르'],
  ['Asia/Manila', '마닐라', '필리핀'],
  ['Asia/Shanghai', '베이징 · 상하이', '중국'],
  ['Asia/Hong_Kong', '홍콩', '홍콩'],
  ['Asia/Taipei', '타이베이', '대만'],
  ['Asia/Ulaanbaatar', '울란바토르', '몽골'],
  ['Asia/Tokyo', '도쿄', '일본'],
  ['Pacific/Guam', '괌', '미국령'],
  ['Australia/Perth', '퍼스', '호주 서부'],
  ['Australia/Sydney', '시드니', '호주 동부'],
  ['Pacific/Auckland', '오클랜드', '뉴질랜드'],
  ['UTC', 'UTC', '협정 세계시'],
];
const DEFAULTS = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Shanghai', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Australia/Sydney'];
const byId: Record<string, [string, string, string]> = Object.fromEntries(CITIES.map((c) => [c[0], c]));

function isDst(ms: number, tz: string): boolean {
  const y = new Date(ms).getUTCFullYear();
  const jan = offsetMin(Date.UTC(y, 0, 1), tz);
  const jul = offsetMin(Date.UTC(y, 6, 1), tz);
  return jan !== jul && offsetMin(ms, tz) === Math.max(jan, jul);
}
const dayKey = (p: ZoneParts) => +p.year * 10000 + +p.month * 100 + +p.day;
function diffLabel(min: number): string {
  if (min === 0) return '한국과 같은 시간';
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const t = h + '시간' + (m ? ' ' + m + '분' : '');
  return min > 0 ? '한국보다 ' + t + ' 빠름' : '한국보다 ' + t + ' 느림';
}
function relDay(p: ZoneParts, base: ZoneParts): string {
  const a = dayKey(p);
  const b = dayKey(base);
  return a === b ? '오늘' : a > b ? '내일' : '어제';
}

function CityCard({ zone, now, kst, onRemove }: { zone: string; now: number | null; kst: ZoneParts | null; onRemove: () => void }) {
  const c = byId[zone];
  const p = now !== null ? partsIn(now, zone) : null;
  const hr = p ? +p.hour : 12;
  const day = hr >= 6 && hr < 18;
  return (
    <li className="city">
      <div className="city-name">{c[1]}</div>
      <div className="city-country">
        {c[2]} · {zone}
      </div>
      <div className="city-time">
        {p ? (
          <>
            {p.hour}:{p.minute}
            <span className="dn" aria-label={day ? '낮' : '밤'}>
              {day ? '☀' : '☾'}
            </span>
          </>
        ) : (
          '--:--'
        )}
      </div>
      <div className="city-meta">{p && kst ? relDay(p, kst) + ' · ' + +p.month + '월 ' + +p.day + '일 (' + WD[p.weekday] + ') ' + p.second + '초' : ' '}</div>
      <span className="city-diff">{now !== null ? diffLabel(offsetMin(now, zone) - offsetMin(now, KST)) : ' '}</span>
      <span className="city-dst" hidden={now === null || !isDst(now, zone)}>
        서머타임
      </span>
      <button className="btn btn-ghost btn-sm city-rm" type="button" aria-label={c[1] + ' 삭제'} onClick={onRemove}>
        ✕
      </button>
    </li>
  );
}

export default function OverseasTool() {
  const [selected, setSelected] = useState<string[]>(DEFAULTS);
  const [now, setNow] = useState<number | null>(null);
  const [addSel, setAddSel] = useState('');
  const [convBase, setConvBase] = useState(KST);
  const [convDt, setConvDt] = useState('');

  useEffect(() => {
    setSelected(store.get<string[]>('overseas-cities', DEFAULTS).filter((z) => byId[z]));
    setConvDt(nowLocalInput(KST, false));
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function update(next: string[]) {
    setSelected(next);
    store.set('overseas-cities', next);
    if (convBase !== KST && !next.includes(convBase)) setConvBase(KST);
  }

  const addable = CITIES.filter((c) => !selected.includes(c[0]));
  const addValue = addable.some((c) => c[0] === addSel) ? addSel : addable[0]?.[0] || '';
  const kst = now !== null ? partsIn(now, KST) : null;

  /* ---------- 시각 환산 ---------- */
  let convRows: { name: string; text: string; note: string }[] | null = null;
  const m = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(convDt);
  if (m) {
    const ms = wallToEpoch(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), convBase);
    const bp = partsIn(ms, convBase);
    convRows = [KST, ...selected]
      .filter((z) => z !== convBase)
      .map((z) => {
        const p = partsIn(ms, z);
        const hr = +p.hour;
        const note = hr >= 9 && hr < 18 ? '업무 시간' : hr >= 22 || hr < 7 ? '한밤중' : '';
        return {
          name: z === KST ? '서울 (한국)' : byId[z][1],
          text: p.year + '-' + p.month + '-' + p.day + ' (' + WD[p.weekday] + ') ' + p.hour + ':' + p.minute,
          note: '기준 도시 ' + relDay(p, bp).replace('오늘', '같은 날') + (note ? ' · ' + note : ''),
        };
      });
  }

  return (
    <section className="tool">
      <div className="wrap stack" style={{ gap: 28 }}>
        <div className="kst-box">
          <div>
            <p className="stat-label">지금 한국 시간 (KST · UTC+09:00)</p>
            <p className="kst-time mono">{kst ? kst.hour + ':' + kst.minute + ':' + kst.second : '--:--:--'}</p>
            <p className="kst-date">{kst ? kst.year + '년 ' + +kst.month + '월 ' + +kst.day + '일 (' + WD[kst.weekday] + ')' : '-'}</p>
          </div>
          <div className="add-city">
            <label className="label" htmlFor="city-sel">
              도시 추가
            </label>
            <div className="input-group">
              <select className="select" id="city-sel" value={addValue} onChange={(e) => setAddSel(e.target.value)}>
                {addable.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[1]} ({c[2]})
                  </option>
                ))}
              </select>
              <button
                className="btn"
                type="button"
                disabled={!addable.length}
                onClick={() => {
                  if (!addValue || selected.includes(addValue)) return;
                  update([...selected, addValue]);
                  toast(byId[addValue][1] + ' 추가');
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="pane-head" style={{ marginBottom: 12 }}>
            <h2 className="subhead">세계 시간</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => update(DEFAULTS.slice())}>
              기본 도시로
            </button>
          </div>
          <ul className="city-list" aria-live="off">
            {selected.length ? (
              selected.map((z) => <CityCard key={z} zone={z} now={now} kst={kst} onRemove={() => update(selected.filter((x) => x !== z))} />)
            ) : (
              <li className="city">
                <p className="meta">도시를 추가하세요.</p>
              </li>
            )}
          </ul>
        </div>

        <div className="surface">
          <h2 className="subhead" style={{ marginBottom: 6 }}>
            시각 환산
          </h2>
          <p className="meta" style={{ marginBottom: 14 }}>
            기준 도시의 특정 시각이 다른 도시에서 몇 시인지 계산합니다. 회의·통화 시간을 잡을 때 쓰세요.
          </p>
          <div className="conv-grid">
            <div className="field">
              <label className="label" htmlFor="conv-base">
                기준 도시
              </label>
              <select className="select" id="conv-base" value={convBase} onChange={(e) => setConvBase(e.target.value)}>
                <option value={KST}>서울 (한국)</option>
                {selected.map((z) => (
                  <option key={z} value={z}>
                    {byId[z][1]} ({byId[z][2]})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="conv-dt">
                기준 시각
              </label>
              <input className="input" type="datetime-local" id="conv-dt" value={convDt} onChange={(e) => setConvDt(e.target.value)} />
            </div>
            <div className="field conv-now">
              <button className="btn btn-outline" type="button" onClick={() => setConvDt(nowLocalInput(convBase, false))}>
                지금
              </button>
            </div>
          </div>
          <table className="kv" style={{ marginTop: 16 }}>
            <tbody>
              {convRows ? (
                convRows.map((r) => (
                  <tr key={r.name}>
                    <th>{r.name}</th>
                    <td>
                      <b className="mono">{r.text}</b> <span className="meta">{r.note}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="meta">기준 시각을 선택하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
