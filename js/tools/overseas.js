/* 해외시간 계산기 (Intl API, IANA time zone) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KST = 'Asia/Seoul';

  var CITIES = [
    ['America/New_York', '뉴욕', '미국 동부'],
    ['America/Chicago', '시카고', '미국 중부'],
    ['America/Denver', '덴버', '미국 산악'],
    ['America/Los_Angeles', '로스앤젤레스', '미국 서부'],
    ['America/Anchorage', '앵커리지', '미국 알래스카'],
    ['Pacific/Honolulu', '호놀룰루', '미국 하와이'],
    ['America/Toronto', '토론토', '캐나다'],
    ['America/Vancouver', '밴쿠버', '캐나다'],
    ['America/Mexico_City', '멕시코시티', '멕시코'],
    ['America/Sao_Paulo', '상파울루', '브라질'],
    ['America/Argentina/Buenos_Aires', '부에노스아이레스', '아르헨티나'],
    ['Europe/London', '런던', '영국'],
    ['Europe/Paris', '파리', '프랑스'],
    ['Europe/Berlin', '베를린', '독일'],
    ['Europe/Rome', '로마', '이탈리아'],
    ['Europe/Madrid', '마드리드', '스페인'],
    ['Europe/Amsterdam', '암스테르담', '네덜란드'],
    ['Europe/Zurich', '취리히', '스위스'],
    ['Europe/Prague', '프라하', '체코'],
    ['Europe/Istanbul', '이스탄불', '튀르키예'],
    ['Europe/Moscow', '모스크바', '러시아'],
    ['Africa/Cairo', '카이로', '이집트'],
    ['Africa/Johannesburg', '요하네스버그', '남아프리카공화국'],
    ['Asia/Dubai', '두바이', '아랍에미리트'],
    ['Asia/Kolkata', '뉴델리', '인도'],
    ['Asia/Kathmandu', '카트만두', '네팔'],
    ['Asia/Bangkok', '방콕', '태국'],
    ['Asia/Ho_Chi_Minh', '호찌민', '베트남'],
    ['Asia/Jakarta', '자카르타', '인도네시아'],
    ['Asia/Kuala_Lumpur', '쿠알라룸푸르', '말레이시아'],
    ['Asia/Singapore', '싱가포르', '싱가포르'],
    ['Asia/Manila', '마닐라', '필리핀'],
    ['Asia/Shanghai', '베이징 · 상하이', '중국'],
    ['Asia/Hong_Kong', '홍콩', '홍콩'],
    ['Asia/Taipei', '타이베이', '대만'],
    ['Asia/Ulaanbaatar', '울란바토르', '몽골'],
    ['Asia/Tokyo', '도쿄', '일본'],
    ['Pacific/Guam', '괌', '미국령'],
    ['Australia/Perth', '퍼스', '호주 서부'],
    ['Australia/Sydney', '시드니', '호주 동부'],
    ['Pacific/Auckland', '오클랜드', '뉴질랜드'],
    ['UTC', 'UTC', '협정 세계시']
  ];
  var DEFAULTS = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Shanghai', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Australia/Sydney'];
  var byId = {};
  CITIES.forEach(function (c) { byId[c[0]] = c; });

  var selected = BD.store.get('overseas-cities', DEFAULTS).filter(function (z) { return byId[z]; });

  /* ---------- tz helpers ---------- */
  var dtfCache = {};
  function parts(ms, tz) {
    var f = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
    var p = {};
    f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    p.hour = p.hour === '24' ? '00' : p.hour;
    return p;
  }
  function offsetMin(ms, tz) {
    var p = parts(ms, tz);
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000) / 60000);
  }
  function isDst(ms, tz) {
    var y = new Date(ms).getUTCFullYear();
    var jan = offsetMin(Date.UTC(y, 0, 1), tz), jul = offsetMin(Date.UTC(y, 6, 1), tz);
    return jan !== jul && offsetMin(ms, tz) === Math.max(jan, jul);
  }
  var WD = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
  function dayKey(p) { return +p.year * 10000 + +p.month * 100 + +p.day; }
  function diffLabel(min) {
    if (min === 0) return '한국과 같은 시간';
    var h = Math.floor(Math.abs(min) / 60), m = Math.abs(min) % 60;
    var t = h + '시간' + (m ? ' ' + m + '분' : '');
    return min > 0 ? '한국보다 ' + t + ' 빠름' : '한국보다 ' + t + ' 느림';
  }
  function relDay(p, base) {
    var a = dayKey(p), b = dayKey(base);
    return a === b ? '오늘' : a > b ? '내일' : '어제';
  }

  /* ---------- selects ---------- */
  var sel = $('city-sel'), convBase = $('conv-base');
  function fillSelects() {
    sel.innerHTML = '';
    CITIES.forEach(function (c) {
      if (selected.indexOf(c[0]) >= 0) return;
      var o = document.createElement('option');
      o.value = c[0]; o.textContent = c[1] + ' (' + c[2] + ')';
      sel.appendChild(o);
    });
    $('btn-add').disabled = !sel.options.length;
    var prev = convBase.value || KST;
    convBase.innerHTML = '<option value="' + KST + '">서울 (한국)</option>';
    selected.forEach(function (z) {
      var o = document.createElement('option');
      o.value = z; o.textContent = byId[z][1] + ' (' + byId[z][2] + ')';
      convBase.appendChild(o);
    });
    convBase.value = (prev === KST || selected.indexOf(prev) >= 0) ? prev : KST;
  }

  /* ---------- city cards ---------- */
  var listEl = $('city-list');
  var cards = {};
  function buildCards() {
    listEl.innerHTML = '';
    cards = {};
    selected.forEach(function (z) {
      var c = byId[z];
      var li = document.createElement('li');
      li.className = 'city';
      li.innerHTML = '<div class="city-name"></div><div class="city-country"></div>' +
        '<div class="city-time"></div><div class="city-meta"></div><span class="city-diff"></span><span class="city-dst" hidden>서머타임</span>' +
        '<button class="btn btn-ghost btn-sm city-rm" type="button">✕</button>';
      li.querySelector('.city-name').textContent = c[1];
      li.querySelector('.city-country').textContent = c[2] + ' · ' + z;
      var rm = li.querySelector('.city-rm');
      rm.setAttribute('aria-label', c[1] + ' 삭제');
      rm.addEventListener('click', function () {
        selected = selected.filter(function (x) { return x !== z; });
        save(); buildCards(); fillSelects(); tick(); convert();
      });
      listEl.appendChild(li);
      cards[z] = li;
    });
    if (!selected.length) listEl.innerHTML = '<li class="city"><p class="meta">도시를 추가하세요.</p></li>';
  }
  function save() { BD.store.set('overseas-cities', selected); }

  function tick() {
    var now = Date.now();
    var k = parts(now, KST);
    $('kst-time').textContent = k.hour + ':' + k.minute + ':' + k.second;
    $('kst-date').textContent = k.year + '년 ' + (+k.month) + '월 ' + (+k.day) + '일 (' + WD[k.weekday] + ')';
    var kOff = offsetMin(now, KST);
    selected.forEach(function (z) {
      var li = cards[z]; if (!li) return;
      var p = parts(now, z);
      var hr = +p.hour;
      li.querySelector('.city-time').innerHTML = p.hour + ':' + p.minute + '<span class="dn" aria-label="' + (hr >= 6 && hr < 18 ? '낮' : '밤') + '">' + (hr >= 6 && hr < 18 ? '☀' : '☾') + '</span>';
      li.querySelector('.city-meta').textContent = relDay(p, k) + ' · ' + (+p.month) + '월 ' + (+p.day) + '일 (' + WD[p.weekday] + ') ' + p.second + '초';
      li.querySelector('.city-diff').textContent = diffLabel(offsetMin(now, z) - kOff);
      li.querySelector('.city-dst').hidden = !isDst(now, z);
    });
  }

  /* ---------- converter ---------- */
  function wallToEpoch(str, tz) {
    var m = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str);
    if (!m) return null;
    var wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    var g = wall - offsetMin(wall, tz) * 60000;
    return wall - offsetMin(g, tz) * 60000;
  }
  function nowInput(tz) {
    var p = parts(Date.now(), tz);
    return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
  }
  function convert() {
    var tb = $('conv-body');
    tb.innerHTML = '';
    var base = convBase.value;
    var ms = wallToEpoch($('conv-dt').value, base);
    if (ms === null) { tb.innerHTML = '<tr><td class="meta">기준 시각을 선택하세요.</td></tr>'; return; }
    var bp = parts(ms, base);
    var zones = [KST].concat(selected).filter(function (z) { return z !== base; });
    zones.forEach(function (z) {
      var p = parts(ms, z);
      var name = z === KST ? '서울 (한국)' : byId[z][1];
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.textContent = name;
      var td = document.createElement('td');
      var hr = +p.hour;
      var note = hr >= 9 && hr < 18 ? '업무 시간' : hr >= 22 || hr < 7 ? '한밤중' : '';
      td.innerHTML = '<b class="mono"></b> <span class="meta"></span>';
      td.querySelector('b').textContent = p.year + '-' + p.month + '-' + p.day + ' (' + WD[p.weekday] + ') ' + p.hour + ':' + p.minute;
      td.querySelector('span').textContent = '기준 도시 ' + relDay(p, bp).replace('오늘', '같은 날') + (note ? ' · ' + note : '');
      tr.appendChild(th); tr.appendChild(td);
      tb.appendChild(tr);
    });
  }

  /* ---------- events ---------- */
  $('btn-add').addEventListener('click', function () {
    var z = sel.value;
    if (!z || selected.indexOf(z) >= 0) return;
    selected.push(z);
    save(); buildCards(); fillSelects(); tick(); convert();
    BD.toast(byId[z][1] + ' 추가');
  });
  $('btn-default').addEventListener('click', function () {
    selected = DEFAULTS.slice();
    save(); buildCards(); fillSelects(); tick(); convert();
  });
  convBase.addEventListener('change', function () { convert(); });
  $('conv-dt').addEventListener('input', convert);
  $('btn-conv-now').addEventListener('click', function () { $('conv-dt').value = nowInput(convBase.value); convert(); });

  fillSelects();
  buildCards();
  tick();
  setInterval(tick, 1000);
  $('conv-dt').value = nowInput(KST);
  convert();
})();
