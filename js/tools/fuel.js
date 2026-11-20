/* 연비 계산기 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  BD.initTabs($('fuel-root'));

  function num(id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : null; }
  function f(n, d) { return n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function set(id, html) { $(id).innerHTML = html; }
  function u(s) { return '<small>' + s + '</small>'; }

  /* 유가 공유 + 기억 */
  var prices = document.querySelectorAll('.fuel-price');
  var saved = BD.store.get('fuel-price', '');
  Array.prototype.forEach.call(prices, function (p) {
    if (saved) p.value = saved;
    p.addEventListener('input', function () {
      Array.prototype.forEach.call(prices, function (o) { if (o !== p) o.value = p.value; });
      BD.store.set('fuel-price', p.value);
      calcAll();
    });
  });

  function grade(kmpl) {
    if (kmpl >= 20) return '하이브리드 수준의 매우 좋은 연비입니다.';
    if (kmpl >= 15) return '좋은 연비입니다.';
    if (kmpl >= 10) return '보통 수준의 연비입니다.';
    if (kmpl >= 7) return '대형차·SUV에서 흔한 연비입니다.';
    return '연비가 낮은 편입니다. 시내 정체나 급가속이 많았는지 확인해 보세요.';
  }

  function calcL() {
    var d = num('l-dist'), l = num('l-fuel'), p = num('l-price');
    if (!d || !l) { ['l-kmpl', 'l-l100', 'l-won', 'l-total'].forEach(function (i) { set(i, '-'); }); $('l-grade').textContent = ''; return; }
    var kmpl = d / l;
    set('l-kmpl', f(kmpl, 2) + u('km/L'));
    set('l-l100', f(100 / kmpl, 2) + u('L'));
    set('l-won', p ? f(p / kmpl, 1) + u('원') : '-');
    set('l-total', p ? f(Math.round(p * l), 0) + u('원') : '-');
    $('l-grade').textContent = grade(kmpl);
  }

  function calcW() {
    var d = num('w-dist'), m = num('w-money'), p = num('w-price');
    if (!d || !m) { ['w-k1', 'w-k10', 'w-won', 'w-liter', 'w-kmpl'].forEach(function (i) { set(i, '-'); }); return; }
    set('w-k1', f(d / m * 1000, 2) + u('km'));
    set('w-k10', f(d / m * 10000, 1) + u('km'));
    set('w-won', f(m / d, 1) + u('원'));
    if (p) {
      var liter = m / p;
      set('w-liter', f(liter, 2) + u('L'));
      set('w-kmpl', f(d / liter, 2) + u('km/L'));
    } else { set('w-liter', '-'); set('w-kmpl', '-'); }
  }

  function calcC() {
    var d = num('c-dist'), e = num('c-eff'), p = num('c-price');
    if (!d || !e) { ['c-total-km', 'c-liter', 'c-cost'].forEach(function (i) { set(i, '-'); }); return; }
    var total = d * ($('c-round').checked ? 2 : 1);
    var liter = total / e;
    set('c-total-km', f(total, 1) + u('km'));
    set('c-liter', f(liter, 2) + u('L'));
    set('c-cost', p ? f(Math.round(liter * p), 0) + u('원') : '-');
  }

  function calcAll() { calcL(); calcW(); calcC(); }

  [['panel-l', calcL], ['panel-w', calcW], ['panel-c', calcC]].forEach(function (x) {
    var form = $(x[0]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      x[1]();
      var empty = Array.prototype.filter.call(form.querySelectorAll('input[type="number"]:not(#l-price)'), function (i) { return !(parseFloat(i.value) > 0); });
      Array.prototype.forEach.call(form.querySelectorAll('input[type="number"]'), function (i) { i.removeAttribute('aria-invalid'); });
      empty.forEach(function (i) { i.setAttribute('aria-invalid', 'true'); });
      if (empty.length) { BD.toast('0보다 큰 값을 입력하세요'); empty[0].focus(); }
    });
    form.addEventListener('input', function (e) {
      if (!e.target.classList.contains('fuel-price')) x[1]();
      if (e.target.getAttribute('aria-invalid') && parseFloat(e.target.value) > 0) e.target.removeAttribute('aria-invalid');
    });
    form.addEventListener('change', x[1]);
    form.addEventListener('reset', function () {
      setTimeout(function () {
        // 유가는 기억값 유지
        Array.prototype.forEach.call(form.querySelectorAll('.fuel-price'), function (p) { p.value = BD.store.get('fuel-price', ''); });
        Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (i) { i.removeAttribute('aria-invalid'); });
        x[1]();
      }, 0);
    });
  });

  calcAll();
})();
