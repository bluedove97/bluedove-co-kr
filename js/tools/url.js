/* URL Encoder / Decoder + URL parser */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('url-in'), output = $('url-out'), status = $('url-status');
  var lastMode = 'encode';

  BD.initTabs($('url-root'));

  function method() { return document.querySelector('input[name="method"]:checked').value; }
  function setStatus(el, cls, msg) { el.className = 'status ' + cls; el.textContent = msg; }

  function encode() {
    lastMode = 'encode';
    var t = input.value;
    var r = method() === 'uri' ? encodeURI(t) : encodeURIComponent(t);
    if ($('plus-space').checked) r = r.replace(/%20/g, '+');
    output.value = r;
    setStatus(status, 'ok', '인코딩 완료 · ' + t.length + '자 → ' + r.length + '자');
  }

  function decode() {
    lastMode = 'decode';
    var t = input.value;
    if ($('plus-space').checked) t = t.replace(/\+/g, ' ');
    try {
      output.value = method() === 'uri' ? decodeURI(t) : decodeURIComponent(t);
      input.removeAttribute('aria-invalid');
      setStatus(status, 'ok', '디코딩 완료');
    } catch (e) {
      // 깨진 % 시퀀스 위치 찾기
      var pos = -1, m, re = /%[0-9A-Fa-f]{2}|%/g;
      while ((m = re.exec(t))) {
        var seq = t.slice(m.index).match(/^(%[0-9A-Fa-f]{2})+/);
        try { if (!seq) throw 0; decodeURIComponent(seq[0]); re.lastIndex = m.index + seq[0].length; }
        catch (x) { pos = m.index; break; }
      }
      output.value = '';
      input.setAttribute('aria-invalid', 'true');
      setStatus(status, 'err', '디코딩 실패 — 잘못된 % 시퀀스' + (pos >= 0 ? ' (' + (pos + 1) + '번째 글자 근처: "' + t.slice(pos, pos + 9) + '")' : ''));
    }
  }

  $('btn-encode').addEventListener('click', encode);
  $('btn-decode').addEventListener('click', decode);
  $('btn-swap').addEventListener('click', function () {
    input.value = output.value;
    if (lastMode === 'encode') decode(); else encode();
  });
  $('btn-clear').addEventListener('click', function () { input.value = ''; output.value = ''; status.className = 'status'; status.textContent = ''; input.removeAttribute('aria-invalid'); input.focus(); });
  input.addEventListener('input', function () { if (input.value) (lastMode === 'encode' ? encode : decode)(); else { output.value = ''; status.textContent = ''; status.className = 'status'; } });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="method"], #plus-space'), function (el) {
    el.addEventListener('change', function () { if (input.value) (lastMode === 'encode' ? encode : decode)(); });
  });

  /* ---------- parser ---------- */
  function safeDecode(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } }

  function row(k, v, mono) {
    var tr = document.createElement('tr');
    var th = document.createElement('th'); th.textContent = k;
    var td = document.createElement('td');
    if (mono !== false) td.className = 'mono';
    td.textContent = v === '' ? '(없음)' : v;
    tr.appendChild(th); tr.appendChild(td);
    return tr;
  }

  function parse() {
    var raw = $('parse-in').value.trim();
    var ps = $('parse-status');
    if (!raw) { setStatus(ps, 'warn', 'URL을 입력하세요.'); $('parse-result').hidden = true; return; }
    var u, prefixed = false;
    try { u = new URL(raw); } catch (e) {
      try { u = new URL('https://' + raw); prefixed = true; }
      catch (e2) { setStatus(ps, 'err', '올바른 URL 형식이 아닙니다.'); $('parse-result').hidden = true; return; }
    }
    if (prefixed) setStatus(ps, 'warn', '프로토콜이 없어 https:// 를 붙여 분석했습니다.');
    else setStatus(ps, 'ok', '분석 완료');
    var pb = $('parts-body'); pb.innerHTML = '';
    pb.appendChild(row('protocol', u.protocol));
    pb.appendChild(row('host', u.hostname));
    pb.appendChild(row('port', u.port || '(기본 ' + (u.protocol === 'https:' ? '443' : u.protocol === 'http:' ? '80' : '-') + ')'));
    pb.appendChild(row('origin', u.origin));
    pb.appendChild(row('pathname', safeDecode(u.pathname)));
    pb.appendChild(row('search', u.search));
    pb.appendChild(row('hash', safeDecode(u.hash)));
    if (u.username) pb.appendChild(row('username', u.username));

    var qb = $('params-body'); qb.innerHTML = '';
    var n = 0;
    u.searchParams.forEach(function (v, k) {
      n++;
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.className = 'mono'; th.textContent = k;
      var td = document.createElement('td');
      td.innerHTML = '<div class="copy-cell"><span class="mono"></span><button class="btn btn-ghost btn-sm" type="button">복사</button></div>';
      td.querySelector('span').textContent = v;
      td.querySelector('button').addEventListener('click', function () { BD.copy(v); });
      tr.appendChild(th); tr.appendChild(td);
      qb.appendChild(tr);
    });
    if (!n) qb.appendChild(row('', '쿼리 파라미터가 없습니다.', false));
    $('param-count').textContent = n ? '(' + n + '개)' : '';
    $('parse-result').hidden = false;
  }
  $('btn-parse').addEventListener('click', parse);
  $('parse-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); parse(); } });
})();
