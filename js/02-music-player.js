/* 02-music-player.js - reproductor de audio local (extraido verbatim de index.html) */
    // =========================================================
    // --- LOCAL AUDIO PLAYER (solo memoria, sin guardado) ---
    // =========================================================
    window.audioEl = new Audio();
    window.audioEl.preload = 'auto';
    window.audioEl.volume = 0.5;
    var musicTracks = []; // {file, name, url} — vive solo en memoria, muere al recargar
    var musicIndex = -1;
    var repeatMode = 0; // 0=off, 1=repetir todo, 2=repetir una (solo memoria)

    function musicStripExt(name) {
      return String(name || '').replace(/\.[^.]+$/, '');
    }

    function musicHasTracks() { return musicTracks.length > 0; }

    function musicIsAudioFile(f) {
      if (!f) return false;
      try {
        if (f.type && f.type.indexOf('audio/') === 0) return true;
      } catch (e) {}
      return /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac|webm)$/i.test(f.name || '');
    }

    function musicRefreshUI() {
      var dz = document.getElementById('musicDropzone');
      if (dz) dz.classList.toggle('hidden', musicHasTracks());
      updateSongDisplay();
      musicUpdateNavButtons();
    }

    function musicUpdateNavButtons() {
      var multi = musicTracks.length > 1;
      var prev = document.getElementById('prevBtn');
      var next = document.getElementById('nextBtn');
      if (prev) prev.disabled = !multi;
      if (next) next.disabled = !multi;
    }

    function musicLoadIndex(i, autoplay) {
      if (!musicHasTracks()) return;
      var n = musicTracks.length;
      musicIndex = ((i % n) + n) % n;
      try {
        window.audioEl.src = musicTracks[musicIndex].url;
        if (autoplay) {
          var p = window.audioEl.play();
          if (p && typeof p.catch === 'function') p.catch(function() {});
        }
      } catch (e) { console.error('Error cargando pista:', e); }
      updateSongDisplay();
      musicUpdateNavButtons();
    }

    function musicAddFiles(files) {
      if (!files || !files.length) return 0;
      var added = 0;
      var wasEmpty = !musicHasTracks();
      for (var k = 0; k < files.length; k++) {
        var f = files[k];
        if (!musicIsAudioFile(f)) continue;
        try { if (!f.size) continue; } catch (e) { continue; }
        try {
          musicTracks.push({ file: f, name: f.name || ('Pista ' + (musicTracks.length + 1)), url: URL.createObjectURL(f) });
          added++;
        } catch (e) { console.error('Error agregando pista:', e); }
      }
      if (added > 0) {
        if (wasEmpty) musicLoadIndex(0, false);
        else musicRefreshUI();
      }
      return added;
    }

    function musicClearList() {
      try { window.audioEl.pause(); } catch (e) {}
      try { window.audioEl.removeAttribute('src'); window.audioEl.load(); } catch (e) {}
      for (var i = 0; i < musicTracks.length; i++) {
        try { URL.revokeObjectURL(musicTracks[i].url); } catch (e) {}
      }
      musicTracks = [];
      musicIndex = -1;
      musicRefreshUI();
    }

    function musicDropReject() {
      var dz = document.getElementById('musicDropzone');
      if (!dz) return;
      dz.classList.add('reject');
      setTimeout(function() { dz.classList.remove('reject'); }, 700);
    }

    function musicSetPlayIcon(playing) {
      var b = document.getElementById('playPauseBtn');
      if (b) b.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    try {
      window.audioEl.addEventListener('play', function() { musicSetPlayIcon(true); });
      window.audioEl.addEventListener('pause', function() { musicSetPlayIcon(false); });
      window.audioEl.addEventListener('ended', function() {
        musicSetPlayIcon(false);
        if (!musicHasTracks()) return;
        if (repeatMode === 2) {
          try {
            window.audioEl.currentTime = 0;
            var p = window.audioEl.play();
            if (p && typeof p.catch === 'function') p.catch(function() {});
          } catch (e) {}
        } else if (repeatMode === 1) {
          musicLoadIndex(musicIndex + 1, true);
        } else {
          if (musicIndex < musicTracks.length - 1) musicLoadIndex(musicIndex + 1, true);
          else updateSongDisplay();
        }
      });
      window.audioEl.addEventListener('error', function() { console.error('Error de audio en la pista actual.'); });
    } catch (e) {}
    function updateRepeatButton() {
      var btn = document.getElementById('repeatBtn');
      if (!btn) return;
      if (repeatMode === 0) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        btn.title = 'Sin repetición';
        btn.style.opacity = '0.4';
        btn.style.color = '';
      } else if (repeatMode === 1) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        btn.title = 'Repetir toda la lista';
        btn.style.opacity = '1';
        btn.style.color = 'var(--color-highlight)';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="font-size:8px;position:absolute;top:1px;right:1px;font-weight:700;">1</span>';
        btn.title = 'Repetir canción';
        btn.style.opacity = '1';
        btn.style.color = 'var(--color-highlight)';
      }
    }

    window.setRepeatMode = function() {
      repeatMode = (repeatMode + 1) % 3;
      updateRepeatButton();
    };

    function updateSongDisplay() {
      if (!_elSongTitle) return;
      try {
        if (musicHasTracks() && musicIndex >= 0 && musicTracks[musicIndex]) {
          _elSongTitle.textContent = musicStripExt(musicTracks[musicIndex].name);
        } else {
          _elSongTitle.textContent = 'Arrastrá tus MP3';
        }
      } catch (error) {}
    }

    var _elFechaHora  = document.getElementById('fecha-hora');
    var _elCurrentTime = document.getElementById('current-time');
    var _elDuration    = document.getElementById('duration-time');
    var _elProgress    = document.getElementById('progressBar');
    var _elSongTitle   = document.getElementById('songTitle');
    var _masterTick    = 0;

    function musicMasterTick() {
      _masterTick++;

      if (_masterTick % 2 === 0) {
        var d = new Date();
        if (_elFechaHora) _elFechaHora.textContent = d.toLocaleDateString() + " " + d.toLocaleTimeString();
      }

      try {
        var cur = Math.floor(window.audioEl.currentTime || 0);
        var dur = Math.floor(window.audioEl.duration || 0);
        if (_elCurrentTime) _elCurrentTime.textContent = Math.floor(cur/60) + ":" + (cur%60).toString().padStart(2,'0');
        if (dur > 0) {
          if (_elDuration) _elDuration.textContent = Math.floor(dur/60) + ":" + (dur%60).toString().padStart(2,'0');
          if (_elProgress && document.activeElement !== _elProgress) _elProgress.value = (cur / dur) * 100;
        } else {
          if (_elDuration) _elDuration.textContent = '0:00';
          if (_elProgress && document.activeElement !== _elProgress) _elProgress.value = 0;
        }
      } catch(e) {}

      if (_masterTick >= 600) _masterTick = 0;

    }
    setInterval(function() { musicMasterTick(); }, 1000);

    window.playPauseVideo = function() {
      if (!musicHasTracks()) return;
      try {
        if (window.audioEl.paused) {
          if (musicIndex < 0) musicLoadIndex(0, false);
          var p = window.audioEl.play();
          if (p && typeof p.catch === 'function') p.catch(function() {});
        } else {
          window.audioEl.pause();
        }
      } catch(err) { console.error('Error en playPause:', err); }
    };

    window._navLock = 0;
    window.nextVideo = function() {
      if (musicTracks.length < 2) return;
      var now = Date.now();
      if (now - window._navLock < 300) return;
      window._navLock = now;
      try { musicLoadIndex(musicIndex + 1, !window.audioEl.paused); }
      catch(err) { console.error('Error en nextVideo:', err); }
    };

    window.prevVideo = function() {
      if (musicTracks.length < 2) return;
      var now = Date.now();
      if (now - window._navLock < 300) return;
      window._navLock = now;
      try {
        var cur = 0;
        try { cur = window.audioEl.currentTime || 0; } catch(e){}
        if (cur > 3) {
          try { window.audioEl.currentTime = 0; } catch(e){}
          return;
        }
        musicLoadIndex(musicIndex - 1, !window.audioEl.paused);
      } catch(err) { console.error('Error en prevVideo:', err); }
    };

    window.seekVideo = function(time) {
      try { window.audioEl.currentTime = time; } catch(e){}
    };

    window.setVideoVolume = function(volume) {
      try {
        var v = parseInt(volume, 10);
        if (isNaN(v)) return;
        window.audioEl.volume = Math.max(0, Math.min(100, v)) / 100;
      } catch(e){}
    };

    // Drag generico reutilizable para paneles flotantes (pointer events + rAF, sin thrash).
    // handleEl puede ser toda la superficie del panel: los clicks en botones/inputs/labels no arrastran.
    window.makeDraggable = function(panelEl, handleEl, storeKey) {
      if (!panelEl || !handleEl) return;
      var dragging = false, moved = false, sx = 0, sy = 0, px = 0, py = 0, nx = 0, ny = 0, raf = 0;
      function apply() {
        raf = 0;
        panelEl.style.left = nx + 'px';
        panelEl.style.top = ny + 'px';
        panelEl.style.right = 'auto';
        panelEl.style.bottom = 'auto';
      }
      handleEl.addEventListener('pointerdown', function(e) {
        if (e.button !== undefined && e.button !== 0) return;
        try { if (e.target && e.target.closest && e.target.closest('button, input, a, select, textarea, label')) return; } catch (err) {}
        dragging = true; moved = false;
        sx = e.clientX; sy = e.clientY;
        try {
          var r = panelEl.getBoundingClientRect();
          px = r.left; py = r.top;
        } catch (err) { dragging = false; return; }
        try { handleEl.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      handleEl.addEventListener('pointermove', function(e) {
        if (!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        nx = px + dx; ny = py + dy;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      function end() {
        if (!dragging) return;
        dragging = false;
        if (raf) { try { cancelAnimationFrame(raf); } catch (err) {} raf = 0; apply(); }
        if (moved && storeKey) {
          try { localStorage.setItem(storeKey, JSON.stringify({ left: panelEl.style.left, top: panelEl.style.top })); } catch (err) {}
        }
        if (moved) {
          // Suprimir el click posterior al arrastre para no disparar el click-outside que cierra dropdowns
          var suppress = function(ev) {
            ev.stopPropagation();
            try { ev.preventDefault(); } catch (err) {}
            document.removeEventListener('click', suppress, true);
          };
          document.addEventListener('click', suppress, true);
          setTimeout(function() { document.removeEventListener('click', suppress, true); }, 50);
        }
        moved = false;
      }
      handleEl.addEventListener('pointerup', end);
      handleEl.addEventListener('pointercancel', end);
      if (storeKey) {
        try {
          var s = JSON.parse(localStorage.getItem(storeKey) || 'null');
          if (s && s.left && s.top) {
            panelEl.style.left = s.left;
            panelEl.style.top = s.top;
            panelEl.style.right = 'auto';
            panelEl.style.bottom = 'auto';
          }
        } catch (err) {}
      }
    };

    document.addEventListener('DOMContentLoaded', function() {
      var playPauseBtn = document.getElementById('playPauseBtn');
      var nextBtn = document.getElementById('nextBtn');
      var prevBtn = document.getElementById('prevBtn');
      var volumeSlider = document.getElementById('volumeSlider');
      var progressBar = document.getElementById('progressBar');
      var toggleBtn = document.getElementById('toggleMusicPanel');
      var toggleBtnFlow = document.getElementById('toggleMusicPanelFlow');
      var musicPanel = document.getElementById('musicPanel');

      if (toggleBtn) {
        toggleBtn.onclick = function() {
          musicPanel.classList.toggle('hidden');
        };
      }
      if (toggleBtnFlow) {
        toggleBtnFlow.onclick = function() {
          musicPanel.classList.toggle('hidden');
        };
      }
      var toggleBtnQuantis = document.getElementById('toggleMusicPanelQuantis');
      if (toggleBtnQuantis) {
        toggleBtnQuantis.onclick = function() {
          musicPanel.classList.toggle('hidden');
        };
      }

      if (playPauseBtn) {
        playPauseBtn.addEventListener('click', window.playPauseVideo);
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', window.nextVideo);
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', window.prevVideo);
      }

      var repeatBtn = document.getElementById('repeatBtn');
      if (repeatBtn) {
        repeatBtn.addEventListener('click', window.setRepeatMode);
      }

      if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
          window.setVideoVolume(parseInt(e.target.value, 10));
        });
      }

      if (progressBar) {
        progressBar.addEventListener('input', function(e) {
          var duration = 0;
          try { duration = window.audioEl.duration || 0; } catch (err) {}
          if (duration) {
            var newTime = (parseInt(e.target.value, 10) / 100) * duration;
            window.seekVideo(newTime);
          }
        });
      }

      // Carga de archivos solo dentro del panel (dropzone + input).
      var musicPanelOpen = function() {
        var mp = document.getElementById('musicPanel');
        return !!(mp && !mp.classList.contains('hidden'));
      };
      var dz = document.getElementById('musicDropzone');
      var fileInput = document.getElementById('musicFileInput');
      if (fileInput) {
        fileInput.addEventListener('change', function() {
          if (!musicPanelOpen()) { fileInput.value = ''; return; }
          var added = 0;
          try { added = musicAddFiles(fileInput.files); } catch (err) {}
          if (!added) musicDropReject();
          fileInput.value = '';
        });
      }
      if (dz) {
        dz.addEventListener('dragenter', function(e) {
          if (!musicPanelOpen()) return;
          e.preventDefault();
          dz.classList.add('dragover');
        });
        dz.addEventListener('dragover', function(e) {
          if (!musicPanelOpen()) return;
          e.preventDefault();
          dz.classList.add('dragover');
        });
        dz.addEventListener('dragleave', function() { dz.classList.remove('dragover'); });
        dz.addEventListener('drop', function(e) {
          dz.classList.remove('dragover');
          if (!musicPanelOpen()) return;
          e.preventDefault();
          // Los archivos los procesa el handler a nivel documento (evita doble carga).
        });
      }
      // Nivel documento: SIEMPRE cancela (evita que el navegador abra el archivo),
      // pero solo acepta archivos sobre la dropzone con el panel abierto.
      document.addEventListener('dragover', function(e) { try { e.preventDefault(); } catch (err) {} });
      document.addEventListener('drop', function(e) {
        try { e.preventDefault(); } catch (err) {}
        try {
          if (!musicPanelOpen()) return;
          var t = e.target;
          var zone = (t && t.closest) ? t.closest('#musicDropzone') : null;
          if (!zone) return;
          var dt = e.dataTransfer;
          var added = (dt && dt.files) ? musicAddFiles(dt.files) : 0;
          if (!added) musicDropReject();
        } catch (err) {}
      });
      var clearBtn = document.getElementById('clearBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', function() { try { musicClearList(); } catch (err) {} });
      }

      updateRepeatButton();
      musicRefreshUI();

      // Music panel drag (reutilizable)
      var musicPanel = document.getElementById('musicPanel');
      var dragHandle = musicPanel ? musicPanel.querySelector('.music-drag-handle') : null;
      if (window.makeDraggable) {
        window.makeDraggable(musicPanel, dragHandle || musicPanel, 'danifu_panel_pos_musicPanel');
        window.makeDraggable(document.getElementById('dominon-config-dropdown'), document.getElementById('dominon-config-dropdown'), 'danifu_panel_pos_dominonCfg');
        window.makeDraggable(document.getElementById('quantis-config-dropdown'), document.getElementById('quantis-config-dropdown'), 'danifu_panel_pos_quantisCfg');
        window.makeDraggable(document.getElementById('miniPlanPopup'), document.getElementById('miniPlanPopup'), 'danifu_panel_pos_miniPlan');
      }
    });
