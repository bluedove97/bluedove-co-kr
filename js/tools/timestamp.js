/* Timestamp Converter */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var ZONES = [
    ['Asia/Seoul', '한국 (KST, UTC+9)'],
    ['UTC', 'UTC'],
    ['Asia/Tokyo', '도쿄'],
    ['Asia/Shanghai', '베이징·상하이'],
    ['Asia/Singapore', '싱가포르'],
    ['Asia/Kolkata', '인도'],
    ['Europe/London', '런던'],
    ['Europe/Paris', '파리'],
    ['Europe/Berlin', '베를린'],
    ['America/New_York', '뉴욕 (미 동부)'],
    ['America/Chicago', '시카고 (미 중부)'],
    ['America/Denver', '덴버 (미 산악)'],
    ['America/Los_Angeles', 'LA (미 서부)'],
    ['Australia/Sydney', '시드니']
  ];
  var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  var tzSel = $('dt-tz');
  ZONES.forEach(function (z) {
    var o = document.createElement('option');
    o.value = z[0]; o.textContent = z[1] + ' — ' + z[0];
    tzSel.appendChild(o);
  });
  if (localTz && !ZONES.some(function (z) { return z[0] === localTz; })) {
    var o = document.createElement('option');
    o.value = localTz; o.textContent = '브라우저 시간대 — ' + localTz;
    tzSel.appendChild(o);
  }

  function fmt(ms, tz) {
    return new Date(ms).toLocaleString('ko-KR', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }
  function partsIn(ms, tz) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function tzOffsetMs(ms, tz) {
    var p = partsIn(ms, tz);
    var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  }
  function offsetLabel(ms, tz) {
    var off = tzOffsetMs(ms, tz) / 60000;
    var sign = off >= 0 ? '+' : '-';
    off = Math.abs(off);
    return 'UTC' + sign + String(Math.floor(off / 60)).padStart(2, '0') + ':' + String(off % 60).padStart(2, '0');
  }
  function relative(ms) {
    var diff = (ms - Date.now()) / 1000, a = Math.abs(diff), t;
    if (a < 60) t = Math.round(a) + '초';
    else if (a < 3600) t = Math.round(a / 60) + '분';
    else if (a < 86400) t = Math.round(a / 3600) + '시간';
    else if (a < 86400 * 365) t = Math.round(a / 86400) + '일';
    else t = (a / 86400 / 365.2425).toFixed(1) + '년';
    return a < 1 ? '지금' : diff > 0 ? t + ' 후' : t + ' 전';
  }

  function row(tbody, k, v) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<th></th><td><div class="copy-cell"><span class="mono"></span><button class="btn btn-ghost btn-sm" type="button">복사</button></div></td>';
    tr.querySelector('th').textContent = k;
    tr.querySelector('span').textContent = v;
    tr.querySelector('button').addEventListener('click', function () { BD.copy(v); });
    tbody.appendChild(tr);
  }

  /* ---------- live clock ---------- */
  var paused = false;
  function tick() {
    if (!paused) {
      var n = Date.now();
      $('now-s').textContent = Math.floor(n / 1000);
      $('now-ms').textContent = n;
      $('now-kst').textContent = fmt(n, 'Asia/Seoul');
    }
  }
  tick();
  setInterval(tick, 200);
  $('btn-pause').addEventListener('click', function () {
    paused = !paused;
    this.setAttribute('aria-pressed', paused);
    this.textContent = paused ? '다시 시작' : '멈춤';
  });

  /* ---------- timestamp -> date ---------- */
  function tsToDate() {
    var raw = $('ts-in').value.trim().replace(/[,_\s]/g, '');
    var st = $('ts-status'), tb = $('ts-result');
    tb.innerHTML = '';
    if (!raw) { st.className = 'status warn'; st.textContent = '타임스탬프를 입력하세요.'; return; }
    if (!/^-?\d+(\.\d+)?$/.test(raw)) { st.className = 'status err'; st.textContent = '숫자만 입력하세요.'; $('ts-in').setAttribute('aria-invalid', 'true'); return; }
    $('ts-in').removeAttribute('aria-invalid');
    var unit = $('ts-unit').value;
    var digits = raw.replace(/^-/, '').split('.')[0].length;
    if (unit === 'auto') unit = digits <= 11 ? 's' : digits <= 14 ? 'ms' : digits <= 17 ? 'us' : 'ns';
    var ms;
    if (unit === 's') ms = parseFloat(raw) * 1000;
    else if (unit === 'ms') ms = parseFloat(raw);
    else {
      var intPart = raw.split('.')[0];
      var big = BigInt(intPart);
      ms = Number(big / (unit === 'us' ? 1000n : 1000000n));
    }
    if (!isFinite(ms) || Math.abs(ms) > 8.64e15) { st.className = 'status err'; st.textContent = '표현할 수 있는 날짜 범위를 벗어났습니다.'; return; }
    var names = { s: '초', ms: '밀리초', us: '마이크로초', ns: '나노초' };
    st.className = 'status ok';
    st.textContent = names[unit] + ' 단위로 해석했습니다' + ($('ts-unit').value === 'auto' ? ' (자동 감지)' : '') + ' · ' + relative(ms);
    row(tb, '한국 시간 (KST)', fmt(ms, 'Asia/Seoul'));
    row(tb, 'UTC', fmt(ms, 'UTC'));
    if (localTz && localTz !== 'Asia/Seoul' && localTz !== 'UTC') row(tb, '내 시간대 (' + localTz + ')', fmt(ms, localTz));
    row(tb, 'ISO 8601 (UTC)', new Date(ms).toISOString());
    row(tb, 'ISO 8601 (KST)', isoInZone(ms, 'Asia/Seoul'));
    row(tb, 'RFC 7231', new Date(ms).toUTCString());
    row(tb, '초', String(Math.floor(ms / 1000)));
    row(tb, '밀리초', String(Math.round(ms)));
  }

  function isoInZone(ms, tz) {
    var p = partsIn(ms, tz);
    var off = offsetLabel(ms, tz).replace('UTC', '');
    var msPart = String(((ms % 1000) + 1000) % 1000 | 0).padStart(3, '0');
    return p.year + '-' + p.month + '-' + p.day + 'T' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute + ':' + p.second + '.' + msPart + off;
  }

  /* ---------- date -> timestamp ---------- */
  function dateToTs() {
    var v = $('dt-in').value;
    var st = $('dt-status'), tb = $('dt-result');
    tb.innerHTML = '';
    var m = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(v);
    if (!m) { st.className = 'status warn'; st.textContent = '날짜와 시각을 선택하세요.'; return; }
    var tz = tzSel.value;
    var wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    // 벽시계 시각 → 해당 시간대의 실제 epoch (오프셋 2회 보정: DST 경계 대응)
    var guess = wall - tzOffsetMs(wall, tz);
    guess = wall - tzOffsetMs(guess, tz);
    st.className = 'status ok';
    st.textContent = tz + ' (' + offsetLabel(guess, tz) + ') 기준으로 변환했습니다.';
    row(tb, '초', String(Math.floor(guess / 1000)));
    row(tb, '밀리초', String(guess));
    row(tb, 'ISO 8601 (UTC)', new Date(guess).toISOString());
    row(tb, '한국 시간 (KST)', fmt(guess, 'Asia/Seoul'));
  }

  function nowLocalInput(tz) {
    var p = partsIn(Date.now(), tz);
    return p.year + '-' + p.month + '-' + p.day + 'T' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute + ':' + p.second;
  }

  $('btn-ts').addEventListener('click', tsToDate);
  $('ts-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') tsToDate(); });
  $('ts-in').addEventListener('input', function () { if ($('ts-in').value.trim().length >= 9) tsToDate(); });
  $('ts-unit').addEventListener('change', function () { if ($('ts-in').value.trim()) tsToDate(); });
  $('btn-ts-now').addEventListener('click', function () { $('ts-in').value = Math.floor(Date.now() / 1000); $('ts-unit').value = 'auto'; tsToDate(); });
  $('btn-dt').addEventListener('click', dateToTs);
  $('dt-in').addEventListener('change', dateToTs);
  tzSel.addEventListener('change', function () { if ($('dt-in').value) dateToTs(); });
  $('btn-dt-now').addEventListener('click', function () { $('dt-in').value = nowLocalInput(tzSel.value); dateToTs(); });

  // 초기값
  $('ts-in').value = Math.floor(Date.now() / 1000);
  tsToDate();
  $('dt-in').value = nowLocalInput('Asia/Seoul');
  dateToTs();
})();
