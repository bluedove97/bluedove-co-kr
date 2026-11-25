'use client';

/* 로또 확률 계산기 — 가상 당첨 번호 + 모의 구매 (0.05초당 1게임)
 * 결과 목록은 게임이 수천 개까지 쌓이므로 React 상태 대신 ref + 직접 DOM 추가로 그린다. */

import { useEffect, useRef, useState } from 'react';
import { toast } from '@/utils/browser';

const PRICE = 1000; // 1게임
const TICK_MS = 50; // 0.05초당 1게임
const MAX_AMOUNT = 10_000_000; // 한 번에 최대 1만 게임
const ADD_BUTTONS = [1000, 5000, 10000, 100000];

type Rank = 0 | 1 | 2 | 3 | 4 | 5; // 0 = 낙첨

/** 등수별 정보. 1~3등 당첨금은 회차마다 달라 최근 평균 수준의 추정치(세전) */
const RANKS: { rank: Exclude<Rank, 0>; cond: string; odds: number; prize: number }[] = [
  { rank: 1, cond: '6개 일치', odds: 8_145_060, prize: 2_000_000_000 },
  { rank: 2, cond: '5개 + 보너스', odds: 1_357_510, prize: 55_000_000 },
  { rank: 3, cond: '5개 일치', odds: 35_724, prize: 1_500_000 },
  { rank: 4, cond: '4개 일치', odds: 733, prize: 50_000 },
  { rank: 5, cond: '3개 일치', odds: 45, prize: 5_000 },
];
// 정확한 확률 = 경우의 수 / C(45,6)
const WAYS: Record<number, number> = { 1: 1, 2: 6, 3: 228, 4: 11_115, 5: 182_780 };
const TOTAL = 8_145_060;
// 낙첨 세분화: k개 일치 경우의 수 = C(6,k) × C(39,6−k)
const MISSES: { hit: 0 | 1 | 2; ways: number; pct: string }[] = [
  { hit: 2, ways: 1_233_765, pct: '약 15.1%' },
  { hit: 1, ways: 3_454_542, pct: '약 42.4%' },
  { hit: 0, ways: 3_262_623, pct: '약 40.1%' },
];

type Draw = { nums: number[]; bonus: number };
/** counts[등수] (0 = 낙첨 전체), miss[일치 개수 0~2] */
type Stats = { games: number; counts: number[]; miss: number[]; prize: number };
const EMPTY_STATS: Stats = { games: 0, counts: [0, 0, 0, 0, 0, 0], miss: [0, 0, 0], prize: 0 };

const won = (n: number) => n.toLocaleString('ko-KR');

