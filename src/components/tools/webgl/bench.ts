/**
 * WebGL Benchmark — 테스트 정의 · 측정 통계 · 점수 계산 (three 와 무관한 순수 모듈)
 *
 * ⚠️ 이 파일의 상수(작업량 · 기준 Frame Time · 가중치 · 해상도)나 Three.js 버전을 바꾸면
 *    이전 결과와 점수를 비교할 수 없다. 바꿀 때는 BENCH_VERSION 을 올린다.
 *    (Three.js 는 package.json 에서 0.187.0 으로 고정 — 결과 JSON 에 revision 이 함께 기록된다)
 */

export const BENCH_VERSION = '1.0';

/** 측정 중 고정 렌더링 해상도 (캔버스 크기 · DPR 과 무관) */
export const TEST_W = 1280;
export const TEST_H = 720;

/** 기준 Frame Time (60fps) */
export const REF_FT = 1000 / 60;

/**
 * 프레임당 반복 렌더링(pass)
 * 빠른 GPU 는 채점 부하를 그려도 주사율(vsync) 상한에 걸려 차이가 드러나지 않는다.
 * 그래서 워밍업에서 한 프레임에 같은 장면을 k 번 그리도록 k 를 올려 Frame Time 을 주사율 간격의
 * PASS_TARGET 배 이상으로 만든 뒤, 처리량 (작업량 × k) / Frame Time 으로 채점한다.
 * 만점 기준 = 채점 부하를 테스트별 refPasses 번 반복해 60fps 로 그리는 처리량.
 */
export const MAX_PASSES = 512;
export const PASS_TARGET = 1.25;

/** 단계 측정 중 평균 Frame Time 이 이보다 길면(5fps 미만) 부하를 더 올리지 않는다 */
export const OVERLOAD_FT = 200;

/* ---------- Full Benchmark 시간표 (전체 약 1분 30초) ----------
   테스트마다: 워밍업 약 1.5초 → 부하 단계 측정(단계당 2초) → 반복 횟수 보정 → 기준 단계 3회(회당 2초, 중앙값)
   3D 8단계 · 나머지 6단계 → 테스트당 약 18~22초 */
export const INIT_MIN_MS = 1500;
export const FULL_WARM_MS = 1500;
export const ROUNDS = 3;
export const ROUND_SETTLE_MS = 200;
export const ROUND_MEASURE_MS = 1800;
/** 반복 횟수 보정 예상 시간 (진행률 표시용, 실제는 GPU 에 따라 다름) */
export const CAL_EST_MS = 800;
export const FINAL_MS = 1000;

/* ---------- Quick Test (약 10초) ---------- */
export const QUICK_RAMP_MS = 2000;
export const QUICK_MEASURE_MS = 8000;

/* ---------- 부하 단계 1개 (Full 의 부하 단계 측정 · 개별 테스트 단계별 측정 공통, 2초) ---------- */
export const STEP_SETTLE_MS = 400;
export const STEP_MEASURE_MS = 1600;

export type TestId = 'render3d' | 'particles' | 'shader' | 'geometry';
export const TEST_ORDER: TestId[] = ['render3d', 'particles', 'shader', 'geometry'];

/** Geometry Stress 단계: 같은 TorusKnot 를 count 개 그린다 (Draw Call = count) */
export const GEO_LEVELS = [
  { count: 4, tubular: 128, radial: 16 },
  { count: 8, tubular: 256, radial: 16 },
  { count: 16, tubular: 256, radial: 32 },
  { count: 32, tubular: 512, radial: 32 },
  { count: 64, tubular: 512, radial: 48 },
  { count: 128, tubular: 768, radial: 48 },
  { count: 256, tubular: 1024, radial: 64 },
];
export const geoTris = (i: number) => {
  const g = GEO_LEVELS[i];
  return g.count * g.tubular * g.radial * 2;
};

export type TestDef = {
  id: TestId;
  name: string;
  ko: string;
  desc: string;
  weight: number;
  /** 개별 테스트의 단계별 부하 값 */
  levels: number[];
  /** 채점용 고정 부하 값 */
  scoreLevel: number;
  /**
   * 만점 기준: 채점 부하를 한 프레임에 이만큼 반복해 60fps 로 그리는 처리량.
   * ⚠️ 임시 기준(v1.0) — 개발 장비 1대(데스크톱 중급 GPU · Chrome · D3D11)의 실측 처리량이 테스트마다
   *    약 40% 가 되도록 맞춘 값이다. 여러 기기 결과가 모이면 다시 보정하고 BENCH_VERSION 을 올린다.
   */
  refPasses: number;
  /** 부하 값 → 작업량 (점수 비례 계산용) */
  work: (v: number) => number;
  /** 부하 값 표시 */
  fmt: (v: number) => string;
};

