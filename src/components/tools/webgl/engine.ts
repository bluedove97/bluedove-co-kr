/**
 * WebGL Benchmark 엔진 — WebGLRenderer 하나와 rAF 루프 하나를 페이지 수명 동안 유지한다.
 *
 * - 미리보기 / 테스트 장면을 setView() 로 바꿔 끼운다.
 * - run(ms, record) : 유효 프레임 시간이 ms 만큼 쌓일 때까지 기다리며, record 면 프레임 간격을 기록한다.
 *   탭이 숨겨진 동안의 프레임은 무효(invalidMs)로 빼고 시간도 세지 않는다.
 * - Frame Time = requestAnimationFrame 간격. GPU 처리 시간은 EXT_disjoint_timer_query_webgl2 가 있을 때만 따로 잰다.
 * - 컨텍스트 손실 · 셰이더 컴파일 실패가 나면 진행 중인 run() 을 BenchError 로 끝낸다.
 */

import type * as T from 'three';
import { BenchError, TEST_H, TEST_W } from './bench';
import { makeScene, type BenchScene } from './scenes';

type Three = typeof import('three');

export type Hud = {
  passes: number;
  fps: number;
  ft: number;
  objects: number;
  particles: number;
  tris: number;
  points: number;
  calls: number;
  width: number;
  height: number;
  gpuMs: number | null;
};

export type Recording = {
  intervals: number[];
  gpuMs: number[];
  /** 패스 1회당 GPU 시간(ms) — 쿼리 실행 당시의 반복 횟수로 나눈 값 */
  gpuPerPass: number[];
  /** GPU 시간과 그때의 반복 횟수 (반복 횟수를 바꾼 직후 늦게 도착한 결과를 가려낼 때) */
  gpu: GpuSample[];
  invalidMs: number;
  tris: number;
  points: number;
  calls: number;
  objects: number;
  particles: number;
};

type Hooks = {
  onHud: (h: Hud) => void;
  onLost: () => void;
  onRestored: () => void;
};

type Task = {
  total: number;
  remaining: number;
  /** 프레임 수 기준 샘플링: 앞의 skip 프레임은 버리고 frames 프레임을 기록 (null 이면 시간 기준) */
  skip: number;
  framesLeft: number | null;
  record: boolean;
  rec: Recording;
  tick?: (done: number) => void;
  resolve: (r: Recording) => void;
  reject: (e: unknown) => void;
};

/* ---------- GPU 타이머 (EXT_disjoint_timer_query_webgl2) ---------- */
type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

/** 쿼리 결과는 몇 프레임 늦게 나오므로, 실행 당시의 반복 횟수(passes)를 함께 들고 다닌다 */
export type GpuSample = { ms: number; passes: number };

class GpuTimer {
  private pending: { q: WebGLQuery; passes: number }[] = [];
  private pool: WebGLQuery[] = [];
  private active: { q: WebGLQuery; passes: number } | null = null;
  constructor(
    private gl: WebGL2RenderingContext,
    private ext: TimerExt,
  ) {}
  static create(gl: WebGL2RenderingContext) {
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
    return ext ? new GpuTimer(gl, ext) : null;
  }
  begin(passes: number) {
    if (this.active || this.pending.length > 6) return; // 결과가 밀리면 쉬어 간다
    const q = this.pool.pop() ?? this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = { q, passes };
  }
  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }
  /** 결과가 나온 쿼리의 GPU 시간 목록. disjoint(측정 불가 구간)면 버린다 */
  poll(): GpuSample[] {
    const out: GpuSample[] = [];
    const gl = this.gl;
    const disjoint = !!gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const { q, passes } = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (!disjoint) out.push({ ms: gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6, passes });
      this.pool.push(q);
    }
    return out;
  }
  dispose() {
    for (const q of [...this.pool, ...this.pending.map((p) => p.q)]) this.gl.deleteQuery(q);
    this.pool = [];
    this.pending = [];
  }
}

export class Bench {
  readonly THREE: Three;
  readonly renderer: T.WebGLRenderer;
  readonly gl: WebGL2RenderingContext;
  readonly hasGpuTimer: boolean;
  private canvas: HTMLCanvasElement;
  private hooks: Hooks;
  private view: BenchScene | null = null;
  private timer: GpuTimer | null;
  private task: Task | null = null;
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private lost = false;
  private hiddenSeen = false;
  private fixed = false;
  private disposed = false;
  /** 프레임당 반복 렌더링 횟수 */
  private passes = 1;
  private ro: ResizeObserver | null = null;
  private hud = { frames: 0, ms: 0, last: 0, gpu: null as number | null };
  /** 미리보기 중 최근 프레임 간격 — 디스플레이 주사율 추정용 */
  private idle: number[] = [];

