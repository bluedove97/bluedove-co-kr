/* JSON <-> YAML (js-yaml 4.1.0, MIT) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var jsonPane = $('json-pane'), yamlPane = $('yaml-pane'), status = $('yaml-status');

  var SAMPLE_JSON = JSON.stringify({
    apiVersion: 'apps/v1', kind: 'Deployment',
    metadata: { name: 'playground', labels: { app: 'playground' } },
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: 'playground' } },
      template: {
        metadata: { labels: { app: 'playground' } },
        spec: { containers: [{ name: 'web', image: 'nginx:1.27', ports: [{ containerPort: 80 }] }] }
      }
    }
  }, null, 2);
  var SAMPLE_YAML = [
    'services:',
    '  web:',
    '    image: nginx:1.27',
    '    ports:',
    '      - "8080:80"',
    '    environment: &env',
    '      TZ: Asia/Seoul',
    '  api:',
    '    build: ./api',
    '    environment: *env   # 앵커 재사용',
    '    depends_on: [web]',
    ''
  ].join('\n');

  function setStatus(cls, html) { status.className = 'status ' + cls; status.innerHTML = html; }

  function jsonErrorLoc(msg, text) {
    var m = /line (\d+) column (\d+)/i.exec(msg);
    if (m) return m[1] + '번째 줄, ' + m[2] + '번째 칸';
    m = /position (\d+)/i.exec(msg);
    if (m) {
      var before = text.slice(0, +m[1]).split('\n');
      return before.length + '번째 줄, ' + (before[before.length - 1].length + 1) + '번째 칸';
    }
    return '';
  }

  function toYaml() {
    var text = jsonPane.value;
    if (!text.trim()) { setStatus('warn', 'JSON 칸이 비어 있습니다.'); return; }
    var data;
    try { data = JSON.parse(text); } catch (e) {
      jsonPane.setAttribute('aria-invalid', 'true');
      var loc = jsonErrorLoc(e.message, text);
      setStatus('err', '<strong>JSON 오류</strong> — ' + BD.escapeHtml(e.message) + (loc ? ' <span class="mono">(' + loc + ')</span>' : ''));
      return;
    }
    jsonPane.removeAttribute('aria-invalid');
    var opts = { indent: Number($('indent').value), lineWidth: -1, noRefs: true, sortKeys: $('sort-keys').checked };
    var out;
    if ($('multi-doc').checked && Array.isArray(data)) {
      out = data.map(function (d) { return jsyaml.dump(d, opts); }).join('---\n');
    } else {
      out = jsyaml.dump(data, opts);
    }
    yamlPane.value = out;
    yamlPane.removeAttribute('aria-invalid');
    setStatus('ok', 'JSON → YAML 변환 완료 (' + out.split('\n').length + '줄)');
  }

  function toJson() {
    var text = yamlPane.value;
    if (!text.trim()) { setStatus('warn', 'YAML 칸이 비어 있습니다.'); return; }
    var docs;
    try {
      docs = [];
      jsyaml.loadAll(text, function (d) { docs.push(d); });
    } catch (e) {
      yamlPane.setAttribute('aria-invalid', 'true');
      var loc = e.mark ? ' <span class="mono">(' + (e.mark.line + 1) + '번째 줄, ' + (e.mark.column + 1) + '번째 칸)</span>' : '';
      setStatus('err', '<strong>YAML 오류</strong> — ' + BD.escapeHtml(e.reason || e.message) + loc);
      return;
    }
    yamlPane.removeAttribute('aria-invalid');
    docs = docs.filter(function (d) { return d !== undefined; });
    var data = docs.length > 1 ? docs : docs[0];
    if (data === undefined) data = null;
    if ($('sort-keys').checked) data = sortDeep(data);
    var ind = Number($('indent').value);
    try {
      jsonPane.value = JSON.stringify(data, function (k, v) {
        return v instanceof Date ? v.toISOString() : v;
      }, ind);
    } catch (e) {
      setStatus('err', '<strong>JSON으로 표현할 수 없는 값</strong> — ' + BD.escapeHtml(e.message));
      return;
    }
    jsonPane.removeAttribute('aria-invalid');
    setStatus('ok', 'YAML → JSON 변환 완료' + (docs.length > 1 ? ' (문서 ' + docs.length + '개 → 배열)' : ''));
  }

  function sortDeep(v) {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      var o = {};
      Object.keys(v).sort().forEach(function (k) { o[k] = sortDeep(v[k]); });
      return o;
    }
    return v;
  }

  $('to-yaml').addEventListener('click', toYaml);
  $('to-json').addEventListener('click', toJson);
  $('json-sample').addEventListener('click', function () { jsonPane.value = SAMPLE_JSON; toYaml(); });
  $('yaml-sample').addEventListener('click', function () { yamlPane.value = SAMPLE_YAML; toJson(); });
  $('json-clear').addEventListener('click', function () { jsonPane.value = ''; jsonPane.removeAttribute('aria-invalid'); status.className = 'status'; status.textContent = ''; });
  $('yaml-clear').addEventListener('click', function () { yamlPane.value = ''; yamlPane.removeAttribute('aria-invalid'); status.className = 'status'; status.textContent = ''; });
  jsonPane.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); toYaml(); } });
  yamlPane.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); toJson(); }
  });
})();