export const TESTS: Record<TestId, TestDef> = {
  render3d: {
    id: 'render3d',
    name: '3D Rendering',
    ko: '3D 오브젝트 렌더링',
    desc: 'Sphere · Box · Torus에 조명과 PBR 재질을 입혀 회전시키고 개수를 늘립니다.',
    weight: 0.35,
    levels: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000],
    scoreLevel: 10000,
    refPasses: 60,
    work: (v) => v,
    fmt: (v) => `${fmtInt(v)} objects`,
  },
  particles: {
    id: 'particles',
    name: 'Particle Stress',
    ko: '파티클 대량 렌더링',
    desc: 'GPU 버퍼에 담은 파티클의 위치를 Vertex Shader에서 계산하고 가산 블렌딩으로 그립니다.',
    weight: 0.25,
    levels: [500, 1000, 5000, 10000, 30000, 50000],
    scoreLevel: 50000,
    refPasses: 300,
    work: (v) => v,
    fmt: (v) => `${fmtInt(v)} particles`,
  },
  shader: {
    id: 'shader',
    name: 'Shader Test',
    ko: 'Fragment Shader · 텍스처',
    desc: '화면 전체에 텍스처 샘플링 · 노이즈 · 3개 광원 조명을 계산하며 반복 횟수를 늘립니다.',
    weight: 0.25,
    levels: [0, 1, 4, 8, 16, 32, 64, 128],
    scoreLevel: 32,
    refPasses: 30,
    work: (v) => v + 1,
    fmt: (v) => (v === 0 ? '텍스처만' : `${v} iterations`),
  },
  geometry: {
    id: 'geometry',
    name: 'Geometry Stress',
    ko: 'Vertex · Triangle 처리',
    desc: '고밀도 TorusKnot 메시의 개수와 분할 수를 늘려 정점 · 삼각형 · Draw Call을 함께 올립니다.',
    weight: 0.15,
    levels: GEO_LEVELS.map((_, i) => i),
    scoreLevel: 5,
    refPasses: 30,
    work: (v) => geoTris(v),
    fmt: (v) => `${GEO_LEVELS[v].count} meshes · ${fmtCount(geoTris(v))} tris`,
  },
};

/** Quick Test: 3D Rendering (Instanced) 채점 부하와 같은 조건 */
export const QUICK_LEVEL = TESTS.render3d.scoreLevel;

/* =========================================================
   통계
   ========================================================= */

export type FrameStats = {
  frames: number;
  durationMs: number;
  avgFps: number;
  /** 가장 느린 1% 프레임 간격의 평균 → FPS */
  low1Fps: number;
  avgFt: number;
  medFt: number;
  /** 가장 느린 1% 프레임 간격의 평균 (ms) */
  worstFt: number;
  /** Frame Time 분산 (ms²) · 표준편차 (ms) */
  ftVar: number;
  ftStd: number;
};

/** requestAnimationFrame 간격(ms) 목록 → 통계. 프레임이 2개 미만이면 null */
export function frameStats(intervals: number[]): FrameStats | null {
  const n = intervals.length;
  if (n < 2) return null;
  let sum = 0;
  for (const x of intervals) sum += x;
  const avgFt = sum / n;
  const sorted = [...intervals].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(n * 0.01));
  let worst = 0;
  for (let i = n - k; i < n; i++) worst += sorted[i];
  worst /= k;
  let v = 0;
  for (const x of intervals) v += (x - avgFt) * (x - avgFt);
  v /= n;
  return {
    frames: n,
    durationMs: sum,
    avgFps: 1000 / avgFt,
    low1Fps: 1000 / worst,
    avgFt,
    medFt: sorted[n >> 1],
    worstFt: worst,
    ftVar: v,
    ftStd: Math.sqrt(v),
  };
}

export function mean(a: number[]): number | null {
  if (!a.length) return null;
  let s = 0;
  for (const x of a) s += x;
  return s / a.length;
}

/* =========================================================
   점수
   처리량      = 작업량(부하 값) × 반복 횟수(k) / 평균 Frame Time
   기준 처리량 = 작업량(채점 부하) × refPasses(테스트별) / 기준 Frame Time(16.67ms)
   테스트 점수 = 가중치 × 10,000 × min(1, 처리량 / 기준 처리량)
   - 같은 해상도(1280×720) · 같은 측정 시간 · 같은 채점 부하에서만 비교한다.
   - 과부하로 작업량을 낮춰 측정한 경우 작업량 비율만큼 점수가 줄어든다.
   ========================================================= */

export const MAX_SCORE = 10000;

export function scoreFraction(def: TestDef, value: number, passes: number, avgFt: number): number {
  const throughput = (def.work(value) * passes) / avgFt;
  const reference = (def.work(def.scoreLevel) * def.refPasses) / REF_FT;
  return Math.min(1, throughput / reference);
}

/* =========================================================
   오류
   ========================================================= */

export type BenchErrorCode = 'abort' | 'context-lost' | 'shader' | 'oom' | 'unmount' | 'error';

export class BenchError extends Error {
  code: BenchErrorCode;
  constructor(code: BenchErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'BenchError';
  }
}

export const ERROR_MESSAGES: Record<BenchErrorCode, string> = {
  abort: '사용자가 테스트를 중단했습니다.',
  'context-lost': 'WebGL 컨텍스트를 잃어 테스트를 중단했습니다. GPU 드라이버 재설정이나 메모리 부족이 원인일 수 있습니다.',
  shader: '셰이더 컴파일에 실패해 테스트를 중단했습니다. 브라우저 콘솔에서 자세한 오류를 볼 수 있습니다.',
  oom: 'GPU 메모리가 부족해(OUT_OF_MEMORY) 테스트를 중단했습니다. 부하를 낮춰 다시 시도해 보세요.',
  unmount: '페이지를 벗어나 테스트를 중단했습니다.',
  error: '알 수 없는 오류로 테스트를 중단했습니다.',
};

/* =========================================================
   표시 형식
   ========================================================= */

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export function fmtCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return fmtInt(n);
}
export const fmtFps = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
export const fmtMs = (n: number) => n.toFixed(2);
