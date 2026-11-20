/* 메인 페이지: pixi.html 의 러너(달리는 캐릭터 + 클릭 시 점프 + 프로젝트 이력 순환)를 반응형으로 재구성 */
(function () {
  'use strict';

  /* ---------- 연락처 이메일 (스팸 수집 방지용 조합) ---------- */
  var mail = document.getElementById('contact-mail');
  if (mail) {
    var addr = mail.getAttribute('data-u') + '@' + mail.getAttribute('data-d');
    mail.href = 'mailto:' + addr;
    mail.textContent = addr;
  }

  /* ---------- 프로젝트 이력 목록 (js/data.js 의 gArr → 최신순) ---------- */
  function parseHistory(arr) {
    return (arr || []).filter(function (s) { return /^\d{4}\.\d{2}/.test(s); }).map(function (s) {
      var parts = s.split('\n\n');
      return {
        period: parts[0].trim().replace(/\s+/g, ' '),
        name: parts.slice(1).join(' ').replace(/\s*\n\s*/g, ' ').trim()
      };
    });
  }
  var historyEl = document.getElementById('history-list');
  if (historyEl) {
    var rows = parseHistory(window.gArr).reverse();
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var li = document.createElement('li');
      var p = document.createElement('span');
      p.className = 'hist-period';
      p.textContent = r.period;
      var n = document.createElement('span');
      n.className = 'hist-name';
      n.textContent = r.name;
      li.appendChild(p);
      li.appendChild(n);
      frag.appendChild(li);
    });
    historyEl.innerHTML = '';
    historyEl.appendChild(frag);
    if (!rows.length) historyEl.innerHTML = '<li><span class="hist-name">이력을 불러오지 못했습니다.</span></li>';
  }

  var stageEl = document.getElementById('runner');
  if (!stageEl || !window.PIXI || !window.gArr) return;

  var card = document.getElementById('runner-card');
  var countEl = document.getElementById('runner-count');
  var pauseBtn = document.getElementById('runner-pause');
  var loadingEl = document.getElementById('runner-loading');

  var TILE_W = 2156;          // 배경 타일 원본 폭
  var TILE_H = 284;
  var AUTO_FIRST = 5000;      // 원본: 처음엔 5초 간격
  var AUTO_AFTER_TAP = 10000; // 원본: 터치 후엔 10초 간격

  /* gArr: "기간\n\n프로젝트명" 형식 */
  var items = window.gArr.map(function (s) {
    var parts = s.split('\n\n');
    if (parts.length < 2) return { period: '', name: s.replace(/\s*\n\s*/g, ' ').trim() };
    return { period: parts[0].trim().replace(/\s+/g, ' '), name: parts.slice(1).join(' ').replace(/\s*\n\s*/g, ' ').trim() };
  });
  var total = items.length;
  var idx = 0;
  var autoTimer = null;
  var paused = false;
  var visible = true;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function showItem(i) {
    var it = items[i];
    card.classList.add('swap');
    setTimeout(function () {
      card.innerHTML = '';
      if (it.period) {
        var p = document.createElement('span');
        p.className = 'runner-period mono';
        p.textContent = it.period;
        card.appendChild(p);
      }
      var n = document.createElement('strong');
      n.className = 'runner-name';
      n.textContent = it.name;
      card.appendChild(n);
      card.setAttribute('data-accent', String(Math.floor(Math.random() * 4)));
      card.classList.remove('swap');
    }, 140);
    countEl.textContent = it.period ? pad(i + 1) + ' / ' + pad(total - 1) : 'END';
  }

  function next() {
    idx = idx % total;
    showItem(idx);
    idx++;
  }

  function startAuto(interval) {
    clearInterval(autoTimer);
    if (paused) return;
    autoTimer = setInterval(next, interval);
  }

  /* ---------- PIXI ---------- */
  if (PIXI.utils) PIXI.utils._saidHello = true;

  var width = stageEl.clientWidth || 360;
  var height = stageEl.clientHeight || TILE_H;
  var renderer = PIXI.autoDetectRenderer(width, height, {
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    antialias: true
  });
  renderer.view.setAttribute('aria-hidden', 'true');
  stageEl.insertBefore(renderer.view, stageEl.firstChild);

  var stage = new PIXI.Container();
  var bgLayer = new PIXI.Container();
  stage.addChild(bgLayer);
  var bg1, bg2, pixie;
  var position = 0;
  var lastT = 0;
  var bgScale = 1;

  function layout() {
    width = stageEl.clientWidth || width;
    height = stageEl.clientHeight || height;
    renderer.resize(width, height);
    bgScale = height / TILE_H;
    if (bg1) { bg1.scale.set(bgScale); bg2.scale.set(bgScale); }
    if (pixie) {
      var small = width < 640;
      var s = small ? 0.24 : 0.3;
      pixie.scale.set(s * bgScale);
      pixie.position.x = small ? Math.max(70, width * 0.17) : Math.min(width / 6, 220);
      pixie.position.y = height - 30 * bgScale;
    }
  }

  PIXI.loader
    .add('pixie', '/js/pixi/Pixie.json')
    .load(function (loader, res) {
      var tex = PIXI.Texture.fromImage('/js/pixi/iP4_BGtile4.jpg');
      bg1 = new PIXI.Sprite(tex);
      bg2 = new PIXI.Sprite(tex);
      bgLayer.addChild(bg1);
      bgLayer.addChild(bg2);

      pixie = new PIXI.spine.Spine(res.pixie.spineData);
      pixie.autoUpdate = false; // 일시정지·탭 전환 대응을 위해 시간은 animate()에서 직접 진행
      stage.addChild(pixie);
      pixie.stateData.setMixByName('running', 'jump', 0.2);
      pixie.stateData.setMixByName('jump', 'running', 0.4);
      pixie.state.setAnimationByName(0, 'running', true);

      layout();
      loadingEl.hidden = true;
      countEl.textContent = '00 / ' + pad(total - 1);
      startAuto(AUTO_FIRST);
      requestAnimationFrame(animate);
    });

  function tap() {
    if (!pixie) return;
    next();
    if (!paused) startAuto(AUTO_AFTER_TAP);
    pixie.state.setAnimationByName(0, 'jump', false);
    pixie.state.addAnimationByName(0, 'running', true, 0);
  }

  stageEl.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    tap();
  });
  stageEl.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); }
  });

  function wrapX(x) {
    var span = TILE_W * bgScale;
    x %= span * 2;
    if (x < 0) x += span * 2;
    return x - span;
  }

  function animate(t) {
    requestAnimationFrame(animate);
    if (!visible) { lastT = t; return; }
    if (paused) { lastT = t; renderer.render(stage); return; }
    var dt = lastT ? Math.min(t - lastT, 50) : 16.7;
    lastT = t;
    // 원본: 프레임당 10px, 배경은 0.6배 속도
    position += 10 * (dt / 16.7) * Math.max(bgScale, 0.8);
    var span = TILE_W * bgScale;
    if (bg1) {
      bg1.position.x = wrapX(-(position * 0.6));
      bg2.position.x = wrapX(-(position * 0.6) + span);
    }
    if (pixie) pixie.update(dt / 1000);
    renderer.render(stage);
  }

  /* ---------- 일시정지 / 화면 밖 정지 / 리사이즈 ---------- */
  pauseBtn.addEventListener('click', function () {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.textContent = paused ? '다시 달리기' : '일시정지';
    if (paused) clearInterval(autoTimer); else startAuto(AUTO_AFTER_TAP);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }).observe(stageEl);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearInterval(autoTimer);
    else if (!paused) startAuto(AUTO_AFTER_TAP);
  });

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(layout, 120);
  });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pauseBtn.click();
  }
})();