  private constructor(THREE: Three, canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, hooks: Hooks) {
    this.THREE = THREE;
    this.canvas = canvas;
    this.gl = gl;
    this.hooks = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, powerPreference: 'high-performance' });
    this.renderer.debug.checkShaderErrors = true;
    // 반복 렌더링 패스를 합산하려고 info 는 프레임마다 직접 초기화
    this.renderer.info.autoReset = false;
    this.renderer.debug.onShaderError = () => this.fail(new BenchError('shader'));
    this.timer = GpuTimer.create(gl);
    this.hasGpuTimer = !!this.timer;

    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    document.addEventListener('visibilitychange', this.onVisibility);
    if ('ResizeObserver' in window && canvas.parentElement) {
      this.ro = new ResizeObserver(() => !this.fixed && this.applySize());
      this.ro.observe(canvas.parentElement);
    }
    this.showPreview();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** WebGL 2 컨텍스트를 직접 만들어 넘긴다 (WebGL 1 로 조용히 내려가지 않도록). 실패하면 BenchError */
  static create(THREE: Three, canvas: HTMLCanvasElement, hooks: Hooks): Bench {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new BenchError('error', 'WebGL 2.0 컨텍스트를 만들 수 없습니다.');
    return new Bench(THREE, canvas, gl, hooks);
  }

  /* ---------------- 장면 · 해상도 ---------------- */

  setView(view: BenchScene) {
    this.view?.dispose();
    this.view = view;
    view.setPasses?.(this.passes);
    this.applySize();
  }

  get current(): BenchScene | null {
    return this.view;
  }

  /** 한 프레임에 장면을 몇 번 그릴지 (1 ~ MAX_PASSES) */
  setPasses(k: number) {
    this.passes = Math.max(1, Math.round(k));
    this.view?.setPasses?.(this.passes);
  }

  getPasses() {
    return this.passes;
  }

  showPreview() {
    this.fixed = false;
    this.passes = 1;
    this.setView(makeScene(this.THREE, 'preview'));
  }

  /** 측정 중에는 1280×720 · pixelRatio 1 로 고정 */
  setFixedResolution(on: boolean) {
    this.fixed = on;
    this.applySize();
  }

  private applySize() {
    if (this.lost || this.disposed) return;
    let w: number, h: number;
    if (this.fixed) {
      this.renderer.setPixelRatio(1);
      w = TEST_W;
      h = TEST_H;
    } else {
      const box = this.canvas.parentElement;
      w = Math.max(1, box?.clientWidth || 640);
      h = Math.max(1, box?.clientHeight || 360);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    this.renderer.setSize(w, h, false);
    this.view?.resize?.(this.canvas.width, this.canvas.height);
  }

  /** 미리보기 프레임 간격 중앙값으로 추정한 주사율(Hz). 표본이 부족하면 null */
  estimateRefreshHz(): number | null {
    if (this.idle.length < 30) return null;
    const s = [...this.idle].sort((a, b) => a - b);
    return Math.round(1000 / s[s.length >> 1]);
  }

  async compile() {
    const v = this.view;
    if (!v || this.lost) return;
    await this.renderer.compileAsync(v.scene, v.camera);
  }

  /** 부하 변경 직후 GPU 메모리 부족 확인 */
  checkMemory() {
    if (this.gl.getError() === this.gl.OUT_OF_MEMORY) throw new BenchError('oom');
  }

  /* ---------------- 측정 ---------------- */

  run(ms: number, record: boolean, signal?: AbortSignal, tick?: (done: number) => void): Promise<Recording> {
    return this.start(ms, record, null, 0, signal, tick);
  }

  /**
   * 부하를 바꾼 직후 GPU 큐 지연(2~3프레임)이 걸러지도록 앞의 skip 프레임을 버리고 frames 프레임을 기록한다.
   * 반복 횟수 보정처럼 '지금 부하'의 Frame Time 이 필요할 때 쓴다.
   */
  sample(skip: number, frames: number, signal?: AbortSignal): Promise<Recording> {
    return this.start(Infinity, true, frames, skip, signal);
  }

  private start(ms: number, record: boolean, frames: number | null, skip: number, signal?: AbortSignal, tick?: (done: number) => void): Promise<Recording> {
    this.fail(new BenchError('abort')); // 겹치는 작업은 없어야 하지만 안전하게 정리
    return new Promise<Recording>((resolve, reject) => {
      if (signal?.aborted) return reject(new BenchError('abort'));
      if (this.lost) return reject(new BenchError('context-lost'));
      const onAbort = () => {
        if (this.task === task) this.task = null;
        reject(new BenchError('abort'));
      };
      const task: Task = {
        total: ms,
        remaining: ms,
        skip,
        framesLeft: frames,
        record,
        tick,
        rec: { intervals: [], gpuMs: [], gpuPerPass: [], gpu: [], invalidMs: 0, tris: 0, points: 0, calls: 0, objects: 0, particles: 0 },
        resolve: (r) => {
          signal?.removeEventListener('abort', onAbort);
          resolve(r);
        },
        reject: (e) => {
          signal?.removeEventListener('abort', onAbort);
          reject(e);
        },
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.task = task;
    });
  }

  private fail(err: BenchError) {
    const t = this.task;
    this.task = null;
    t?.reject(err);
  }

  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const view = this.view;
    if (this.lost || !view) {
      this.lastT = 0;
      return;
    }
    const dt = this.lastT ? t - this.lastT : 0;
    this.lastT = t;
    const valid = dt > 0 && !this.hiddenSeen && !document.hidden;
    this.hiddenSeen = false;
    const step = Math.min(dt, 100) / 1000;
    this.time += step;

    view.update(this.time, step);
    const r = this.renderer;
    r.info.reset();
    this.timer?.begin(this.passes);
    // 첫 패스만 화면을 지우고 나머지는 같은 장면을 위에 덧그린다 (지운 결과를 드라이버가 건너뛰지 못하도록)
    for (let p = 0; p < this.passes; p++) {
      r.autoClear = p === 0;
      r.render(view.scene, view.camera);
    }
    r.autoClear = true;
    this.timer?.end();
    const gpu = this.timer ? this.timer.poll() : [];
    const info = this.renderer.info.render;

    const task = this.task;
    if (task && task.skip > 0) {
      if (valid) task.skip--;
    } else if (task) {
      if (valid) {
        task.remaining -= dt;
        if (task.framesLeft != null) task.framesLeft--;
        if (task.record) task.rec.intervals.push(dt);
      } else if (dt > 0) task.rec.invalidMs += dt;
      if (task.record) {
        for (const g of gpu) {
          task.rec.gpuMs.push(g.ms);
          task.rec.gpuPerPass.push(g.ms / g.passes);
          task.rec.gpu.push(g);
        }
        task.rec.tris = Math.max(task.rec.tris, info.triangles);
        task.rec.points = Math.max(task.rec.points, info.points);
        task.rec.calls = Math.max(task.rec.calls, info.calls);
        task.rec.objects = view.objectCount();
        task.rec.particles = view.particleCount();
      }
      task.tick?.(Math.min(1, 1 - task.remaining / task.total));
      if (task.remaining <= 0 || (task.framesLeft != null && task.framesLeft <= 0)) {
        this.task = null;
        task.resolve(task.rec);
      }
    } else if (valid && !this.fixed) {
      this.idle.push(dt);
      if (this.idle.length > 90) this.idle.shift();
    }

    /* HUD: 0.25초마다 */
    const h = this.hud;
    if (valid) {
      h.frames++;
      h.ms += dt;
    }
    if (gpu.length) h.gpu = gpu[gpu.length - 1].ms;
    if (t - h.last >= 250) {
      this.hooks.onHud({
        passes: this.passes,
        fps: h.ms ? (1000 * h.frames) / h.ms : 0,
        ft: h.frames ? h.ms / h.frames : 0,
        objects: view.objectCount(),
        particles: view.particleCount(),
        tris: info.triangles,
        points: info.points,
        calls: info.calls,
        width: this.canvas.width,
        height: this.canvas.height,
        gpuMs: this.timer ? h.gpu : null,
      });
      h.frames = 0;
      h.ms = 0;
      h.last = t;
    }
  };

  /* ---------------- 이벤트 ---------------- */

  private onVisibility = () => {
    if (document.hidden) this.hiddenSeen = true;
  };

  private onLost = (e: Event) => {
    e.preventDefault(); // 복구(webglcontextrestored)를 받으려면 필요
    this.lost = true;
    this.idle = [];
    this.fail(new BenchError('context-lost'));
    this.hooks.onLost();
  };

  private onRestored = () => {
    // three 가 내부 상태를 다시 만든다. 쿼리 객체는 새 컨텍스트에서 다시 만든다.
    this.lost = false;
    this.timer = GpuTimer.create(this.gl);
    this.showPreview();
    this.hooks.onRestored();
  };

  /** rAF · 리스너 · 장면 · three 리소스 · WebGL 컨텍스트를 모두 해제 */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.fail(new BenchError('unmount'));
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.ro?.disconnect();
    try {
      this.timer?.dispose();
      this.view?.dispose();
      this.view = null;
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    } catch {
      /* 이미 잃은 컨텍스트 */
    }
  }
}
