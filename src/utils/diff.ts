/* Myers O(ND) diff — 정수 배열(A, B)에 대해 편집 연산 목록 반환 */

import { escapeHtml as esc } from './format';

export type Op = { t: 'eq' | 'del' | 'ins'; a?: number; b?: number };

const MAX_D = 6000;

function core(a: number[], b: number[]): Op[] {
  const N = a.length;
  const M = b.length;
  const ops: Op[] = [];
  if (!N) {
    for (let i = 0; i < M; i++) ops.push({ t: 'ins', b: i });
    return ops;
  }
  if (!M) {
    for (let i = 0; i < N; i++) ops.push({ t: 'del', a: i });
    return ops;
  }
  const max = N + M;
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let D = -1;
  let x = 0;
  let y = 0;
  outer: for (let d = 0; d <= max; d++) {
    if (d > MAX_D) break;
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
      else x = v[off + k - 1] + 1;
      y = x - k;
      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= N && y >= M) {
        D = d;
        break outer;
      }
    }
  }
  if (D < 0) {
    // 너무 다르면 전체 삭제 + 전체 추가로 처리
    for (let i = 0; i < N; i++) ops.push({ t: 'del', a: i });
    for (let i = 0; i < M; i++) ops.push({ t: 'ins', b: i });
    return ops;
  }
  x = N;
  y = M;
  for (let d = D; d >= 0; d--) {
    const snap = trace[d];
    const k = x - y;
    const pk = k === -d || (k !== d && snap[k - 1 + d + 1] < snap[k + 1 + d + 1]) ? k + 1 : k - 1;
    const px = snap[pk + d + 1];
    const py = px - pk;
    while (x > px && y > py) {
      ops.push({ t: 'eq', a: x - 1, b: y - 1 });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === px) ops.push({ t: 'ins', b: py });
      else ops.push({ t: 'del', a: px });
    }
    x = px;
    y = py;
  }
  return ops.reverse();
}

/** 공통 접두·접미를 먼저 잘라 낸 뒤 core 실행 */
export function diffSeq(A: number[], B: number[]): Op[] {
  const n = A.length;
  const m = B.length;
  let s = 0;
  while (s < n && s < m && A[s] === B[s]) s++;
  let ea = n;
  let eb = m;
  while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) {
    ea--;
    eb--;
  }
  const ops: Op[] = [];
  for (let i = 0; i < s; i++) ops.push({ t: 'eq', a: i, b: i });
  core(A.slice(s, ea), B.slice(s, eb)).forEach((o) => {
    ops.push({ t: o.t, a: o.a === undefined ? undefined : o.a + s, b: o.b === undefined ? undefined : o.b + s });
  });
  for (let i = 0; i < n - ea; i++) ops.push({ t: 'eq', a: ea + i, b: eb + i });
  return ops;
}

/** 문자열 배열 두 개를 같은 정수 id 공간으로 변환 */
export function intern(arrA: string[], arrB: string[]): [number[], number[]] {
  const map = new Map<string, number>();
  let id = 0;
  const f = (s: string) => {
    let v = map.get(s);
    if (v === undefined) {
      v = id++;
      map.set(s, v);
    }
    return v;
  };
  return [arrA.map(f), arrB.map(f)];
}

/** 한 줄 안의 글자 단위 차이를 <del>/<ins> 로 강조한 HTML (escape 됨) */
export function charDiff(la: string, lb: string): [string, string] {
  if (la.length > 2000 || lb.length > 2000) return [esc(la), esc(lb)];
  const A = Array.from(la);
  const B = Array.from(lb);
  const [ia, ib] = intern(A, B);
  const ops = diffSeq(ia, ib);
  let left = '';
  let right = '';
  let cur: Op['t'] | null = null;
  let buf = '';
  const flush = (side: 'l' | 'r') => {
    if (!buf) return;
    const html = cur === 'eq' ? esc(buf) : cur === 'del' ? '<del>' + esc(buf) + '</del>' : '<ins>' + esc(buf) + '</ins>';
    if (side === 'l') left += html;
    else right += html;
    buf = '';
  };
  ops.forEach((o) => {
    if (o.t === 'ins') return;
    if (o.t !== cur) {
      flush('l');
      cur = o.t;
    }
    buf += A[o.a!];
  });
  flush('l');
  cur = null;
  ops.forEach((o) => {
    if (o.t === 'del') return;
    if (o.t !== cur) {
      flush('r');
      cur = o.t;
    }
    buf += B[o.b!];
  });
  flush('r');
  return [left, right];
}

