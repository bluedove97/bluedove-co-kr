'use client';

/* 만나이 계산기 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { pad2 } from '@/utils/format';

const ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];

type Ymd = { y: number; m: number; d: number };
type Age = { by: number; man: number; yeon: number; korean: number; zodiac: string; days: number; dday: number; birthday: boolean };

const RULES: { text: string; test?: (a: Age) => boolean; info?: (a: Age) => string }[] = [
  { text: '만 18세 이상: 투표, 운전면허 취득, 아르바이트 및 취업', test: (a) => a.man >= 18 },
  { text: '만 18세~30세: 워킹홀리데이 신청 가능', test: (a) => a.man >= 18 && a.man <= 30 },
  { text: '연나이 18세 이상: 군대입영, 9급 공무원 지원 가능', test: (a) => a.yeon >= 18 },
  { text: '초등 입학: 만 6세가 된 다음해 3월부터 입학, 연나이 7세', info: (a) => a.by + 7 + '년 3월' },
  { text: '병역법과 청소년보호법은 태어난 연도만 고려하는 연나이가 기준', info: () => '참고' },
  { text: '만 19세 이상 : 청소년 관람불가 영화 관람', test: (a) => a.man >= 19 },
];

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function parse(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const utc = (o: Ymd) => Date.UTC(o.y, o.m - 1, o.d);

/** 해당 연도의 생일 (2/29생은 평년에 3/1) */
function birthdayIn(b: Ymd, y: number): Ymd {
  if (b.m === 2 && b.d === 29 && !isLeap(y)) return { y, m: 3, d: 1 };
  return { y, m: b.m, d: b.d };
}

function calc(b: Ymd, t: Ymd): Age {
  let man = t.y - b.y;
  if (utc(t) < utc(birthdayIn(b, t.y))) man--;
  const yeon = t.y - b.y;
  let next = birthdayIn(b, t.y);
  if (utc(next) <= utc(t)) next = birthdayIn(b, t.y + 1);
  return {
    by: b.y,
    man,
    yeon,
    korean: yeon + 1,
    zodiac: ZODIAC[((b.y % 12) + 12) % 12],
    days: Math.round((utc(t) - utc(b)) / 86400000),
    dday: Math.round((utc(next) - utc(t)) / 86400000),
    birthday: utc(birthdayIn(b, t.y)) === utc(t),
  };
}

type Result = { age: Age | null; main: ReactNode; sub?: string; invalid: boolean };
const INITIAL: Result = { age: null, main: '생년월일을 입력하세요.', invalid: false };

export default function AgeTool() {
  const [birth, setBirth] = useState('');
  const [base, setBase] = useState('');
  const [res, setRes] = useState<Result>(INITIAL);
  const birthRef = useRef<HTMLInputElement>(null);

  function run(bs = birth, ts = base) {
    const b = parse(bs);
    let t = parse(ts);
    if (!b) return setRes({ age: null, main: '출생일을 선택하세요.', invalid: true });
    if (!t) {
      const today = todayStr();
      t = parse(today)!;
      setBase(today);
    }
    if (utc(b) > utc(t)) return setRes({ age: null, main: '출생일이 기준일보다 늦습니다.', sub: '날짜를 확인해 주세요.', invalid: true });
    const a = calc(b, t);
    setRes({
      age: a,
      invalid: false,
      main: (
        <>
          만 <strong>{a.man}세</strong>, <strong>{a.zodiac}띠</strong>,<br />
          연나이 <strong>{a.yeon}세</strong>입니다
        </>
      ),
      sub: a.birthday ? '기준일이 생일입니다. 축하합니다!' : undefined,
    });
  }

  // 초기값: 기준일=오늘, 출생일=1990-01-01 (클라이언트에서 계산)
  useEffect(() => {
    const today = todayStr();
    setBase(today);
    setBirth('1990-01-01');
    run('1990-01-01', today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a = res.age;

  return (
    <section className="tool">
      <div className="wrap">
        <form
          className="age-card surface-white"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          onReset={(e) => {
            e.preventDefault();
            setBirth('');
            setBase(todayStr());
            setRes(INITIAL);
            birthRef.current?.focus();
          }}
        >
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="birth">
                출생일
              </label>
              <input
                className="input"
                type="date"
                id="birth"
                ref={birthRef}
                required
                min="1900-01-01"
                max="2100-12-31"
                value={birth}
                aria-invalid={res.invalid || undefined}
                onChange={(e) => {
                  setBirth(e.target.value);
                  if (e.target.value) run(e.target.value, base);
                }}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="base">
                기준일
              </label>
              <input
                className="input"
                type="date"
                id="base"
                required
                min="1900-01-01"
                max="2100-12-31"
                value={base}
                onChange={(e) => {
                  setBase(e.target.value);
                  if (birth) run(birth, e.target.value);
                }}
              />
            </div>
          </div>

          <div className="result" aria-live="polite">
            <p className="result-main">{res.main}</p>
            {res.sub && <p className="result-sub">{res.sub}</p>}
          </div>

          <div className="stat-row" hidden={!a} style={{ marginBottom: 20 }}>
            <div className="stat">
              <div className="stat-label">다음 생일까지</div>
              <div className="stat-value">{a ? (a.birthday ? '오늘' : 'D-' + a.dday.toLocaleString()) : '-'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">살아온 날</div>
              <div className="stat-value">
                {a ? (
                  <>
                    {a.days.toLocaleString()}
                    <small>일</small>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">세는 나이 (옛 한국식)</div>
              <div className="stat-value">
                {a ? (
                  <>
                    {a.korean}
                    <small>세</small>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">초등학교 입학</div>
              <div className="stat-value">
                {a ? (
                  <>
                    {a.by + 7}
                    <small>년 3월</small>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          <ul className="age-rules">
            {RULES.map((r) => {
              let badge: ReactNode = null;
              if (a) {
                if (r.test) {
                  const ok = r.test(a);
                  badge = <span className={'rule-badge ' + (ok ? 'yes' : 'no')}>{ok ? '해당' : '해당 없음'}</span>;
                } else if (r.info) {
                  badge = <span className="rule-badge info">{r.info(a)}</span>;
                }
              }
              return (
                <li key={r.text}>
                  <span>{r.text}</span>
                  {badge}
                </li>
              );
            })}
          </ul>

          <div className="age-actions">
            <button className="btn btn-outline" type="reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              초기화
            </button>
            <button className="btn" type="submit">
              계산하기
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
