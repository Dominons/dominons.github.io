/* 08-orbital.js - dashboard orbital Dominon (extraido verbatim de index.html) */
    // =========================================================
    // --- DOMINON ORBITAL DASHBOARD (FASE 1) ---
    // =========================================================
    (function() {
      var ORB_LAYERS = [
        { key: 'trading', title: 'TradingView', icon: '<i class="fa-solid fa-chart-line"></i>' },
        { key: 'notepad', title: 'Bloc de Notas', icon: '<i class="fa-solid fa-file-pen"></i>' },
        { key: 'calculator', title: 'Calculadora', icon: '<i class="fa-solid fa-calculator"></i>' },
        { key: 'pomodoro', title: 'Pomodoro', icon: '<i class="fa-solid fa-stopwatch"></i>' },
        { key: 'gemini', title: 'Gemini', icon: '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Gemini"><defs><linearGradient id="geminiGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4A8CFF"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#EC4899"/></linearGradient></defs><path d="M12 0L13.9 8.1L22 12L13.9 15.9L12 24L10.1 15.9L2 12L10.1 8.1Z" fill="url(#geminiGrad2)"/></svg>' }
      ];
      var ES_DAYS = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
      var ES_MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      var EN_DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      var EN_MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
      var activeLayer = null;
      var clockTimer = null;
      var orbOpenStack = [];
      var orbButtons = {};
      var orbFlying = {};
      var orbRestoring = false;
      var orbSaveTimer = null;
      var orbLayoutSig = '';
      function orbStateKey() {
        try {
          if (window.storageKeyForUser) return window.storageKeyForUser('danifu_orbital_state_');
        } catch (e) {}
        return 'danifu_orbital_state_guest';
      }
      function orbValidKey(k) {
        for (var i = 0; i < ORB_LAYERS.length; i++) {
          if (ORB_LAYERS[i].key === k) return true;
        }
        return false;
      }
      function orbSaveState() {
        try {
          if (orbSaveTimer) clearTimeout(orbSaveTimer);
          orbSaveTimer = setTimeout(function() {
            orbSaveTimer = null;
            try {
              var valid = [];
              for (var i = 0; i < orbOpenStack.length; i++) {
                var k = orbOpenStack[i];
                if (orbValidKey(k) && valid.indexOf(k) === -1) valid.push(k);
              }
              localStorage.setItem(orbStateKey(), JSON.stringify({ stack: valid, t: Date.now() }));
            } catch (e) {}
          }, 300);
        } catch (e) {}
      }
      window.orbRestoreState = function() {
        var keys = null;
        try {
          var raw = localStorage.getItem(orbStateKey());
          if (!raw) return;
          var data = JSON.parse(raw);
          if (!data || !Array.isArray(data.stack)) return;
          keys = [];
          for (var i = 0; i < data.stack.length; i++) {
            if (orbValidKey(data.stack[i]) && keys.indexOf(data.stack[i]) === -1) keys.push(data.stack[i]);
          }
        } catch (e) { return; }
        if (!keys.length) return;
        if (!orbStage() || !document.getElementById('orbitalClock')) return;
        orbRestoring = true;
        try {
          for (var j = 0; j < keys.length; j++) orbOpenLayer(keys[j]);
          orbRenderBar();
          orbRenumberOrders();
          if (orbOpenStack.length) {
            orbSetStackMode(true);
            var main = orbMain();
            if (main) { try { main.scrollTop = 0; } catch (e) {} }
          }
        } catch (e) {}
        orbRestoring = false;
      };

      function pad2(n) { return (n < 10 ? '0' : '') + n; }

      function orbTickClock() {
        var t = document.getElementById('orbClockTime');
        var d = document.getElementById('orbClockDate');
        var clockEl = document.getElementById('orbitalClock');
        if (!t || !d) {
          if (clockEl) {
            clockEl.innerHTML = '<div class="orbital-time" id="orbClockTime">00:00:00</div>' +
              '<div class="orbital-date" id="orbClockDate"></div>' +
              '<div class="rgb-line"></div>';
            t = document.getElementById('orbClockTime');
            d = document.getElementById('orbClockDate');
          } else {
            return;
          }
        }
        var now = new Date();
        if (t) t.textContent = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
        if (d) {
          var en = false;
          try { en = (window.currentLang === 'en'); } catch (e) {}
          var days = en ? EN_DAYS : ES_DAYS;
          var months = en ? EN_MONTHS : ES_MONTHS;
          d.textContent = days[now.getDay()] + ', ' + pad2(now.getDate()) + ' · ' + months[now.getMonth()] + ' · ' + now.getFullYear();
        }
      }
      window.orbClockStop = function() {
        if (clockTimer) { try { clearInterval(clockTimer); } catch (e) {} clockTimer = null; }
      };

      function orbStage() { return document.getElementById('orbitalStage'); }

      function orbLayoutIcons() {
        var st = orbStage();
        if (!st) return;
        var w = st.clientWidth, h = st.clientHeight;
        if (!w || !h) return;
        var btns = st.querySelectorAll('.orb-icon');
        var sig = w + 'x' + h + 'x' + btns.length;
        if (sig === orbLayoutSig) return;
        orbLayoutSig = sig;
        var rx = Math.min(w / 2 - 44, Math.max(260, w * 0.32));
        var ry = Math.min(h / 2 - 44, Math.max(200, h * 0.36));
        if (rx < 120) rx = 120;
        if (ry < 100) ry = 100;
        var cx = w / 2, cy = h / 2, half = 32;
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].parentNode !== st) continue;
          var a = (-90 + i * 72) * Math.PI / 180;
          btns[i].style.left = (cx + rx * Math.cos(a) - half) + 'px';
          btns[i].style.top = (cy + ry * Math.sin(a) - half) + 'px';
        }
      }

      function orbMain() {
        var st = orbStage();
        return st ? st.parentNode : null;
      }
      function orbLayerEl(key) {
        return document.querySelector('#main-dashboard-view .orbital-layer[data-orbital="' + key + '"]');
      }
      function orbIsAnimOn() {
        try { return !document.documentElement.classList.contains('anim-off'); }
        catch (e) { return true; }
      }
      function orbEnsureBar() {
        var main = orbMain();
        if (!main) return null;
        var bar = document.getElementById('orbitalBar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'orbital-bar';
          bar.id = 'orbitalBar';
          main.insertBefore(bar, main.firstChild);
        }
        return bar;
      }
      function orbRenumberOrders() {
        for (var i = 0; i < orbOpenStack.length; i++) {
          var el = orbLayerEl(orbOpenStack[i]);
          if (el) el.style.order = String(i + 1);
        }
      }
      function orbRenderBar() {
        var bar = orbEnsureBar();
        if (!bar) return;
        while (bar.firstChild) bar.removeChild(bar.firstChild);
        var visible = [];
        for (var i = 0; i < ORB_LAYERS.length; i++) {
          var k = ORB_LAYERS[i].key;
          if (!orbFlying[k] && orbButtons[k]) visible.push(orbButtons[k]);
        }
        var stacked = orbOpenStack.length > 0;
        var clock = stacked ? document.getElementById('orbitalClock') : null;
        if (clock && stacked && !clock.classList.contains('compact')) {
          try { clock.classList.add('compact'); } catch (e) {}
        }
        if (!visible.length && clock) {
          bar.appendChild(clock);
          if (clock && !clock.classList.contains('compact')) clock.classList.add('compact');
          return;
        }
        var insertAt = Math.ceil(visible.length / 2);
        for (var j = 0; j <= visible.length; j++) {
          if (j === insertAt && clock) bar.appendChild(clock);
          if (j < visible.length) bar.appendChild(visible[j]);
        }
        if (stacked && clock) {
          if (clock.parentNode !== bar) { try { bar.appendChild(clock); } catch (e) {} }
          var cr = null;
          try { cr = clock.getBoundingClientRect(); } catch (e) {}
          if (!cr || cr.width < 50 || cr.height < 10) {
            try { console.warn('[orbital] reloj en barra con rect anómalo:', cr && cr.width, cr && cr.height); } catch (e) {}
          }
        }
      }
      function orbSetStackMode(on) {
        var main = orbMain();
        if (main) main.classList.toggle('has-stack', !!on);
        var st = orbStage();
        if (st) st.style.display = on ? 'none' : 'block';
        var bar = document.getElementById('orbitalBar');
        if (bar) bar.style.display = on ? 'flex' : 'none';
        var clock = document.getElementById('orbitalClock');
        if (clock) clock.classList.toggle('compact', !!on);
        if (!on && !st) return;
        if (!on && st && !st.querySelector('.orb-icon')) {
          orbBuildIcons();
          orbLayoutIcons();
        }
      }
      function orbRect(el) { try { return el.getBoundingClientRect(); } catch (e) { return null; } }
      function orbFlipPlay(btn, r1, r2) {
        if (!r1 || !r2 || !r1.width || !r2.width) return;
        var dx = (r1.left + r1.width / 2) - (r2.left + r2.width / 2);
        var dy = (r1.top + r1.height / 2) - (r2.top + r2.height / 2);
        var s = r1.width / r2.width;
        try {
          btn.style.transition = 'none';
          btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
          void btn.offsetWidth;
          btn.style.transition = '';
          btn.style.transform = '';
        } catch (e) {
          try { btn.style.transform = ''; btn.style.transition = ''; } catch (e2) {}
        }
      }
      function orbFlyIcon(key, toPanel) {
        var btn = orbButtons[key];
        if (!btn) return;
        if (toPanel) {
          var layer = orbLayerEl(key);
          if (!layer) return;
          var bar = orbEnsureBar();
          orbFlying[key] = false;
          if (!orbIsAnimOn()) {
            if (bar && btn.parentNode !== bar) bar.appendChild(btn);
            btn.style.left = ''; btn.style.top = '';
            btn.classList.remove('orb-icon-in-panel');
            orbRenderBar();
            return;
          }
          var r1 = orbRect(btn);
          if (bar && btn.parentNode !== bar) bar.appendChild(btn);
          btn.style.left = ''; btn.style.top = '';
          btn.classList.remove('orb-icon-in-panel');
          orbRenderBar();
          orbFlipPlay(btn, r1, orbRect(btn));
        } else {
          orbFlying[key] = false;
          if (!orbIsAnimOn()) {
            btn.classList.remove('orb-icon-in-panel');
            btn.style.transform = '';
            btn.style.transition = '';
            orbRenderBar();
            return;
          }
          var q1 = orbRect(btn);
          btn.classList.remove('orb-icon-in-panel');
          orbRenderBar();
          orbFlipPlay(btn, q1, orbRect(btn));
        }
      }

      function orbOpenLayer(key) {
        if (!orbValidKey(key)) return;
        if (orbOpenStack.indexOf(key) !== -1) return;
        orbLayoutSig = '';
        var silent = orbRestoring;
        var first = orbOpenStack.length === 0;
        orbOpenStack.push(key);
        var el = orbLayerEl(key);
        if (el) {
          el.classList.remove('layer-closed');
          el.classList.add('layer-open');
        }
        orbRenumberOrders();
        if (first) {
          orbSetStackMode(true);
          orbFlying[key] = false;
          if (!silent) orbRenderBar();
        }
        if (silent) {
          var btn0 = orbButtons[key];
          var layer0 = orbLayerEl(key);
          if (btn0) {
            orbFlying[key] = false;
            if (layer0 && btn0.parentNode !== layer0) layer0.appendChild(btn0);
            btn0.classList.add('orb-icon-in-panel');
            btn0.style.left = ''; btn0.style.top = '';
            try { btn0.style.transform = ''; btn0.style.transition = ''; } catch (e) {}
          }
        } else {
          orbFlyIcon(key, true);
        }
        var btn = orbButtons[key];
        if (btn) btn.classList.add('orb-active');
        activeLayer = key;
        if (!silent) orbSaveState();
      }

      function orbCloseOne(key) {
        var idx = orbOpenStack.indexOf(key);
        if (idx === -1) return;
        orbLayoutSig = '';
        orbOpenStack.splice(idx, 1);
        var el = orbLayerEl(key);
        if (el) {
          el.classList.remove('layer-open');
          el.classList.add('layer-closed');
          el.style.order = '';
        }
        var btn = orbButtons[key];
        if (btn) btn.classList.remove('orb-active');
        if (orbOpenStack.length === 0) orbCloseAllLayers();
        else {
          orbFlyIcon(key, false);
          orbRenumberOrders();
          if (activeLayer === key) activeLayer = orbOpenStack[orbOpenStack.length - 1];
          orbSaveState();
        }
      }

      function orbCloseAllLayers() {
        orbLayoutSig = '';
        var keys = orbOpenStack.slice();
        for (var i = 0; i < keys.length; i++) {
          var el = orbLayerEl(keys[i]);
          if (el) {
            el.classList.remove('layer-open');
            el.classList.add('layer-closed');
            el.style.order = '';
          }
          var btn = orbButtons[keys[i]];
          if (btn) {
            btn.classList.remove('orb-active');
            btn.classList.remove('orb-icon-in-panel');
            try { btn.style.transform = ''; btn.style.transition = ''; } catch (e) {}
          }
        }
        orbOpenStack = [];
        orbFlying = {};
        activeLayer = null;
        var st = orbStage();
        var clock = document.getElementById('orbitalClock');
        if (st && clock && clock.parentNode !== st) st.insertBefore(clock, st.firstChild);
        for (var m = 0; m < ORB_LAYERS.length; m++) {
          var ib = orbButtons[ORB_LAYERS[m].key];
          if (ib && st && ib.parentNode !== st) {
            ib.classList.remove('orb-icon-in-panel');
            try { ib.style.transform = ''; ib.style.transition = ''; } catch (e) {}
            st.appendChild(ib);
          }
        }
        orbSetStackMode(false);
        if (st) {
          st.classList.remove('mode-layer');
          st.classList.add('mode-circle');
        }
        orbLayoutIcons();
        orbTickClock();
        orbSaveState();
      }

      function orbToggleLayer(key) {
        if (orbOpenStack.indexOf(key) !== -1) orbCloseOne(key);
        else orbOpenLayer(key);
      }

      function orbBuildIcons() {
        var st = orbStage();
        if (!st || st.querySelector('.orb-icon')) return;
        for (var i = 0; i < ORB_LAYERS.length; i++) {
          (function(def, idx) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'orb-icon';
            b.setAttribute('data-orbital', def.key);
            b.title = def.title;
            var inner = document.createElement('span');
            inner.className = 'orb-icon-inner';
            inner.innerHTML = def.icon;
            inner.style.animationDelay = (idx * 0.75) + 's';
            b.appendChild(inner);
            b.addEventListener('click', function() { orbToggleLayer(def.key); });
            st.appendChild(b);
            orbButtons[def.key] = b;
          })(ORB_LAYERS[i], i);
        }
      }

      function orbApplyTitles(map) {
        try {
          if (!map) return;
          for (var k in orbButtons) {
            if (!Object.prototype.hasOwnProperty.call(orbButtons, k)) continue;
            if (map[k] && orbButtons[k]) orbButtons[k].title = map[k];
          }
          var clock = document.getElementById('orbitalClock');
          if (clock && map.closeAll) {
            clock.title = map.closeAll;
            clock.setAttribute('aria-label', map.closeAll);
          }
        } catch (e) {}
      }
      window.orbApplyTitles = orbApplyTitles;

      function orbInit() {
        var st = orbStage();
        if (!st) return;
        var clock = document.getElementById('orbitalClock');
        if (clock && !clock.firstChild) {
          clock.innerHTML = '<div class="orbital-time" id="orbClockTime">00:00:00</div>' +
            '<div class="orbital-date" id="orbClockDate"></div>' +
            '<div class="rgb-line"></div>';
        }
        orbBuildIcons();
        orbSetStackMode(false);
        var clock0 = document.getElementById('orbitalClock');
        if (clock0 && !clock0._orbBound) {
          clock0._orbBound = true;
          clock0.title = 'Cerrar todo';
          clock0.setAttribute('role', 'button');
          clock0.addEventListener('click', function() {
            if (orbOpenStack.length) orbCloseAllLayers();
          });
        }
        orbTickClock();
        try { if (clockTimer) clearInterval(clockTimer); } catch (e) {}
        clockTimer = setInterval(orbTickClock, 1000);
        orbLayoutIcons();
        setTimeout(orbLayoutIcons, 600);
        window.addEventListener('resize', orbLayoutIcons);
        window.addEventListener('load', orbLayoutIcons);
        document.addEventListener('keydown', function(e) {
          if (orbOpenStack.length === 0) return;
          if (!e || e.key !== 'Escape') return;
          var tag = e.target && e.target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          if (e.target && e.target.isContentEditable) return;
          orbCloseOne(orbOpenStack[orbOpenStack.length - 1]);
        });
        try { window.orbRestoreState(); } catch (e) {}
        try { if (window._orbTitles) orbApplyTitles(window._orbTitles); } catch (e) {}
      }

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', orbInit);
      else orbInit();
    })();
