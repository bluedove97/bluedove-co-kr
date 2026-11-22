/**
 * WebGL Benchmark 실행 흐름 — Quick Test / Full Benchmark / 개별 테스트(단계별 측정)
 * 모든 함수는 AbortSignal 로 언제든 중단되며 BenchError 를 던진다. 끝나면 호출한 쪽이 engine.showPreview() 로 되돌린다.
 */

import {
  CAL_EST_MS,
  FINAL_MS,
  FULL_WARM_MS,
  INIT_MIN_MS,
  MAX_PASSES,
  MAX_SCORE,
  OVERLOAD_FT,
  PASS_TARGET,
  QUICK_LEVEL,
  QUICK_MEASURE_MS,
  QUICK_RAMP_MS,
  ROUND_MEASURE_MS,
  ROUND_SETTLE_MS,
  ROUNDS,
  STEP_MEASURE_MS,
  STEP_SETTLE_MS,
  TEST_ORDER,
  TESTS,
  BenchError,
  frameStats,
  mean,
  scoreFraction,
  type FrameStats,
  type TestId,
} from './bench';
import type { Bench, Recording } from './engine';
import { makeScene, type SceneOptions } from './scenes';

export type Phase = 'Initialize' | 'Warm-up' | 'Benchmark' | 'Finalize' | 'Measure';
/** step: Full Benchmark 진행 표시 위치 (0 Initialize · 1~4 테스트 · 5 Finalize) */
export type Progress = { phase: Phase; label: string; pct: number; step?: number };
type OnProgress = (p: Progress) => void;

/** 한 측정 구간의 결과 */
export type Measure = {
  value: number;
  stats: FrameStats | null;
  tris: number;
  points: number;
  calls: number;
  objects: number;
  particles: number;
  /** GPU 처리 시간 평균(ms) — 타이머 쿼리 미지원이면 null */
  gpuMs: number | null;
  /** 탭이 숨겨져 측정에서 뺀 시간(ms) */
  invalidMs: number;
};

export type TestRun = Measure & {
  id: TestId;
  /** 프레임당 반복 렌더링 횟수 */
  passes: number;
  /** 과부하로 채점 부하보다 낮춰 측정했는지 */
  reduced: boolean;
  fraction: number;
  /** 테스트 점수 (Measure.points 는 그린 GL 포인트 수라 이름을 구분) */
  score: number;
  maxScore: number;
  /** 평균 FPS 가 추정 주사율에 닿음 (vsync 상한) */
  vsyncCapped: boolean;
  /** 기준 단계 반복 측정 (점수와 위 측정값은 평균 Frame Time 중앙값 회차) */
  rounds: Measure[];
  /** 부하 단계 측정 (반복 렌더링 없이, 단계별 FPS 변화) */
  ladder: Measure[];
};

export type RunMeta = { startedAt: Date; durationMs: number; refreshHz: number | null; gpuTimer: boolean };

export type FullResult = RunMeta & {
  kind: 'full';
  tests: TestRun[];
  total: number;
  overall: FrameStats | null;
  maxTris: number;
  warnings: string[];
};

export type QuickResult = RunMeta & {
  kind: 'quick';
  run: Measure;
  reduced: boolean;
  vsyncCapped: boolean;
  warnings: string[];
};

export type SweepResult = RunMeta & {
  kind: 'sweep';
  test: TestId;
  options: SceneOptions;
  rows: Measure[];
  /** 과부하로 멈춘 경우 그 단계 값 */
  stoppedAt: number | null;
  warnings: string[];
};

export type BenchResult = FullResult | QuickResult | SweepResult;

/* ---------------- 공통 ---------------- */

function toMeasure(value: number, r: Recording): Measure {
  return {
    value,
    stats: frameStats(r.intervals),
    tris: r.tris,
    points: r.points,
    calls: r.calls,
    objects: r.objects,
    particles: r.particles,
    gpuMs: mean(r.gpuMs),
    invalidMs: r.invalidMs,
  };
}

