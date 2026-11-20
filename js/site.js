/* Bluedove's Developer Playground — 공통 스크립트 */
(function () {
  'use strict';

  var BD = window.BD = window.BD || {};

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var btn = document.querySelector('.nav-toggle');
    var scrim = document.querySelector('.scrim');
    var sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      if (open) {
        var cur = sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector('a');
        if (cur) cur.focus({ preventScroll: true });
      }
    }
    btn.addEventListener('click', function () {
      setOpen(!document.body.classList.contains('nav-open'));
    });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setOpen(false);
        btn.focus();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });

    // 현재 메뉴가 사이드바 스크롤 영역 안에 보이도록
    var current = sidebar.querySelector('[aria-current="page"]');
    if (current && current.scrollIntoView) {
      var r = current.getBoundingClientRect();
      if (r.bottom > window.innerHeight) current.scrollIntoView({ block: 'center' });
    }
  }

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  BD.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  };

  /* ---------- Clipboard ---------- */
  BD.copy = function (text) {
    if (text == null || text === '') { BD.toast('복사할 내용이 없습니다'); return Promise.resolve(false); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    var p = navigator.clipboard && window.isSecureContext
      ? navigator.clipboard.writeText(text).then(function () { return true; }, fallback)
      : Promise.resolve(fallback());
    return p.then(function (ok) {
      BD.toast(ok ? '클립보드에 복사했습니다' : '복사에 실패했습니다');
      return ok;
    });
  };

  /* data-copy="#targetId" : 대상 요소의 value / textContent 를 복사 */
  function initCopyButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      var target = document.querySelector(btn.getAttribute('data-copy'));
      if (!target) return;
      var text = 'value' in target && target.tagName !== 'BUTTON' ? target.value : target.textContent;
      BD.copy(text);
    });
  }

  /* ---------- Download helper ---------- */
  BD.download = function (blobOrText, filename, type) {
    var blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  /* ---------- Tabs (role=tablist) ---------- */
  BD.initTabs = function (root, onChange) {
    var list = root.querySelector('[role="tablist"]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (onChange) onChange(tab.getAttribute('aria-controls'));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(initial);
    return { select: function (id) { var t = tabs.filter(function (x) { return x.getAttribute('aria-controls') === id; })[0]; if (t) select(t); } };
  };

  /* ---------- Misc helpers ---------- */
  BD.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  BD.formatBytes = function (n) {
    if (!isFinite(n)) return '-';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  };

  BD.store = {
    get: function (k, d) { try { var v = localStorage.getItem('bd:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('bd:' + k, JSON.stringify(v)); } catch (e) { /* noop */ } }
  };

  /* JSON 구문 강조 (이미 정렬된 문자열 대상) */
  BD.highlightJson = function (json) {
    var esc = BD.escapeHtml(json);
    return esc.replace(/(&quot;(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[{}\[\],]/g, function (m, str, colon, bool) {
      if (str) return colon ? '<span class="tok-key">' + str + '</span><span class="tok-punc">' + colon + '</span>' : '<span class="tok-str">' + str + '</span>';
      if (bool) return '<span class="tok-bool">' + m + '</span>';
      if (m === 'null') return '<span class="tok-null">null</span>';
      if (/^[{}\[\],]$/.test(m)) return '<span class="tok-punc">' + m + '</span>';
      return '<span class="tok-num">' + m + '</span>';
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initCopyButtons();
    var y = document.querySelectorAll('[data-year]');
    for (var i = 0; i < y.length; i++) y[i].textContent = new Date().getFullYear();
  });
})();
