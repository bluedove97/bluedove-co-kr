'use client';

/**
 * 브라우저 GPU 벤치마크 (WebGL Benchmark)
 * three · 엔진 · 실행 흐름은 이 페이지에서만 동적 import 한다 (다른 페이지 번들에 영향 없음).
 * 실시간 HUD 는 매 프레임 바뀌므로 React 상태 대신 data-hud 요소에 직접 쓴다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText, download, toast } from '@/utils/browser';
import { pad2 } from '@/utils/format';
import { detectEnv, type Env } from '../features/checks';
import {
  BENCH_VERSION,
  BenchError,
  ERROR_MESSAGES,
  MAX_SCORE,
  REF_FT,
  ROUNDS,
  TEST_H,
  TEST_ORDER,
  TEST_W,
  TESTS,
  fmtCount,
  fmtFps,
  fmtInt,
  fmtMs,
  type TestId,
} from './bench';
import type { Bench, Hud } from './engine';
import { probeGpu, type GpuInfo } from './gpuinfo';
import type { BenchResult, FullResult, Measure, Progress, QuickResult, SweepResult } from './runner';
import type { SceneOptions } from './scenes';

type Status = 'init' | 'ready' | 'running' | 'done' | 'aborted' | 'unsupported' | 'error';
type RunKind = { type: 'full' } | { type: 'quick' } | { type: 'sweep'; id: TestId };
type Runner = typeof import('./runner');
type Screen = { screen: string; viewport: string; dpr: number };

const STATUS_LABEL: Record<Status, string> = {
  init: 'Loading',
  ready: 'Ready',
  running: 'Running',
  done: 'Completed',
  aborted: 'Stopped',
  unsupported: 'Unsupported',
  error: 'Error',
};
/** Full Benchmark 진행 표시 (Progress.step 순서) */
const FULL_STEPS = ['Initialize', '3D', 'Particle', 'Shader', 'Geometry', 'Finalize'];
const RUN_NAME: Record<RunKind['type'], string> = { full: 'Full Benchmark', quick: 'Quick Test', sweep: '개별 테스트' };

const NA = 'N/A';
const r2 = (n: number | null | undefined) => (n == null || !isFinite(n) ? null : Math.round(n * 100) / 100);