const isCapped = (fps: number | undefined, hz: number | null) => !!fps && !!hz && fps >= hz * 0.93;

/** 진행률 보고를 10Hz 정도로 줄인다 */
function throttle(on: OnProgress): OnProgress {
  let last = 0;
  let lastLabel = '';
  return (p) => {
    const now = performance.now();
    if (p.label !== lastLabel || now - last > 100 || p.pct >= 1) {
      last = now;
      lastLabel = p.label;
      on(p);
    }
  };
}

/** 낮은 부하부터 target 까지 단계적으로 올린다. 과부하(5fps 미만)면 직전 단계에서 멈추고 그 값을 돌려준다 */
async function ramp(engine: Bench, ladder: number[], target: number, totalMs: number, signal: AbortSignal, tick: (d: number) => void) {
  const steps = ladder.filter((v) => v <= target);
  if (!steps.includes(target)) steps.push(target);
  const per = totalMs / steps.length;
  let safe = steps[0];
  for (let i = 0; i < steps.length; i++) {
    engine.current!.setLevel(steps[i]);
    const rec = await engine.run(per, true, signal, (d) => tick((i + d) / steps.length));
    engine.checkMemory();
    const st = frameStats(rec.intervals);
    if (st && st.avgFt > OVERLOAD_FT) {
      safe = i === 0 ? steps[0] : steps[i - 1];
      return { safe, overloaded: true };
    }
    safe = steps[i];
  }
  return { safe, overloaded: false };
}

/**
 * 반복 렌더링 횟수 보정: Frame Time 이 targetFt(주사율 간격 × PASS_TARGET) 이상이 되는 k 를 찾는다.
 * 이 영역에서는 vsync 상한에 걸리지 않으므로 처리량을 비교할 수 있다.
 * - k 를 바꾼 직후에는 GPU 큐에 앞 프레임이 남아 있어(2~3프레임) 바로 재면 과소평가 → 3프레임 버리고 4프레임의 중앙값으로 판단
 * - GPU 타이머가 있으면 패스당 GPU 시간으로 필요한 k 를 예측해 건너뛴다(한 번에 최대 8배). 없으면 2배씩.
 *   가벼운 부하에서는 GPU 클럭이 낮아 패스당 시간이 크게 잡히므로 예측은 보통 모자라는 쪽으로 틀린다(과부하 방향 아님).
 */
async function calibratePasses(engine: Bench, targetFt: number, signal: AbortSignal, tick: (d: number) => void) {
  const MAX_STEPS = 14;
  // 타이머가 없으면 rAF 간격만 보고 판단해야 하므로 GPU 큐가 찰 때까지 더 많이 버린다
  const skip = engine.hasGpuTimer ? 4 : 6;
  let k = 1;
  engine.setPasses(k);
  for (let i = 0; i < MAX_STEPS; i++) {
    tick(i / MAX_STEPS);
    const rec = await engine.sample(skip, 4, signal);
    const ft = median(rec.intervals);
    const perPass = median(rec.gpuPerPass);
    // GPU 가 미리 쌓아 둔 프레임 때문에 rAF 간격은 늦게 반응한다 → 지금 k 로 실제 잰 GPU 시간으로도 도달 여부를 본다
    // (예측값으로 멈추지 않는다: 클럭이 낮은 상태의 예측은 과대평가라 너무 일찍 멈춘다)
    const gpuFrame = median(rec.gpu.filter((g) => g.passes === k).map((g) => g.ms));
    if (ft == null || ft >= targetFt || (gpuFrame != null && gpuFrame >= targetFt) || k >= MAX_PASSES) break;
    if (ft > OVERLOAD_FT / 2) break; // 안전장치: 이미 충분히 무거움
    let next = k * 2;
    if (perPass && perPass > 0) {
      const need = Math.ceil((targetFt * 1.1) / perPass);
      next = Math.max(Math.ceil(k * 1.25), Math.min(k * 8, need));
    }
    k = Math.min(MAX_PASSES, next);
    engine.setPasses(k);
  }
  tick(1);
  return k;
}

