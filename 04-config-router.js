/* 04-config-router.js - configuracion, i18n, planes (extraido verbatim de index.html) */
    // =========================================================
    // --- CONFIGURATION & VIEW ROUTER ---
    // =========================================================
    // =========================================================
    (function() {
      window.currentLang = localStorage.getItem('danifu_lang') || 'es';
      const I18N = {
        es: {
          plans: 'PLANES',
          plansTitle: 'Planes de membresia',
          notepad: 'Bloc de Notas - Nota ',
          chart: 'TradingView',
          calculator: 'Calculadora',
          pomodoro: 'Pomodoro',
          start: 'INICIAR',
          projects: 'Proyectos',
          qHint: 'SCROLL: ZOOM | DRAG: PAN | CLICK: NUEVO BLOQUE | CLIC DERECHO: ARCHIVO',
          exportNote: 'Export',
          importNote: 'Import',
          trialContactTitle: 'Contactame y probá cualquier plan por 24hs',
          trialContactNotice: 'Contactame y probá cualquier plan por 24hs',
          trialContactDiscord: 'Discord: @DANIFU777',
          trialContactCopyHint: 'Click para copiar',
          trialContactCopied: '¡Copiado!',
          orbTrading: 'TradingView',
          orbNotepad: 'Bloc de Notas',
          orbCalculator: 'Calculadora',
          orbPomodoro: 'Pomodoro',
          orbGemini: 'Gemini',
          orbCloseAll: 'Cerrar todo y volver al reloj'
        },
        en: {
          plans: 'PLANS',
          plansTitle: 'Membership plans',
          notepad: 'Notepad - Note ',
          chart: 'TradingView',
          calculator: 'Calculator',
          pomodoro: 'Pomodoro',
          start: 'START',
          projects: 'Projects',
          qHint: 'SCROLL: ZOOM | DRAG: PAN | CLICK: NEW BLOCK | RIGHT-CLICK: FILE',
          exportNote: 'Export',
          importNote: 'Import',
          trialContactTitle: 'Contact me and try any plan for 24 hours',
          trialContactNotice: 'Contact me and try any plan for 24 hours',
          trialContactDiscord: 'Discord: @DANIFU777',
          trialContactCopyHint: 'Click to copy',
          trialContactCopied: 'Copied!',
          orbTrading: 'TradingView',
          orbNotepad: 'Notepad',
          orbCalculator: 'Calculator',
          orbPomodoro: 'Pomodoro',
          orbGemini: 'Gemini',
          orbCloseAll: 'Close all and return to the clock'
        }
      };

      function qs(sel) { return document.querySelector(sel); }
      function setText(sel, text) { const el = qs(sel); if (el) el.textContent = text; }

      window.showPlanPopup = function(message) {
        const popup = document.getElementById('miniPlanPopup');
        if (!popup) return alert(message);
        popup.textContent = message;
        popup.classList.add('open');
        clearTimeout(window._planPopupTimer);
        window._planPopupTimer = setTimeout(function() { popup.classList.remove('open'); }, 2600);
      };

      window.applyGlobalStaticLanguage = function() {
        const L = I18N[window.currentLang] || I18N.es;
        const planBtn = document.getElementById('openPlansBtn');
        if (planBtn) planBtn.innerHTML = '<i class="fa-solid fa-gem"></i> ' + L.plans;
        setText('#plansTitle', L.plansTitle);
        setText('#main-dashboard-view .chart-header h2', L.chart);
        const title = document.getElementById('notepad-title');
        if (title) title.textContent = L.notepad + (window.activeTab || '1');
        setText('#main-dashboard-view .calculator-panel h2', L.calculator);
        setText('#main-dashboard-view .pomodoro-panel h2', L.pomodoro);
        setText('#start-btn', L.start);
        setText('#quantis-sidebar-header span', L.projects);
        setText('#q-zoom-hint', L.qHint);
        const exportNote = document.getElementById('exportNoteBtn');
        const importNote = document.getElementById('importNoteBtn');
        if (exportNote) exportNote.innerHTML = '<i class="fa-solid fa-file-export"></i> ' + L.exportNote;
        if (importNote) importNote.innerHTML = '<i class="fa-solid fa-file-import"></i> ' + L.importNote;
        document.querySelectorAll('#dominonLangToggle,#quantisLangToggle').forEach(function(toggle) {
          toggle.textContent = window.currentLang.toUpperCase();
        });
        setText('#trialContactNotice', L.trialContactNotice);
        setText('#trialContactDiscord', L.trialContactDiscord);
        var trialBtn = document.getElementById('trialContactBtn');
        if (trialBtn) {
          trialBtn.title = L.trialContactTitle;
          trialBtn.setAttribute('aria-label', L.trialContactTitle);
        }
        var trialDiscord = document.getElementById('trialContactDiscord');
        if (trialDiscord) trialDiscord.title = L.trialContactCopyHint;
        window._orbTitles = {
          trading: L.orbTrading, notepad: L.orbNotepad,
          calculator: L.orbCalculator, pomodoro: L.orbPomodoro,
          gemini: L.orbGemini, closeAll: L.orbCloseAll
        };
        if (window.orbApplyTitles) window.orbApplyTitles(window._orbTitles);
      };

      window.setGlobalLanguage = function(lang, source) {
        window.currentLang = lang === 'en' ? 'en' : 'es';
        localStorage.setItem('danifu_lang', window.currentLang);
        window.applyGlobalStaticLanguage();
        if (source !== 'deep-flow' && typeof window.deepFlowSetLanguage === 'function') {
          window.deepFlowSetLanguage(window.currentLang);
        }
      };

      function closeConfigDropdowns(exceptId) {
        ['dominon-config-dropdown', 'quantis-config-dropdown'].forEach(function(id) {
          if (id !== exceptId) document.getElementById(id)?.classList.remove('open');
        });
      }

      function toggleConfig(dropdownId, e) {
        e.stopPropagation();
        closeConfigDropdowns(dropdownId);
        document.getElementById(dropdownId)?.classList.toggle('open');
      }

      document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('dominonConfigBtn')?.addEventListener('click', function(e) {
          toggleConfig('dominon-config-dropdown', e);
        });
        document.getElementById('quantisConfigBtn')?.addEventListener('click', function(e) {
          toggleConfig('quantis-config-dropdown', e);
        });
        document.getElementById('dominonLangToggle')?.addEventListener('click', function() {
          window.setGlobalLanguage(window.currentLang === 'en' ? 'es' : 'en');
        });
        document.getElementById('quantisLangToggle')?.addEventListener('click', function() {
          window.setGlobalLanguage(window.currentLang === 'en' ? 'es' : 'en');
        });
        document.getElementById('openPlansBtn')?.addEventListener('click', function() {
          document.getElementById('trialContactPopup')?.classList.remove('open');
          document.getElementById('plansModal')?.classList.add('open');
        });
        function copyTrialContactText(text, done) {
          function fallback() {
            try {
              var ta = document.createElement('textarea');
              ta.value = text;
              ta.style.position = 'fixed';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              done(true);
            } catch (e) { done(false); }
          }
          try {
            if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
              navigator.clipboard.writeText(text).then(function() { done(true); }, function() { fallback(); });
            } else {
              fallback();
            }
          } catch (e) { fallback(); }
        }
        document.getElementById('trialContactBtn')?.addEventListener('click', function(e) {
          e.stopPropagation();
          closeConfigDropdowns();
          var popup = document.getElementById('trialContactPopup');
          if (!popup) return;
          var willOpen = !popup.classList.contains('open');
          popup.classList.toggle('open');
          if (willOpen) {
            try {
              var btn = document.getElementById('trialContactBtn');
              var r = btn ? btn.getBoundingClientRect() : null;
              var left = r ? r.left : 18, top = r ? (r.bottom + 8) : 60;
              popup.style.left = left + 'px';
              popup.style.top = top + 'px';
              var w = popup.offsetWidth || 260;
              if (left + w > window.innerWidth - 8) {
                left = Math.max(8, window.innerWidth - w - 8);
                popup.style.left = left + 'px';
              }
            } catch (err) {}
          }
        });
        document.getElementById('trialContactDiscord')?.addEventListener('click', function() {
          var el = document.getElementById('trialContactDiscord');
          copyTrialContactText('@DANIFU777', function() {
            if (!el) return;
            var L = (window.currentLang === 'en') ? I18N.en : I18N.es;
            el.classList.add('copied');
            el.textContent = L.trialContactCopied;
            setTimeout(function() {
              var L2 = (window.currentLang === 'en') ? I18N.en : I18N.es;
              el.classList.remove('copied');
              el.textContent = L2.trialContactDiscord;
            }, 1200);
          });
        });
        document.getElementById('closePlansBtn')?.addEventListener('click', function() {
          document.getElementById('plansModal')?.classList.remove('open');
        });
        document.getElementById('plansModal')?.addEventListener('click', function(e) {
          if (e.target.id === 'plansModal') e.currentTarget.classList.remove('open');
        });
        document.querySelectorAll('.plan-option').forEach(function(btn) {
          btn.addEventListener('click', function() {
            document.getElementById('planContactCard')?.classList.add('open');
          });
        });
        document.addEventListener('click', function(e) {
          if (!e.target.closest('#dominon-config-dropdown,#quantis-config-dropdown,#dominonConfigBtn,#quantisConfigBtn')) {
            closeConfigDropdowns();
          }
          if (!e.target.closest('#trialContactPopup,#trialContactBtn')) {
            document.getElementById('trialContactPopup')?.classList.remove('open');
          }
        });
        window.applyGlobalStaticLanguage();
      });
    })();
