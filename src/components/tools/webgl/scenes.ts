/**
 * WebGL Benchmark 장면 — 미리보기 + 테스트 4종
 * three 는 런타임에 인자로 받는다(동적 import). 여기서는 타입만 import 해서 페이지 번들에 three 가 들어가지 않는다.
 * 모든 배치 · 속도는 인덱스 해시로 정해서 같은 부하 값이면 매번 같은 장면이 된다.
 */

import type * as T from 'three';
import { GEO_LEVELS, type TestId } from './bench';

type Three = typeof import('three');

export interface BenchScene {
  scene: T.Scene;
  camera: T.Camera;
  /** 부하 값 변경 (TESTS[id].levels 의 값) */
  setLevel(v: number): void;
  /** time: 누적 초, dt: 직전 프레임 초 */
  update(time: number, dt: number): void;
  /** 렌더링 버퍼 크기가 바뀔 때 (px) */
  resize?(w: number, h: number): void;
  /** 프레임당 반복 렌더링 횟수가 바뀔 때 (가산 블렌딩 밝기 보정용) */
  setPasses?(k: number): void;
  objectCount(): number;
  particleCount(): number;
  dispose(): void;
}

export type SceneOptions = {
  /** 3D Rendering: 개별 Mesh(Draw Call = 개수) / Instanced(Draw Call = 3) */
  render3dMode?: 'instanced' | 'mesh';
  /** Particle: gl.POINTS / 인스턴스 사각형(billboard) */
  particleMethod?: 'points' | 'quads';
  /** Particle: 버퍼 용량 */
  particleMax?: number;
};

export const ASPECT = 16 / 9;
const BG = 0x0a1020;

/* ---------- 결정적 난수 ---------- */
function hash(i: number, k: number) {
  let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(k + 7, 0x85ebca6b);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  x = Math.imul(x, 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}
const range = (i: number, k: number, a: number, b: number) => a + (b - a) * hash(i, k);

export function makeScene(THREE: Three, id: TestId | 'preview', opts: SceneOptions = {}): BenchScene {
  switch (id) {
    case 'preview': {
      const s = createRender3D(THREE, 'mesh', 0);
      s.setLevel(36);
      return s;
    }
    case 'render3d':
      return createRender3D(THREE, opts.render3dMode ?? 'instanced', 20000);
    case 'particles':
      return createParticles(THREE, opts.particleMethod ?? 'points', opts.particleMax ?? 50000);
    case 'shader':
      return createShader(THREE);
    case 'geometry':
      return createGeometry(THREE);
  }
}

/* =========================================================
   3D Rendering — Sphere · Box · Torus + 조명 + MeshStandardMaterial
   mesh: 오브젝트마다 Mesh (CPU 에서 회전, Draw Call = 개수)
   instanced: 종류별 InstancedMesh 3개, 회전은 Vertex Shader 에서 (Draw Call = 3)
   ========================================================= */

function createRender3D(THREE: Three, mode: 'mesh' | 'instanced', capacity: number): BenchScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 20, 42);
  const camera = new THREE.PerspectiveCamera(50, ASPECT, 0.1, 100);
  camera.position.set(0, 0, 16);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x1a2333, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0x3d8bff, 80, 0, 2);
  rim.position.set(-9, -3, 5);
  scene.add(rim);

  const baseGeos: T.BufferGeometry[] = [
    new THREE.SphereGeometry(0.5, 24, 12),
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.TorusGeometry(0.4, 0.15, 12, 32),
  ];
  const colors = [0x3d8bff, 0xf0b429, 0x2fae6b];
  const group = new THREE.Group();
  scene.add(group);

  const geos: T.BufferGeometry[] = [...baseGeos];
  const mats: T.Material[] = [];
  let n = 0;

  const scaleFor = (count: number) => Math.min(1.4, Math.max(0.12, 1.6 * Math.cbrt(60 / Math.max(count, 1))));
  const posOf = (i: number, out: T.Vector3) => out.set(range(i, 1, -11, 11), range(i, 2, -6, 6), range(i, 3, -14, 4));

  /* ----- mesh ----- */
  const meshes: T.Mesh[] = [];
  const spins: number[] = [];

  /* ----- instanced ----- */
  const inst: T.InstancedMesh[] = [];
  const uTime = { value: 0 };

  if (mode === 'mesh') {
    for (const c of colors) mats.push(new THREE.MeshStandardMaterial({ color: c, metalness: 0.25, roughness: 0.35 }));
  } else {
    const per = Math.ceil(capacity / 3);
    baseGeos.forEach((g, k) => {
      const geo = g.clone();
      const spin = new Float32Array(per * 4);
      for (let j = 0; j < per; j++) {
        const i = j * 3 + k;
        spin[j * 4] = range(i, 4, -1, 1);
        spin[j * 4 + 1] = range(i, 5, 0.2, 1);
        spin[j * 4 + 2] = range(i, 6, -1, 1);
        spin[j * 4 + 3] = range(i, 7, 0.4, 1.6);
      }
      geo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spin, 4));
      geos.push(geo);
      const mat = new THREE.MeshStandardMaterial({ color: colors[k], metalness: 0.25, roughness: 0.35 });
      addSpin(mat, uTime);
      mats.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, per);
      im.count = 0;
      im.frustumCulled = false;
      inst.push(im);
      group.add(im);
    });
  }

  const tmpP = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3();
  const tmpM = new THREE.Matrix4();

  function setLevel(count: number) {
    n = mode === 'instanced' ? Math.min(count, Math.ceil(capacity / 3) * 3) : count;
    const s = scaleFor(n);
    if (mode === 'mesh') {
      while (meshes.length < n) {
        const i = meshes.length;
        const m = new THREE.Mesh(baseGeos[i % 3], mats[i % 3]);
        m.rotation.set(range(i, 8, 0, 6.28), range(i, 9, 0, 6.28), 0);
        meshes.push(m);
        spins.push(range(i, 7, 0.4, 1.6));
        group.add(m);
      }
      while (meshes.length > n) {
        group.remove(meshes.pop()!);
        spins.pop();
      }
      meshes.forEach((m, i) => {
        posOf(i, m.position);
        m.scale.setScalar(s);
      });
    } else {
      tmpS.setScalar(s);
      inst.forEach((im, k) => {
        const cnt = Math.max(0, Math.floor((n - k + 2) / 3));
        for (let j = 0; j < cnt; j++) {
          posOf(j * 3 + k, tmpP);
          tmpM.compose(tmpP, tmpQ, tmpS);
          im.setMatrixAt(j, tmpM);
        }
        im.count = cnt;
        im.instanceMatrix.needsUpdate = true;
      });
    }
  }

  return {
    scene,
    camera,
    setLevel,
    update(time, dt) {
      uTime.value = time;
      group.rotation.y = Math.sin(time * 0.15) * 0.25;
      if (mode === 'mesh') {
        for (let i = 0; i < meshes.length; i++) {
          meshes[i].rotation.x += spins[i] * dt;
          meshes[i].rotation.y += spins[i] * 0.7 * dt;
        }
      }
    },
    objectCount: () => n,
    particleCount: () => 0,
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      inst.forEach((im) => im.dispose());
      scene.clear();
    },
  };
}