function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
}

function invalidWarning(name: string, ms: number) {
  return `${name}: 탭이 숨겨진 ${(ms / 1000).toFixed(1)}초 구간은 측정에서 제외했습니다.`;
}

/* =========================================================
   Full Benchmark (약 1분 30초)
   Initialize → [테스트마다] ① 워밍업 약 1.5초 ② 부하 단계 측정(단계당 2초, 반복 렌더링 없음)
              ③ 반복 횟수 보정 ④ 기준 단계 3회(회당 2초) → 평균 Frame Time 중앙값으로 채점 → Finalize
   ========================================================= */

/** 테스트별 부하 단계: 채점 부하 이하의 단계 */
const fullLadder = (id: TestId) => TESTS[id].levels.filter((v) => v <= TESTS[id].scoreLevel);
const STEP_MS = STEP_SETTLE_MS + STEP_MEASURE_MS;
const ROUND_MS = ROUND_SETTLE_MS + ROUND_MEASURE_MS;
const testPlanMs = (id: TestId) => FULL_WARM_MS + fullLadder(id).length * STEP_MS + CAL_EST_MS + ROUNDS * ROUND_MS;

/** Full Benchmark 예상 소요 시간(ms) */
export const FULL_PLAN_MS = INIT_MIN_MS + TEST_ORDER.reduce((s, id) => s + testPlanMs(id), 0) + FINAL_MS;

