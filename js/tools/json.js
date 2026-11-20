/* JSON Formatter / Validator */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('json-in'), output = $('json-out'), status = $('json-status');
  var indentSel = $('indent'), sortKeys = $('sort-keys');
  var HIGHLIGHT_LIMIT = 1024 * 1024;
  var lastResult = '';

  var SAMPLE = '{"site":"Bluedove\'s Developer Playground","year":2026,"tools":[{"id":"json","category":"developer","free":true},{"id":"age","category":"daily","free":true}],"owner":{"name":"bluedove","since":2004,"cka":true},"server":null}';

  function indent() {
    var v = indentSel.value;
    return v === 'tab' ? '\t' : Number(v);
  }

  function sortDeep(v) {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).sort().forEach(function (k) { o[k] = sortDeep(v[k]); });
      return o;
    }
    return v;
  }

  function analyze(v) {
    var keys = 0, maxDepth = 0;
    (function walk(x, d) {
      if (d > maxDepth) maxDepth = d;
      if (Array.isArray(x)) x.forEach(function (y) { walk(y, d + 1); });
      else if (x && typeof x === 'object') {
        var ks = Object.keys(x);
        keys += ks.length;
        ks.forEach(function (k) { walk(x[k], d + 1); });
      }
    })(v, 0);
    var type = v === null ? 'null' : Array.isArray(v) ? 'array[' + v.length + ']' : typeof v;
    return { keys: keys, depth: maxDepth, type: type };
  }

  /* 브라우저마다 다른 오류 메시지에서 위치를 뽑아 줄/칸 계산 */
  function errorLocation(msg, text) {
    var m = /line (\d+) column (\d+)/i.exec(msg);
    if (m) return { line: +m[1], col: +m[2] };
    m = /position (\d+)/i.exec(msg);
    if (m) {
      var pos = +m[1];
      var before = text.slice(0, pos).split('\n');
      return { line: before.length, col: before[before.length - 1].length + 1 };
    }
    if (/end of (JSON )?input|unexpected end/i.test(msg)) {
      var lines = text.split('\n');
      return { line: lines.length, col: lines[lines.length - 1].length + 1 };
    }
    return null;
  }

  function parse(text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      return { ok: false, message: e.message, loc: errorLocation(e.message, text) };
    }
  }

  function showError(r, text) {
    input.setAttribute('aria-invalid', 'true');
    status.className = 'status err';
    var html = '<div><strong>JSON 문법 오류</strong> — ' + BD.escapeHtml(r.message);
    if (r.loc) {
      var line = text.split('\n')[r.loc.line - 1] || '';
      var start = Math.max(0, r.loc.col - 40);
      var snippet = line.slice(start, r.loc.col + 40);
      var caret = new Array(r.loc.col - start).join(' ') + '^';
      html += '<br><span class="mono">' + r.loc.line + '번째 줄, ' + r.loc.col + '번째 칸</span>' +
        '<pre class="mono" style="margin:8px 0 0;white-space:pre;overflow-x:auto">' + BD.escapeHtml(snippet) + '\n' + caret + '</pre>';
    }
    status.innerHTML = html + '</div>';
    $('json-stats').hidden = true;
  }

  function render(text) {
    lastResult = text;
    if (text.length <= HIGHLIGHT_LIMIT) output.innerHTML = BD.highlightJson(text);
    else output.textContent = text;
  }

  function run(mode) {
    var text = input.value;
    if (!text.trim()) {
      status.className = 'status';
      status.textContent = 'JSON을 입력하세요.';
      output.textContent = '';
      lastResult = '';
      input.removeAttribute('aria-invalid');
      $('json-stats').hidden = true;
      return;
    }
    var r = parse(text);
    if (!r.ok) { showError(r, text); return; }
    input.removeAttribute('aria-invalid');
    var v = sortKeys.checked ? sortDeep(r.value) : r.value;
    if (mode === 'format') render(JSON.stringify(v, null, indent()));
    else if (mode === 'minify') render(JSON.stringify(v));

    var info = analyze(r.value);
    status.className = 'status ok';
    status.textContent = '올바른 JSON입니다.';
    $('json-stats').hidden = false;
    $('st-size').innerHTML = BD.escapeHtml(BD.formatBytes(new Blob([text]).size));
    $('st-type').textContent = info.type;
    $('st-keys').textContent = info.keys.toLocaleString();
    $('st-depth').textContent = info.depth;
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { run('validate'); }, 250);
  });
  $('btn-format').addEventListener('click', function () { run('format'); });
  $('btn-minify').addEventListener('click', function () { run('minify'); });
  indentSel.addEventListener('change', function () { if (lastResult) run('format'); });
  sortKeys.addEventListener('change', function () { if (lastResult) run('format'); });
  $('btn-sample').addEventListener('click', function () { input.value = SAMPLE; run('format'); input.focus(); });
  $('btn-clear').addEventListener('click', function () { input.value = ''; run(); input.focus(); });
  $('btn-download').addEventListener('click', function () {
    if (!lastResult) { BD.toast('먼저 정렬하거나 압축하세요'); return; }
    BD.download(lastResult, 'formatted.json', 'application/json');
  });
  input.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run('format'); }
  });
})();