export function splitLines(t: string): string[] {
  if (t === '') return [];
  const l = t.replace(/\r\n?/g, '\n').split('\n');
  if (l[l.length - 1] === '') l.pop();
  return l;
}

/** 줄 diff 결과 표 HTML 생성 */
export function renderDiffTable(A: string[], B: string[], ops: Op[], view: 'split' | 'unified', onlyChanges: boolean): string {
  type Block = { type: 'eq' | 'chg'; eq: Op[]; del: number[]; ins: number[] };
  const blocks: Block[] = [];
  let curB: Block | null = null;
  ops.forEach((o) => {
    const type = o.t === 'eq' ? 'eq' : 'chg';
    if (!curB || curB.type !== type) {
      curB = { type, eq: [], del: [], ins: [] };
      blocks.push(curB);
    }
    if (o.t === 'eq') curB.eq.push(o);
    else if (o.t === 'del') curB.del.push(o.a!);
    else curB.ins.push(o.b!);
  });

  const CTX = 3;
  const html: string[] = [];
  const cols = view === 'split' ? 7 : 4;

  const gapRow = (n: number) => html.push('<tr class="gap"><td colspan="' + cols + '">··· ' + n + '줄 같음 ···</td></tr>');
  const eqRow = (o: Op) => {
    const t = esc(B[o.b!]);
    if (view === 'split')
      html.push(
        '<tr><td class="ln">' + (o.a! + 1) + '</td><td class="sg"></td><td class="c">' + esc(A[o.a!]) + '</td><td class="split-gap"></td><td class="ln">' + (o.b! + 1) + '</td><td class="sg"></td><td class="c">' + t + '</td></tr>',
      );
    else html.push('<tr><td class="ln">' + (o.a! + 1) + '</td><td class="ln">' + (o.b! + 1) + '</td><td class="sg"></td><td class="c">' + t + '</td></tr>');
  };

  blocks.forEach((b, bi) => {
    if (b.type === 'eq') {
      const list = b.eq;
      if (onlyChanges && list.length > CTX * 2 + 1) {
        const head = bi === 0 ? 0 : CTX;
        const tail = bi === blocks.length - 1 ? 0 : CTX;
        list.slice(0, head).forEach(eqRow);
        gapRow(list.length - head - tail);
        list.slice(list.length - tail).forEach(eqRow);
      } else list.forEach(eqRow);
      return;
    }
    const pairs = Math.min(b.del.length, b.ins.length);
    const hl: [string, string][] = [];
    for (let i = 0; i < pairs; i++) hl.push(charDiff(A[b.del[i]], B[b.ins[i]]));
    if (view === 'split') {
      const n = Math.max(b.del.length, b.ins.length);
      for (let j = 0; j < n; j++) {
        const ai = b.del[j];
        const bj = b.ins[j];
        const L =
          ai === undefined
            ? '<td class="ln"></td><td class="sg"></td><td class="c empty"></td>'
            : '<td class="ln">' + (ai + 1) + '</td><td class="sg" style="color:var(--diff-del-ink);background:var(--diff-del)">−</td><td class="c del">' + (j < pairs ? hl[j][0] : esc(A[ai])) + '</td>';
        const R =
          bj === undefined
            ? '<td class="ln"></td><td class="sg"></td><td class="c empty"></td>'
            : '<td class="ln">' + (bj + 1) + '</td><td class="sg" style="color:var(--diff-add-ink);background:var(--diff-add)">+</td><td class="c add">' + (j < pairs ? hl[j][1] : esc(B[bj])) + '</td>';
        html.push('<tr>' + L + '<td class="split-gap"></td>' + R + '</tr>');
      }
    } else {
      b.del.forEach((ai, j) => html.push('<tr class="del"><td class="ln">' + (ai + 1) + '</td><td class="ln"></td><td class="sg">−</td><td class="c">' + (j < pairs ? hl[j][0] : esc(A[ai])) + '</td></tr>'));
      b.ins.forEach((bj, j) => html.push('<tr class="add"><td class="ln"></td><td class="ln">' + (bj + 1) + '</td><td class="sg">+</td><td class="c">' + (j < pairs ? hl[j][1] : esc(B[bj])) + '</td></tr>'));
    }
  });

  const colgroup =
    view === 'split'
      ? '<colgroup><col style="width:48px"><col style="width:22px"><col><col style="width:1px"><col style="width:48px"><col style="width:22px"><col></colgroup>'
      : '<colgroup><col style="width:48px"><col style="width:48px"><col style="width:22px"><col></colgroup>';
  return '<table class="diff-table">' + colgroup + '<tbody>' + html.join('') + '</tbody></table>';
}