/** MeshStandardMaterial 의 정점 단계에 인스턴스별 회전(aSpin: 축 xyz + 속도 w)을 끼워 넣는다 */
function addSpin(mat: T.MeshStandardMaterial, uTime: { value: number }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 aSpin;
uniform float uTime;
mat3 spinMat() {
  vec3 a = normalize(aSpin.xyz);
  float g = uTime * aSpin.w;
  float c = cos(g), s = sin(g), t = 1.0 - c;
  return mat3(
    t * a.x * a.x + c,       t * a.x * a.y + s * a.z, t * a.x * a.z - s * a.y,
    t * a.x * a.y - s * a.z, t * a.y * a.y + c,       t * a.y * a.z + s * a.x,
    t * a.x * a.z + s * a.y, t * a.y * a.z - s * a.x, t * a.z * a.z + c);
}`,
      )
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = spinMat() * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = spinMat() * transformed;');
  };
  mat.customProgramCacheKey = () => 'wg-spin';
}

/* =========================================================
   Particle Stress — 위치는 Vertex Shader 에서 시간으로 계산 (CPU 갱신 없음)
   points: gl.POINTS + gl_PointSize / quads: 인스턴스 사각형 billboard
   ========================================================= */

const PARTICLE_VS = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uScale;
attribute vec3 aVel;
attribute float aPhase;
#ifdef QUADS
attribute vec3 aBase;
varying vec2 vUv;
#endif
varying vec3 vColor;

vec3 particlePos(vec3 base) {
  vec3 p = base + aVel * (uTime + aPhase * 20.0);
  p = mod(p + 10.0, 20.0) - 10.0;
  float ang = uTime * 0.15 + length(p.xz) * 0.12;
  float c = cos(ang), s = sin(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;
  return p;
}

void main() {
#ifdef QUADS
  vec4 mv = modelViewMatrix * vec4(particlePos(aBase), 1.0);
  mv.xy += position.xy * uSize;
  vUv = uv;
#else
  vec4 mv = modelViewMatrix * vec4(particlePos(position), 1.0);
  gl_PointSize = uSize * uScale / -mv.z;
#endif
  gl_Position = projectionMatrix * mv;
  vColor = mix(vec3(0.24, 0.55, 1.0), vec3(1.0, 0.55, 0.25), fract(aPhase * 7.0));
}
`;

const PARTICLE_FS = /* glsl */ `
uniform float uGain;
varying vec3 vColor;
#ifdef QUADS
varying vec2 vUv;
#endif
void main() {
#ifdef QUADS
  vec2 d = vUv - 0.5;
#else
  vec2 d = gl_PointCoord - 0.5;
#endif
  float a = 1.0 - smoothstep(0.0, 0.5, length(d));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vColor * a * 0.55 * uGain, a);
}
`;

function createParticles(THREE: Three, method: 'points' | 'quads', capacity: number): BenchScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080f);
  const FOV = 60;
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 100);
  camera.position.set(0, 0, 24);
  camera.lookAt(0, 0, 0);

  const base = new Float32Array(capacity * 3);
  const vel = new Float32Array(capacity * 3);
  const phase = new Float32Array(capacity);
  for (let i = 0; i < capacity; i++) {
    base[i * 3] = range(i, 1, -10, 10);
    base[i * 3 + 1] = range(i, 2, -10, 10);
    base[i * 3 + 2] = range(i, 3, -10, 10);
    vel[i * 3] = range(i, 4, -0.6, 0.6);
    vel[i * 3 + 1] = range(i, 5, -0.6, 0.6);
    vel[i * 3 + 2] = range(i, 6, -0.6, 0.6);
    phase[i] = hash(i, 7);
  }

  const uniforms = { uTime: { value: 0 }, uSize: { value: 0.5 }, uScale: { value: 1 }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PARTICLE_VS,
    fragmentShader: PARTICLE_FS,
    defines: method === 'quads' ? { QUADS: '' } : {},
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  let geo: T.BufferGeometry;
  let obj: T.Object3D;
  let plane: T.BufferGeometry | null = null;
  if (method === 'points') {
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    obj = new THREE.Points(geo, mat);
  } else {
    plane = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = plane.index;
    ig.setAttribute('position', plane.getAttribute('position'));
    ig.setAttribute('uv', plane.getAttribute('uv'));
    ig.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3));
    ig.setAttribute('aVel', new THREE.InstancedBufferAttribute(vel, 3));
    ig.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    geo = ig;
    obj = new THREE.Mesh(ig, mat);
  }
  obj.frustumCulled = false;
  scene.add(obj);

  let n = 0;
  return {
    scene,
    camera,
    setLevel(v) {
      n = Math.min(v, capacity);
      if (method === 'points') geo.setDrawRange(0, n);
      else (geo as T.InstancedBufferGeometry).instanceCount = n;
    },
    update(time) {
      uniforms.uTime.value = time;
    },
    resize(_w, h) {
      // 화면 높이 기준 투영 배율: gl_PointSize(px) = 월드 크기 × uScale / 거리 (quads 와 같은 크기로 맞춤)
      uniforms.uScale.value = h / (2 * Math.tan((FOV * Math.PI) / 360));
    },
    setPasses(k) {
      // 가산 블렌딩이라 k 번 덧그리면 k 배 밝아진다 → 화면 밝기만 보정 (연산량은 같음)
      uniforms.uGain.value = 1 / k;
    },
    objectCount: () => 1,
    particleCount: () => n,
    dispose() {
      geo.dispose();
      plane?.dispose();
      mat.dispose();
      scene.clear();
    },
  };
}

