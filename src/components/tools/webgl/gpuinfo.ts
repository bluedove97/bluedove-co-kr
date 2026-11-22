/**
 * WebGL / GPU 정보 조회 — 임시 캔버스로 컨텍스트를 만들어 읽고 바로 해제한다.
 * GPU 모델명은 WEBGL_debug_renderer_info 확장으로만 읽는다. 확장이 없거나 브라우저가 막으면 null(N/A).
 */

export type GpuInfo = {
  /** 'WebGL 2.0' | 'WebGL 1.0' | null(미지원) */
  version: 'WebGL 2.0' | 'WebGL 1.0' | null;
  webgl2: boolean;
  renderer: string | null;
  vendor: string | null;
  maxTextureSize: number | null;
  maxRenderbufferSize: number | null;
  maxVertexAttribs: number | null;
  /** EXT_disjoint_timer_query_webgl2 지원 여부 (WebGL 2 만) */
  timerQuery: boolean;
  /** 컨텍스트 생성 실패 사유 */
  error: string | null;
};

export function probeGpu(): GpuInfo {
  const info: GpuInfo = {
    version: null,
    webgl2: false,
    renderer: null,
    vendor: null,
    maxTextureSize: null,
    maxRenderbufferSize: null,
    maxVertexAttribs: null,
    timerQuery: false,
    error: null,
  };

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement('canvas');
  } catch {
    info.error = 'Canvas를 만들 수 없습니다.';
    return info;
  }

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2');
    if (gl) {
      info.version = 'WebGL 2.0';
      info.webgl2 = true;
    } else {
      gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) info.version = 'WebGL 1.0';
    }
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
  }
  if (!gl) {
    info.error ??= 'WebGL 컨텍스트를 만들 수 없습니다. 하드웨어 가속이 꺼져 있거나 브라우저가 WebGL을 지원하지 않습니다.';
    return info;
  }

  try {
    info.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    info.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    info.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      info.renderer = clean(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
      info.vendor = clean(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
    }
    if (info.webgl2) info.timerQuery = !!gl.getExtension('EXT_disjoint_timer_query_webgl2');
  } catch {
    /* 일부 값만 읽힌 상태로 둔다 */
  }

  // 조회용 컨텍스트는 바로 반납 (브라우저의 동시 컨텍스트 수 제한)
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* 무시 */
  }
  return info;
}

function clean(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