/** 균등 난수 0 ≤ r < max (Web Crypto, 모듈로 편향 제거) */
function randInt(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

/** 1~45 중 서로 다른 count 개 (부분 Fisher–Yates) */
function pick(count: number): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = 0; i < count; i++) {
    const j = i + randInt(45 - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function newDraw(): Draw {
  const seven = pick(7);
  return { nums: seven.slice(0, 6).sort((a, b) => a - b), bonus: seven[6] };
}

function rankOf(hit: number, bonusHit: boolean): Rank {
  if (hit === 6) return 1;
  if (hit === 5) return bonusHit ? 2 : 3;
  if (hit === 4) return 4;
  if (hit === 3) return 5;
  return 0;
}

/** 공 색상 (실제 로또 공 색 구간) */
function ballTone(n: number): string {
  if (n <= 10) return 't1';
  if (n <= 20) return 't2';
  if (n <= 30) return 't3';
  if (n <= 40) return 't4';
  return 't5';
}

function Ball({ n, bonus }: { n: number | null; bonus?: boolean }) {
  return (
    <span className={`lt-ball lg ${n ? ballTone(n) : 'empty'}${bonus ? ' bonus' : ''}`} aria-label={n ? `${bonus ? '보너스 ' : ''}${n}번` : '추첨 전'}>
      {n ?? '?'}
    </span>
  );
}

/** 결과 한 줄(DOM 직접 생성) */
function buildRow(no: number, nums: number[], draw: Draw, rank: Rank): HTMLLIElement {
  const win = new Set(draw.nums);
  const li = document.createElement('li');
  li.className = `lt-row r${rank}`;

  const idx = document.createElement('span');
  idx.className = 'lt-no';
  idx.textContent = `#${no}`;
  li.appendChild(idx);

  const balls = document.createElement('span');
  balls.className = 'lt-balls';
  let hit = 0;
  for (const n of nums) {
    const b = document.createElement('span');
    if (win.has(n)) {
      hit++;
      b.className = `lt-ball ${ballTone(n)}`;
      b.title = '일치';
    } else if (rank === 2 && n === draw.bonus) {
      b.className = `lt-ball ${ballTone(n)} bonus`;
      b.title = '보너스 일치';
    } else {
      b.className = 'lt-ball miss';
    }
    b.textContent = String(n);
    balls.appendChild(b);
  }
  li.appendChild(balls);

  const badge = document.createElement('span');
  badge.className = 'lt-rank';
  badge.textContent = rank ? `${rank}등` : '낙첨';
  const sub = document.createElement('small');
  sub.textContent = rank === 2 ? '5개+보너스' : `${hit}개 일치`;
  badge.appendChild(sub);
  li.appendChild(badge);
  return li;
}

/** 1·2등 축하 오버레이 (종이 조각 + 배너), 일정 시간 뒤 스스로 제거 */
function celebrate(host: HTMLElement, rank: 1 | 2, no: number) {
  const layer = document.createElement('div');
  layer.className = `lt-celebrate c${rank}`;
  const colors = rank === 1 ? ['#f5b400', '#ff5a5f', '#2bb673', '#0057d2', '#b06cff', '#ffd84d'] : ['#c0c8d2', '#8fa3b8', '#b06cff', '#f5b400'];
  const pieces = rank === 1 ? 90 : 36;
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * (rank === 1 ? 1.2 : 0.6)}s`;
    p.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    layer.appendChild(p);
  }
  const banner = document.createElement('div');
  banner.className = 'lt-banner';
  banner.setAttribute('role', 'status');
  const big = document.createElement('strong');
  big.textContent = rank === 1 ? '1등 당첨!' : '2등 당첨!';
  const small = document.createElement('span');
  small.textContent = rank === 1 ? `#${no} 게임 · 8,145,060분의 1의 행운` : `#${no} 게임 · 5개 + 보너스 번호 일치`;
  banner.append(big, small);
  layer.appendChild(banner);
  host.appendChild(layer);
  setTimeout(() => layer.remove(), rank === 1 ? 5200 : 3600);
}

export default function LottoTool() {
  const [draw, setDraw] = useState<Draw | null>(null);
  const [amount, setAmount] = useState(0);
  const [running, setRunning] = useState(false);
  const [queue, setQueue] = useState({ done: 0, total: 0 });
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [winsOnly, setWinsOnly] = useState(false);

  const listRef = useRef<HTMLOListElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const gameNoRef = useRef(0);
  const progressRef = useRef({ done: 0, total: 0 });

  // 새로 고침마다 새 당첨 번호 (정적 HTML 에 빌드 시점 번호가 박히지 않도록 effect 에서)
  useEffect(() => {
    setDraw(newDraw());
    return () => clearInterval(timerRef.current);
  }, []);

  const games = Math.floor(amount / PRICE);
  const canBuy = !!draw && !running && games >= 1;

  const setAmountSafe = (v: number) => {
    if (v > MAX_AMOUNT) {
      toast(`한 번에 최대 ${won(MAX_AMOUNT)}원까지 넣을 수 있습니다`);
      v = MAX_AMOUNT;
    }
    setAmount(Math.max(0, v));
  };

  function stop(refund: boolean) {
    clearInterval(timerRef.current);
    timerRef.current = undefined;
    setRunning(false);
    const { done, total } = progressRef.current;
    if (refund && total > done) {
      const left = total - done;
      setAmount((a) => Math.min(MAX_AMOUNT, a + left * PRICE));
      toast(`남은 ${won(left)}게임(${won(left * PRICE)}원)을 돌려받았습니다`);
    }
    progressRef.current = { done, total: done };
    setQueue({ done, total: done });
  }

  function buy() {
    if (!canBuy || !draw) return;
    const total = games;
    setAmount(amount - total * PRICE); // 1,000원 미만 잔돈은 남겨 둔다
    progressRef.current = { done: 0, total };
    setQueue({ done: 0, total });
    setRunning(true);

    let done = 0;
    const tick = () => {
      if (done >= progressRef.current.total) return; // 중지 직후 남은 호출 방지
      const nums = pick(6).sort((a, b) => a - b);
      const hit = nums.filter((n) => draw.nums.includes(n)).length;
      const rank = rankOf(hit, nums.includes(draw.bonus));
      const no = ++gameNoRef.current;

      const list = listRef.current;
      if (list) {
        const row = buildRow(no, nums, draw, rank);
        list.insertBefore(row, list.firstChild); // 최신 게임이 위로
      }
      if (rank && rank <= 2 && fxRef.current) celebrate(fxRef.current, rank as 1 | 2, no);
      if (rank === 3) toast(`#${no} 게임 3등 당첨!`);

      setStats((s) => {
        const counts = s.counts.slice();
        counts[rank]++;
        const miss = s.miss.slice();
        if (!rank) miss[hit]++;
        return { games: s.games + 1, counts, miss, prize: s.prize + (rank ? RANKS[rank - 1].prize : 0) };
      });
      done++;
      progressRef.current.done = done;
      setQueue({ done, total });
      if (done >= total) stop(false);
    };
    tick(); // 첫 게임은 바로
    if (total > 1) timerRef.current = setInterval(tick, TICK_MS);
  }

  const invested = stats.games * PRICE;
  const profit = stats.prize - invested;
  // 주식 수익률처럼: (평가액 − 매수금액) ÷ 매수금액
  const rate = invested ? (profit / invested) * 100 : 0;
  const leftSec = ((queue.total - queue.done) * TICK_MS) / 1000;

  return (
    <section className="tool lt">
      <div className="wrap" ref={fxRef}>
        {/* 당첨 번호 */}
        <div className="lt-draw surface">
          <div className="lt-draw-head">
            <h2 className="lt-h">가상 회차 당첨 번호</h2>
            <span className="hint">가상 번호 · 새로 고침하면 바뀝니다</span>
          </div>
          <div className="lt-draw-balls" aria-live="polite">
            {(draw ? draw.nums : [null, null, null, null, null, null]).map((n, i) => (
              <Ball key={i} n={n} />
            ))}
            <span className="lt-plus" aria-hidden="true">
              +
            </span>
            <Ball n={draw?.bonus ?? null} bonus />
          </div>
        </div>

        {/* 구매 */}
        <div className="lt-buy surface-white">
          <div className="field">
            <label className="label" htmlFor="lt-amount">
              구매 금액 <span className="hint">(1게임 1,000원)</span>
            </label>
            <div className="lt-amount-row">
              <div className="unit-input lt-amount">
                <input
                  className="input mono"
                  id="lt-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={amount ? won(amount) : ''}
                  onChange={(e) => setAmountSafe(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                />
                <span className="unit">원</span>
              </div>
              <div className="lt-add">
                {ADD_BUTTONS.map((v) => (
                  <button key={v} type="button" className="btn btn-outline btn-sm" onClick={() => setAmountSafe(amount + v)}>
                    +{won(v)}
                  </button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAmount(0)} disabled={!amount}>
                  리셋
                </button>
              </div>
            </div>
          </div>

          <div className="lt-buy-foot">
            <p className="meta" aria-live="polite">
              {running ? (
                <>
                  추첨 중 <b className="mono">{won(queue.done)}</b> / {won(queue.total)}게임 · 약 {leftSec.toFixed(1)}초 남음
                </>
              ) : games >= 1 ? (
                <>
                  <b className="mono">{won(games)}</b>게임 구매 가능
                  {amount % PRICE ? ` · ${won(amount % PRICE)}원은 남습니다` : ''} · 약 {((games * TICK_MS) / 1000).toFixed(1)}초
                </>
              ) : (
                '1,000원 이상 넣으면 구매할 수 있습니다.'
              )}
            </p>
            <div className="btn-row">
              {running && (
                <button type="button" className="btn btn-outline" onClick={() => stop(true)}>
                  중지
                </button>
              )}
              <button type="button" className="btn lt-buy-btn" onClick={buy} disabled={!canBuy}>
                {running ? '추첨 중…' : '로또 구매'}
              </button>
            </div>
          </div>
          {running && (
            <div className="lt-progress" aria-hidden="true">
              <span style={{ width: `${queue.total ? (queue.done / queue.total) * 100 : 0}%` }} />
            </div>
          )}
        </div>

        <div className="lt-main">
          {/* 당첨 영역 */}
          <div className="lt-results">
            <div className="pane-head">
              <h2 className="lt-h">당첨 결과</h2>
              <label className="check">
                <input type="checkbox" checked={winsOnly} onChange={(e) => setWinsOnly(e.target.checked)} /> 당첨만 보기
              </label>
            </div>
            <div className={`lt-list-box${winsOnly ? ' wins-only' : ''}`}>
              {stats.games === 0 && <p className="lt-empty">금액을 넣고 로또 구매를 누르면 게임 결과가 여기에 쌓입니다.</p>}
              {winsOnly && stats.games > 0 && stats.counts[0] === stats.games && <p className="lt-empty">아직 당첨된 게임이 없습니다.</p>}
              <ol className="lt-list" ref={listRef} aria-label="게임 결과 (최신순)" />
            </div>
          </div>

          {/* 통계 */}
          <aside className="lt-stats" aria-label="통계">
            <h2 className="lt-h">통계</h2>
            <div className="stat-row lt-sum">
              <div className="stat">
                <div className="stat-label">투자 금액</div>
                <div className="stat-value">
                  {won(invested)}
                  <small>원</small>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">게임 수</div>
                <div className="stat-value">
                  {won(stats.games)}
                  <small>게임</small>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">추정 당첨금</div>
                <div className="stat-value">
                  {won(stats.prize)}
                  <small>원</small>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">수익률</div>
                <div className={`stat-value ${!invested || profit === 0 ? '' : profit > 0 ? 'lt-plus-v' : 'lt-minus-v'}`}>
                  {invested ? `${rate > 0 ? '+' : ''}${rate.toFixed(1)}` : '-'}
                  <small>%</small>
                </div>
              </div>
            </div>
            <p className={`lt-net meta ${profit > 0 ? 'up' : profit < 0 ? 'down' : ''}`}>
              손익 <b className="mono">{profit > 0 ? '+' : ''}{won(profit)}원</b>
            </p>

            <table className="lt-table">
              <thead>
                <tr>
                  <th scope="col">등수</th>
                  <th scope="col">당첨횟수</th>
                  <th scope="col">기댓값</th>
                  <th scope="col">확률</th>
                </tr>
              </thead>
              <tbody>
                {RANKS.map((r) => (
                  <tr key={r.rank} className={`r${r.rank}${stats.counts[r.rank] ? ' has' : ''}`}>
                    <th scope="row">
                      <span className="lt-rank-chip">{r.rank}등</span>
                      <small>{r.cond}</small>
                    </th>
                    <td className="mono lt-count">{won(stats.counts[r.rank])}</td>
                    <td className="mono">{fmtExpect((stats.games * WAYS[r.rank]) / TOTAL)}</td>
                    <td className="mono">1/{won(r.odds)}</td>
                  </tr>
                ))}
                {MISSES.map((m) => (
                  <tr key={`miss${m.hit}`} className="r0">
                    <th scope="row">
                      <span className="lt-rank-chip">낙첨</span>
                      <small>{m.hit}개 일치</small>
                    </th>
                    <td className="mono lt-count">{won(stats.miss[m.hit])}</td>
                    <td className="mono">{fmtExpect((stats.games * m.ways) / TOTAL)}</td>
                    <td className="mono">{m.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint lt-note">
              기댓값 = 지금까지 진행한 게임 수에 대한 확률상 당첨 횟수. 추정 당첨금은 4등 50,000원 · 5등 5,000원(고정)과 1등 20억 · 2등 5,500만 · 3등 150만 원(최근 평균 수준, 세전)으로 계산합니다.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function fmtExpect(v: number): string {
  if (v === 0) return '0';
  if (v >= 100) return Math.round(v).toLocaleString('ko-KR');
  if (v >= 0.01) return v.toFixed(2);
  // 아주 작은 값도 소수로 (유효숫자 2자리, 예: 0.000037)
  return v.toFixed(Math.min(20, Math.ceil(-Math.log10(v)) + 1));
}
