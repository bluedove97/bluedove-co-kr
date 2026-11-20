/* 브라우저 성능 테스트 — 어항 물고기
   - 물고기 = 개별 SVG 요소, 매 프레임 JS로 이동
   - 시작하기 → 0.1초마다 1마리씩 자동 증가 (실제 경과 시간 기준)
   - FPS < 20 상태가 10초 연속 → 종료, 점수 = 물고기 수 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var tank = $('tank');
  var FPS_LIMIT = 20;
  var HOLD_MS = 10000;
  var SAMPLE_MS = 500;
  var SPAWN_MS = 100;      // 0.1초에 1마리
  var SVGNS = 'http://www.w3.org/2000/svg';

  var fish = [];
  var W = tank.clientWidth, H = tank.clientHeight;
  var running = true;      // 애니메이션 루프
  var started = false;     // 테스트 진행 중 (물고기 자동 증가 + 종료 판정)
  var finished = false;
  var growMs = 0;          // 시작 후 (보이는 동안) 흐른 시간
  var startTime = performance.now();
  var lowSince = null;
  var maxFps = 0, refFps = 60;
  var fpsNow = 0;
  var frameCount = 0, windowStart = performance.now(), lastFrame = 0;
  var history = []; // 최근 120 샘플 (60초)
  var best = BD.store.get('fishtank-best', 0);

  /* ---------- fish ---------- */
  function makeFishEl(hue, w) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 36');
    svg.setAttribute('width', w);
    svg.setAttribute('height', Math.round(w * 36 / 64));
    svg.setAttribute('class', 'fish');
    svg.setAttribute('aria-hidden', 'true');
    var body = 'hsl(' + hue + ',85%,58%)', fin = 'hsl(' + hue + ',80%,44%)';
    svg.innerHTML =
      '<g class="tail"><path d="M18 18 L2 6 Q6 18 2 30 Z" fill="' + fin + '"/></g>' +
      '<ellipse cx="38" cy="18" rx="24" ry="13" fill="' + body + '"/>' +
      '<path d="M30 6 Q38 0 46 6" fill="' + fin + '"/>' +
      '<path d="M34 22 Q38 30 44 24" fill="' + fin + '" opacity=".8"/>' +
      '<circle cx="51" cy="15" r="3.4" fill="#fff"/><circle cx="52" cy="15" r="1.8" fill="#14243a"/>';
    return svg;
  }

  /* 모바일 미니 상태줄 (요소가 없으면 무시) */
  function setMini(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function addFish(n) {
    if (finished) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var w = Math.round(rand(34, 66));
      var el = makeFishEl(Math.floor(rand(0, 360)), w);
      var f = {
        el: el, w: w, h: w * 36 / 64,
        x: rand(0, Math.max(1, W - w)), y: rand(0, Math.max(1, H * 0.78 - w * 0.56)),
        a: rand(0, Math.PI * 2), sp: rand(40, 120), turn: 0, t: rand(0.5, 3), dir: 1
      };
      f.dir = Math.cos(f.a) >= 0 ? 1 : -1;
      frag.appendChild(el);
      fish.push(f);
    }
    tank.appendChild(frag);
    $('h-fish').textContent = fish.length.toLocaleString();
    setMini('m-fish', fish.length.toLocaleString());
  }

  function step(dt) {
    var maxY = H * 0.8;
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      f.t -= dt;
      if (f.t <= 0) { // 가끔 방향·속도 바꾸기
        f.turn = rand(-1.4, 1.4);
        f.sp = rand(30, 130);
        f.t = rand(0.6, 3.2);
      }
      f.a += f.turn * dt;
      var vx = Math.cos(f.a) * f.sp, vy = Math.sin(f.a) * f.sp * 0.45;
      f.x += vx * dt; f.y += vy * dt;
      if (f.x < 0) { f.x = 0; f.a = Math.PI - f.a; }
      else if (f.x > W - f.w) { f.x = W - f.w; f.a = Math.PI - f.a; }
      if (f.y < 0) { f.y = 0; f.a = -f.a; }
      else if (f.y > maxY - f.h) { f.y = maxY - f.h; f.a = -f.a; }
      var c = Math.cos(f.a);
      if (c > 0.15) f.dir = 1; else if (c < -0.15) f.dir = -1;
      f.el.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px) scaleX(' + f.dir + ')';
    }
  }

  /* ---------- measuring ---------- */
  var chart = $('fps-chart'), cctx = chart.getContext('2d');
  function sizeChart() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    chart.width = Math.round(chart.clientWidth * dpr);
    chart.height = Math.round(64 * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart();
  }
  function drawChart() {
    var w = chart.clientWidth, h = 64;
    cctx.clearRect(0, 0, w, h);
    var top = Math.max(refFps, 60);
    var y20 = h - (FPS_LIMIT / top) * (h - 8) - 4;
    cctx.strokeStyle = 'rgba(187,0,0,.5)';
    cctx.setLineDash([4, 4]);
    cctx.beginPath(); cctx.moveTo(0, y20); cctx.lineTo(w, y20); cctx.stroke();
    cctx.setLineDash([]);
    cctx.fillStyle = '#475e75';
    cctx.font = '11px "IBM Plex Mono", monospace';
    cctx.fillText('20 fps', 6, y20 - 4);
    if (history.length < 2) return;
    var n = 120, dx = w / (n - 1);
    cctx.strokeStyle = '#0057d2';
    cctx.lineWidth = 2;
    cctx.beginPath();
    history.forEach(function (v, i) {
      var x = (n - history.length + i) * dx;
      var y = h - (Math.min(v, top) / top) * (h - 8) - 4;
      if (i === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y);
    });
    cctx.stroke();
  }

  function loadPct(fps) {
    if (fps >= refFps) return 0;
    if (fps >= FPS_LIMIT) return (refFps - fps) / (refFps - FPS_LIMIT) * 85;
    return 85 + (FPS_LIMIT - fps) / FPS_LIMIT * 15;
  }

  function sample(now) {
    var elapsed = now - windowStart;
    fpsNow = frameCount * 1000 / elapsed;
    frameCount = 0; windowStart = now;
    if (fpsNow > maxFps) maxFps = fpsNow;
    // 주사율 추정 (60/90/120/144…)
    if (fish.length <= 20 && fpsNow > refFps * 1.15) refFps = Math.round(fpsNow / 10) * 10;
    history.push(fpsNow);
    if (history.length > 120) history.shift();

    $('h-fps').textContent = fpsNow.toFixed(0);
    setMini('m-fps', fpsNow.toFixed(0));
    $('h-ft').innerHTML = (1000 / Math.max(fpsNow, 0.1)).toFixed(1) + '<small>ms</small>';
    var pct = loadPct(fpsNow);
    $('load-fill').style.width = pct.toFixed(1) + '%';
    $('load-meter').setAttribute('aria-valuenow', Math.round(pct));
    var st = $('load-state');
    if (fpsNow >= refFps * 0.8) { st.className = 'load-state ok'; st.textContent = '여유'; }
    else if (fpsNow >= FPS_LIMIT) { st.className = 'load-state warn'; st.textContent = '버거움'; }
    else { st.className = 'load-state err'; st.textContent = '한계'; }
    drawChart();

    if (started && fpsNow < FPS_LIMIT) {
      if (lowSince === null) lowSince = now;
    } else lowSince = null;
    updateCountdown(now);
  }

  function updateCountdown(now) {
    var cd = $('countdown');
    if (lowSince === null) { cd.hidden = true; return; }
    var left = HOLD_MS - (now - lowSince);
    if (left <= 0) { finish(now); return; }
    cd.hidden = false;
    cd.textContent = 'FPS 20 미만 · 종료까지 ' + (left / 1000).toFixed(1) + '초';
  }

  /* ---------- loop ---------- */
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    var raw = lastFrame ? now - lastFrame : 0;
    var dt = lastFrame ? Math.min(raw / 1000, 0.1) : 0.016;
    lastFrame = now;
    frameCount++;
    if (started) {
      // 실제 경과 시간 기준으로 0.1초당 1마리 — 프레임이 밀려도 증가 속도는 일정
      growMs += raw;
      var target = 1 + Math.floor(growMs / SPAWN_MS);
      if (fish.length < target) addFish(target - fish.length);
      $('h-time').innerHTML = (growMs / 1000).toFixed(1) + '<small>초</small>';
      setMini('m-time', (growMs / 1000).toFixed(1));
    }
    step(dt);
    if (now - windowStart >= SAMPLE_MS) sample(now);
    else if (lowSince !== null) updateCountdown(now);
  }

  function finish(now) {
    if (finished) return;
    finished = true;
    started = false;
    running = false;
    $('countdown').hidden = true;
    var score = fish.length;
    var isBest = score > best;
    if (isBest) { best = score; BD.store.set('fishtank-best', best); }
    $('h-best').textContent = best.toLocaleString();
    $('r-score').textContent = score.toLocaleString();
    $('r-desc').textContent = isBest ? '새 최고 기록입니다!' : grade(score);
    var tb = $('r-table'); tb.innerHTML = '';
    [
      ['테스트 시간', (growMs / 1000).toFixed(1) + '초'],
      ['최고 FPS', maxFps.toFixed(0)],
      ['추정 주사율', refFps + 'Hz'],
      ['내 최고 기록', best.toLocaleString() + '마리'],
      ['브라우저', browserName()]
    ].forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<th></th><td class="mono"></td>';
      tr.firstChild.textContent = r[0]; tr.lastChild.textContent = r[1];
      tb.appendChild(tr);
    });
    $('result').hidden = false;
    setStartButton('done');
    $('btn-again').focus();
  }

  function grade(n) {
    if (n >= 3000) return '괴물 같은 성능입니다.';
    if (n >= 1500) return '아주 빠른 브라우저입니다.';
    if (n >= 600) return '꽤 잘 버텼습니다.';
    if (n >= 200) return '평범한 수준입니다.';
    return '어항이 금방 꽉 찼네요.';
  }

  function browserName() {
    var ua = navigator.userAgent;
    var m = /(Edg|OPR|SamsungBrowser|Firefox|Chrome|Version)\/([\d.]+)/.exec(ua);
    if (!m) return 'Unknown';
    var name = { Edg: 'Edge', OPR: 'Opera', SamsungBrowser: 'Samsung Internet', Version: 'Safari' }[m[1]] || m[1];
    return name + ' ' + m[2].split('.')[0];
  }

  function setStartButton(state) {
    var btn = $('btn-start'), label = $('btn-start-label');
    btn.classList.toggle('is-running', state === 'running');
    btn.disabled = state !== 'idle';
    label.textContent = state === 'running' ? '측정 중…' : state === 'done' ? '종료됨' : '시작하기';
  }

  function start() {
    if (started || finished) return;
    started = true;
    growMs = 0;
    lowSince = null;
    startTime = performance.now();
    setStartButton('running');
    scrollToBody();
  }

  /* 시작 시 부드럽게 이동
     - 데스크톱: 측정 영역(.page-body) 위쪽으로 (상단바 높이는 html 의 scroll-padding-top 이 보정)
     - 모바일: 어항(#tank)이 화면에 온전히 들어오도록 상단바 아래 영역의 가운데로 */
  function scrollToBody() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var behavior = reduce ? 'auto' : 'smooth';
    var isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
      var bar = document.querySelector('.topbar');
      var barH = bar ? bar.getBoundingClientRect().height : 60;
      var viewH = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - barH;
      var r = tank.getBoundingClientRect();
      // 어항 + 아래 미니 상태줄까지 한 덩어리로 화면에 넣는다
      var mini = document.querySelector('.mini-hud');
      var bottom = mini && mini.offsetParent ? mini.getBoundingClientRect().bottom : r.bottom;
      var h = bottom - r.top;
      var top = window.pageYOffset + r.top - barH - 25;
      // 남은 화면보다 작으면 가운데 정렬, 크면 어항 윗변을 상단바 바로 아래에 맞춤
      top -= h < viewH ? (viewH - h) / 2 : 8;
      window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: behavior });
      return;
    }

    var body = document.querySelector('.page-body');
    if (body) body.scrollIntoView({ behavior: behavior, block: 'start' });
  }

  function reset() {
    fish.forEach(function (f) { f.el.remove(); });
    fish = [];
    started = false;
    finished = false;
    growMs = 0;
    lowSince = null; maxFps = 0; history = [];
    startTime = performance.now();
    windowStart = startTime; frameCount = 0; lastFrame = 0;
    $('result').hidden = true;
    $('countdown').hidden = true;
    $('h-time').innerHTML = '0.0<small>초</small>';
    setMini('m-time', '0.0');
    setStartButton('idle');
    addFish(1);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  /* ---------- events ---------- */
  $('btn-start').addEventListener('click', start);
  $('btn-reset').addEventListener('click', reset);
  $('btn-again').addEventListener('click', function () { reset(); start(); });

  /* 결과 팝업 닫기: 어항은 종료 상태 그대로 두고, '처음부터'로 다시 시작 */
  function closeResult() {
    if ($('result').hidden) return;
    $('result').hidden = true;
    $('btn-reset').focus();
  }
  $('btn-close').addEventListener('click', closeResult);
  $('btn-close2').addEventListener('click', closeResult);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeResult(); });
  $('btn-share').addEventListener('click', function () {
    BD.copy('브라우저 성능 테스트 (어항) 점수: ' + fish.length + '마리 · ' + browserName() + ' · ' + location.origin + location.pathname);
  });

  document.addEventListener('visibilitychange', function () {
    // 숨겨진 탭은 rAF 가 멈추므로 측정을 초기화
    lowSince = null;
    windowStart = performance.now(); frameCount = 0; lastFrame = 0;
    $('countdown').hidden = true;
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { W = tank.clientWidth; H = tank.clientHeight; }).observe(tank);
  } else {
    window.addEventListener('resize', function () { W = tank.clientWidth; H = tank.clientHeight; });
  }
  window.addEventListener('resize', sizeChart);

  $('h-best').textContent = best ? best.toLocaleString() : '-';
  sizeChart();
  addFish(1);
  requestAnimationFrame(loop);
})();