export async function runFull(engine: Bench, signal: AbortSignal, onProgress: OnProgress): Promise<FullResult> {
  const report = throttle(onProgress);
  const t0 = performance.now();
  const startedAt = new Date();
  const refreshHz = engine.estimateRefreshHz();
  const THREE = engine.THREE;
  const warnings: string[] = [];
  /** 계획상 지나간 시간 — 진행률은 실제 경과가 아니라 계획 기준으로 매끄럽게 올린다 */
  let done = 0;
  const pct = (extra: number) => Math.min(0.999, (done + extra) / FULL_PLAN_MS);

  /* Initialize: 고정 해상도 + 4개 장면 셰이더 미리 컴파일 */
  report({ phase: 'Initialize', step: 0, label: 'WebGL 초기화 · 셰이더 컴파일', pct: 0 });
  engine.setFixedResolution(true);
  for (const id of TEST_ORDER) {
    const s = makeScene(THREE, id);
    s.setLevel(TESTS[id].levels[0]);
    engine.setView(s);
    await engine.compile();
    if (signal.aborted) throw new BenchError('abort');
  }
  const initLeft = Math.max(200, INIT_MIN_MS - (performance.now() - t0));
  await engine.run(initLeft, false, signal, (d) => report({ phase: 'Initialize', step: 0, label: 'WebGL 초기화 · 셰이더 컴파일', pct: pct(d * INIT_MIN_MS) }));
  engine.checkMemory();
  done = INIT_MIN_MS;

  const targetFt = (1000 / (refreshHz ?? 60)) * PASS_TARGET;
  const tests: TestRun[] = [];
  const allIntervals: number[] = [];

  for (let i = 0; i < TEST_ORDER.length; i++) {
    const def = TESTS[TEST_ORDER[i]];
    const step = i + 1;
    const levels = fullLadder(def.id);
    const testEnd = done + testPlanMs(def.id);
    let invalidMs = 0;
    engine.setPasses(1);
    engine.setView(makeScene(THREE, def.id));

    /* ① 워밍업: 낮은 부하 → 채점 부하로 빠르게 올리며 셰이더 · 버퍼 준비와 과부하 점검 */
    const warm = await ramp(engine, def.levels, def.scoreLevel, FULL_WARM_MS, signal, (d) =>
      report({ phase: 'Warm-up', step, label: `${def.name} · 워밍업`, pct: pct(d * FULL_WARM_MS) }),
    );
    done += FULL_WARM_MS;

    /* ② 부하 단계 측정: 반복 렌더링 없이 단계마다 2초 (안정화 0.4초 + 측정 1.6초) */
    let safe = warm.safe;
    let overloaded = warm.overloaded;
    const ladder: Measure[] = [];
    const steps = levels.filter((v) => v <= warm.safe);
    for (let j = 0; j < steps.length; j++) {
      const v = steps[j];
      const label = `${def.name} · 부하 단계 ${j + 1}/${levels.length} · ${def.fmt(v)}`;
      engine.current!.setLevel(v);
      await engine.run(STEP_SETTLE_MS, false, signal, (d) => report({ phase: 'Benchmark', step, label, pct: pct(d * STEP_SETTLE_MS) }));
      engine.checkMemory();
      const rec = await engine.run(STEP_MEASURE_MS, true, signal, (d) =>
        report({ phase: 'Benchmark', step, label, pct: pct(STEP_SETTLE_MS + d * STEP_MEASURE_MS) }),
      );
      done += STEP_MS;
      const m = toMeasure(v, rec);
      ladder.push(m);
      invalidMs += m.invalidMs;
      if (m.stats && m.stats.avgFt > OVERLOAD_FT) {
        safe = j > 0 ? steps[j - 1] : v;
        overloaded = true;
        break;
      }
    }
    // 건너뛴 단계 시간만큼 진행률을 맞춘다
    done = testEnd - CAL_EST_MS - ROUNDS * ROUND_MS;

    /* ③ 반복 횟수 보정 (과부하면 반복하지 않음) */
    engine.current!.setLevel(safe);
    let k = overloaded
      ? 1
      : await calibratePasses(engine, targetFt, signal, (d) =>
          report({ phase: 'Benchmark', step, label: `${def.name} · 반복 횟수 보정`, pct: pct(d * CAL_EST_MS) }),
        );
    engine.setPasses(k);
    done += CAL_EST_MS;

    /* ④ 기준 단계 3회: 회당 2초 (안정화 0.2초 + 측정 1.8초)
       부하가 이어지면 GPU 클럭이 올라 다시 주사율 상한에 닿을 수 있다. 그런 회차는 버리고 k 를 올려 3회를 처음부터 다시 잰다. */
    let rounds: Measure[] = [];
    let roundIntervals: number[] = [];
    const roundsStart = done;
    let retries = 0;
    while (rounds.length < ROUNDS) {
      const n = rounds.length;
      const label = `${def.name} · 기준 측정 ${n + 1}/${ROUNDS}${k > 1 ? ` · ×${k}` : ''}`;
      // 재측정으로 계획보다 길어져도 진행률이 이 테스트 끝을 넘지 않게 한다
      const at = (x: number) => Math.min(0.999, Math.min(testEnd, roundsStart + n * ROUND_MS + x) / FULL_PLAN_MS);
      await engine.run(ROUND_SETTLE_MS, false, signal, (d) => report({ phase: 'Benchmark', step, label, pct: at(d * ROUND_SETTLE_MS) }));
      engine.checkMemory();
      const rec = await engine.run(ROUND_MEASURE_MS, true, signal, (d) =>
        report({ phase: 'Benchmark', step, label, pct: at(ROUND_SETTLE_MS + d * ROUND_MEASURE_MS) }),
      );
      const m = toMeasure(safe, rec);
      invalidMs += m.invalidMs;
      if (!overloaded && k < MAX_PASSES && retries < 4 && isCapped(m.stats?.avgFps, refreshHz ?? 60)) {
        retries++;
        const now = median(rec.gpu.filter((g) => g.passes === k).map((g) => g.ms));
        const need = now ? Math.ceil(((targetFt * 1.1) / now) * k) : k * 2;
        k = Math.min(MAX_PASSES, Math.max(Math.ceil(k * 1.25), Math.min(k * 4, need)));
        engine.setPasses(k);
        rounds = [];
        roundIntervals = [];
        continue;
      }
      rounds.push(m);
      roundIntervals.push(...rec.intervals);
    }
    allIntervals.push(...roundIntervals);
    done = testEnd;

    // 중앙값: 평균 Frame Time 이 가운데인 회차 (반복 횟수 · 부하가 같으므로 처리량 중앙값과 같다)
    const measured = rounds.filter((r) => r.stats).sort((a, b) => a.stats!.avgFt - b.stats!.avgFt);
    const med = measured.length ? measured[measured.length >> 1] : rounds[0];
    const fraction = med.stats ? scoreFraction(def, safe, k, med.stats.avgFt) : 0;
    const maxScore = Math.round(def.weight * MAX_SCORE);
    const reduced = safe < def.scoreLevel;
    if (reduced) warnings.push(`${def.name}: 과부하로 채점 부하를 ${def.fmt(safe)}로 낮춰 측정했습니다. 점수는 작업량 비율만큼 낮아집니다.`);
    if (invalidMs > 0) warnings.push(invalidWarning(def.name, invalidMs));
    if (!med.stats) warnings.push(`${def.name}: 유효한 프레임이 부족해 점수를 계산하지 못했습니다.`);
    tests.push({
      ...med,
      invalidMs,
      id: def.id,
      passes: k,
      reduced,
      fraction,
      score: Math.round(fraction * maxScore),
      maxScore,
      // 반복 횟수를 최대로 올려도 주사율에 닿은 경우만 상한 도달로 본다
      vsyncCapped: k >= MAX_PASSES && isCapped(med.stats?.avgFps, refreshHz),
      rounds,
      ladder,
    });
  }

  /* Finalize */
  report({ phase: 'Finalize', step: 5, label: '결과 계산', pct: pct(0) });
  const total = tests.reduce((s, t) => s + t.score, 0);
  const overall = frameStats(allIntervals);
  const maxTris = Math.max(...tests.map((t) => t.tris));
  if (tests.some((t) => t.vsyncCapped))
    warnings.push('일부 테스트가 반복 렌더링 최대치에서도 디스플레이 주사율 상한에 닿았습니다. 해당 테스트의 실제 성능은 측정값보다 높을 수 있습니다.');
  // 부하를 내리고(미리보기) 마무리 구간을 보여 준다
  engine.showPreview();
  await engine.run(FINAL_MS, false, signal, (d) => report({ phase: 'Finalize', step: 5, label: '결과 계산', pct: Math.min(1, pct(d * FINAL_MS)) }));

  return {
    kind: 'full',
    tests,
    total,
    overall,
    maxTris,
    warnings,
    startedAt,
    durationMs: performance.now() - t0,
    refreshHz,
    gpuTimer: engine.hasGpuTimer,
  };
}

