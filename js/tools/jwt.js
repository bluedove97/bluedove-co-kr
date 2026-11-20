/* JWT Decoder + signature verification (Web Crypto API) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('jwt-in'), status = $('jwt-status'), vstatus = $('verify-status');
  var keyIn = $('key-in');
  var current = null; // { header, payload, parts }

  var enc = new TextEncoder();

  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodePart(s, name) {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error(name + ' 부분에 Base64URL이 아닌 문자가 있습니다.');
    var text = new TextDecoder().decode(b64urlToBytes(s));
    try { return JSON.parse(text); } catch (e) { throw new Error(name + ' 부분이 JSON이 아닙니다.'); }
  }

  function fmtDate(sec) {
    var d = new Date(sec * 1000);
    if (isNaN(d)) return '-';
    var kst = d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return kst + ' (KST)';
  }
  function relative(sec) {
    var diff = sec - Date.now() / 1000;
    var a = Math.abs(diff);
    var t = a < 60 ? Math.round(a) + '초' : a < 3600 ? Math.round(a / 60) + '분' : a < 86400 ? (a / 3600).toFixed(1) + '시간' : (a / 86400).toFixed(1) + '일';
    return diff >= 0 ? t + ' 후' : t + ' 전';
  }

  var CLAIM_NAMES = { iss: '발급자', sub: '주체', aud: '대상', exp: '만료 시각', nbf: '유효 시작', iat: '발급 시각', jti: '토큰 ID' };

  function renderClaims(p) {
    var tb = document.createElement('tbody');
    var now = Date.now() / 1000;
    Object.keys(p).forEach(function (k) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.innerHTML = '<span class="mono">' + BD.escapeHtml(k) + '</span>' + (CLAIM_NAMES[k] ? '<br>' + CLAIM_NAMES[k] : '');
      var td = document.createElement('td');
      var v = p[k];
      if ((k === 'exp' || k === 'iat' || k === 'nbf') && typeof v === 'number') {
        var badge = '';
        if (k === 'exp') badge = v < now ? '<span class="claim-badge err">만료됨</span>' : '<span class="claim-badge ok">유효</span>';
        if (k === 'nbf') badge = v > now ? '<span class="claim-badge warn">아직 무효</span>' : '<span class="claim-badge ok">시작됨</span>';
        td.innerHTML = '<span class="mono">' + v + '</span>' + badge + '<br>' + fmtDate(v) + ' · ' + relative(v);
      } else {
        td.className = 'mono';
        td.textContent = typeof v === 'string' ? v : JSON.stringify(v);
      }
      tr.appendChild(th); tr.appendChild(td);
      tb.appendChild(tr);
    });
    var table = $('claims');
    table.replaceChild(tb, table.tBodies[0]);
  }

  function reset() {
    current = null;
    $('jwt-header').textContent = '';
    $('jwt-payload').textContent = '';
    $('jwt-colored').innerHTML = '';
    $('alg-name').textContent = '-';
    var table = $('claims');
    table.tBodies[0].innerHTML = '<tr><td class="meta">토큰을 입력하면 표시됩니다.</td></tr>';
    vstatus.className = 'status'; vstatus.textContent = '';
  }

  function decode() {
    var raw = input.value.trim().replace(/^Bearer\s+/i, '');
    vstatus.className = 'status'; vstatus.textContent = '';
    if (!raw) { reset(); status.className = 'status'; status.textContent = ''; input.removeAttribute('aria-invalid'); return; }
    var parts = raw.split('.');
    try {
      if (parts.length === 5) throw new Error('점이 4개인 JWE(암호화된 토큰)입니다. JWE는 키 없이 내용을 볼 수 없습니다.');
      if (parts.length !== 3) throw new Error('JWT는 점(.)으로 구분된 3부분이어야 합니다. 현재 ' + parts.length + '부분입니다.');
      var header = decodePart(parts[0], 'Header');
      var payload = decodePart(parts[1], 'Payload');
      current = { header: header, payload: payload, parts: parts };
      $('jwt-header').innerHTML = BD.highlightJson(JSON.stringify(header, null, 2));
      $('jwt-payload').innerHTML = BD.highlightJson(JSON.stringify(payload, null, 2));
      $('jwt-colored').innerHTML = '<span class="h">' + parts[0] + '</span><span class="d">.</span><span class="p">' + parts[1] + '</span><span class="d">.</span><span class="s">' + BD.escapeHtml(parts[2]) + '</span>';
      $('alg-name').textContent = header.alg || '(없음)';
      var isHmac = /^HS/.test(header.alg || '');
      $('b64-secret-wrap').hidden = !isHmac;
      $('key-label').textContent = isHmac ? '공유 비밀키 (secret)' : '공개키 (PEM 또는 JWK)';
      renderClaims(payload);
      input.removeAttribute('aria-invalid');
      var msgs = ['디코딩 완료'];
      var cls = 'ok';
      if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) { msgs.push('토큰이 만료되었습니다 (' + relative(payload.exp) + ')'); cls = 'warn'; }
      if ((header.alg || '').toLowerCase() === 'none') { msgs.push('alg가 none인 서명 없는 토큰입니다. 실서비스에서는 거부해야 합니다.'); cls = 'warn'; }
      status.className = 'status ' + cls;
      status.textContent = msgs.join(' · ');
    } catch (e) {
      reset();
      input.setAttribute('aria-invalid', 'true');
      status.className = 'status err';
      status.textContent = e.message;
    }
  }

  /* ---------- verification ---------- */
  var HASH = { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' };
  var CURVE = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };

  function pemToDer(pem) {
    var b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }

  function algParams(alg) {
    var m = /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg);
    if (!m) return null;
    var hash = HASH[m[2]];
    switch (m[1]) {
      case 'HS': return { import: { name: 'HMAC', hash: hash }, verify: { name: 'HMAC' } };
      case 'RS': return { import: { name: 'RSASSA-PKCS1-v1_5', hash: hash }, verify: { name: 'RSASSA-PKCS1-v1_5' } };
      case 'PS': return { import: { name: 'RSA-PSS', hash: hash }, verify: { name: 'RSA-PSS', saltLength: Number(m[2]) / 8 } };
      case 'ES': return { import: { name: 'ECDSA', namedCurve: CURVE[alg] }, verify: { name: 'ECDSA', hash: hash } };
    }
  }

  function importKey(alg, params, keyText) {
    var subtle = crypto.subtle;
    if (/^HS/.test(alg)) {
      var raw = $('b64-secret').checked ? b64urlToBytes(keyText.trim().replace(/=+$/, '')) : enc.encode(keyText);
      return subtle.importKey('raw', raw, params.import, false, ['verify']);
    }
    var t = keyText.trim();
    if (t.charAt(0) === '{') {
      var jwk = JSON.parse(t);
      if (jwk.keys && Array.isArray(jwk.keys)) {
        var kid = current.header.kid;
        jwk = jwk.keys.filter(function (k) { return kid ? k.kid === kid : true; })[0];
        if (!jwk) throw new Error('JWKS에서 kid "' + kid + '"에 해당하는 키를 찾지 못했습니다.');
      }
      var clean = { kty: jwk.kty, n: jwk.n, e: jwk.e, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true };
      Object.keys(clean).forEach(function (k) { if (clean[k] === undefined) delete clean[k]; });
      return subtle.importKey('jwk', clean, params.import, false, ['verify']);
    }
    if (/BEGIN RSA PUBLIC KEY/.test(t)) throw new Error('PKCS#1(BEGIN RSA PUBLIC KEY) 형식은 지원하지 않습니다. "openssl rsa -RSAPublicKey_in -pubout" 으로 SPKI 형식으로 바꿔 주세요.');
    if (/BEGIN CERTIFICATE/.test(t)) throw new Error('인증서 대신 공개키(BEGIN PUBLIC KEY)를 넣어 주세요. "openssl x509 -pubkey -noout -in cert.pem" 으로 추출할 수 있습니다.');
    if (/PRIVATE KEY/.test(t)) throw new Error('개인키는 넣지 마세요. 검증에는 공개키만 필요합니다.');
    if (!/BEGIN PUBLIC KEY/.test(t)) throw new Error('공개키는 PEM(-----BEGIN PUBLIC KEY-----) 또는 JWK(JSON) 형식이어야 합니다.');
    return subtle.importKey('spki', pemToDer(t), params.import, false, ['verify']);
  }

  function verify() {
    if (!current) { vstatus.className = 'status warn'; vstatus.textContent = '먼저 JWT를 입력하세요.'; return; }
    if (!window.crypto || !crypto.subtle) { vstatus.className = 'status err'; vstatus.textContent = '이 브라우저(또는 http 환경)에서는 Web Crypto API를 쓸 수 없습니다.'; return; }
    var alg = current.header.alg;
    var params = algParams(alg);
    if (!params) { vstatus.className = 'status err'; vstatus.textContent = '지원하지 않는 알고리즘입니다: ' + alg; return; }
    if (!keyIn.value.trim()) { vstatus.className = 'status warn'; vstatus.textContent = '키를 입력하세요.'; return; }
    var data = enc.encode(current.parts[0] + '.' + current.parts[1]);
    var sig;
    try { sig = b64urlToBytes(current.parts[2]); } catch (e) { vstatus.className = 'status err'; vstatus.textContent = '서명 부분을 디코딩할 수 없습니다.'; return; }
    Promise.resolve().then(function () { return importKey(alg, params, keyIn.value); })
      .then(function (key) { return crypto.subtle.verify(params.verify, key, sig, data); })
      .then(function (ok) {
        vstatus.className = 'status ' + (ok ? 'ok' : 'err');
        vstatus.textContent = ok ? '서명이 유효합니다 (' + alg + ')' : '서명이 일치하지 않습니다. 키가 다르거나 토큰이 변조되었습니다.';
      })
      .catch(function (e) {
        vstatus.className = 'status err';
        vstatus.textContent = '검증할 수 없습니다 — ' + (e && e.message ? e.message : '키 형식을 확인하세요.');
      });
  }

  /* ---------- sample (HS256 signed in-browser) ---------- */
  function makeSample() {
    var secret = 'bluedove-playground-secret';
    var now = Math.floor(Date.now() / 1000);
    var h = bytesToB64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    var p = bytesToB64url(enc.encode(JSON.stringify({ sub: 'bluedove', name: 'Developer Playground', role: ['admin', 'dev'], iat: now, nbf: now, exp: now + 3600 })));
    if (!window.crypto || !crypto.subtle) { BD.toast('Web Crypto API를 지원하지 않는 환경입니다'); return; }
    crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(function (k) { return crypto.subtle.sign('HMAC', k, enc.encode(h + '.' + p)); })
      .then(function (s) {
        input.value = h + '.' + p + '.' + bytesToB64url(new Uint8Array(s));
        keyIn.value = secret;
        $('b64-secret').checked = false;
        decode();
        BD.toast('예시 토큰과 비밀키를 넣었습니다');
      });
  }

  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(decode, 150); });
  $('btn-verify').addEventListener('click', verify);
  $('btn-sample').addEventListener('click', makeSample);
  $('btn-clear').addEventListener('click', function () { input.value = ''; keyIn.value = ''; decode(); input.focus(); });
})();
