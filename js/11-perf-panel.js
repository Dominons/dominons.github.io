/* 11-perf-panel.js - panel de rendimiento (extraido verbatim de index.html) */
    // =========================================================
    // --- PANEL DE RENDIMIENTO (pinta solo con panel abierto) ---
    // =========================================================
    (function() {
      var open = false, secTimer = null;
      var ltObs = null, ltN = 0, ltMs = 0;
      var buckets = [];
      function el(id) { return document.getElementById(id); }
      function tglKey() {
        try { return (window.storageKeyForUser ? window.storageKeyForUser('danifu_perf_toggles_') : 'danifu_perf_toggles_guest'); }
        catch (e) { return 'danifu_perf_toggles_guest'; }
      }
      function loadToggles() {
        var d = { feed: true, tx: true, sound: true, anim: true };
        try {
          var s = JSON.parse(localStorage.getItem(tglKey()) || 'null');
          if (s && typeof s === 'object') {
            if (typeof s.feed === 'boolean') d.feed = s.feed;
            if (typeof s.tx === 'boolean') d.tx = s.tx;
            if (typeof s.sound === 'boolean') d.sound = s.sound;
            if (typeof s.anim === 'boolean') d.anim = s.anim;
          }
        } catch (e) {}
        return d;
      }
      function applyToggles() {
        var t = loadToggles();
        try {
          if (t.feed) { if (typeof perfDfStart === 'function') perfDfStart('price'); }
          else { if (typeof perfDfStop === 'function') perfDfStop('price'); }
          if (t.tx) { if (typeof perfDfStart === 'function') perfDfStart('tx'); }
          else { if (typeof perfDfStop === 'function') perfDfStop('tx'); }
        } catch (e) {}
        try { if (typeof STATE !== 'undefined') STATE.soundEnabled = !!t.sound; } catch (e) {}
        try {
          document.documentElement.classList.toggle('anim-off', !t.anim);
          document.documentElement.classList.toggle('anim-on', !!t.anim);
        } catch (e) {}
        var f = el('perfTglFeed'), x = el('perfTglTx'), s = el('perfTglSound'), a = el('perfTglAnim');
        if (f) f.checked = !!t.feed;
        if (x) x.checked = !!t.tx;
        if (s) s.checked = !!t.sound;
        if (a) a.checked = !!t.anim;
      }
      window.perfApplyToggles = applyToggles;
      function snapReg() {
        var s = {};
        try {
          for (var k in window.__perfReg) {
            if (Object.prototype.hasOwnProperty.call(window.__perfReg, k)) {
              s[k] = { ms: window.__perfReg[k].ms, calls: window.__perfReg[k].calls };
            }
          }
        } catch (e) {}
        return s;
      }
      function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      function paint() {
        var now = Date.now();
        buckets.push({ t: now, snap: snapReg() });
        while (buckets.length > 11) buckets.shift();
        var body = el('perfTopBody');
        if (buckets.length < 2) {
          if (body) body.innerHTML = '<tr><td colspan="3">midiendo…</td></tr>';
          return;
        }
        var first = buckets[0], last = buckets[buckets.length - 1];
        var dt = Math.max(1, (last.t - first.t) / 1000);
        var rows = [];
        for (var k in last.snap) {
          if (!Object.prototype.hasOwnProperty.call(last.snap, k)) continue;
          var a = first.snap[k] || { ms: 0, calls: 0 }, b = last.snap[k];
          var ms = (b.ms - a.ms) / dt, calls = (b.calls - a.calls) / dt;
          if (b.calls <= 0) continue;
          rows.push({ k: k, ms: ms, calls: calls });
        }
        rows.sort(function(x, y) { return y.ms - x.ms; });
        if (body) {
          if (!rows.length) { body.innerHTML = '<tr><td colspan="3">sin actividad</td></tr>'; }
          else {
            var h = '';
            for (var i = 0; i < rows.length; i++) {
              h += '<tr><td>' + esc(rows[i].k) + '</td><td>' + rows[i].ms.toFixed(1) + '</td><td>' + rows[i].calls.toFixed(1) + '</td></tr>';
            }
            body.innerHTML = h;
          }
        }
        var lt = el('perfLt');
        if (lt) lt.textContent = ltN + ' (' + Math.round(ltMs) + ' ms)';
        ltN = 0; ltMs = 0;
      }
      function openPanel() {
        if (open) return;
        open = true;
        var p = el('perf-panel');
        if (p) { p.classList.add('open'); p.setAttribute('aria-hidden', 'false'); }
        buckets = [];
        ltN = 0; ltMs = 0;
        try {
          if (typeof PerformanceObserver !== 'undefined') {
            ltObs = new PerformanceObserver(function(list) {
              try {
                var es = list.getEntries();
                for (var i = 0; i < es.length; i++) { ltN++; ltMs += es[i].duration || 0; }
              } catch (e) {}
            });
            ltObs.observe({ entryTypes: ['longtask'] });
          }
        } catch (e) { ltObs = null; }
        paint();
        secTimer = setInterval(paint, 1000);
      }
      function closePanel() {
        if (!open) return;
        open = false;
        try { if (secTimer) clearInterval(secTimer); } catch (e) {}
        secTimer = null;
        try { if (ltObs) ltObs.disconnect(); } catch (e) {}
        ltObs = null;
        var p = el('perf-panel');
        if (p) { p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); }
      }
      function bindToggle(id, key) {
        var c = el(id);
        if (!c) return;
        c.addEventListener('change', function() {
          var t = loadToggles();
          t[key] = !!c.checked;
          try { localStorage.setItem(tglKey(), JSON.stringify(t)); } catch (e) {}
          applyToggles();
        });
      }
      document.addEventListener('DOMContentLoaded', function() {
        try { if (window.qSaveToFirebase) window.qSaveToFirebase = window.__perfWrap('Guardado Firebase', window.qSaveToFirebase); } catch (e) {}
        applyToggles();
        var b = el('perfToggleBtn');
        if (b) b.addEventListener('click', function(e) { e.stopPropagation(); open ? closePanel() : openPanel(); });
        var c = el('perfCloseBtn');
        if (c) c.addEventListener('click', function() { closePanel(); });
        bindToggle('perfTglFeed', 'feed');
        bindToggle('perfTglTx', 'tx');
        bindToggle('perfTglSound', 'sound');
        bindToggle('perfTglAnim', 'anim');
      });
    })();
