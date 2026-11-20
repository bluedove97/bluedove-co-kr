/* 텍스트 비교(Myers diff) · 줄 정렬 · 글자 수 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = BD.escapeHtml;

  BD.initTabs($('diff-root'));

  /* =========================================================
     Myers O(ND) diff — 정수 배열(A, B)에 대해 ops 반환
     ops: [{t:'eq'|'del'|'ins', a:index, b:index}]
     ========================================================= */
  var MAX_D = 6000;

  function core(a, b) {
    var N = a.length, M = b.length, ops = [], i;
    if (!N) { for (i = 0; i < M; i++) ops.push({ t: 'ins', b: i }); return ops; }
    if (!M) { for (i = 0; i < N; i++) ops.push({ t: 'del', a: i }); return ops; }
    var max = N + M, off = max + 1;
    var v = new Int32Array(2 * max + 3);
    var trace = [], D = -1, x, y, k, d;
    outer:
    for (d = 0; d <= max; d++) {
      if (d > MAX_D) break;
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (k = -d; k <= d; k += 2) {
        if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
        else x = v[off + k - 1] + 1;
        y = x - k;
        while (x < N && y < M && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= N && y >= M) { D = d; break outer; }
      }
    }
    if (D < 0) { // 너무 다르면 전체 삭제 + 전체 추가로 처리
      for (i = 0; i < N; i++) ops.push({ t: 'del', a: i });
      for (i = 0; i < M; i++) ops.push({ t: 'ins', b: i });
      return ops;
    }
    x = N; y = M;
    for (d = D; d >= 0; d--) {
      var snap = trace[d];
      k = x - y;
      var pk = (k === -d || (k !== d && snap[k - 1 + d + 1] < snap[k + 1 + d + 1])) ? k + 1 : k - 1;
      var px = snap[pk + d + 1], py = px - pk;
      while (x > px && y > py) { ops.push({ t: 'eq', a: x - 1, b: y - 1 }); x--; y--; }
      if (d > 0) {
        if (x === px) ops.push({ t: 'ins', b: py });
        else ops.push({ t: 'del', a: px });
      }
      x = px; y = py;
    }
    return ops.reverse();
  }

  function diffSeq(A, B) {
    var n = A.length, m = B.length, s = 0;
    while (s < n && s < m && A[s] === B[s]) s++;
    var ea = n, eb = m;
    while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
    var ops = [], i;
    for (i = 0; i < s; i++) ops.push({ t: 'eq', a: i, b: i });
    core(A.slice(s, ea), B.slice(s, eb)).forEach(function (o) {
      ops.push({ t: o.t, a: o.a === undefined ? undefined : o.a + s, b: o.b === undefined ? undefined : o.b + s });
    });
    for (i = 0; i < n - ea; i++) ops.push({ t: 'eq', a: ea + i, b: eb + i });
    return ops;
  }

  function intern(arrA, arrB) {
    var map = new Map(), id = 0;
    function f(s) { var v = map.get(s); if (v === undefined) { v = id++; map.set(s, v); } return v; }
    return [arrA.map(f), arrB.map(f)];
  }

  /* 글자 단위 강조 */
  function charDiff(la, lb) {
    if (la.length > 2000 || lb.length > 2000) return [esc(la), esc(lb)];
    var A = Array.from(la), B = Array.from(lb);
    var ids = intern(A, B);
    var ops = diffSeq(ids[0], ids[1]);
    var left = '', right = '', cur = null, buf = '';
    function flush(side) {
      if (!buf) return;
      var html = cur === 'eq' ? esc(buf) : (cur === 'del' ? '<del>' + esc(buf) + '</del>' : '<ins>' + esc(buf) + '</ins>');
      if (side === 'l') left += html; else right += html;
      buf = '';
    }
    // 왼쪽(del + eq)
    cur = null;
    ops.forEach(function (o) {
      if (o.t === 'ins') return;
      if (o.t !== cur) { flush('l'); cur = o.t; }
      buf += A[o.a];
    });
    flush('l');
    cur = null;
    ops.forEach(function (o) {
      if (o.t === 'del') return;
      if (o.t !== cur) { flush('r'); cur = o.t; }
      buf += B[o.b];
    });
    flush('r');
    return [left, right];
  }

  /* ---------- diff UI ---------- */
  var SAMPLE_A = 'server:\n  port: 8080\n  host: localhost\nlogging:\n  level: INFO\nfeatures:\n  - json\n  - yaml\n  - base64\n';
  var SAMPLE_B = 'server:\n  port: 9090\n  host: 0.0.0.0\nlogging:\n  level: INFO\n  file: /var/log/app.log\nfeatures:\n  - json\n  - base64\n  - jwt\n';

  function splitLines(t) {
    if (t === '') return [];
    var l = t.replace(/\r\n?/g, '\n').split('\n');
    if (l[l.length - 1] === '') l.pop();
    return l;
  }

  function runDiff() {
    var ta = $('diff-a').value, tb = $('diff-b').value;
    var st = $('diff-status'), out = $('diff-out');
    if (!ta && !tb) { st.className = 'status warn'; st.textContent = '비교할 텍스트를 입력하세요.'; out.hidden = true; return; }
    var A = splitLines(ta), B = splitLines(tb);
    if (A.length + B.length > 60000) { st.className = 'status err'; st.textContent = '줄 수가 너무 많습니다 (합계 60,000줄 이하).'; return; }
    var ign = $('ign-ws').checked, icase = $('ign-case').checked;
    function key(s) { if (ign) s = s.replace(/\s+/g, ' ').trim(); if (icase) s = s.toLowerCase(); return s; }
    var ids = intern(A.map(key), B.map(key));
    var t0 = performance.now();
    var ops = diffSeq(ids[0], ids[1]);
    var ms = performance.now() - t0;

    var add = 0, del = 0;
    ops.forEach(function (o) { if (o.t === 'ins') add++; else if (o.t === 'del') del++; });
    if (!add && !del) {
      st.className = 'status ok';
      st.textContent = '두 텍스트가 같습니다' + (ign || icase ? ' (옵션 기준)' : '') + '. 총 ' + A.length + '줄';
      out.hidden = true;
      return;
    }
    st.className = 'status';
    st.innerHTML = '<span><b style="color:var(--diff-add-ink)">+' + add + '</b> 추가 · <b style="color:var(--diff-del-ink)">−' + del + '</b> 삭제 · A ' + A.length + '줄 / B ' + B.length + '줄 <span class="meta">(' + ms.toFixed(1) + 'ms)</span></span>';

    // hunk 묶기: eq 블록과 change 블록
    var blocks = [], curB = null;
    ops.forEach(function (o) {
      var type = o.t === 'eq' ? 'eq' : 'chg';
      if (!curB || curB.type !== type) { curB = { type: type, eq: [], del: [], ins: [] }; blocks.push(curB); }
      if (o.t === 'eq') curB.eq.push(o); else if (o.t === 'del') curB.del.push(o.a); else curB.ins.push(o.b);
    });

    var view = document.querySelector('input[name="view"]:checked').value;
    var only = $('only-changes').checked;
    var CTX = 3;
    var html = [];
    var cols = view === 'split' ? 7 : 4;

    function gapRow(n) { html.push('<tr class="gap"><td colspan="' + cols + '">··· ' + n + '줄 같음 ···</td></tr>'); }
    function eqRow(o) {
      var t = esc(B[o.b]);
      if (view === 'split') html.push('<tr><td class="ln">' + (o.a + 1) + '</td><td class="sg"></td><td class="c">' + esc(A[o.a]) + '</td><td class="split-gap"></td><td class="ln">' + (o.b + 1) + '</td><td class="sg"></td><td class="c">' + t + '</td></tr>');
      else html.push('<tr><td class="ln">' + (o.a + 1) + '</td><td class="ln">' + (o.b + 1) + '</td><td class="sg"></td><td class="c">' + t + '</td></tr>');
    }

    blocks.forEach(function (b, bi) {
      if (b.type === 'eq') {
        var list = b.eq;
        if (only && list.length > CTX * 2 + 1) {
          var head = bi === 0 ? 0 : CTX, tail = bi === blocks.length - 1 ? 0 : CTX;
          list.slice(0, head).forEach(eqRow);
          gapRow(list.length - head - tail);
          list.slice(list.length - tail).forEach(eqRow);
        } else list.forEach(eqRow);
        return;
      }
      var pairs = Math.min(b.del.length, b.ins.length);
      var hl = [];
      for (var i = 0; i < pairs; i++) hl.push(charDiff(A[b.del[i]], B[b.ins[i]]));
      if (view === 'split') {
        var n = Math.max(b.del.length, b.ins.length);
        for (var j = 0; j < n; j++) {
          var ai = b.del[j], bj = b.ins[j];
          var L = ai === undefined ? '<td class="ln"></td><td class="sg"></td><td class="c empty"></td>'
            : '<td class="ln">' + (ai + 1) + '</td><td class="sg" style="color:var(--diff-del-ink);background:var(--diff-del)">−</td><td class="c del">' + (j < pairs ? hl[j][0] : esc(A[ai])) + '</td>';
          var R = bj === undefined ? '<td class="ln"></td><td class="sg"></td><td class="c empty"></td>'
            : '<td class="ln">' + (bj + 1) + '</td><td class="sg" style="color:var(--diff-add-ink);background:var(--diff-add)">+</td><td class="c add">' + (j < pairs ? hl[j][1] : esc(B[bj])) + '</td>';
          html.push('<tr>' + L + '<td class="split-gap"></td>' + R + '</tr>');
        }
      } else {
        b.del.forEach(function (ai, j) { html.push('<tr class="del"><td class="ln">' + (ai + 1) + '</td><td class="ln"></td><td class="sg">−</td><td class="c">' + (j < pairs ? hl[j][0] : esc(A[ai])) + '</td></tr>'); });
        b.ins.forEach(function (bj, j) { html.push('<tr class="add"><td class="ln"></td><td class="ln">' + (bj + 1) + '</td><td class="sg">+</td><td class="c">' + (j < pairs ? hl[j][1] : esc(B[bj])) + '</td></tr>'); });
      }
    });

    var colgroup = view === 'split'
      ? '<colgroup><col style="width:48px"><col style="width:22px"><col><col style="width:1px"><col style="width:48px"><col style="width:22px"><col></colgroup>'
      : '<colgroup><col style="width:48px"><col style="width:48px"><col style="width:22px"><col></colgroup>';
    out.innerHTML = '<table class="diff-table">' + colgroup + '<tbody>' + html.join('') + '</tbody></table>';
    out.hidden = false;
  }

  $('btn-diff').addEventListener('click', runDiff);
  $('btn-sample').addEventListener('click', function () { $('diff-a').value = SAMPLE_A; $('diff-b').value = SAMPLE_B; runDiff(); });
  $('btn-swap-ab').addEventListener('click', function () { var t = $('diff-a').value; $('diff-a').value = $('diff-b').value; $('diff-b').value = t; if (!$('diff-out').hidden) runDiff(); });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="view"], #ign-ws, #ign-case, #only-changes'), function (el) {
    el.addEventListener('change', function () { if (!$('diff-out').hidden || $('diff-status').textContent) runDiff(); });
  });

  /* =========================================================
     줄 정렬
     ========================================================= */
  function countLines(t) { return t ? splitLines(t).length : 0; }
  function runSort() {
    var lines = splitLines($('sort-in').value);
    var before = lines.length;
    var icase = $('s-case').checked;
    if ($('s-trim').checked) lines = lines.map(function (l) { return l.trim(); });
    if ($('s-empty').checked) lines = lines.filter(function (l) { return l.trim() !== ''; });
    if ($('s-dedupe').checked) {
      var seen = new Set();
      lines = lines.filter(function (l) { var k = icase ? l.toLowerCase() : l; if (seen.has(k)) return false; seen.add(k); return true; });
    }
    var coll = new Intl.Collator('ko', { numeric: true, sensitivity: icase ? 'accent' : 'variant' });
    var num = function (s) { var m = /-?\d+(?:\.\d+)?/.exec(s.replace(/,/g, '')); return m ? parseFloat(m[0]) : Infinity; };
    switch ($('sort-mode').value) {
      case 'asc': lines.sort(coll.compare); break;
      case 'desc': lines.sort(function (a, b) { return coll.compare(b, a); }); break;
      case 'num-asc': lines.sort(function (a, b) { return num(a) - num(b) || coll.compare(a, b); }); break;
      case 'num-desc': lines.sort(function (a, b) { var x = num(a), y = num(b); if (x === Infinity) x = -Infinity; if (y === Infinity) y = -Infinity; return y - x || coll.compare(a, b); }); break;
      case 'len-asc': lines.sort(function (a, b) { return a.length - b.length || coll.compare(a, b); }); break;
      case 'len-desc': lines.sort(function (a, b) { return b.length - a.length || coll.compare(a, b); }); break;
      case 'reverse': lines.reverse(); break;
      case 'shuffle':
        for (var i = lines.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = lines[i]; lines[i] = lines[j]; lines[j] = t; }
        break;
    }
    $('sort-out').value = lines.join('\n');
    $('sort-out-meta').textContent = '· ' + before + '줄 → ' + lines.length + '줄';
  }
  $('btn-sort').addEventListener('click', runSort);
  $('sort-in').addEventListener('input', function () { $('sort-in-meta').textContent = countLines($('sort-in').value) + '줄'; });
  Array.prototype.forEach.call(document.querySelectorAll('#sort-mode, #s-dedupe, #s-empty, #s-trim, #s-case'), function (el) {
    el.addEventListener('change', function () { if ($('sort-in').value) runSort(); });
  });
  $('btn-sort-back').addEventListener('click', function () {
    $('sort-in').value = $('sort-out').value;
    $('sort-in-meta').textContent = countLines($('sort-in').value) + '줄';
  });

  /* =========================================================
     글자 수
     ========================================================= */
  var seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
  function graphemes(s) {
    if (!seg) return Array.from(s);
    var out = [];
    for (var it = seg.segment(s)[Symbol.iterator](), r = it.next(); !r.done; r = it.next()) out.push(r.value.segment);
    return out;
  }
  var enc = new TextEncoder();
  function runCount() {
    var t = $('count-in').value.replace(/\r\n?/g, '\n');
    var g = graphemes(t);
    var nows = g.filter(function (c) { return !/^\s+$/.test(c); }).length;
    var words = t.trim() ? t.trim().split(/\s+/).length : 0;
    var lines = t ? t.split('\n').length : 0;
    var utf8 = enc.encode(t).length;
    var euckr = 0, ko = 0, en = 0;
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) { euckr += 2; i++; continue; }
      euckr += c < 128 ? 1 : 2;
      if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x3131 && c <= 0x318E)) ko++;
      else if (/[A-Za-z0-9]/.test(t[i])) en++;
    }
    $('c-all').textContent = g.length.toLocaleString();
    $('c-nows').textContent = nows.toLocaleString();
    $('c-words').textContent = words.toLocaleString();
    $('c-lines').textContent = lines.toLocaleString();
    $('c-utf8').textContent = utf8.toLocaleString();
    $('c-euckr').textContent = euckr.toLocaleString();
    $('c-ko').textContent = ko.toLocaleString();
    $('c-en').textContent = en.toLocaleString();
    $('c-sms').textContent = !t ? '' : euckr <= 90 ? '문자 메시지: SMS(단문, 90바이트 이하)로 보낼 수 있습니다.'
      : euckr <= 2000 ? '문자 메시지: 90바이트를 넘어 LMS(장문, 2,000바이트 이하)로 보내야 합니다.'
        : '문자 메시지: 2,000바이트를 넘어 LMS 한 건으로 보낼 수 없습니다.';
  }
  $('count-in').addEventListener('input', runCount);
  $('btn-count-clear').addEventListener('click', function () { $('count-in').value = ''; runCount(); $('count-in').focus(); });
})();