/* =========================================================
   Shader Test — 화면 전체 Fragment Shader
   0: 텍스처 샘플링만 / 1~: 노이즈 + 텍스처 반복(uIter) + 법선 + 3개 광원 Blinn-Phong
   반복 횟수는 uniform 이라 단계가 바뀌어도 셰이더를 다시 컴파일하지 않는다.
   ========================================================= */

const SHADER_VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SHADER_FS = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime;
uniform int uIter;
uniform vec2 uRes;
varying vec2 vUv;

float hash12(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 4.0;
  vec3 base = texture2D(uTex, vUv * 3.0 + vec2(uTime * 0.03, 0.0)).rgb;
  if (uIter == 0) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }
  float h = 0.0;
  float amp = 0.5;
  vec2 q = p + vec2(uTime * 0.15, 0.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 128; i++) {
    if (i >= uIter) break;
    h += amp * vnoise(q);
    acc += texture2D(uTex, q * 0.07 + float(i) * 0.013).rgb * amp;
    q = mat2(1.6, 1.2, -1.2, 1.6) * q + vec2(1.7, 9.2);
    amp *= 0.62;
  }
  vec3 n = normalize(vec3(-dFdx(h) * 60.0, -dFdy(h) * 60.0, 1.0));
  vec3 albedo = mix(base, acc, 0.5);
  vec3 col = albedo * 0.12;
  for (int l = 0; l < 3; l++) {
    float fl = float(l);
    vec3 lp = vec3(cos(uTime * 0.6 + fl * 2.1) * 2.5, sin(uTime * 0.5 + fl * 1.7) * 1.5, 1.2);
    vec3 L = normalize(lp - vec3(p * 0.6, h));
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, H), 0.0), 48.0);
    vec3 lc = l == 0 ? vec3(0.35, 0.6, 1.0) : (l == 1 ? vec3(1.0, 0.7, 0.35) : vec3(0.5, 1.0, 0.7));
    col += albedo * diff * lc * 0.7 + spec * lc * 0.6;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(THREE: Three): BenchScene {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // 텍스처: 런타임에 만든 256×256 패턴(체커 + 노이즈 + 그라데이션) — 외부 이미지 없이 밉맵 · 반복 샘플링
  const S = 256;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const checker = ((x >> 5) + (y >> 5)) & 1;
      const nz = hash(x, y) * 40;
      data[i] = 30 + checker * 60 + nz + (x / S) * 90;
      data[i + 1] = 60 + checker * 40 + nz + (y / S) * 80;
      data[i + 2] = 120 + checker * 70 + nz;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, S, S);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;

  const uniforms = { uTex: { value: tex }, uTime: { value: 0 }, uIter: { value: 0 }, uRes: { value: new THREE.Vector2(16, 9) } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SHADER_VS, fragmentShader: SHADER_FS, depthTest: false, depthWrite: false });
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  return {
    scene,
    camera,
    setLevel(v) {
      uniforms.uIter.value = v;
    },
    update(time) {
      uniforms.uTime.value = time;
    },
    resize(w, h) {
      uniforms.uRes.value.set(w, h);
    },
    objectCount: () => 1,
    particleCount: () => 0,
    dispose() {
      geo.dispose();
      mat.dispose();
      tex.dispose();
      scene.clear();
    },
  };
}

