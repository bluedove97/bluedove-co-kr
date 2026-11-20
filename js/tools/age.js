/* 만나이 계산기 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('age-form'), birthEl = $('birth'), baseEl = $('base');
  var ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];

  var RULES = [
    { text: '만 18세 이상: 투표, 운전면허 취득, 아르바이트 및 취업', test: function (a) { return a.man >= 18; } },
    { text: '만 18세~30세: 워킹홀리데이 신청 가능', test: function (a) { return a.man >= 18 && a.man <= 30; } },
    { text: '연나이 18세 이상: 군대입영, 9급 공무원 지원 가능', test: function (a) { return a.yeon >= 18; } },
    { text: '초등 입학: 만 6세가 된 다음해 3월부터 입학, 연나이 7세', info: function (a) { return a.by + 7 + '년 3월'; } },
    { text: '병역법과 청소년보호법은 태어난 연도만 고려하는 연나이가 기준', info: function () { return '참고'; } },
    { text: '만 19세 이상 : 청소년 관람불가 영화 관람', test: function (a) { return a.man >= 19; } }
  ];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function utc(o) { return Date.UTC(o.y, o.m - 1, o.d); }

  /* 해당 연도의 생일 (2/29생은 평년에 3/1) */
  function birthdayIn(b, y) {
    if (b.m === 2 && b.d === 29 && !isLeap(y)) return { y: y, m: 3, d: 1 };
    return { y: y, m: b.m, d: b.d };
  }

  function calc(b, t) {
    var man = t.y - b.y;
    if (utc(t) < utc(birthdayIn(b, t.y))) man--;
    var yeon = t.y - b.y;
    var next = birthdayIn(b, t.y);
    if (utc(next) <= utc(t)) next = birthdayIn(b, t.y + 1);
    var dday = Math.round((utc(next) - utc(t)) / 86400000);
    var todayIsBirthday = utc(birthdayIn(b, t.y)) === utc(t);
    return {
      by: b.y, man: man, yeon: yeon, korean: yeon + 1,
      zodiac: ZODIAC[((b.y % 12) + 12) % 12],
      days: Math.round((utc(t) - utc(b)) / 86400000),
      dday: dday, birthday: todayIsBirthday
    };
  }

  function renderRules(a) {
    var ul = $('age-rules');
    ul.innerHTML = '';
    RULES.forEach(function (r) {
      var li = document.createElement('li');
      var t = document.createElement('span');
      t.textContent = r.text;
      li.appendChild(t);
      if (a) {
        var badge = document.createElement('span');
        if (r.test) {
          var ok = r.test(a);
          badge.className = 'rule-badge ' + (ok ? 'yes' : 'no');
          badge.textContent = ok ? '해당' : '해당 없음';
        } else {
          badge.className = 'rule-badge info';
          badge.textContent = r.info(a);
        }
        li.appendChild(badge);
      }
      ul.appendChild(li);
    });
  }

  function run() {
    var b = parse(birthEl.value), t = parse(baseEl.value);
    var res = $('age-result');
    birthEl.removeAttribute('aria-invalid');
    if (!b) {
      birthEl.setAttribute('aria-invalid', 'true');
      res.innerHTML = '<p class="result-main">출생일을 선택하세요.</p>';
      $('age-stats').hidden = true; renderRules(null); return;
    }
    if (!t) { t = parse(todayStr()); baseEl.value = todayStr(); }
    if (utc(b) > utc(t)) {
      birthEl.setAttribute('aria-invalid', 'true');
      res.innerHTML = '<p class="result-main">출생일이 기준일보다 늦습니다.</p><p class="result-sub">날짜를 확인해 주세요.</p>';
      $('age-stats').hidden = true; renderRules(null); return;
    }
    var a = calc(b, t);
    res.innerHTML = '<p class="result-main">만 <strong>' + a.man + '세</strong>, <strong>' + a.zodiac + '띠</strong>,<br>연나이 <strong>' + a.yeon + '세</strong>입니다</p>' +
      (a.birthday ? '<p class="result-sub">기준일이 생일입니다. 축하합니다!</p>' : '');
    $('age-stats').hidden = false;
    $('s-next').innerHTML = a.birthday ? '오늘' : 'D-' + a.dday.toLocaleString();
    $('s-days').innerHTML = a.days.toLocaleString() + '<small>일</small>';
    $('s-korean').innerHTML = a.korean + '<small>세</small>';
    $('s-school').innerHTML = (a.by + 7) + '<small>년 3월</small>';
    renderRules(a);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  form.addEventListener('reset', function () {
    setTimeout(function () {
      birthEl.value = '';
      baseEl.value = todayStr();
      $('age-result').innerHTML = '<p class="result-main">생년월일을 입력하세요.</p>';
      $('age-stats').hidden = true;
      birthEl.removeAttribute('aria-invalid');
      renderRules(null);
      birthEl.focus();
    }, 0);
  });
  birthEl.addEventListener('change', function () { if (birthEl.value) run(); });
  baseEl.addEventListener('change', function () { if (birthEl.value) run(); });

  baseEl.value = todayStr();
  birthEl.value = '1990-01-01';
  run();
})();
