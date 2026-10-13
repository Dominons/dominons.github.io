/* 09-nav-particles.js - particulas de navegacion (extraido verbatim de index.html) */
    (function () {
      document.addEventListener('click', function (e) {
        try { if (document.documentElement.classList.contains('anim-off')) return; } catch (err) {}
        var btn = e.target.closest('.glow-button');
        if (!btn || !btn.getAttribute('onclick')) return;
        var r = btn.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        for (var i = 0; i < 12; i++) {
          (function (i) {
            setTimeout(function () {
              var p = document.createElement('span');
              p.className = 'nav-particle';
              var angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
              var dist = 22 + Math.random() * 26;
              p.style.left = cx + 'px';
              p.style.top = cy + 'px';
              p.style.setProperty('--px', (Math.cos(angle) * dist).toFixed(1) + 'px');
              p.style.setProperty('--py', (Math.sin(angle) * dist).toFixed(1) + 'px');
              document.body.appendChild(p);
              setTimeout(function () { p.remove(); }, 700);
            }, i * 8);
          })(i);
        }
      }, true);
    })();