/* =========================================================
   Geometry Stress — 고밀도 TorusKnot 를 격자로 배치 (Draw Call = 개수)
   Fragment 부하를 줄이려고 MeshNormalMaterial 사용 → 정점 · 삼각형 처리 위주
   ========================================================= */

function createGeometry(THREE: Three): BenchScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const camera = new THREE.PerspectiveCamera(50, ASPECT, 0.1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const mat = new THREE.MeshNormalMaterial();
  let geo: T.BufferGeometry | null = null;
  const meshes: T.Mesh[] = [];
  let level = 0;

  return {
    scene,
    camera,
    setLevel(v) {
      level = v;
      const L = GEO_LEVELS[v];
      meshes.forEach((m) => scene.remove(m));
      meshes.length = 0;
      geo?.dispose();
      geo = new THREE.TorusKnotGeometry(1, 0.28, L.tubular, L.radial);
      // 화면(높이 18.6 × 폭 33.2)에 격자로 채운다
      const cols = Math.ceil(Math.sqrt(L.count * ASPECT));
      const rows = Math.ceil(L.count / cols);
      const cell = Math.min(32 / cols, 17.5 / rows);
      const s = cell / 3;
      for (let i = 0; i < L.count; i++) {
        const m = new THREE.Mesh(geo, mat);
        const c = i % cols;
        const r = Math.floor(i / cols);
        m.position.set((c - (cols - 1) / 2) * cell, ((rows - 1) / 2 - r) * cell, 0);
        m.scale.setScalar(s);
        meshes.push(m);
        scene.add(m);
      }
    },
    update(time) {
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].rotation.x = time * 0.6 + i * 0.37;
        meshes[i].rotation.y = time * 0.8 + i * 0.21;
      }
    },
    objectCount: () => GEO_LEVELS[level].count,
    particleCount: () => 0,
    dispose() {
      geo?.dispose();
      mat.dispose();
      scene.clear();
    },
  };
}
