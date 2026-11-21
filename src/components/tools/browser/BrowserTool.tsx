'use client';

/* 브라우저 성능 테스트 — 어항 물고기
   - 물고기 = 개별 SVG 요소, 매 프레임 JS로 이동 (성능 측정이 목적이라 React 렌더링을 거치지 않고 DOM 을 직접 갱신)
   - 시작하기 → 0.1초마다 1마리씩 자동 증가 (실제 경과 시간 기준)
   - FPS < 20 상태가 10초 연속 → 종료, 점수 = 물고기 수 */

import { useEffect, useRef } from 'react';
import { copyText, store } from '@/utils/browser';

const FPS_LIMIT = 20;
const HOLD_MS = 10000;
const SAMPLE_MS = 500;
const SPAWN_MS = 100; // 0.1초에 1마리
const SVGNS = 'http://www.w3.org/2000/svg';

type Fish = { el: SVGSVGElement; w: number; h: number; x: number; y: number; a: number; sp: number; turn: number; t: number; dir: number };

export default function BrowserTool() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>('[data-id="' + id + '"]')!;
    const tank = $('tank');
    const ac = new AbortController();
    const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: (e: Event) => void) => el.addEventListener(type, fn, { signal: ac.signal });

    let fish: Fish[] = [];
    let W = tank.clientWidth;
    let H = tank.clientHeight;
    let running = true; // 애니메이션 루프
    let started = false; // 테스트 진행 중 (물고기 자동 증가 + 종료 판정)
    let finished = false;
    let growMs = 0; // 시작 후 (보이는 동안) 흐른 시간
    let lowSince: number | null = null;
    let maxFps = 0;
    let refFps = 60;
    let fpsNow = 0;
    let frameCount = 0;
    let windowStart = performance.now();
    let lastFrame = 0;
    let history: number[] = []; // 최근 120 샘플 (60초)
    let best = store.get('fishtank-best', 0);
    let raf = 0;

    /* ---------- fish ---------- */
    function makeFishEl(hue: number, w: number) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 64 36');
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(Math.round((w * 36) / 64)));
      svg.setAttribute('class', 'fish');
      svg.setAttribute('aria-hidden', 'true');
      const body = 'hsl(' + hue + ',85%,58%)';
      const fin = 'hsl(' + hue + ',80%,44%)';
      svg.innerHTML =
        '<g class="tail"><path d="M18 18 L2 6 Q6 18 2 30 Z" fill="' +
        fin +
        '"/></g>' +
        '<ellipse cx="38" cy="18" rx="24" ry="13" fill="' +
        body +
        '"/>' +
        '<path d="M30 6 Q38 0 46 6" fill="' +
        fin +
        '"/>' +
        '<path d="M34 22 Q38 30 44 24" fill="' +
        fin +
        '" opacity=".8"/>' +
        '<circle cx="51" cy="15" r="3.4" fill="#fff"/><circle cx="52" cy="15" r="1.8" fill="#14243a"/>';
      return svg;
    }

    const setText = (id: string, text: string) => {
      $(id).textContent = text;
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function addFish(n: number) {
      if (finished) return;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const w = Math.round(rand(34, 66));
        const el = makeFishEl(Math.floor(rand(0, 360)), w);
        const f: Fish = {
          el,
          w,
          h: (w * 36) / 64,
          x: rand(0, Math.max(1, W - w)),
          y: rand(0, Math.max(1, H * 0.78 - w * 0.56)),
          a: rand(0, Math.PI * 2),
          sp: rand(40, 120),
          turn: 0,
          t: rand(0.5, 3),
          dir: 1,
        };
        f.dir = Math.cos(f.a) >= 0 ? 1 : -1;
        frag.appendChild(el);
        fish.push(f);
      }
      tank.appendChild(frag);
      setText('h-fish', fish.length.toLocaleString());
      setText('m-fish', fish.length.toLocaleString());
    }

    function step(dt: number) {
      const maxY = H * 0.8;
      for (let i = 0; i < fish.length; i++) {
        const f = fish[i];
        f.t -= dt;
        if (f.t <= 0) {
          // 가끔 방향·속도 바꾸기
          f.turn = rand(-1.4, 1.4);
          f.sp = rand(30, 130);
          f.t = rand(0.6, 3.2);
        }
        f.a += f.turn * dt;
        const vx = Math.cos(f.a) * f.sp;
        const vy = Math.sin(f.a) * f.sp * 0.45;
        f.x += vx * dt;
        f.y += vy * dt;
        if (f.x < 0) {
          f.x = 0;
          f.a = Math.PI - f.a;
        } else if (f.x > W - f.w) {
          f.x = W - f.w;
          f.a = Math.PI - f.a;
        }
        if (f.y < 0) {
          f.y = 0;
          f.a = -f.a;
        } else if (f.y > maxY - f.h) {
          f.y = maxY - f.h;
          f.a = -f.a;
        }
        const c = Math.cos(f.a);
        if (c > 0.15) f.dir = 1;
        else if (c < -0.15) f.dir = -1;
        f.el.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px) scaleX(' + f.dir + ')';
      }
    }

    /* ---------- measuring ---------- */
    const chart = $<HTMLCanvasElement>('fps-chart');
    const cctx = chart.getContext('2d')!;
    function sizeChart() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      chart.width = Math.round(chart.clientWidth * dpr);
      chart.height = Math.round(64 * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawChart();
    }
    function drawChart() {
      const w = chart.clientWidth;
      const h = 64;
      cctx.clearRect(0, 0, w, h);
      const top = Math.max(refFps, 60);
      const y20 = h - (FPS_LIMIT / top) * (h - 8) - 4;
      cctx.strokeStyle = 'rgba(187,0,0,.5)';
      cctx.setLineDash([4, 4]);
      cctx.beginPath();
      cctx.moveTo(0, y20);
      cctx.lineTo(w, y20);
      cctx.stroke();
      cctx.setLineDash([]);
      cctx.fillStyle = '#475e75';
      cctx.font = '11px "IBM Plex Mono", monospace';
      cctx.fillText('20 fps', 6, y20 - 4);
      if (history.length < 2) return;
      const n = 120;
      const dx = w / (n - 1);
      cctx.strokeStyle = '#0057d2';
      cctx.lineWidth = 2;
      cctx.beginPath();
      history.forEach((v, i) => {
        const x = (n - history.length + i) * dx;
        const y = h - (Math.min(v, top) / top) * (h - 8) - 4;
        if (i === 0) cctx.moveTo(x, y);
        else cctx.lineTo(x, y);
      });
      cctx.stroke();
    }

    function loadPct(fps: number) {
      if (fps >= refFps) return 0;
      if (fps >= FPS_LIMIT) return ((refFps - fps) / (refFps - FPS_LIMIT)) * 85;
      return 85 + ((FPS_LIMIT - fps) / FPS_LIMIT) * 15;
    }

    function sample(now: number) {
      const elapsed = now - windowStart;
      fpsNow = (frameCount * 1000) / elapsed;
      frameCount = 0;
      windowStart = now;
      if (fpsNow > maxFps) maxFps = fpsNow;
      // 주사율 추정 (60/90/120/144…)
      if (fish.length <= 20 && fpsNow > refFps * 1.15) refFps = Math.round(fpsNow / 10) * 10;
      history.push(fpsNow);
      if (history.length > 120) history.shift();

      setText('h-fps', fpsNow.toFixed(0));
      setText('m-fps', fpsNow.toFixed(0));
      $('h-ft').innerHTML = (1000 / Math.max(fpsNow, 0.1)).toFixed(1) + '<small>ms</small>';
      const pct = loadPct(fpsNow);
      $('load-fill').style.width = pct.toFixed(1) + '%';
      $('load-meter').setAttribute('aria-valuenow', String(Math.round(pct)));
      const st = $('load-state');
      if (fpsNow >= refFps * 0.8) {
        st.className = 'load-state ok';
        st.textContent = '여유';
      } else if (fpsNow >= FPS_LIMIT) {
        st.className = 'load-state warn';
        st.textContent = '버거움';
      } else {
        st.className = 'load-state err';
        st.textContent = '한계';
      }
      drawChart();

      if (started && fpsNow < FPS_LIMIT) {
        if (lowSince === null) lowSince = now;
      } else lowSince = null;
      updateCountdown(now);
    }

    function updateCountdown(now: number) {
      const cd = $('countdown');
      if (lowSince === null) {
        cd.hidden = true;
        return;
      }
      const left = HOLD_MS - (now - lowSince);
      if (left <= 0) {
        finish();
        return;
      }
      cd.hidden = false;
      cd.textContent = 'FPS 20 미만 · 종료까지 ' + (left / 1000).toFixed(1) + '초';
    }

    /* ---------- loop ---------- */
    function loop(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const rawDt = lastFrame ? now - lastFrame : 0;
      const dt = lastFrame ? Math.min(rawDt / 1000, 0.1) : 0.016;
      lastFrame = now;
      frameCount++;
      if (started) {
        // 실제 경과 시간 기준으로 0.1초당 1마리 — 프레임이 밀려도 증가 속도는 일정
        growMs += rawDt;
        const target = 1 + Math.floor(growMs / SPAWN_MS);
        if (fish.length < target) addFish(target - fish.length);
        $('h-time').innerHTML = (growMs / 1000).toFixed(1) + '<small>초</small>';
        setText('m-time', (growMs / 1000).toFixed(1));
      }
      step(dt);
      if (now - windowStart >= SAMPLE_MS) sample(now);
      else if (lowSince !== null) updateCountdown(now);
    }

    function grade(n: number) {
      if (n >= 3000) return '괴물 같은 성능입니다.';
      if (n >= 1500) return '아주 빠른 브라우저입니다.';
      if (n >= 600) return '꽤 잘 버텼습니다.';
      if (n >= 200) return '평범한 수준입니다.';
      return '어항이 금방 꽉 찼네요.';
    }

    function browserName() {
      const m = /(Edg|OPR|SamsungBrowser|Firefox|Chrome|Version)\/([\d.]+)/.exec(navigator.userAgent);
      if (!m) return 'Unknown';
      const name = ({ Edg: 'Edge', OPR: 'Opera', SamsungBrowser: 'Samsung Internet', Version: 'Safari' } as Record<string, string>)[m[1]] || m[1];
      return name + ' ' + m[2].split('.')[0];
    }

    function finish() {
      if (finished) return;
      finished = true;
      started = false;
      running = false;
      $('countdown').hidden = true;
      const score = fish.length;
      const isBest = score > best;
      if (isBest) {
        best = score;
        store.set('fishtank-best', best);
      }
      setText('h-best', best.toLocaleString());
      setText('r-score', score.toLocaleString());
      setText('r-desc', isBest ? '새 최고 기록입니다!' : grade(score));
      const tb = $('r-table');
      tb.innerHTML = '';
      [
        ['테스트 시간', (growMs / 1000).toFixed(1) + '초'],
        ['최고 FPS', maxFps.toFixed(0)],
        ['추정 주사율', refFps + 'Hz'],
        ['내 최고 기록', best.toLocaleString() + '마리'],
        ['브라우저', browserName()],
      ].forEach((r) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        const td = document.createElement('td');
        td.className = 'mono';
        th.textContent = r[0];
        td.textContent = r[1];
        tr.appendChild(th);
        tr.appendChild(td);
        tb.appendChild(tr);
      });
      $('result').hidden = false;
      setStartButton('done');
      $('btn-again').focus();
    }

    function setStartButton(state: 'idle' | 'running' | 'done') {
      const btn = $<HTMLButtonElement>('btn-start');
      btn.classList.toggle('is-running', state === 'running');
      btn.disabled = state !== 'idle';
      setText('btn-start-label', state === 'running' ? '측정 중…' : state === 'done' ? '종료됨' : '시작하기');
    }

    function start() {
      if (started || finished) return;
      started = true;
      growMs = 0;
      lowSince = null;
      setStartButton('running');
      scrollToBody();
    }

    /* 시작 시 부드럽게 이동
       - 데스크톱: 측정 영역(.page-body) 위쪽으로 (상단바 높이는 html 의 scroll-padding-top 이 보정)
       - 모바일: 어항이 화면에 온전히 들어오도록 상단바 아래 영역의 가운데로 */
    function scrollToBody() {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

      if (isMobile) {
        const bar = document.querySelector('.topbar');
        const barH = bar ? bar.getBoundingClientRect().height : 60;
        const viewH = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - barH;
        const r = tank.getBoundingClientRect();
        // 어항 + 아래 미니 상태줄까지 한 덩어리로 화면에 넣는다
        const mini = root.querySelector<HTMLElement>('.mini-hud');
        const bottom = mini && mini.offsetParent ? mini.getBoundingClientRect().bottom : r.bottom;
        const h = bottom - r.top;
        let top = window.pageYOffset + r.top - barH - 25;
        // 남은 화면보다 작으면 가운데 정렬, 크면 어항 윗변을 상단바 바로 아래에 맞춤
        top -= h < viewH ? (viewH - h) / 2 : 8;
        window.scrollTo({ top: Math.max(0, Math.round(top)), behavior });
        return;
      }

      const body = document.querySelector('.page-body');
      if (body) body.scrollIntoView({ behavior, block: 'start' });
    }

    function reset() {
      fish.forEach((f) => f.el.remove());
      fish = [];
      started = false;
      finished = false;
      growMs = 0;
      lowSince = null;
      maxFps = 0;
      history = [];
      windowStart = performance.now();
      frameCount = 0;
      lastFrame = 0;
      $('result').hidden = true;
      $('countdown').hidden = true;
      $('h-time').innerHTML = '0.0<small>초</small>';
      setText('m-time', '0.0');
      setStartButton('idle');
      addFish(1);
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    }

    /* 결과 팝업 닫기: 어항은 종료 상태 그대로 두고, '처음부터'로 다시 시작 */
    function closeResult() {
      if ($('result').hidden) return;
      $('result').hidden = true;
      $('btn-reset').focus();
    }

    /* ---------- events ---------- */
    on($('btn-start'), 'click', start);
    on($('btn-reset'), 'click', reset);
    on($('btn-again'), 'click', () => {
      reset();
      start();
    });
    on($('btn-close'), 'click', closeResult);
    on($('btn-close2'), 'click', closeResult);
    on(document, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') closeResult();
    });
    on($('btn-share'), 'click', () => {
      copyText('브라우저 성능 테스트 (어항) 점수: ' + fish.length + '마리 · ' + browserName() + ' · ' + location.origin + location.pathname);
    });
    on(document, 'visibilitychange', () => {
      // 숨겨진 탭은 rAF 가 멈추므로 측정을 초기화
      lowSince = null;
      windowStart = performance.now();
      frameCount = 0;
      lastFrame = 0;
      $('countdown').hidden = true;
    });
    const ro = new ResizeObserver(() => {
      W = tank.clientWidth;
      H = tank.clientHeight;
    });
    ro.observe(tank);
    on(window, 'resize', sizeChart);

    setText('h-best', best ? best.toLocaleString() : '-');
    sizeChart();
    addFish(1);
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ac.abort();
      ro.disconnect();
      fish.forEach((f) => f.el.remove());
      fish = [];
    };
  }, []);

  return (
    <section className="tool">
      <div className="wrap stack" style={{ gap: 16 }} ref={rootRef}>
        <div className="hud stat-row" aria-live="off">
          <div className="stat">
            <div className="stat-label">물고기</div>
            <div className="stat-value" data-id="h-fish">
              1
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">FPS</div>
            <div className="stat-value" data-id="h-fps">
              -
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">프레임 시간</div>
            <div className="stat-value" data-id="h-ft">
              -
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">경과 시간</div>
            <div className="stat-value" data-id="h-time">
              0.0<small>초</small>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">최고 기록</div>
            <div className="stat-value" data-id="h-best">
              -
            </div>
          </div>
        </div>

        <div className="load">
          <div className="load-head">
            <span className="label">브라우저 부하</span>
            <span className="load-state" data-id="load-state">
              대기
            </span>
          </div>
          <div className="load-bar" role="meter" aria-label="브라우저 부하" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} data-id="load-meter">
            <div className="load-fill" data-id="load-fill"></div>
            <div className="load-th" title="FPS 20 기준선"></div>
          </div>
          <canvas className="fps-chart" data-id="fps-chart" height={64} aria-label="최근 60초 FPS 그래프" role="img"></canvas>
        </div>

        {/* 물고기 SVG 는 이펙트에서 직접 추가 — React 가 자식을 다시 그리지 않도록 이 div 의 children 은 고정 */}
        <div className="tank" data-id="tank">
          <svg className="tank-deco" viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 90 Q120 70 240 92 T480 88 T800 86 V120 H0Z" fill="#e8d9b5" />
            <path d="M60 110 C50 80 75 60 62 30 M70 110 C80 85 60 70 78 45" stroke="#2f8f5b" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M690 112 C700 80 678 64 694 26 M702 112 C690 90 715 70 706 50" stroke="#3aa36a" strokeWidth="5" fill="none" strokeLinecap="round" />
            <ellipse cx="420" cy="104" rx="26" ry="10" fill="#b9a57f" />
            <ellipse cx="452" cy="108" rx="14" ry="6" fill="#a79470" />
          </svg>
          <div className="countdown" data-id="countdown" hidden aria-live="assertive"></div>
          <div className="result-layer" data-id="result" hidden>
            <div className="result-card" role="dialog" aria-modal="false" aria-labelledby="result-title">
              <button className="btn btn-ghost btn-sm result-close" type="button" data-id="btn-close" aria-label="결과 닫기">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              <p className="meta mono">FINAL SCORE</p>
              <h2 id="result-title" className="result-score">
                <span data-id="r-score">0</span>
                <small>마리</small>
              </h2>
              <p className="result-desc" data-id="r-desc"></p>
              <table className="kv" style={{ marginTop: 12 }}>
                <tbody data-id="r-table"></tbody>
              </table>
              <div className="btn-row" style={{ marginTop: 16, justifyContent: 'center' }}>
                <button className="btn" type="button" data-id="btn-again">
                  다시 하기
                </button>
                <button className="btn btn-outline" type="button" data-id="btn-share">
                  결과 복사
                </button>
                <button className="btn btn-ghost" type="button" data-id="btn-close2">
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 전용: 어항 아래 실시간 요약 (위쪽 HUD 가 화면 밖일 때) */}
        <p className="mini-hud mono" aria-hidden="true">
          물고기 <b data-id="m-fish">1</b>
          <span className="sep">·</span>FPS <b data-id="m-fps">-</b>
          <span className="sep">·</span>경과 <b data-id="m-time">0.0</b>초
        </p>

        <div className="controls">
          <button className="btn ctrl-start" type="button" data-id="btn-start">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span data-id="btn-start-label">시작하기</span>
          </button>
          <button className="btn btn-outline" type="button" data-id="btn-reset">
            처음부터
          </button>
          <span className="meta controls-help">
            시작하면 0.1초마다 물고기가 1마리씩 늘어납니다. FPS가 <b>20</b> 아래로 떨어진 채 <b>10초</b>가 지나면 테스트가 끝납니다.
          </span>
        </div>
      </div>
    </section>
  );
}