/* =========================================================
   Quick Test — 3D Rendering(Instanced) 2초 램프 + 8초 측정
   ========================================================= */

export async function runQuick(engine: Bench, signal: AbortSignal, onProgress: OnProgress): Promise<QuickResult> {
  const report = throttle(onProgress);
  const t0 = performance.now();
  const startedAt = new Date();
  const refreshHz = engine.estimateRefreshHz();
  const PLAN = QUICK_RAMP_MS + QUICK_MEASURE_MS;
  const warnings: string[] = [];

  engine.setFixedResolution(true);
  engine.setPasses(1);
  engine.setView(makeScene(engine.THREE, 'render3d', { render3dMode: 'instanced' }));
  const def = TESTS.render3d;
  const r = await ramp(engine, def.levels, QUICK_LEVEL, QUICK_RAMP_MS, signal, (d) =>
    report({ phase: 'Warm-up', label: '워밍업 · 3D Rendering', pct: (d * QUICK_RAMP_MS) / PLAN }),
  );
  const rec = await engine.run(QUICK_MEASURE_MS, true, signal, (d) =>
    report({ phase: 'Measure', label: '측정 · 3D Rendering', pct: (QUICK_RAMP_MS + d * QUICK_MEASURE_MS) / PLAN }),
  );
  const run = toMeasure(r.safe, rec);
  const reduced = r.safe < QUICK_LEVEL;
  if (reduced) warnings.push(`과부하로 부하를 ${def.fmt(r.safe)}로 낮춰 측정했습니다.`);
  if (run.invalidMs > 0) warnings.push(invalidWarning(def.name, run.invalidMs));
  const vsyncCapped = isCapped(run.stats?.avgFps, refreshHz);
  if (vsyncCapped) warnings.push('디스플레이 주사율 상한에 닿았습니다. 실제 성능은 측정값보다 높을 수 있습니다.');
  return { kind: 'quick', run, reduced, vsyncCapped, warnings, startedAt, durationMs: performance.now() - t0, refreshHz, gpuTimer: engine.hasGpuTimer };
}

