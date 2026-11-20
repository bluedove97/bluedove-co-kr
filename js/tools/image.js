/* 이미지 압축 · 변환 (Canvas API / Web Worker, 서버 전송 없음) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var list = $('list'), drop = $('drop'), fileIn = $('file-in');
  var items = []; // { id, file, url, outBlob, outUrl, li, w, h, ow, oh, state }
  var seq = 0;
  var MAX_FILE = 50 * 1024 * 1024;

  /* ---------- engine ---------- */
  var worker = null;
  var pending = {};
  var canWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
    'convertToBlob' in OffscreenCanvas.prototype && typeof createImageBitmap === 'function';
  if (canWorker) {
    try {
      worker = new Worker('/js/tools/image-worker.js');
      worker.onmessage = function (e) { var cb = pending[e.data.id]; delete pending[e.data.id]; if (cb) cb(e.data); };
      worker.onerror = function () { worker = null; };
    } catch (e) { worker = null; }
  }
  $('engine-info').textContent = worker ? '(처리 엔진: Web Worker + OffscreenCanvas)' : '(처리 엔진: Canvas API)';

  function fit(w, h, maxW, maxH) {
    var r = 1;
    if (maxW && w > maxW) r = Math.min(r, maxW / w);
    if (maxH && h > maxH) r = Math.min(r, maxH / h);
    return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
  }

  function convertMain(job) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(job.file);
      img.onload = function () {
        var s = fit(img.naturalWidth, img.naturalHeight, job.maxW, job.maxH);
        var c = document.createElement('canvas');
        c.width = s.w; c.height = s.h;
        var ctx = c.getContext('2d');
        if (job.type === 'image/jpeg') { ctx.fillStyle = job.bg; ctx.fillRect(0, 0, s.w, s.h); }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, s.w, s.h);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          if (!blob) resolve({ ok: false, error: '인코딩 실패' });
          else resolve({ ok: true, blob: blob, w: s.w, h: s.h, ow: img.naturalWidth, oh: img.naturalHeight });
        }, job.type, job.quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ ok: false, error: '이미지를 읽을 수 없습니다' }); };
      img.src = url;
    });
  }

  function convert(job) {
    if (!worker) return convertMain(job);
    return new Promise(function (resolve) {
      pending[job.id] = function (res) {
        if (res.ok) resolve(res);
        else convertMain(job).then(resolve); // 워커 실패 시 메인 스레드로 재시도
      };
      worker.postMessage(job);
    });
  }

  /* ---------- options ---------- */
  function opts() {
    var mw = parseInt($('max-w').value, 10), mh = parseInt($('max-h').value, 10);
    return {
      type: document.querySelector('input[name="fmt"]:checked').value,
      quality: Number($('quality').value) / 100,
      maxW: mw > 0 ? mw : 0,
      maxH: mh > 0 ? mh : 0,
      bg: $('bg-color').value
    };
  }
  var EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

  function syncQualityUi() {
    var isPng = opts().type === 'image/png';
    $('quality').disabled = isPng;
    $('q-val').textContent = isPng ? '무손실' : $('quality').value;
    $('q-hint').textContent = isPng ? 'PNG는 무손실 포맷이라 화질 값이 적용되지 않습니다.' : '낮을수록 용량이 작아집니다. 70~85를 추천합니다.';
  }

  /* ---------- list UI ---------- */
  function outName(it) {
    var base = it.file.name.replace(/\.[^.]+$/, '') || 'image';
    return base + '.' + (EXT[it.outBlob.type] || 'img');
  }

  function renderItem(it) {
    var li = it.li;
    if (!li) {
      li = it.li = document.createElement('li');
      li.className = 'img-item';
      li.innerHTML =
        '<img class="img-thumb" alt="">' +
        '<div style="min-width:0"><div class="img-name"></div><div class="img-meta"></div><div class="img-meta img-dim"></div></div>' +
        '<div class="img-actions"><button class="btn btn-sm" type="button" data-act="dl" disabled>다운로드</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="rm" aria-label="목록에서 삭제">삭제</button></div>';
      li.querySelector('.img-thumb').src = it.url;
      li.querySelector('.img-thumb').alt = it.file.name + ' 미리보기';
      li.querySelector('.img-name').textContent = it.file.name;
      li.querySelector('[data-act="dl"]').addEventListener('click', function () { if (it.outBlob) BD.download(it.outBlob, outName(it)); });
      li.querySelector('[data-act="rm"]').addEventListener('click', function () { removeItem(it); });
      list.appendChild(li);
    }
    var meta = li.querySelector('.img-meta');
    var dim = li.querySelector('.img-dim');
    var btn = li.querySelector('[data-act="dl"]');
    if (it.state === 'working') {
      meta.textContent = BD.formatBytes(it.file.size) + ' → 변환 중…';
      btn.disabled = true;
    } else if (it.state === 'error') {
      meta.textContent = '변환 실패: ' + it.error;
      btn.disabled = true;
    } else {
      var saved = 1 - it.outBlob.size / it.file.size;
      var pct = Math.round(Math.abs(saved) * 100);
      var cls = saved >= 0 ? 'down' : 'up';
      meta.innerHTML = BD.formatBytes(it.file.size) + ' → <b>' + BD.formatBytes(it.outBlob.size) + '</b> <span class="img-saving ' + cls + '">' + (saved >= 0 ? '−' : '+') + pct + '%</span>';
      var typeNote = it.outBlob.type !== it.requested ? ' · 이 브라우저는 ' + (EXT[it.requested] || '').toUpperCase() + ' 인코딩을 지원하지 않아 ' + (EXT[it.outBlob.type] || it.outBlob.type).toUpperCase() + '로 저장' : '';
      dim.textContent = it.ow + '×' + it.oh + (it.ow !== it.w || it.oh !== it.h ? ' → ' + it.w + '×' + it.h : '') + ' · ' + (EXT[it.outBlob.type] || '').toUpperCase() + typeNote + (saved < 0 ? ' · 원본보다 커졌습니다' : '');
      btn.disabled = false;
    }
  }

  function summary() {
    var done = items.filter(function (i) { return i.state === 'done'; });
    $('bulk').hidden = items.length === 0;
    if (!items.length) return;
    var a = 0, b = 0;
    done.forEach(function (i) { a += i.file.size; b += i.outBlob.size; });
    $('summary').textContent = items.length + '장 · ' + (done.length ? BD.formatBytes(a) + ' → ' + BD.formatBytes(b) + ' (' + (a ? Math.round((1 - b / a) * 100) : 0) + '% 절감)' : '변환 중…');
    $('btn-all').disabled = done.length === 0;
  }

  var runToken = 0;
  function processAll(onlyPending) {
    var token = ++runToken;
    var o = opts();
    var queue = items.filter(function (i) { return !onlyPending || i.state !== 'done'; });
    (function nextJob() {
      if (token !== runToken) return;
      var it = queue.shift();
      if (!it) { summary(); return; }
      if (items.indexOf(it) < 0) { nextJob(); return; }
      it.state = 'working';
      renderItem(it);
      var job = { id: it.id + ':' + token, file: it.file, type: o.type, quality: o.quality, maxW: o.maxW, maxH: o.maxH, bg: o.bg };
      convert(job).then(function (res) {
        if (token !== runToken || items.indexOf(it) < 0) return nextJob();
        if (res.ok) {
          it.state = 'done'; it.outBlob = res.blob; it.requested = o.type;
          it.w = res.w; it.h = res.h; it.ow = res.ow; it.oh = res.oh;
        } else { it.state = 'error'; it.error = res.error; }
        renderItem(it);
        summary();
        nextJob();
      });
    })();
  }

  function addFiles(files) {
    var added = 0;
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type)) { BD.toast(f.name + ': 이미지 파일이 아닙니다'); return; }
      if (f.size > MAX_FILE) { BD.toast(f.name + ': 50MB를 넘는 파일은 건너뜁니다'); return; }
      items.push({ id: ++seq, file: f, url: URL.createObjectURL(f), state: 'working' });
      added++;
    });
    if (added) { items.forEach(function (it) { if (!it.li) renderItem(it); }); summary(); processAll(true); }
  }

  function removeItem(it) {
    var i = items.indexOf(it);
    if (i >= 0) items.splice(i, 1);
    URL.revokeObjectURL(it.url);
    if (it.li) it.li.remove();
    summary();
  }

  /* ---------- events ---------- */
  fileIn.addEventListener('change', function () { addFiles(fileIn.files); fileIn.value = ''; });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    var files = [];
    Array.prototype.forEach.call((e.clipboardData && e.clipboardData.items) || [], function (x) {
      if (x.kind === 'file' && /^image\//.test(x.type)) {
        var f = x.getAsFile();
        if (f) files.push(new File([f], 'pasted-' + Date.now() + '.' + (f.type.split('/')[1] || 'png'), { type: f.type }));
      }
    });
    if (files.length) addFiles(files);
  });

  var t;
  function optsChanged() {
    syncQualityUi();
    clearTimeout(t);
    t = setTimeout(function () { if (items.length) processAll(); }, 250);
  }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="fmt"]'), function (r) { r.addEventListener('change', optsChanged); });
  $('quality').addEventListener('input', optsChanged);
  $('max-w').addEventListener('input', optsChanged);
  $('max-h').addEventListener('input', optsChanged);
  $('bg-color').addEventListener('input', optsChanged);

  $('btn-all').addEventListener('click', function () {
    var done = items.filter(function (i) { return i.state === 'done'; });
    done.forEach(function (it, i) { setTimeout(function () { BD.download(it.outBlob, outName(it)); }, i * 350); });
  });
  $('btn-reset').addEventListener('click', function () { items.slice().forEach(removeItem); runToken++; });

  syncQualityUi();
})();
