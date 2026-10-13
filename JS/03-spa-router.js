/* 03-spa-router.js - router SPA 3 vistas (extraido verbatim de index.html) */
    // =========================================================
    // --- SPA ROUTER (3-VIEW SWITCHER) ---
    // =========================================================
    // New 3-view router — add/remove .hidden-view cleanly across all views with fade transitions
    window.switchAppView = function(targetViewId) {
      var ALL_VIEWS = ['main-dashboard-view', 'deep-flow-view', 'quantis-view'];
      var currentActiveView = null;

      // 1. Identificar la vista que está visible actualmente
      ALL_VIEWS.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && !el.classList.contains('hidden-view')) {
          currentActiveView = el;
        }
      });

      // Reproducir sonido si la función existe
      if (typeof playClickSound === 'function') {
        try { playClickSound(); } catch(e) {}
      }

      // 2. Si hay una vista activa, aplicar fade-out antes de ocultar
      if (currentActiveView && currentActiveView.id !== targetViewId) {
        currentActiveView.classList.add('view-invisible');

        // Esperar a que termine la transición de salida (0.5s animado / 0ms estático)
        var exitMs = 500;
        try { if (document.documentElement.classList.contains('anim-off')) exitMs = 0; } catch (e) {}
        setTimeout(function() {
          currentActiveView.classList.add('hidden-view');
          currentActiveView.classList.remove('view-invisible');

          // Mostrar la nueva vista
          revealTargetView(targetViewId);
        }, exitMs);
      } else {
        // Si no había vista activa previa, mostrar directamente
        revealTargetView(targetViewId);
      }
    };

    // Función auxiliar para realizar el fade-in de la nueva vista
    function revealTargetView(targetViewId) {
      var targetEl = document.getElementById(targetViewId);
      if (!targetEl) return;

      // Preparar la vista: quitar hidden-view pero mantenerla invisible mediante opacity/transform
      targetEl.classList.add('view-invisible');
      targetEl.classList.remove('hidden-view');

      // Forzar un reflow para que el navegador procese el estado invisible inicial
      void targetEl.offsetWidth;

      // Quitar la invisibilidad para que ocurra la transición de entrada suave
      targetEl.classList.remove('view-invisible');

      // Forzar actualización del layout de Quantis si se accede a esa vista
      if (targetViewId === 'quantis-view' && typeof window.qApplyPlanLimits === 'function') {
        window.qApplyPlanLimits();
      }
    }
