/* Base64 Encoder / Decoder (UTF-8 safe) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var input = $('b64-in'), output = $('b64-out'), status = $('b64-status');
  var mode = 'encode';
  var enc = new TextEncoder();

  BD.initTabs($('b64-root'));

  function bytesToB64(bytes) {
    var bin = '';
    var CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    var clean = b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (/[^A-Za-z0-9+/=]/.test(clean)) {
      var bad = clean.match(/[^A-Za-z0-9+/=]/)[0];
      throw new Error('Base64에 쓸 수 없는 문자 "' + bad + '"가 있습니다.');
    }
    clean = clean.replace(/=+$/, '');
    if (clean.length % 4 === 1) throw new Error('길이가 올바르지 않습니다. 문자가 빠졌거나 잘렸을 수 있습니다.');
    while (clean.length % 4) clean += '=';
    var bin = atob(clean);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function setStatus(cls, msg) { status.className = 'status ' + cls; status.textContent = msg; }

  function updateMeta() {
    $('in-meta').textContent = input.value.length.toLocaleString() + '자 · ' + BD.formatBytes(enc.encode(input.value).length);
  }

  function run(m) {
    if (m) mode = m;
    updateMeta();
    var text = input.value;
    if (!text) { output.value = ''; $('out-meta').innerHTML = '&nbsp;'; status.className = 'status'; status.textContent = ''; return; }
    try {
      if (mode === 'encode') {
        var r = bytesToB64(enc.encode(text));
        if ($('url-safe').checked) r = r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        output.value = r;
        setStatus('ok', '인코딩 완료' + ($('url-safe').checked ? ' (URL-safe)' : ''));
      } else {
        var bytes = b64ToBytes(text);
        var decoded;
        var fatal = true;
        try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) {
          fatal = false;
          decoded = new TextDecoder('utf-8').decode(bytes);
        }
        output.value = decoded;
        if (fatal) setStatus('ok', '디코딩 완료 (UTF-8)');
        else setStatus('warn', '디코딩은 됐지만 UTF-8 텍스트가 아닌 바이너리 데이터로 보입니다. 깨진 글자는 �로 표시됩니다.');
      }
      $('out-meta').textContent = output.value.length.toLocaleString() + '자';
      input.removeAttribute('aria-invalid');
    } catch (e) {
      output.value = '';
      input.setAttribute('aria-invalid', 'true');
      setStatus('err', '디코딩 실패 — ' + e.message);
    }
  }

  $('btn-encode').addEventListener('click', function () { run('encode'); });
  $('btn-decode').addEventListener('click', function () { run('decode'); });
  $('btn-swap').addEventListener('click', function () {
    input.value = output.value;
    run(mode === 'encode' ? 'decode' : 'encode');
  });
  $('btn-clear').addEventListener('click', function () { input.value = ''; run(); input.focus(); });
  $('url-safe').addEventListener('change', function () { if (mode === 'encode') run(); });
  input.addEventListener('input', function () { if ($('live').checked) run(); else updateMeta(); });

  /* ---------- File ---------- */
  var MAX = 20 * 1024 * 1024;
  var current = null; // { mime, b64 }
  var drop = $('drop'), fileIn = $('file-in');

  function renderFile() {
    if (!current) return;
    $('file-out').value = $('with-prefix').checked ? 'data:' + current.mime + ';base64,' + current.b64 : current.b64;
    $('f-len').textContent = $('file-out').value.length.toLocaleString();
  }

  function handleFile(file) {
    if (!file) return;
    if (file.size > MAX) { BD.toast('20MB 이하 파일만 변환할 수 있습니다'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      current = { mime: file.type || 'application/octet-stream', b64: bytesToB64(bytes) };
      $('file-result').hidden = false;
      $('f-name').textContent = file.name;
      $('f-type').textContent = current.mime;
      $('f-size').textContent = BD.formatBytes(file.size);
      var prev = $('f-preview');
      if (/^image\//.test(current.mime)) { prev.src = 'data:' + current.mime + ';base64,' + current.b64; prev.hidden = false; }
      else { prev.hidden = true; prev.removeAttribute('src'); }
      renderFile();
    };
    reader.onerror = function () { BD.toast('파일을 읽지 못했습니다'); };
    reader.readAsArrayBuffer(file);
  }

  fileIn.addEventListener('change', function () { handleFile(fileIn.files[0]); fileIn.value = ''; });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { handleFile(e.dataTransfer.files[0]); });
  $('with-prefix').addEventListener('change', renderFile);
  $('btn-css').addEventListener('click', function () {
    if (!current) return;
    BD.copy("background-image: url('data:" + current.mime + ';base64,' + current.b64 + "');");
  });
})();
