/* 11-orbital.js - dashboard orbital de Dominon: reloj central, 5 iconos en orbita, paneles por capas (con GSAP + fallback) */
(function() {
  var G = (typeof window.gsap !== 'undefined') ? window.gsap : null;
  var ORB_LAYERS = [
    { key: 'trading', title: 'TradingView', icon: '<i class="fa-solid fa-chart-line"></i>' },
    { key: 'notepad', title: 'Bloc de Notas', icon: '<i class="fa-solid fa-pen-to-square"></i>' },
    { key: 'calculator', title: 'Calculadora', icon: '<i class="fa-solid fa-calculator"></i>' },
    { key: 'pomodoro', title: 'Pomodoro', icon: '<i class="fa-solid fa-stopwatch"></i>' },
    { key: 'gemini', title: 'Gemini', icon: '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="Gemini"><defs><linearGradient id="geminiGradOrbit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4A8CFF"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#EC4899"/></linearGradient></defs><path d="M12 0L13.9 8.1L22 12L13.9 15.9L12 24L10.1 15.9L2 12L10.1 8.1Z" fill="url(#geminiGradOrbit)"/></svg>' }
  ];
  var ES_DAYS = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  var ES_MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  var EN_DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  var EN_MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  var openStack = [];
  var buttons = {};
  var clockTimer = null;
  var accentCache = { v: '', rgb: '168,85,247' };
  var orbAngle = -Math.PI / 2;
  var lastT = 0;
  var ORBIT_MS = 120000;

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isAnimOn() {
    try { return !document.documentElement.classList.contains('anim-off'); }
    catch (e) { return true; }
  }
  function layerEl(key) {
    return document.querySelector('#main-dashboard-view .orbital-layer[data-orbital="' + key + '"]');
  }
  function setXY(el, x, y) {
    if (G) {
      try { G.set(el, { x: x, y: y, xPercent: -50, yPercent: -50 }); return; }
      catch (e) {}
    }
    try { el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)'; }
    catch (e) {}
  }
  function clearXY(el) {
    if (G) {
      try { G.set(el, { clearProps: 'transform,left,top' }); return; }
      catch (e) {}
    }
    try { el.style.transform = ''; el.style.left = ''; el.style.top = ''; }
    catch (e) {}
  }
  function accentRgb() {
    try {
      var view = $('main-dashboard-view');
      var v = view ? (getComputedStyle(view).getPropertyValue('--color-highlight') || '').trim() : '';
      if (v && v !== accentCache.v) {
        accentCache.v = v;
        var h = v.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (!isNaN(n)) accentCache.rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
      }
    } catch (e) {}
    return accentCache.rgb;
  }

  function tickClock() {
    var t = $('orbClockTime'), d = $('orbClockDate');
    if (!t && !d) return;
    var now = new Date();
    if (t) t.textContent = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
    if (d) {
      var en = false;
      try { en = (window.currentLang === 'en'); } catch (e) {}
      var days = en ? EN_DAYS : ES_DAYS, months = en ? EN_MONTHS : ES_MONTHS;
      d.textContent = days[now.getDay()] + ', ' + pad2(now.getDate()) + ' · ' + months[now.getMonth()] + ' · ' + now.getFullYear();
    }
  }

  function buildAll() {
    var st = $('orbitalStage');
    if (!st || st.querySelector('.orb-icon')) return;
    var clock = $('orbitalClock');
    if (clock && !clock.firstChild) {
      clock.innerHTML = '<div class="orbital-time" id="orbClockTime">00:00:00</div>' +
        '<div class="orbital-date" id="orbClockDate"></div>' +
        '<div class="rgb-line"></div>';
    }
    for (var i = 0; i < ORB_LAYERS.length; i++) {
      (function(def) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'orb-icon';
        b.setAttribute('data-orbital', def.key);
        b.title = def.title;
        b.innerHTML = def.icon;
        b.addEventListener('click', function() { toggleLayer(def.key); });
        st.appendChild(b);
        buttons[def.key] = b;
      })(ORB_LAYERS[i]);
    }
  }

  function refresh() {
    var main = document.querySelector('#main-dashboard-view .orbital-main');
    var layers = document.querySelectorAll('#main-dashboard-view .orbital-layer');
    var openCount = 0;
    for (var i = 0; i < layers.length; i++) {
      var isOpen = openStack.indexOf(layers[i].getAttribute('data-orbital')) !== -1;
      layers[i].classList.toggle('open', isOpen);
      layers[i].classList.toggle('solo', isOpen && openStack.length === 1);
      if (isOpen) openCount++;
    }
    if (main) main.classList.toggle('has-open', openCount > 0);
    for (var k in buttons) {
      if (!Object.prototype.hasOwnProperty.call(buttons, k)) continue;
      buttons[k].classList.toggle('orb-active', openStack.indexOf(k) !== -1);
      if (openCount > 0) clearXY(buttons[k]);
    }
    if (openCount === 0) layoutCircle();
    else {
      try {
        var st2 = $('orbitalStage');
        var nIcons = st2 ? st2.querySelectorAll('.orb-icon').length : -1;
        var hasClock = !!(st2 && st2.querySelector('#orbitalClock'));
        if ((nIcons !== 5 || !hasClock) && console && console.warn) {
          console.warn('[orbital] barra incompleta: iconos=' + nIcons + ' reloj=' + hasClock);
        }
      } catch (e) {}
    }
  }

  function toggleLayer(key) {
    var idx = openStack.indexOf(key);
    if (idx !== -1) {
      openStack.splice(idx, 1);
      var el = layerEl(key);
      if (el) { el.classList.remove('open'); el.classList.remove('solo'); }
    } else {
      openStack.push(key);
      var el2 = layerEl(key);
      if (el2) el2.classList.add('open');
    }
    refresh();
  }

  function closeAll() {
    openStack = [];
    var layers = document.querySelectorAll('#main-dashboard-view .orbital-layer');
    for (var i = 0; i < layers.length; i++) {
      layers[i].classList.remove('open');
      layers[i].classList.remove('solo');
    }
    refresh();
  }

  var particles = [];
  var stars = [];
  function sizeCanvas() {
    var cv = $('orbitalStars'), st = $('orbitalStage');
    if (!cv || !st) return null;
    var w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return null;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function ensureStars() {
    if (stars.length) return;
    for (var i = 0; i < 90; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.5 });
    }
  }

  function circleGeom() {
    var st = $('orbitalStage');
    if (!st) return null;
    var w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return null;
    var cw = 0, ch = 0;
    try {
      var clock = $('orbitalClock');
      if (clock) { cw = clock.offsetWidth || 0; ch = clock.offsetHeight || 0; }
    } catch (e) {}
    var rx = Math.min(w / 2 - 44, Math.max(200, cw / 2 + 72));
    var ry = Math.min(h / 2 - 44, Math.max(160, ch / 2 + 72));
    if (rx < 120) rx = 120;
    if (ry < 100) ry = 100;
    return { st: st, w: w, h: h, rx: rx, ry: ry, cx: w / 2, cy: h / 2 };
  }
  function clampXY(g, x, y) {
    var m = 36;
    if (x < m) x = m;
    if (x > g.w - m) x = g.w - m;
    if (y < m) y = m;
    if (y > g.h - m) y = g.h - m;
    return [x, y];
  }
  function layoutCircle() {
    var g = circleGeom();
    if (!g) return;
    var keys = Object.keys(buttons);
    for (var i = 0; i < keys.length; i++) {
      var b = buttons[keys[i]];
      if (!b || b.parentNode !== g.st) continue;
      var a = orbAngle + i * (Math.PI * 2 / keys.length);
      var p = clampXY(g, g.cx + g.rx * Math.cos(a), g.cy + g.ry * Math.sin(a));
      setXY(b, p[0], p[1]);
    }
  }

  var tick = 0;
  function frame(now) {
    try {
      if (document.hidden) return;
      var stacked = openStack.length > 0;
      if (!stacked) {
        var g = circleGeom();
        if (g) {
          if (lastT) {
            var dt = Math.min(100, Math.max(0, now - lastT));
            orbAngle += (dt / ORBIT_MS) * Math.PI * 2;
          }
          lastT = now;
          var keys = Object.keys(buttons);
          for (var i = 0; i < keys.length; i++) {
            var b = buttons[keys[i]];
            if (!b || b.parentNode !== g.st) continue;
            var a = orbAngle + i * (Math.PI * 2 / keys.length);
            var p = clampXY(g, g.cx + g.rx * Math.cos(a), g.cy + g.ry * Math.sin(a));
            setXY(b, p[0], p[1]);
          }
        }
      }
      if (!isAnimOn()) return;
      if (stacked) return;
      var s = sizeCanvas();
      if (!s) return;
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      ensureStars();
      var t = now / 1000, k, p2;
      ctx.fillStyle = '#ffffff';
      for (k = 0; k < stars.length; k++) {
        p2 = stars[k];
        ctx.globalAlpha = 0.15 + 0.55 * Math.abs(Math.sin(t * p2.sp + p2.ph));
        ctx.beginPath();
        ctx.arc(p2.x * w, p2.y * h, p2.r, 0, 6.29);
        ctx.fill();
      }
      var keys2 = Object.keys(buttons);
      if (tick % 3 === 0 && particles.length < 140 && keys2.length) {
        var bk = buttons[keys2[(tick / 3) % keys2.length | 0]];
        if (bk) {
          var r = bk.getBoundingClientRect(), sr = g.st.getBoundingClientRect();
          particles.push({
            x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            life: 1
          });
        }
      }
      var rgb = accentRgb();
      for (k = particles.length - 1; k >= 0; k--) {
        p2 = particles[k];
        p2.x += p2.vx; p2.y += p2.vy; p2.life -= 0.02;
        if (p2.life <= 0) { particles.splice(k, 1); continue; }
        ctx.globalAlpha = Math.max(0, p2.life) * 0.7;
        ctx.fillStyle = 'rgba(' + rgb + ',1)';
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 1.6 * p2.life + 0.4, 0, 6.29);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      tick++;
    } catch (e) {}
  }
  function loop(now) {
    if (G) {
      try { G.ticker.add(frame); return; }
      catch (e) {}
    }
    requestAnimationFrame(function step(t) {
      lastT = t;
      frame(t);
      requestAnimationFrame(step);
    });
  }

  function init() {
    window.__orbitalBuild = '2026-10-15-gsap-bar-check';
    try { if (console && console.info) console.info('[orbital] build 2026-10-15-gsap-bar-check'); } catch (e) {}
    buildAll();
    tickClock();
    try { if (clockTimer) clearInterval(clockTimer); } catch (e) {}
    clockTimer = setInterval(tickClock, 1000);
    layoutCircle();
    document.addEventListener('keydown', function(e) {
      if (!e || e.key !== 'Escape') return;
      if (openStack.length === 0) return;
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.target && e.target.isContentEditable) return;
      closeAll();
    });
    window.addEventListener('resize', function() {
      var s = sizeCanvas();
      if (s) { stars = []; }
      layoutCircle();
    });
    lastT = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (G) {
      try { G.ticker.add(frame); }
      catch (e) { loop(lastT); }
    } else {
      loop(lastT);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
