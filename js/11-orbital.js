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
  var orbGeomCache = null;
  var accentTick = 0;
  var accentCur = '168,85,247';
  function orbPos(i, n, g) {
    var a = orbAngle + i * (Math.PI * 2 / n);
    return [g.cx + g.rx * Math.cos(a), g.cy + g.ry * Math.sin(a)];
  }
  function orbMeasure() {
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
    orbGeomCache = { st: st, w: w, h: h, rx: rx, ry: ry, cx: w / 2, cy: h / 2 };
    return orbGeomCache;
  }

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
      (function(def, idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'orb-icon';
        b.setAttribute('data-orbital', def.key);
        b.title = def.title;
        b.innerHTML = def.icon;
        b.style.order = idx >= 2 ? idx + 1 : idx;
        b.style.animationDelay = (idx * 0.45) + 's';
        b.addEventListener('click', function() { toggleLayer(def.key); });
        st.appendChild(b);
        buttons[def.key] = b;
      })(ORB_LAYERS[i], i);
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
    var cv = $('orbitalStars');
    var main = document.querySelector('#main-dashboard-view .orbital-main');
    if (!cv || !main) return null;
    var w = main.clientWidth, h = main.clientHeight;
    if (!w || !h) return null;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var st = $('orbitalStage');
    var ox = 0, oy = 0;
    try { if (st) { ox = st.offsetLeft || 0; oy = st.offsetTop || 0; } } catch (e) {}
    return { ctx: ctx, w: w, h: h, main: main, ox: ox, oy: oy };
  }
  function ensureStars() {
    if (stars.length) return;
    for (var i = 0; i < 60; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.5 });
    }
  }

  function circleGeom() {
    if (orbGeomCache) return orbGeomCache;
    return orbMeasure();
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
    var g = orbMeasure();
    if (!g) return;
    var keys = Object.keys(buttons);
    for (var i = 0; i < keys.length; i++) {
      var b = buttons[keys[i]];
      if (!b || b.parentNode !== g.st) continue;
      var xy = orbPos(i, keys.length, g);
      var p = clampXY(g, xy[0], xy[1]);
      setXY(b, p[0], p[1]);
    }
  }

  var tick = 0;
  var frameCount = 0;
  var cvCtx = null, cvW = 0, cvH = 0, cvOX = 0, cvOY = 0;
  function frame(now) {
    try {
      if (document.hidden) return;
      if (!isAnimOn()) return;
      // Reloj propio en ms: el ticker de GSAP pasa segundos y rAF milisegundos.
      // Usar el argumento tal cual congelaba la órbita (dt siempre 0).
      var tms = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var stacked = openStack.length > 0;
      if (!stacked) {
        var g = circleGeom();
        if (g) {
          if (lastT) {
            var dt = Math.min(100, Math.max(0, tms - lastT));
            orbAngle += (dt / ORBIT_MS) * Math.PI * 2;
          }
          lastT = tms;
          var keys = Object.keys(buttons);
          for (var i = 0; i < keys.length; i++) {
            var b = buttons[keys[i]];
            if (!b || b.parentNode !== g.st) continue;
            var xy2 = orbPos(i, keys.length, g);
            var p = clampXY(g, xy2[0], xy2[1]);
            setXY(b, p[0], p[1]);
          }
        }
      }
      frameCount++;
      if (frameCount % 60 === 0) {
        try { orbMeasure(); } catch (e) {}
        if (isAnimOn()) { try { accentCur = accentRgb(); } catch (e) {} }
      }
      if (stacked) return;
      if (frameCount % 30 === 0) {
        try {
          var sc = sizeCanvas();
          if (sc) { cvCtx = sc.ctx; cvW = sc.w; cvH = sc.h; cvOX = sc.ox || 0; cvOY = sc.oy || 0; }
        } catch (e) {}
      }
      if (!cvCtx) return;
      var ctx = cvCtx, w = cvW, h = cvH;
      ctx.clearRect(0, 0, w, h);
      ensureStars();
      var t = tms / 1000, k, p2;
      ctx.fillStyle = '#ffffff';
      for (k = 0; k < stars.length; k++) {
        p2 = stars[k];
        ctx.globalAlpha = 0.15 + 0.55 * Math.abs(Math.sin(t * p2.sp + p2.ph));
        ctx.beginPath();
        ctx.arc(p2.x * w, p2.y * h, p2.r, 0, 6.29);
        ctx.fill();
      }
      var keys2 = Object.keys(buttons);
      if (tick % 6 === 0 && particles.length < 80 && keys2.length && g) {
        var bi = (tick / 6) % keys2.length | 0;
        var ba2 = orbAngle + bi * (Math.PI * 2 / keys2.length);
        particles.push({
          x: cvOX + g.cx + g.rx * Math.cos(ba2), y: cvOY + g.cy + g.ry * Math.sin(ba2),
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          life: 1
        });
      }
      var rgb = accentCur;
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