function stamp(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}
function readScreen(): Screen {
  return {
    screen: `${screen.width}×${screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
  };
}
function workloadOf(id: TestId, m: Measure) {
  return TESTS[id].fmt(m.value);
}

export default function WebglTool() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Bench | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<Status>('init');
  const [env, setEnv] = useState<Env | null>(null);
  const [gpu, setGpu] = useState<GpuInfo | null>(null);
  const [scr, setScr] = useState<Screen | null>(null);
  const [threeRev, setThreeRev] = useState('');
  const [lost, setLost] = useState(false);
  const [running, setRunning] = useState<RunKind | null>(null);
  const [lastRun, setLastRun] = useState<RunKind | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<BenchResult | null>(null);
  const [message, setMessage] = useState('');
  const [opts, setOpts] = useState<Required<SceneOptions>>({ render3dMode: 'instanced', particleMethod: 'points', particleMax: 50000 });

  /* ---------- HUD: 직접 DOM 갱신 ---------- */
  const onHud = useCallback((h: Hud) => {
    const root = rootRef.current;
    if (!root) return;
    const set = (k: string, v: string) => root.querySelectorAll<HTMLElement>(`[data-hud="${k}"]`).forEach((el) => (el.textContent = v));
    set('fps', h.fps ? fmtFps(h.fps) : '—');
    set('ft', h.ft ? fmtMs(h.ft) : '—');
    set('objects', fmtInt(h.objects));
    set('particles', h.particles ? fmtCount(h.particles) : '0');
    set('tris', fmtCount(h.tris));
    set('calls', fmtInt(h.calls));
    set('res', `${h.width}×${h.height}`);
    set('passes', h.passes > 1 ? `×${h.passes} pass` : '');
    set('gpu', h.gpuMs == null ? NA : fmtMs(h.gpuMs));
  }, []);

  /* ---------- 초기화: 환경 조회 → three · 엔진 로드 ---------- */
  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;
    setScr(readScreen());
    const g = probeGpu();
    setGpu(g);
    detectEnv().then((e) => !disposed && setEnv(e));

    if (!g.webgl2) {
      setStatus('unsupported');
      setMessage(
        g.version === 'WebGL 1.0'
          ? '이 브라우저는 WebGL 1.0만 지원합니다. 이 벤치마크는 점수 기준을 하나로 유지하려고 WebGL 2.0에서만 실행합니다.'
          : (g.error ?? 'WebGL을 사용할 수 없습니다.') + ' 브라우저 설정에서 하드웨어 가속을 켜 보세요.',
      );
    } else {
      Promise.all([import('three'), import('./engine'), import('./runner')])
        .then(([THREE, eng, runner]) => {
          if (disposed || !canvasRef.current) return;
          runnerRef.current = runner;
          engineRef.current = eng.Bench.create(THREE, canvasRef.current, {
            onHud,
            onLost: () => {
              if (!mountedRef.current) return;
              setLost(true);
            },
            onRestored: () => {
              if (!mountedRef.current) return;
              setLost(false);
              toast('WebGL 컨텍스트를 복구했습니다');
            },
          });
          setThreeRev(THREE.REVISION);
          setStatus('ready');
        })
        .catch((e) => {
          if (disposed) return;
          console.error('[WebGL Benchmark]', e);
          setStatus('error');
          setMessage(e instanceof BenchError ? e.message : 'WebGL 렌더러를 초기화하지 못했습니다. 페이지를 새로고침해 보세요.');
        });
    }

    let rz: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => setScr(readScreen()), 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      mountedRef.current = false;
      clearTimeout(rz);
      window.removeEventListener('resize', onResize);
      abortRef.current?.abort();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [onHud]);

  /* ---------- 실행 ---------- */
  async function start(kind: RunKind) {
    const engine = engineRef.current;
    const runner = runnerRef.current;
    if (!engine || !runner || running || lost) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(kind);
    setLastRun(kind);
    setStatus('running');
    setResult(null);
    setMessage('');
    setProgress({ phase: kind.type === 'full' ? 'Initialize' : 'Measure', label: '준비 중', pct: 0 });
    try {
      let r: BenchResult;
      if (kind.type === 'full') r = await runner.runFull(engine, ac.signal, setProgress);
      else if (kind.type === 'quick') r = await runner.runQuick(engine, ac.signal, setProgress);
      else r = await runner.runSweep(engine, kind.id, sweepOpts(kind.id), ac.signal, setProgress);
      if (!mountedRef.current) return;
      setResult(r);
      setStatus('done');
      toast('측정을 마쳤습니다');
      requestAnimationFrame(() => document.getElementById('wg-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      if (!mountedRef.current) return;
      const code = e instanceof BenchError ? e.code : 'error';
      if (code === 'error') console.error('[WebGL Benchmark]', e);
      setStatus('aborted');
      setMessage(ERROR_MESSAGES[code]);
    } finally {
      abortRef.current = null;
      if (mountedRef.current) {
        setRunning(null);
        setProgress(null);
        if (engineRef.current && !lost) engineRef.current.showPreview();
      }
    }
  }

  function sweepOpts(id: TestId): SceneOptions {
    if (id === 'render3d') return { render3dMode: opts.render3dMode };
    if (id === 'particles') return { particleMethod: opts.particleMethod, particleMax: opts.particleMax };
    return {};
  }

  function stop() {
    abortRef.current?.abort();
  }

  /* ---------- 결과 내보내기 ---------- */
  function environmentJson(r: BenchResult) {
    return {
      browser: env?.browser ?? null,
      browserVersion: env?.browserVersion ?? null,
      os: env?.os ?? null,
      deviceType: env?.deviceType ?? null,
      webglVersion: gpu?.version ?? null,
      gpuRenderer: gpu?.renderer ?? null,
      gpuVendor: gpu?.vendor ?? null,
      maxTextureSize: gpu?.maxTextureSize ?? null,
      maxRenderbufferSize: gpu?.maxRenderbufferSize ?? null,
      maxVertexAttribs: gpu?.maxVertexAttribs ?? null,
      screenResolution: scr?.screen ?? null,
      viewportResolution: scr?.viewport ?? null,
      devicePixelRatio: scr?.dpr ?? null,
      renderingResolution: `${TEST_W}x${TEST_H}`,
      estimatedRefreshHz: r.refreshHz,
      gpuTimerQuery: r.gpuTimer,
      userAgent: env?.userAgent ?? null,
    };
  }

  function measureJson(id: TestId, m: Measure) {
    const s = m.stats;
    return {
      workload: workloadOf(id, m),
      value: m.value,
      frames: s?.frames ?? 0,
      averageFps: r2(s?.avgFps),
      low1PercentFps: r2(s?.low1Fps),
      averageFrameTimeMs: r2(s?.avgFt),
      medianFrameTimeMs: r2(s?.medFt),
      frameTimeStdDevMs: r2(s?.ftStd),
      frameTimeVariance: r2(s?.ftVar),
      triangles: m.tris,
      points: m.points,
      drawCalls: m.calls,
      objects: m.objects,
      particles: m.particles,
      gpuTimeMs: r2(m.gpuMs),
      excludedHiddenMs: r2(m.invalidMs),
    };
  }

  function resultJson(r: BenchResult) {
    const base = {
      tool: "Bluedove's Developer Playground — WebGL Benchmark (브라우저 GPU 벤치마크)",
      url: location.origin + location.pathname,
      benchmarkVersion: BENCH_VERSION,
      threeRevision: threeRev,
      mode: r.kind === 'sweep' ? `Single Test (${TESTS[r.test].name})` : RUN_NAME[r.kind],
      testedAt: r.startedAt.toISOString(),
      durationMs: Math.round(r.durationMs),
      note: '사이트 자체 테스트 기준의 상대적인 성능 지표입니다. GPU 등급이나 시장 순위가 아닙니다. Frame Time은 requestAnimationFrame 간격이며 GPU 처리 시간과 다릅니다.',
      environment: environmentJson(r),
      warnings: r.warnings,
    };
    if (r.kind === 'full')
      return {
        ...base,
        scoring: {
          maxScore: MAX_SCORE,
          referenceFrameTimeMs: r2(REF_FT),
          renderingResolution: `${TEST_W}x${TEST_H}`,
          formula:
            'weight × 10000 × min(1, (workload × passes / averageFrameTime) / (scoringWorkload × referencePasses / referenceFrameTime))',
        },
        summary: {
          totalScore: r.total,
          averageFps: r2(r.overall?.avgFps),
          low1PercentFps: r2(r.overall?.low1Fps),
          averageFrameTimeMs: r2(r.overall?.avgFt),
          frameTimeStdDevMs: r2(r.overall?.ftStd),
          maxTriangles: r.maxTris,
        },
        tests: r.tests.map((t) => ({
          id: t.id,
          name: TESTS[t.id].name,
          weight: TESTS[t.id].weight,
          score: t.score,
          maxScore: t.maxScore,
          scoringWorkload: TESTS[t.id].fmt(TESTS[t.id].scoreLevel),
          passesPerFrame: t.passes,
          referencePasses: TESTS[t.id].refPasses,
          reducedWorkload: t.reduced,
          refreshRateCapped: t.vsyncCapped,
          ...measureJson(t.id, t),
          scoringRounds: t.rounds.map((m) => measureJson(t.id, m)),
          loadSteps: t.ladder.map((m) => measureJson(t.id, m)),
        })),
      };
    if (r.kind === 'quick') return { ...base, test: TESTS.render3d.name, reducedWorkload: r.reduced, refreshRateCapped: r.vsyncCapped, result: measureJson('render3d', r.run) };
    return { ...base, test: TESTS[r.test].name, options: r.options, stoppedAt: r.stoppedAt, levels: r.rows.map((m) => measureJson(r.test, m)) };
  }

  function resultText(r: BenchResult) {
    const lines: string[] = [`WebGL Benchmark — ${r.kind === 'sweep' ? `${TESTS[r.test].name} 단계별 측정` : RUN_NAME[r.kind]}`];
    if (r.kind === 'full') {
      lines.push(`Total Score: ${fmtInt(r.total)} / ${fmtInt(MAX_SCORE)} (사이트 자체 기준 상대 점수)`);
      if (r.overall) lines.push(`Average FPS ${fmtFps(r.overall.avgFps)} · 1% Low ${fmtFps(r.overall.low1Fps)} · Frame Time ${fmtMs(r.overall.avgFt)} ms`);
      for (const t of r.tests)
        lines.push(
          `- ${TESTS[t.id].name}: ${fmtInt(t.score)} / ${fmtInt(t.maxScore)} (×${t.passes} pass · 3회 ${t.rounds.map((m) => fpsOr(m.stats?.avgFps)).join(' / ')} fps, 중앙값 사용)`,
        );
    } else if (r.kind === 'quick') {
      const s = r.run.stats;
      lines.push(`${workloadOf('render3d', r.run)} · ${s ? `Average FPS ${fmtFps(s.avgFps)} · 1% Low ${fmtFps(s.low1Fps)} · Frame Time ${fmtMs(s.avgFt)} ms` : '측정 실패'}`);
    } else {
      for (const m of r.rows) lines.push(`- ${workloadOf(r.test, m)}: ${m.stats ? `${fmtFps(m.stats.avgFps)} fps · 1% Low ${fmtFps(m.stats.low1Fps)}` : '측정 실패'}`);
    }
    lines.push(`GPU: ${gpu?.renderer ?? NA} · ${gpu?.version ?? NA} · ${env ? `${env.browser} ${env.browserVersion.split('.')[0]} · ${env.os}` : ''}`);
    lines.push(`${TEST_W}×${TEST_H} · Three.js r${threeRev} · Benchmark v${BENCH_VERSION}`);
    return lines.join('\n');
  }

  async function copyResult() {
    if (result && (await copyText(resultText(result)))) toast('결과를 복사했습니다');
  }
  function downloadJson() {
    if (!result) return;
    download(JSON.stringify(resultJson(result), null, 2), `webgl-benchmark-${stamp(result.startedAt)}.json`, 'application/json;charset=utf-8');
  }

  const canRun = (status === 'ready' || status === 'done' || status === 'aborted') && !running && !lost;
  const webglLabel = gpu ? (gpu.version ?? 'WebGL 미지원') : '확인 중';

  return (
    <section className="tool">
      <div className="wrap wg" ref={rootRef}>
        {/* ---------- A. Header + B. GPU / Browser Information ---------- */}
        <div className="wg-head surface-white">
          <div className="wg-head-top">
            <div>
              <h2 className="wg-title">WebGL Benchmark</h2>
              <p className="meta">GPU &amp; 3D Graphics Performance Test</p>
            </div>
            <div className="wg-pills">
              <span className={'fc-pill ' + (gpu?.webgl2 ? 'ok' : gpu ? 'warn' : '')}>{webglLabel}</span>
              <span className={'fc-pill ' + (status === 'running' ? 'run' : status === 'done' || status === 'ready' ? 'ok' : status === 'init' ? '' : 'warn')}>
                {lost ? 'Context Lost' : STATUS_LABEL[status]}
              </span>
            </div>
          </div>
          <dl className="wg-info">
            <Info k="Browser" v={env ? `${env.browser}${env.browserVersion ? ' ' + env.browserVersion : ''}` : null} />
            <Info k="Operating System" v={env?.os ?? null} />
            <Info k="WebGL Version" v={gpu ? (gpu.version ?? '미지원') : null} />
            <Info k="GPU Renderer" v={gpu ? (gpu.renderer ?? NA) : null} wide />
            <Info k="GPU Vendor" v={gpu ? (gpu.vendor ?? NA) : null} />
            <Info k="MAX_TEXTURE_SIZE" v={gpu ? (gpu.maxTextureSize != null ? fmtInt(gpu.maxTextureSize) : NA) : null} mono />
            <Info k="MAX_RENDERBUFFER_SIZE" v={gpu ? (gpu.maxRenderbufferSize != null ? fmtInt(gpu.maxRenderbufferSize) : NA) : null} mono />
            <Info k="MAX_VERTEX_ATTRIBS" v={gpu ? (gpu.maxVertexAttribs != null ? String(gpu.maxVertexAttribs) : NA) : null} mono />
            <Info k="Screen Resolution" v={scr?.screen ?? null} mono />
            <Info k="Viewport Resolution" v={scr?.viewport ?? null} mono />
            <Info k="Device Pixel Ratio" v={scr ? String(scr.dpr) : null} mono />
          </dl>
          {gpu && !gpu.renderer && (
            <p className="meta">GPU Renderer · Vendor는 브라우저가 WEBGL_debug_renderer_info 확장을 제공하지 않거나 개인정보 보호 정책으로 막아 확인할 수 없습니다(N/A).</p>
          )}
        </div>

        {/* ---------- C. Live Rendering Preview ---------- */}
        <div className="wg-stage">
          <canvas ref={canvasRef} aria-label="WebGL 실시간 렌더링 화면" role="img" />
          <dl className="wg-hud" aria-hidden="true">
            <div>
              <dt>FPS</dt>
              <dd data-hud="fps">—</dd>
            </div>
            <div>
              <dt>Frame</dt>
              <dd>
                <span data-hud="ft">—</span> ms
              </dd>
            </div>
            <div>
              <dt>Objects</dt>
              <dd data-hud="objects">—</dd>
            </div>
            <div>
              <dt>Triangles</dt>
              <dd data-hud="tris">—</dd>
            </div>
            <div>
              <dt>Res</dt>
              <dd>
                <span data-hud="res">—</span> <span data-hud="passes" />
              </dd>
            </div>
          </dl>
          {running && progress && <p className="wg-stage-label mono">{progress.label}</p>}
          {(status === 'init' || status === 'unsupported' || status === 'error' || lost) && (
            <div className="wg-stage-msg" role="status">
              {lost ? (
                <p>WebGL 컨텍스트를 잃었습니다. 브라우저가 복구하면 자동으로 다시 그립니다…</p>
              ) : status === 'init' ? (
                <p className="mono">Loading WebGL…</p>
              ) : (
                <p>{message}</p>
              )}
            </div>
          )}
        </div>

        {/* 실시간 성능 지표 */}
        <div className="stat-row wg-live" aria-label="실시간 성능 지표">
          <Live k="FPS" hud="fps" />
          <Live k="Frame Time" hud="ft" unit="ms" />
          <Live k="Draw Calls" hud="calls" />
          <Live k="Triangles" hud="tris" />
          <Live k="Objects" hud="objects" />
          <Live k="Particles" hud="particles" />
          <Live k="Rendering" hud="res" subHud="passes" />
          <Live k="GPU Time" hud="gpu" unit={gpu?.timerQuery ? 'ms' : undefined} />
        </div>
        <p className="meta wg-live-note">
          Frame Time은 requestAnimationFrame 간격입니다. GPU Time은 EXT_disjoint_timer_query_webgl2 확장을 지원하는 브라우저에서만 따로 측정하며, 지원하지 않으면 N/A로 둡니다.
        </p>

        {/* ---------- 실행 ---------- */}
        <div className="wg-run surface-white">
          <div className="wg-run-btns">
            <button className="btn wg-btn-main" type="button" onClick={() => start({ type: 'full' })} disabled={!canRun}>
              {running?.type === 'full' ? '측정 중…' : 'Full Benchmark'}
              <small>약 1분 30초</small>
            </button>
            <button className="btn btn-outline wg-btn-main" type="button" onClick={() => start({ type: 'quick' })} disabled={!canRun}>
              {running?.type === 'quick' ? '측정 중…' : 'Quick Test'}
              <small>약 10초</small>
            </button>
            <button className="btn btn-ghost" type="button" onClick={stop} disabled={!running}>
              중단
            </button>
          </div>

          {running?.type === 'full' && progress && (
            <ol className="wg-phases" aria-label="진행 단계">
              {FULL_STEPS.map((p, i) => {
                const cur = progress.step ?? 0;
                return (
                  <li key={p} className={i < cur ? 'done' : i === cur ? 'on' : ''}>
                    {p}
                  </li>
                );
              })}
            </ol>
          )}
          {running && progress && (
            <div className="wg-progress-wrap">
              <div className="wg-progress-text">
                <span>{progress.label}</span>
                <span className="mono">{Math.round(progress.pct * 100)}%</span>
              </div>
              <div className="fc-progress" role="progressbar" aria-label="테스트 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.pct * 100)}>
                <span style={{ width: `${progress.pct * 100}%` }} />
              </div>
            </div>
          )}
          {!running && message && status !== 'unsupported' && status !== 'error' && <p className="wg-msg">{message}</p>}
          {status === 'unsupported' && <p className="wg-msg">{message}</p>}
          <p className="meta">
            측정 중에는 렌더링 해상도를 {TEST_W}×{TEST_H}로 고정합니다. 다른 탭으로 가면 그 구간은 측정에서 빠지고 결과에 경고가 남습니다. 노트북은 전원을 연결하고 다른 무거운 작업을 닫은 뒤 측정하세요.
          </p>
        </div>

        {/* ---------- D. Benchmark Modes ---------- */}
        <h2 className="wg-h2">Benchmark Modes</h2>
        <p className="meta wg-modes-lead">테스트 하나만 골라 낮은 부하부터 단계별로 올리며 FPS 변화를 기록합니다. 5fps 아래로 떨어지면 다음 단계는 실행하지 않습니다.</p>
        <div className="wg-modes">
          {TEST_ORDER.map((id, i) => {
            const def = TESTS[id];
            return (
              <div className="wg-mode" key={id}>
                <p className="wg-mode-head">
                  <span className="mono">{pad2(i + 1)}</span>
                  <b>{def.name}</b>
                </p>
                <p className="wg-mode-ko">{def.ko}</p>
                <p className="wg-mode-desc">{def.desc}</p>
                {id === 'render3d' && (
                  <label className="wg-opt">
                    <span>렌더링 방식</span>
                    <select
                      className="select select-sm"
                      value={opts.render3dMode}
                      disabled={!!running}
                      onChange={(e) => setOpts((o) => ({ ...o, render3dMode: e.target.value as 'instanced' | 'mesh' }))}
                    >
                      <option value="instanced">Instanced</option>
                      <option value="mesh">개별 Mesh</option>
                    </select>
                  </label>
                )}
                {id === 'particles' && (
                  <>
                    <label className="wg-opt">
                      <span>렌더링 방식</span>
                      <select
                        className="select select-sm"
                        value={opts.particleMethod}
                        disabled={!!running}
                        onChange={(e) => setOpts((o) => ({ ...o, particleMethod: e.target.value as 'points' | 'quads' }))}
                      >
                        <option value="points">Points</option>
                        <option value="quads">Instanced Quad</option>
                      </select>
                    </label>
                    <label className="wg-opt">
                      <span>최대 개수</span>
                      <select
                        className="select select-sm"
                        value={opts.particleMax}
                        disabled={!!running}
                        onChange={(e) => setOpts((o) => ({ ...o, particleMax: Number(e.target.value) }))}
                      >
                        <option value={50000}>50,000</option>
                        <option value={100000}>100,000</option>
                        <option value={200000}>200,000</option>
                        <option value={500000}>500,000</option>
                      </select>
                    </label>
                  </>
                )}
                <p className="wg-mode-meta mono">가중치 {Math.round(def.weight * 100)}%</p>
                <button className="btn btn-outline btn-sm wg-mode-btn" type="button" onClick={() => start({ type: 'sweep', id })} disabled={!canRun}>
                  {running?.type === 'sweep' && running.id === id ? '측정 중…' : '단계별 측정'}
                </button>
              </div>
            );
          })}
        </div>

        {/* ---------- 결과 ---------- */}
        {result && (
          <div id="wg-result" className="wg-result surface-white">
            <div className="wg-result-head">
              <h2 className="wg-h2">Benchmark Results</h2>
              <span className="fc-pill ok">{result.kind === 'sweep' ? `${TESTS[result.test].name} 단계별` : RUN_NAME[result.kind]}</span>
            </div>

            {result.kind === 'full' && <FullView r={result} />}
            {result.kind === 'quick' && <QuickView r={result} />}
            {result.kind === 'sweep' && <SweepView r={result} />}

            {result.warnings.length > 0 && (
              <ul className="wg-warn">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}

            <h3 className="wg-h3">Environment Information</h3>
            <table className="kv">
              <tbody>
                <Row k="Browser" v={env ? `${env.browser} ${env.browserVersion}` : NA} />
                <Row k="OS" v={env?.os ?? NA} />
                <Row k="GPU Renderer" v={gpu?.renderer ?? `${NA} (브라우저가 제공하지 않음)`} />
                <Row k="WebGL Version" v={gpu?.version ?? NA} />
                <Row k="Screen Resolution" v={scr?.screen ?? NA} mono />
                <Row k="Rendering Resolution" v={`${TEST_W}×${TEST_H} (고정)`} mono />
                <Row k="Device Pixel Ratio" v={scr ? String(scr.dpr) : NA} mono />
                <Row k="추정 주사율" v={result.refreshHz ? `${result.refreshHz} Hz` : NA} mono />
                <Row k="GPU Timer Query" v={result.gpuTimer ? '지원 (GPU Time 측정)' : '미지원 (GPU Time 미측정)'} />
                <Row k="Test Duration" v={`${(result.durationMs / 1000).toFixed(1)}초`} mono />
                <Row k="Version" v={`Three.js r${threeRev} · Benchmark v${BENCH_VERSION}`} mono />
              </tbody>
            </table>

            <div className="wg-actions">
              <button className="btn btn-outline" type="button" onClick={copyResult}>
                Copy Result
              </button>
              <button className="btn btn-outline" type="button" onClick={downloadJson}>
                Download JSON
              </button>
              <button className="btn" type="button" onClick={() => lastRun && start(lastRun)} disabled={!canRun || !lastRun}>
                Run Again
              </button>
            </div>
          </div>
        )}

        <p className="meta wg-foot">
          모든 렌더링 · 측정 · 점수 계산은 이 브라우저 안에서만 실행되며 결과는 서버로 전송되지 않습니다. 점수는 이 사이트의 고정 테스트 조건에서 계산한 상대적인 성능 지표이며 GPU 등급이나 시장 순위가 아닙니다.
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   작은 표시 컴포넌트
   ========================================================= */

function Info({ k, v, mono, wide }: { k: string; v: string | null; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'wide' : undefined}>
      <dt>{k}</dt>
      <dd className={mono ? 'mono' : undefined}>{v ?? '—'}</dd>
    </div>
  );
}

function Live({ k, hud, unit, subHud }: { k: string; hud: string; unit?: string; subHud?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{k}</div>
      <div className="stat-value">
        <span data-hud={hud}>—</span>
        {unit && <small>{unit}</small>}
        {subHud && <small data-hud={subHud} />}
      </div>
    </div>
  );
}

function Stat({ k, v, unit, strong }: { k: string; v: string; unit?: string; strong?: boolean }) {
  return (
    <div className={'stat' + (strong ? ' wg-total' : '')}>
      <div className="stat-label">{k}</div>
      <div className="stat-value">
        {v}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <tr>
      <th scope="row">{k}</th>
      <td className={mono ? 'mono' : undefined}>{v}</td>
    </tr>
  );
}

const fpsOr = (n: number | undefined) => (n == null ? '—' : fmtFps(n));
const msOr = (n: number | undefined) => (n == null ? '—' : fmtMs(n));

function FullView({ r }: { r: FullResult }) {
  const o = r.overall;
  return (
    <>
      <h3 className="wg-h3">Summary</h3>
      <div className="stat-row wg-summary">
        <Stat k="Total Score" v={fmtInt(r.total)} unit={`/ ${fmtInt(MAX_SCORE)}`} strong />
        <Stat k="Average FPS" v={fpsOr(o?.avgFps)} />
        <Stat k="1% Low FPS" v={fpsOr(o?.low1Fps)} />
        <Stat k="Avg Frame Time" v={msOr(o?.avgFt)} unit="ms" />
        <Stat k="Max Triangles" v={fmtCount(r.maxTris)} />
      </div>
      <p className="meta wg-score-note">
        사이트 자체 테스트 기준({TEST_W}×{TEST_H} 고정 · 기준 단계 {ROUNDS}회 측정 중앙값)의 상대 점수입니다. 주사율 상한을 피하려고 한 프레임에 같은 장면을 여러 번(pass) 그려 처리량을 재고, 테스트별로 정한 횟수만큼 채점 부하를 반복해 60fps({fmtMs(REF_FT)}ms)로 그리는 처리량을 만점으로 봅니다(임시 기준). GPU 등급이나 시장 순위를 뜻하지 않습니다.
      </p>

      <h3 className="wg-h3">Test Breakdown</h3>
      <ul className="wg-break">
        {r.tests.map((t) => {
          const def = TESTS[t.id];
          const s = t.stats;
          return (
            <li key={t.id}>
              <div className="wg-break-top">
                <b>{def.name}</b>
                <span className="mono">
                  {fmtInt(t.score)} <small>/ {fmtInt(t.maxScore)}</small>
                </span>
              </div>
              <div className="wg-bar" aria-hidden="true">
                <span style={{ width: `${(t.score / t.maxScore) * 100}%` }} />
              </div>
              <p className="wg-break-meta mono">
                {def.fmt(t.value)}
                {t.passes > 1 ? ` ×${t.passes} pass` : ''} · {s ? `${fmtFps(s.avgFps)} fps · 1% Low ${fmtFps(s.low1Fps)} · ${fmtMs(s.avgFt)} ± ${fmtMs(s.ftStd)} ms` : '측정 실패'} ·{' '}
                {t.points && !t.tris ? `${fmtCount(t.points)} points` : `${fmtCount(t.tris)} tris`} · {fmtInt(t.calls)} calls{t.gpuMs != null ? ` · GPU ${fmtMs(t.gpuMs)} ms` : ''}
              </p>
              {(t.score >= t.maxScore || t.vsyncCapped || t.reduced) && (
                <p className="wg-flags">
                  {t.score >= t.maxScore && <span className="fc-pill ok">기준 충족(만점)</span>}
                  {t.vsyncCapped && <span className="fc-pill warn">주사율 상한 도달</span>}
                  {t.reduced && <span className="fc-pill warn">부하 축소</span>}
                </p>
              )}
              <p className="wg-break-meta mono">
                기준 측정 {t.rounds.length}회: {t.rounds.map((m) => fpsOr(m.stats?.avgFps)).join(' / ')} fps (중앙값으로 채점)
              </p>
              {t.ladder.length > 0 && (
                <details className="wg-ladder">
                  <summary>부하 단계별 FPS ({t.ladder.length}단계 · 반복 렌더링 없음)</summary>
                  <LevelTable id={t.id} rows={t.ladder} gpuTimer={r.gpuTimer} />
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function QuickView({ r }: { r: QuickResult }) {
  const s = r.run.stats;
  return (
    <>
      <h3 className="wg-h3">Summary</h3>
      <div className="stat-row wg-summary">
        <Stat k="Average FPS" v={fpsOr(s?.avgFps)} strong />
        <Stat k="1% Low FPS" v={fpsOr(s?.low1Fps)} />
        <Stat k="Avg Frame Time" v={msOr(s?.avgFt)} unit="ms" />
        <Stat k="Frame Time σ" v={msOr(s?.ftStd)} unit="ms" />
        <Stat k="Triangles" v={fmtCount(r.run.tris)} />
        <Stat k="Draw Calls" v={fmtInt(r.run.calls)} />
        {r.run.gpuMs != null && <Stat k="GPU Time" v={fmtMs(r.run.gpuMs)} unit="ms" />}
      </div>
      <p className="meta wg-score-note">
        3D Rendering(Instanced) {TESTS.render3d.fmt(r.run.value)} · {TEST_W}×{TEST_H} · 8초 측정. Quick Test는 종합 점수를 내지 않습니다. 점수는 Full Benchmark로 확인하세요.
      </p>
    </>
  );
}

/** 부하 단계별 측정 표 (개별 테스트 결과 · Full Benchmark 의 부하 단계) */
function LevelTable({ id, rows, gpuTimer }: { id: TestId; rows: Measure[]; gpuTimer: boolean }) {
  const def = TESTS[id];
  const maxFps = Math.max(1, ...rows.map((m) => m.stats?.avgFps ?? 0));
  return (
    <div className="wg-table-wrap">
      <table className="wg-table">
        <thead>
          <tr>
            <th scope="col">부하</th>
            <th scope="col">Avg FPS</th>
            <th scope="col">1% Low</th>
            <th scope="col">Frame Time</th>
            <th scope="col">σ</th>
            <th scope="col">Triangles</th>
            <th scope="col">Draw Calls</th>
            {gpuTimer && <th scope="col">GPU</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.value}>
              <th scope="row">{def.fmt(m.value)}</th>
              <td>
                <span className="mono">{fpsOr(m.stats?.avgFps)}</span>
                <span className="wg-fpsbar" aria-hidden="true">
                  <span style={{ width: `${((m.stats?.avgFps ?? 0) / maxFps) * 100}%` }} />
                </span>
              </td>
              <td className="mono">{fpsOr(m.stats?.low1Fps)}</td>
              <td className="mono">{msOr(m.stats?.avgFt)} ms</td>
              <td className="mono">{msOr(m.stats?.ftStd)}</td>
              <td className="mono">{m.particles && !m.tris ? `${fmtCount(m.points)} pts` : fmtCount(m.tris)}</td>
              <td className="mono">{fmtInt(m.calls)}</td>
              {gpuTimer && <td className="mono">{m.gpuMs != null ? `${fmtMs(m.gpuMs)} ms` : NA}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SweepView({ r }: { r: SweepResult }) {
  const def = TESTS[r.test];
  const opt =
    r.test === 'render3d'
      ? r.options.render3dMode === 'mesh'
        ? '개별 Mesh'
        : 'Instanced'
      : r.test === 'particles'
        ? `${r.options.particleMethod === 'quads' ? 'Instanced Quad' : 'Points'} · 최대 ${fmtInt(r.options.particleMax ?? 50000)}`
        : '';
  return (
    <>
      <p className="meta wg-score-note">
        {def.name}
        {opt && ` (${opt})`} · {TEST_W}×{TEST_H} · 단계당 1.6초 측정. 단계별 측정은 점수를 내지 않습니다.
      </p>
      <LevelTable id={r.test} rows={r.rows} gpuTimer={r.gpuTimer} />
    </>
  );
}