/* =========================================================
   개별 테스트 — 단계마다 안정화 0.4초 + 측정 1.6초, 5fps 미만이면 멈춤
   ========================================================= */

export function sweepLevels(id: TestId, opts: SceneOptions): number[] {
  const def = TESTS[id];
  if (id === 'render3d' && opts.render3dMode === 'mesh') return def.levels.filter((v) => v <= 5000); // CPU 부담이 커서 상한을 둔다
  if (id === 'particles') {
    const max = opts.particleMax ?? 50000;
    const extra = [100000, 200000, 500000].filter((v) => v <= max);
    return [...def.levels, ...extra];
  }
  return def.levels;
}

export async function runSweep(engine: Bench, id: TestId, opts: SceneOptions, signal: AbortSignal, onProgress: OnProgress): Promise<SweepResult> {
  const report = throttle(onProgress);
  const t0 = performance.now();
  const startedAt = new Date();
  const refreshHz = engine.estimateRefreshHz();
  const def = TESTS[id];
  const levels = sweepLevels(id, opts);
  const per = STEP_SETTLE_MS + STEP_MEASURE_MS;
  const rows: Measure[] = [];
  const warnings: string[] = [];
  let stoppedAt: number | null = null;

  engine.setFixedResolution(true);
  engine.setPasses(1);
  const view = makeScene(engine.THREE, id, opts);
  engine.setView(view);
  for (let i = 0; i < levels.length; i++) {
    const v = levels[i];
    const label = `${def.name} · ${def.fmt(v)}`;
    view.setLevel(v);
    await engine.run(STEP_SETTLE_MS, false, signal, (d) => report({ phase: 'Measure', label, pct: (i * per + d * STEP_SETTLE_MS) / (levels.length * per) }));
    engine.checkMemory();
    const rec = await engine.run(STEP_MEASURE_MS, true, signal, (d) =>
      report({ phase: 'Measure', label, pct: (i * per + STEP_SETTLE_MS + d * STEP_MEASURE_MS) / (levels.length * per) }),
    );
    const m = toMeasure(v, rec);
    rows.push(m);
    if (m.invalidMs > 0) warnings.push(invalidWarning(def.fmt(v), m.invalidMs));
    if (m.stats && m.stats.avgFt > OVERLOAD_FT && i < levels.length - 1) {
      stoppedAt = v;
      warnings.push(`${def.fmt(v)}에서 5fps 미만으로 떨어져 더 높은 단계는 실행하지 않았습니다.`);
      break;
    }
  }
  if (rows.some((r) => isCapped(r.stats?.avgFps, refreshHz)))
    warnings.push('일부 단계가 디스플레이 주사율 상한에 닿았습니다. 그 단계들끼리는 FPS 차이가 드러나지 않습니다.');
  return { kind: 'sweep', test: id, options: opts, rows, stoppedAt, warnings, startedAt, durationMs: performance.now() - t0, refreshHz, gpuTimer: engine.hasGpuTimer };
}
