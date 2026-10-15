/* 11-orbital.js - dashboard orbital de Dominon: reloj central, 5 iconos en orbita, paneles por capas */
(function() {
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

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isAnimOn() {
    try { return !document.documentElement.classList.contains('anim-off'); }
    catch (e) { return true; }
  }
  function layerEl(key) {
    return document.querySelector('#main-dashboard-view .orbital-layer[data-orbital="' + key + '"]');
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
    var openCount = 0, lastKey = null;
    for (var i = 0; i < layers.length; i++) {
      var isOpen = openStack.indexOf(layers[i].getAttribute('data-orbital')) !== -1;
      layers[i].classList.toggle('open', isOpen);
      layers[i].classList.toggle('solo', isOpen && openStack.length === 1);
      if (isOpen) { openCount++; lastKey = layers[i].getAttribute('data-orbital'); }
    }
    if (main) main.classList.toggle('has-open', openCount > 0);
    for (var k in buttons) {
      if (!Object.prototype.hasOwnProperty.call(buttons, k)) continue;
      buttons[k].classList.toggle('orb-active', openStack.indexOf(k) !== -1);
      if (openCount > 0) {
        try { buttons[k].style.transform = ''; } catch (e) {}
      }
    }
    if (openCount === 0) layoutCircle(performance.now());
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

  var ORBIT_MS = 120000;
  function layoutCircle(now) {
    var st = $('orbitalStage');
    if (!st) return;
    var w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    var r = Math.max(150, Math.min(w, h) * 0.36);
    var cx = w / 2, cy = h / 2;
    var base = (now / ORBIT_MS) * Math.PI * 2;
    var keys = Object.keys(buttons);
    for (var i = 0; i < keys.length; i++) {
      var b = buttons[keys[i]];
      if (!b || b.parentNode !== st) continue;
      var a = base + i * (Math.PI * 2 / keys.length) - Math.PI / 2;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      b.style.left = '50%';
      b.style.top = '50%';
      b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)';
    }
  }

  var tick = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    try {
      if (document.hidden) return;
      var st = $('orbitalStage');
      if (!st) return;
      var stacked = openStack.length > 0;
      if (!stacked) layoutCircle(now);
      if (!isAnimOn()) return;
      if (stacked) return;
      var s = sizeCanvas();
      if (!s) return;
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      ensureStars();
      var t = now / 1000, i, p;
      ctx.fillStyle = '#ffffff';
      for (i = 0; i < stars.length; i++) {
        p = stars[i];
        ctx.globalAlpha = 0.15 + 0.55 * Math.abs(Math.sin(t * p.sp + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 6.29);
        ctx.fill();
      }
      var keys = Object.keys(buttons);
      if (tick % 3 === 0 && particles.length < 140 && keys.length) {
        var bk = buttons[keys[(tick / 3) % keys.length | 0]];
        if (bk) {
          var r = bk.getBoundingClientRect(), sr = st.getBoundingClientRect();
          particles.push({
            x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            life: 1
          });
        }
      }
      var rgb = accentRgb();
      for (i = particles.length - 1; i >= 0; i--) {
        p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life) * 0.7;
        ctx.fillStyle = 'rgba(' + rgb + ',1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * p.life + 0.4, 0, 6.29);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      tick++;
    } catch (e) {}
  }

  function init() {
    buildAll();
    tickClock();
    try { if (clockTimer) clearInterval(clockTimer); } catch (e) {}
    clockTimer = setInterval(tickClock, 1000);
    layoutCircle(performance.now());
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
      layoutCircle(performance.now());
    });
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
