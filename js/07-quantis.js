/* 07-quantis.js - motor Quantis canvas (extraido verbatim de index.html) */
  (function () {
    // =========================================================
    // --- QUANTIS INFINITE CANVAS ENGINE (BOUNDED, GRID, ZOOM-TO-MOUSE) ---
    // =========================================================
    var QS = {
      lang: "es",
      zoom: 1.0,
      panX: 0,
      panY: 0,
      isPanning: false,
      startX: 0,
      startY: 0,
      isDrawing: false,
      drawMode: null,
      drawColor: "#000000",
      drawSize: 8,
      activePath: null,
      ctxCoords: { x: 0, y: 0 },
      activeProj: 0,
      activePage: 0,
      selectedPaths: [],
      isSelecting: false,
      marqueeStart: null,
      selectionDragStart: null,
      selectionDragOffset: { x: 0, y: 0 },
      projects: [
        {
          id: "qp-1",
          name: "Proyecto Alpha",
          pages: ["Página Inicial", "Investigación"],
        },
        { id: "qp-2", name: "Proyecto Beta", pages: ["Resumen"] },
      ],
      canvasData: {
        "0-0": [
          {
            type: "text",
            x: 3870,
            y: 3870,
            desc: "Bienvenida",
            content:
              "Lienzo Infinito — Click para crear un bloque. Scroll para zoom. Arrastra para navegar. Clic derecho para insertar archivos.",
          },
        ],
        "0-1": [],
        "1-0": [],
      },
      drawings: {},
      clipboard: [],
      undoStack: {},
      redoStack: {},
    };
    window.QS = QS;

    // =========================================================
    // --- QUANTIS DOM REFERENCES ---
    // =========================================================
    var QD = {};

    function qInit() {
      QD.viewport = document.getElementById("quantis-viewport");
      QD.canvas = document.getElementById("quantis-canvas-container");
      QD.drawSvg = document.getElementById("quantis-drawing-svg");
      QD.projList = document.getElementById("q-projects-list");
      QD.ctxMenu = document.getElementById("q-context-menu");
      QD.fileInput = document.getElementById("q-file-input");
      QD.clock = document.getElementById("quantis-clock");

      if (!QD.viewport) return;

      // ===== QUANTIS VIEWPORT — ZOOM & SCROLL =====
      var quantisViewport = QD.viewport;

      quantisViewport.addEventListener(
        "wheel",
        function (e) {
          if (
            !(
              e.target === quantisViewport || quantisViewport.contains(e.target)
            )
          )
            return;
          e.preventDefault();
          var rect = quantisViewport.getBoundingClientRect();
          var mouseX = e.clientX - rect.left;
          var mouseY = e.clientY - rect.top;
          var oldZoom = QS.zoom;
          var factor = e.ctrlKey ? 0.01 : 0.0015;
          var newZoom = oldZoom * (1 - e.deltaY * factor);
          var bounds = qGetCanvasBounds();
          var minZoom = Math.max(
            0.2,
            quantisViewport.clientWidth / bounds.size,
          );
          var minZoomY = Math.max(
            0.2,
            quantisViewport.clientHeight / bounds.size,
          );
          minZoom = Math.max(minZoom, minZoomY);
          var maxZoom = 3.0;
          QS.zoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
          if (QS.zoom === oldZoom) return;
          var canvasX = (mouseX - QS.panX) / oldZoom;
          var canvasY = (mouseY - QS.panY) / oldZoom;
          QS.panX = mouseX - canvasX * QS.zoom;
          QS.panY = mouseY - canvasY * QS.zoom;
          qUpdateTransform();
        },
        { passive: false },
      );

      qLoadWorkspace();
      qApplyCanvasSize();
      qRenderProjects();
      qLoadPage(QS.activeProj, QS.activePage, true);
      qSetupCanvas();
      qSetupWorkspaceButtons();
      qSetupDrawingControls();
      qSetupClock();
      qSetupAutoSave();
      window.qUpdateDrawingControls();

      // Auto-guardar Quantis en Firebase cada 60 segundos si el usuario está autenticado
      setInterval(function() {
        var view = document.getElementById('quantis-view');
        if (view && !view.classList.contains('hidden-view') && window.auth && window.auth.currentUser) {
          window.qSaveToFirebase();
        }
      }, 60000);
    }

    // ---- CLOCK ----
    function qSetupClock() {
      function tick() {
        if (!QD.clock) return;
        var n = new Date();
        var pad = function (v) {
          return String(v).padStart(2, "0");
        };
        QD.clock.textContent =
          pad(n.getHours()) +
          ":" +
          pad(n.getMinutes()) +
          ":" +
          pad(n.getSeconds());
      }
      tick();
      setInterval(tick, 1000);
    }

    // ---- AUTO-SAVE ----
    function qSetupAutoSave() {
      // Guarda cada 30 segundos si Quantis está visible y hay sesión iniciada
      setInterval(function () {
        var view = document.getElementById("quantis-view");
        if (
          view &&
          !view.classList.contains("hidden-view") &&
          window.auth &&
          window.auth.currentUser
        ) {
          qSavePage();
        }
      }, 30000);

      // Guarda al cambiar de pestaña o minimizar ventana
      document.addEventListener("visibilitychange", function () {
        if (
          document.visibilityState === "hidden" &&
          window.auth &&
          window.auth.currentUser
        ) {
          qSavePage();
          window.qFlushCloudSave?.();
        }
      });

      // Guarda antes de cerrar el navegador (solo con sesión activa, para no
      // volcar el workspace del usuario en la clave 'guest' al hacer logout)
      window.addEventListener("beforeunload", function () {
        if (window.auth && window.auth.currentUser) {
          qSavePage();
          window.qFlushCloudSave?.();
        }
      });
    }

    // ---- CANVAS TRANSFORM ----
    function qApplyCanvasSize() {
      if (!QD.canvas) return;
      var limits = window.getPlanLimits
        ? window.getPlanLimits()
        : { quantisSize: 2000 };
      var size = limits.quantisSize || 2000;
      QD.canvas.style.width = size + "px";
      QD.canvas.style.height = size + "px";
      QD.canvas.style.left = "0px";
      QD.canvas.style.top = "0px";
      QD.drawSvg.setAttribute("viewBox", "0 0 " + size + " " + size);
      QD.drawSvg.style.width = size + "px";
      QD.drawSvg.style.height = size + "px";
      qRedrawCanvas();
    }

    function qGetCanvasBounds() {
      var limits = window.getPlanLimits
        ? window.getPlanLimits()
        : { quantisSize: 2000 };
      var size = limits.quantisSize || 2000;
      var half = size / 2;
      return { size: size, half: half };
    }

    function qClampPan() {
      var bounds = qGetCanvasBounds();
      var maxPanX = (bounds.size * QS.zoom) / 2;
      var maxPanY = (bounds.size * QS.zoom) / 2;
      QS.panX = Math.max(-maxPanX, Math.min(maxPanX, QS.panX));
      QS.panY = Math.max(-maxPanY, Math.min(maxPanY, QS.panY));
    }

    function qGetZoomConstraints() {
      var bounds = qGetCanvasBounds();
      var minZoom = Math.max(
        0.35,
        Math.max(
          QD.viewport.clientWidth / bounds.size,
          QD.viewport.clientHeight / bounds.size,
        ),
      );
      var maxZoom = Math.min(
        3.0,
        bounds.size /
          Math.min(QD.viewport.clientWidth, QD.viewport.clientHeight),
      );
      return { min: minZoom, max: maxZoom };
    }

    function qIsWithinBounds(x, y) {
      var bounds = qGetCanvasBounds();
      return x >= 0 && x <= bounds.size && y >= 0 && y <= bounds.size;
    }

    // ---- SELECTION HELPERS ----
    function qHitTestPath(path, px, py, margin) {
      margin = margin || 6;
      var threshold = (path.size || 8) + margin;
      for (var i = 0; i < path.points.length; i++) {
        if (Math.hypot(path.points[i].x - px, path.points[i].y - py) <= threshold) return true;
      }
      if (path.points.length >= 2) {
        for (var i = 0; i < path.points.length - 1; i++) {
          var ax = path.points[i].x, ay = path.points[i].y;
          var bx = path.points[i+1].x, by = path.points[i+1].y;
          var dx = bx - ax, dy = by - ay;
          var len2 = dx*dx + dy*dy;
          var t = len2 !== 0 ? Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / len2)) : 0;
          var cx = ax + t*dx, cy = ay + t*dy;
          if (Math.hypot(px-cx, py-cy) <= threshold) return true;
        }
      }
      if (path.mode === "circle" && path.points.length >= 2) {
        var cx0 = path.points[0].x, cy0 = path.points[0].y;
        var r = Math.hypot(path.points[1].x - cx0, path.points[1].y - cy0);
        if (Math.abs(Math.hypot(px-cx0, py-cy0) - r) <= threshold) return true;
      }
      return false;
    }

    function qGetPathBoundingBox(path) {
      if (!path.points || !path.points.length) return null;
      var minX = path.points[0].x, maxX = path.points[0].x;
      var minY = path.points[0].y, maxY = path.points[0].y;
      for (var i = 1; i < path.points.length; i++) {
        var p = path.points[i];
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function qGetSelectedPathsBoundingBox() {
      var box = null;
      for (var i = 0; i < QS.selectedPaths.length; i++) {
        var b = qGetPathBoundingBox(QS.selectedPaths[i]);
        if (!b) continue;
        if (!box) box = { x: b.x, y: b.y, w: b.w, h: b.h };
        else { box.x = Math.min(box.x, b.x); box.y = Math.min(box.y, b.y); box.w = Math.max(box.x + box.w, b.x + b.w) - box.x; box.h = Math.max(box.y + box.h, b.y + b.h) - box.y; }
      }
      return box;
    }

    function qClearSelection() {
      QS.selectedPaths = [];
      qUpdateSelectionVisual();
    }

    function qUpdateSelectionVisual() {
      var boxEl = document.getElementById("q-selection-box");
      if (!boxEl) return;
      if (QS.selectedPaths.length === 0) {
        boxEl.style.display = "none";
        boxEl.innerHTML = "";
        return;
      }
      var box = qGetSelectedPathsBoundingBox();
      if (!box) { boxEl.style.display = "none"; return; }
      boxEl.style.display = "block";
      boxEl.style.left = box.x + "px";
      boxEl.style.top = box.y + "px";
      boxEl.style.width = box.w + "px";
      boxEl.style.height = box.h + "px";
      boxEl.innerHTML = '<div class="q-sel-rect" style="left:0;top:0;width:100%;height:100%;"></div>';
        qSetSelectionBorder();
      }

      // FASE 3 — COPIAR / PEGAR / ELIMINAR
      window.qCopySelection = function () {
        if (!window.isMembershipPlanReady || !qIsPremiumBrush()) {
          window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
          return;
        }
        if (QS.selectedPaths.length > 0) {
          QS.clipboard = JSON.parse(JSON.stringify(QS.selectedPaths));
        }
        qUpdateDrawingControls();
      };

      window.qPasteSelection = function () {
        if (!window.isMembershipPlanReady || !qIsPremiumBrush()) {
          window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
          return;
        }
        if (QS.clipboard.length === 0) return;
        if (QS.drawMode !== "select") return;
        qPushUndo();
        var key = qWorkspaceKey();
        var drawings = qNormalizeDrawingPaths(key);
        var offsetX = 20, offsetY = 20;
        var useCursor = QS.lastMouse && QS.lastMouse.x !== undefined && QS.lastMouse.y !== undefined;
        if (useCursor) {
          var rect = QD.viewport ? QD.viewport.getBoundingClientRect() : null;
          if (rect) {
            var canvasX = (QS.lastMouse.x - rect.left) / QS.zoom - QS.panX;
            var canvasY = (QS.lastMouse.y - rect.top) / QS.zoom - QS.panY;
            var cloneTest = JSON.parse(JSON.stringify(QS.clipboard[0]));
            var testBox = qGetPathBoundingBox(cloneTest);
            if (testBox) {
              offsetX = canvasX - (testBox.x + testBox.w / 2);
              offsetY = canvasY - (testBox.y + testBox.h / 2);
            }
          }
        }
        var newPaths = [];
        QS.clipboard.forEach(function (src) {
          var clone = JSON.parse(JSON.stringify(src));
          clone.id = qNextDrawId();
          if (clone.points) {
            clone.points.forEach(function (pt) {
              pt.x += offsetX;
              pt.y += offsetY;
            });
          }
          if (clone.origin) {
            clone.origin.x += offsetX;
            clone.origin.y += offsetY;
          }
          var box = qGetPathBoundingBox(clone);
          if (box && (box.x + box.w > 8000 * QS.zoom || box.y + box.h > 8000 * QS.zoom || box.x < 0 || box.y < 0)) {
            var clampedX = Math.max(0, Math.min(box.x, 8000 * QS.zoom - box.w - 20));
            var clampedY = Math.max(0, Math.min(box.y, 8000 * QS.zoom - box.h - 20));
            var dx = clampedX - box.x;
            var dy = clampedY - box.y;
            clone.points.forEach(function (pt) { pt.x += dx; });
            clone.points.forEach(function (pt) { pt.y += dy; });
            if (clone.origin) { clone.origin.x += dx; clone.origin.y += dy; }
          }
          drawings.push(clone);
          newPaths.push(clone);
        });
        QS.selectedPaths = newPaths;
        qRedrawCanvas();
        qUpdateSelectionVisual();
        qUpdateDrawingControls();
        qSaveWorkspace();
      };

      window.qDeleteSelection = function () {
        if (!window.isMembershipPlanReady || !qIsPremiumBrush()) {
          window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
          return;
        }
        if (QS.selectedPaths.length === 0) return;
        qPushUndo();
        var key = qWorkspaceKey();
        var drawings = qNormalizeDrawingPaths(key);
        var selectedIds = QS.selectedPaths.map(function (p) { return p.id; });
        QS.drawings[key] = drawings.filter(function (p) { return selectedIds.indexOf(p.id) === -1; });
        QS.selectedPaths = [];
        qUpdateSelectionVisual();
        qRedrawCanvas();
        qUpdateDrawingControls();
        qSaveWorkspace();
      };

      // FASE 4 — DESHACER / REHACER (snapshot doble: trazos + bloques)
      function qSnapshotNow(key) {
        return JSON.stringify({ d: qNormalizeDrawingPaths(key), c: QS.canvasData[key] || [] });
      }
      function qPushUndo() {
        var key = qWorkspaceKey();
        if (!QS.undoStack[key]) QS.undoStack[key] = [];
        if (!QS.redoStack[key]) QS.redoStack[key] = [];
        var snapshot = qSnapshotNow(key);
        var stack = QS.undoStack[key];
        // No empujar si es idéntico al tope (evita entradas basura)
        if (stack.length > 0 && stack[stack.length - 1] === snapshot) return;
        stack.push(snapshot);
        // Tope ~8 MB por clave (strings JS UTF-16: ~2 bytes/caracter), descartando los más viejos
        var bytes = 0, i;
        for (i = 0; i < stack.length; i++) bytes += stack[i].length * 2;
        while (stack.length > 1 && bytes > 8388608) { bytes -= stack[0].length * 2; stack.shift(); }
        if (stack.length > 50) stack.shift();
        QS.redoStack[key] = [];
      }
      function qRestoreSnapshot(key, snapshot) {
        var s = null;
        try { s = JSON.parse(snapshot); } catch (e) { return; }
        var d = Array.isArray(s) ? s : (s.d || []);
        var c = Array.isArray(s) ? (QS.canvasData[key] || []) : (s.c || []);
        QS.drawings[key] = d;
        QS.canvasData[key] = c;
        qRebuildBlocksFromData(key);
        qRedrawCanvas();
        qClearSelection();
        qSavePage();
        qSaveWorkspace();
      }

      window.qUndo = function () {
        if (!window.isMembershipPlanReady || !qIsPremiumBrush()) {
          window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
          return;
        }
        var key = qWorkspaceKey();
        if (!QS.undoStack[key] || QS.undoStack[key].length === 0) return;
        if (QS.drawMode === "select" && QS.isDraggingSelection) return;
        var snapshot = QS.undoStack[key].pop();
        if (!QS.redoStack[key]) QS.redoStack[key] = [];
        QS.redoStack[key].push(qSnapshotNow(key));
        qRestoreSnapshot(key, snapshot);
        qUpdateDrawingControls();
      };

      window.qRedo = function () {
        if (!window.isMembershipPlanReady || !qIsPremiumBrush()) {
          window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
          return;
        }
        var key = qWorkspaceKey();
        if (!QS.redoStack[key] || QS.redoStack[key].length === 0) return;
        if (QS.drawMode === "select" && QS.isDraggingSelection) return;
        var snapshot = QS.redoStack[key].pop();
        if (!QS.undoStack[key]) QS.undoStack[key] = [];
        QS.undoStack[key].push(qSnapshotNow(key));
        qRestoreSnapshot(key, snapshot);
        qUpdateDrawingControls();
      };

      function qIsPathSelected(path) {
      return QS.selectedPaths.indexOf(path) !== -1;
    }

    function qTogglePathSelection(path, shiftKey) {
      var idx = QS.selectedPaths.indexOf(path);
      if (idx !== -1) {
        QS.selectedPaths.splice(idx, 1);
      } else {
        if (!shiftKey) QS.selectedPaths = [];
        QS.selectedPaths.push(path);
      }
       qUpdateSelectionVisual();
     }

     function qSetSelectionBorder() {
       var b = 2 / Math.max(0.1, QS.zoom);
       var marqueeEl = document.getElementById("q-selection-marquee");
       if (marqueeEl) marqueeEl.style.borderWidth = b + "px";
       var boxEl = document.getElementById("q-selection-box");
       if (boxEl) boxEl.style.borderWidth = b + "px";
       var selRect = boxEl ? boxEl.querySelector(".q-sel-rect") : null;
       if (selRect) selRect.style.borderWidth = (1.5 / Math.max(0.1, QS.zoom)) + "px";
     }

     function qUpdateTransform() {
      qClampPan();
      QD.canvas.style.transform =
        "translate3d(" +
        QS.panX +
        "px," +
        QS.panY +
        "px,0) scale(" +
        QS.zoom +
        ")";
    }

    // =========================================================
    // --- QUANTIS LOCAL STORAGE ENGINE ---
    // =========================================================
    function quantisStorageKey() {
      // Clave aislada por usuario (igual que el bloc de notas), para que los
      // proyectos de un usuario no se mezclen con los de otro en el mismo navegador.
      return "quantis_local_data_" + qCurrentUid();
    }

    function qCurrentUid() {
      return window.auth && window.auth.currentUser
        ? window.auth.currentUser.uid
        : "guest";
    }

        function qNextDrawId() {
      return "qd_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    }

    function qNormalizeDrawingPaths(key) {
      if (!Array.isArray(QS.drawings[key])) QS.drawings[key] = [];
      QS.drawings[key] = QS.drawings[key].filter(function (path) {
        return path && Array.isArray(path.points) && path.points.length > 0;
      });
      // FASE 0: ID único por dibujo (migra automáticamente los paths viejos sin ID)
      QS.drawings[key].forEach(function (path) {
        if (!path.id) path.id = qNextDrawId();
      });
      return QS.drawings[key];
    }

    function qCreateSvgPath(points, size, color, mode) {
      if (!points || points.length < 2) return null;
      var d = "M " + points[0].x + "," + points[0].y;
      if (points.length === 1) {
        d += " L " + (points[0].x + 0.01) + "," + (points[0].y + 0.01);
      } else {
        for (var i = 1; i < points.length; i++) {
          d += " L " + points[i].x + "," + points[i].y;
        }
      }
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke-width", size || 8);
      path.setAttribute("stroke", color || "#000000");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      if (mode === "eraser") {
        path.setAttribute("vector-effect", "non-scaling-stroke");
        path.style.mixBlendMode = "difference";
      }
      return path;
    }

    function qCreateSvgCircle(cx, cy, r, size, color) {
      var circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", r);
      circle.setAttribute("stroke-width", size || 8);
      circle.setAttribute("stroke", color || "#000000");
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke-linecap", "round");
      circle.setAttribute("stroke-linejoin", "round");
      return circle;
    }

    function qStrokeVectorPath(path) {
      if (
        !QD.drawSvg ||
        !path ||
        !Array.isArray(path.points) ||
        !path.points.length
      )
        return;
      var svgElement;
      if (path.mode === "circle" && path.points.length >= 2) {
        var cx = path.points[0].x,
          cy = path.points[0].y;
        var px = path.points[1].x,
          py = path.points[1].y;
        var r = Math.hypot(px - cx, py - cy);
        svgElement = qCreateSvgCircle(cx, cy, r, path.size, path.color);
      } else if (path.mode === "rectangle" || path.mode === "square") {
        var p0 = path.points[0],
          p1 = path.points[1];
        var x = Math.min(p0.x, p1.x),
          y = Math.min(p0.y, p1.y);
        var w = Math.abs(p1.x - p0.x),
          h = Math.abs(p1.y - p0.y);
        var side = path.mode === "square" ? Math.max(w, h) : w;
        h = path.mode === "square" ? side : h;
        var pts = [
          { x: x, y: y },
          { x: x + side, y: y },
          { x: x + side, y: y + h },
          { x: x, y: y + h },
          { x: x, y: y },
        ];
        svgElement = qCreateSvgPath(pts, path.size, path.color, path.mode);
      } else if (path.mode === "lineh") {
        svgElement = qCreateSvgPath(
          [path.points[0], { x: path.points[1].x, y: path.points[0].y }],
          path.size,
          path.color,
          path.mode,
        );
      } else if (path.mode === "linev") {
        svgElement = qCreateSvgPath(
          [path.points[0], { x: path.points[0].x, y: path.points[1].y }],
          path.size,
          path.color,
          path.mode,
        );
      } else {
        svgElement = qCreateSvgPath(
          path.points,
          path.size,
          path.color,
          path.mode,
        );
      }
      if (svgElement) {
        QD.drawSvg.appendChild(svgElement);
      }
    }

    function qWorkspaceKey() {
      return QS.activeProj + "-" + QS.activePage;
    }

    function qRedrawCanvas() {
      if (!QD.drawSvg) return;
      while (QD.drawSvg.firstChild) {
        QD.drawSvg.removeChild(QD.drawSvg.firstChild);
      }
      qNormalizeDrawingPaths(qWorkspaceKey()).forEach(qStrokeVectorPath);
    }

    function qStrokeLiveSegment(path, fromPoint, toPoint) {
      if (!QD.drawSvg || !path || !fromPoint || !toPoint) return;
      var svgElement = qCreateSvgPath(
        [fromPoint, toPoint],
        path.size,
        path.color,
        path.mode,
      );
      if (svgElement) {
        QD.drawSvg.appendChild(svgElement);
      }
    }

    function qSaveDrawing() {
      qNormalizeDrawingPaths(qWorkspaceKey());
    }

    function qLoadDrawing() {
      qRedrawCanvas();
    }

    function qSaveWorkspace() {
      qSavePage();
      qPersistWorkspace();
      if (window.isPremiumPlan && window.isPremiumPlan()) {
        window.pulseCloudLoader('quantisSaveLoader');
        clearTimeout(window._qCloudSaveTimer);
        window._qCloudSaveTimer = setTimeout(function() {
          window.qSaveToFirebase?.();
        }, 1200);
      }
    }

    // Descarga inmediata a la nube si hay una escritura pendiente de Quantis
    window.qFlushCloudSave = function() {
      clearTimeout(window._qCloudSaveTimer);
      window.qSaveToFirebase?.();
    };

    // =========================================================
    // FIX: qPersistWorkspace — guarda siempre, sin chequeo de UID
    // =========================================================
    function qPersistWorkspace() {
      try {
        localStorage.setItem(
          quantisStorageKey(),
          JSON.stringify({
            uid: qCurrentUid(),
            projects: QS.projects,
            canvasData: QS.canvasData,
            drawings: QS.drawings,
            activeProj: QS.activeProj,
            activePage: QS.activePage,
          }),
        );
      } catch (error) {
        console.warn("No se pudo guardar Quantis localmente:", error);
      }
    }

    // =========================================================
    // FIX: qLoadWorkspace — eliminado el bloqueo por UID
    // El UID mismatch causaba que nunca se cargara el workspace
    // al arrancar (Firebase auth aún no resuelto → uid='guest')
    // =========================================================
    function qLoadWorkspace() {
      try {
        // Reinicia por completo el workspace antes de cargar: así nunca se
        // mantiene el estado del usuario anterior (p. ej. lo que el cierre de
        // sesión pudo volcar en la clave 'guest') al entrar otro usuario.
        QS.projects = [
          {
            id: "qp-1",
            name: "Proyecto Alpha",
            pages: ["Página Inicial", "Investigación"],
          },
          { id: "qp-2", name: "Proyecto Beta", pages: ["Resumen"] },
        ];
        QS.canvasData = {
          "0-0": [
            {
              type: "text",
              x: 3870,
              y: 3870,
              desc: "Bienvenida",
              content:
                "Lienzo Infinito — Click para crear un bloque. Scroll para zoom. Arrastra para navegar. Clic derecho para insertar archivos.",
            },
          ],
          "0-1": [],
          "1-0": [],
        };
        QS.drawings = {};
        QS.activeProj = 0;
        QS.activePage = 0;

        var raw = localStorage.getItem(quantisStorageKey());
        if (!raw) {
          // Migración única: datos guardados con la antigua clave global compartida
          // ("quantis_local_data"). Solo se atribuyen a este usuario si su UID coincide,
          // así no se pierde la información ya guardada.
          try {
            var old = localStorage.getItem("quantis_local_data");
            if (old) {
              var oldData = JSON.parse(old);
              if (oldData && oldData.uid && oldData.uid === qCurrentUid()) {
                raw = old;
                try { localStorage.setItem(quantisStorageKey(), old); } catch (wErr) {}
              }
            }
          } catch (migErr) {}
        }
        if (!raw) return;
        var data = JSON.parse(raw);
        // ELIMINADO: if (data.uid && data.uid !== qCurrentUid()) return;
        // Esa comprobación bloqueaba la carga porque auth no estaba
        // resuelto todavía cuando se llamaba qInit().
        if (Array.isArray(data.projects) && data.projects.length)
          QS.projects = data.projects;
        if (data.canvasData && typeof data.canvasData === "object")
          QS.canvasData = data.canvasData;
        if (data.drawings && typeof data.drawings === "object")
          QS.drawings = data.drawings;
        QS.activeProj = Number.isInteger(data.activeProj) ? data.activeProj : 0;
        QS.activePage = Number.isInteger(data.activePage) ? data.activePage : 0;
        // Seguridad: asegurarse de que los índices siguen siendo válidos
        QS.activeProj = Math.min(
          QS.activeProj,
          Math.max(0, QS.projects.length - 1),
        );
        QS.activePage = Math.min(
          QS.activePage,
          Math.max(
            0,
            QS.projects[QS.activeProj]
              ? QS.projects[QS.activeProj].pages.length - 1
              : 0,
          ),
        );
      } catch (error) {
        console.warn("No se pudo cargar Quantis local:", error);
      }
    }

    // Expuesto globalmente para que el handler de auth pueda
    // recargar el workspace cuando el usuario se autentica.
    window.qReloadWorkspace = function () {
      // IMPORTANTE: no se llama a qSavePage() aquí. Al cambiar de usuario,
      // qSavePage internamente llama a qPersistWorkspace() y guardaría el
      // workspace visible (que puede ser el del usuario anterior) dentro de la
      // clave del usuario actual. Siempre se parte de un workspace limpio.
      qLoadWorkspace();
      qApplyCanvasSize();
      qRenderProjects();
      qLoadPage(QS.activeProj, QS.activePage, true);
    };

    // =========================================================
    // FIX: qSavePage — guarda el canvas actual en memoria y localStorage
    // =========================================================
    function qSavePage() {
      if (!QD.canvas) return;
      if (window.isPremiumPlan && window.isPremiumPlan()) {
        window.pulseCloudLoader('quantisSaveLoader');
      }
      var key = QS.activeProj + "-" + QS.activePage;
      var els = [];
      QD.canvas.querySelectorAll(".q-canvas-el").forEach(function (blk) {
        var x = parseFloat(blk.style.left);
        var y = parseFloat(blk.style.top);
        var w = blk.style.width ? parseFloat(blk.style.width) : null;
        var h = blk.style.height ? parseFloat(blk.style.height) : null;
        var descEl = blk.querySelector(".q-block-desc");
        var desc = descEl ? descEl.value : "";
        var textNode = blk.querySelector(".q-block-text");
        if (textNode) {
          els.push({
            type: "text",
            x: x,
            y: y,
            desc: desc,
            content: textNode.innerText,
            isLink: textNode.getAttribute("data-is-link") === "true",
          });
        } else {
          var imgEl = blk.querySelector(".q-file-img");
          var lbl = blk.querySelector(".q-file-label");
          els.push({
            type: "file",
            x: x,
            y: y,
            w: w,
            h: h,
            desc: desc,
            fileName: lbl ? lbl.textContent : "",
            fileType: blk.getAttribute("data-ftype") || "unknown",
            fileData: imgEl ? imgEl.src : null,
          });
        }
      });
      QS.canvasData[key] = els;
      qSaveDrawing();
      qPersistWorkspace();
    }

    // Reconstruye los bloques del DOM desde canvasData (no guarda por su cuenta).
    function qRebuildBlocksFromData(key) {
      if (!QD.canvas) return;
      QD.canvas.querySelectorAll(".q-canvas-el").forEach(function (el) {
        el.remove();
      });
      var data = QS.canvasData[key] || [];
      data.forEach(function (el) {
        if (el.type === "text")
          qRecreateText(el.x, el.y, el.desc, el.content, el.isLink);
        else
          qRecreateFile(
            el.x,
            el.y,
            el.desc,
            el.fileName,
            el.fileType,
            el.fileData,
            el.w,
            el.h,
          );
      });
    }

    function qLoadPage(projIdx, pageIdx, skipCurrentSave) {
      if (!skipCurrentSave) qSavePage();
      QS.activeProj = projIdx;
      QS.activePage = pageIdx;
      qRebuildBlocksFromData(projIdx + "-" + pageIdx);
      qLoadDrawing();
      qRenderProjects();
      qPersistWorkspace();
    }

    // ---- PROJECTS SIDEBAR ----
    function qRenderProjects() {
      if (!QD.projList) return;
      QD.projList.innerHTML = "";
      QS.projects.forEach(function (proj, pi) {
        var wrap = document.createElement("div");
        wrap.className = "q-proj-item";

        var lbl = document.createElement("div");
        lbl.className = "q-proj-label";

        // Nombre del proyecto (click para renombrar)
        var nameSpan = document.createElement("span");
        nameSpan.innerHTML = '<i class="fa-solid fa-folder"></i>' + proj.name;
        nameSpan.style.cursor = "pointer";
        nameSpan.style.flex = "1";
        nameSpan.onclick = function () {
          var n = prompt("Renombrar proyecto:", proj.name);
          if (n && n.trim()) {
            proj.name = n.trim();
            qRenderProjects();
            qSaveWorkspace();
          }
        };
        lbl.appendChild(nameSpan);

        // Botón: agregar página
        var addPageBtn = document.createElement("button");
        addPageBtn.style.cssText =
          "background:none;border:none;color:var(--quantis-faint);cursor:pointer;font-size:10px;padding:2px 4px;";
        addPageBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        addPageBtn.title = "Nueva Página";
        addPageBtn.onclick = function (e) {
          e.stopPropagation();
          qAddPage(pi);
        };
        lbl.appendChild(addPageBtn);

        // FIX: Botón para eliminar proyecto
        var delProjBtn = document.createElement("button");
        delProjBtn.style.cssText =
          "background:none;border:none;color:#ef4444;cursor:pointer;font-size:10px;padding:2px 4px;opacity:0.7;";
        delProjBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        delProjBtn.title = "Eliminar Proyecto";
        delProjBtn.onclick = function (e) {
          e.stopPropagation();
          qDeleteProject(pi);
        };
        lbl.appendChild(delProjBtn);

        wrap.appendChild(lbl);

        var ul = document.createElement("div");
        ul.className = "q-page-list";
        proj.pages.forEach(function (page, gi) {
          var li = document.createElement("div");
          li.className =
            "q-page-item" +
            (QS.activeProj === pi && QS.activePage === gi ? " active" : "");
          li.innerHTML =
            '<span><i class="fa-solid fa-file-lines"></i>' + page + "</span>";
          li.onclick = function () {
            qLoadPage(pi, gi);
          };

          var del = document.createElement("button");
          del.className = "q-page-del";
          del.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
          // FIX: reindexar claves de páginas al eliminar
          del.onclick = function (e) {
            e.stopPropagation();
            if (!confirm("¿Eliminar esta página?")) return;
            // Guardar estado actual antes de borrar
            qSavePage();
            // Reindexar canvasData y drawings para las páginas posteriores
            var totalPages = proj.pages.length;
            for (var k = gi + 1; k < totalPages; k++) {
              QS.canvasData[pi + "-" + (k - 1)] =
                QS.canvasData[pi + "-" + k] || [];
              QS.drawings[pi + "-" + (k - 1)] = QS.drawings[pi + "-" + k] || [];
              delete QS.canvasData[pi + "-" + k];
              delete QS.drawings[pi + "-" + k];
            }
            // Eliminar la última (que ya fue movida un lugar antes)
            delete QS.canvasData[pi + "-" + (totalPages - 1)];
            delete QS.drawings[pi + "-" + (totalPages - 1)];
            proj.pages.splice(gi, 1);
            // Si la página eliminada era la activa o anterior, ajustar
            var newPage = QS.activePage;
            if (QS.activeProj === pi) {
              if (QS.activePage === gi) {
                newPage = Math.max(0, gi - 1);
              } else if (QS.activePage > gi) {
                newPage = QS.activePage - 1;
              }
            }
            if (!proj.pages.length) proj.pages.push("Página 1");
            var newProj = QS.activeProj;
            newPage = Math.min(newPage, proj.pages.length - 1);
            qLoadPage(newProj, newPage, true);
            qSaveWorkspace();
          };
          li.appendChild(del);
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
        QD.projList.appendChild(wrap);
      });
    }

    window.qAddProject = function () {
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      var limits = window.getPlanLimits
        ? window.getPlanLimits()
        : { maxQuantisProjects: 2 };
      if (QS.projects.length >= limits.maxQuantisProjects) {
        window.showPlanPopup("Limite de proyectos alcanzado para tu plan.");
        return;
      }
      var n = prompt("Nombre del nuevo proyecto:");
      if (n && n.trim()) {
        var newIdx = QS.projects.length;
        QS.projects.push({
          id: "qp-" + Date.now(),
          name: n.trim(),
          pages: ["Página 1"],
        });
        QS.canvasData[newIdx + "-0"] = [];
        QS.drawings[newIdx + "-0"] = [];
        qRenderProjects();
        qSaveWorkspace();
      }
    };

    // FIX: qDeleteProject — elimina proyecto y reindexea claves de proyectos posteriores
    function qDeleteProject(pi) {
      if (QS.projects.length <= 1) {
        alert("No puedes eliminar el único proyecto.");
        return;
      }
      if (
        !confirm(
          '¿Eliminar proyecto "' +
            QS.projects[pi].name +
            '" y todas sus páginas?',
        )
      )
        return;
      qSavePage();

      // Eliminar datos de todas las páginas de este proyecto
      var proj = QS.projects[pi];
      proj.pages.forEach(function (_, gi) {
        delete QS.canvasData[pi + "-" + gi];
        delete QS.drawings[pi + "-" + gi];
      });

      // Reindexar proyectos posteriores
      for (var i = pi + 1; i < QS.projects.length; i++) {
        QS.projects[i].pages.forEach(function (_, gi) {
          QS.canvasData[i - 1 + "-" + gi] = QS.canvasData[i + "-" + gi] || [];
          QS.drawings[i - 1 + "-" + gi] = QS.drawings[i + "-" + gi] || [];
          delete QS.canvasData[i + "-" + gi];
          delete QS.drawings[i + "-" + gi];
        });
      }

      QS.projects.splice(pi, 1);

      // Ajustar proyecto activo
      var newProj = Math.min(QS.activeProj, QS.projects.length - 1);
      if (newProj < 0) newProj = 0;
      var newPage = 0;
      if (!QS.projects.length) {
        QS.projects = [
          { id: "qp-" + Date.now(), name: "Proyecto 1", pages: ["Página 1"] },
        ];
        QS.canvasData["0-0"] = [];
        QS.drawings["0-0"] = [];
      }
      qLoadPage(newProj, newPage, true);
      qSaveWorkspace();
    }

    function qAddPage(projIdx) {
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      var limits = window.getPlanLimits
        ? window.getPlanLimits()
        : { maxQuantisPagesPerProj: 3 };
      if (QS.projects[projIdx].pages.length >= limits.maxQuantisPagesPerProj) {
        window.showPlanPopup(
          "Limite de paginas por proyecto alcanzado para tu plan.",
        );
        return;
      }
      var n = prompt("Nombre de la nueva página:");
      if (n && n.trim()) {
        QS.projects[projIdx].pages.push(n.trim());
        var newIdx = QS.projects[projIdx].pages.length - 1;
        QS.canvasData[projIdx + "-" + newIdx] = [];
        QS.drawings[projIdx + "-" + newIdx] = [];
        qLoadPage(projIdx, newIdx);
      }
    }

    window.qApplyPlanLimits = function () {
      qApplyCanvasSize();
      var prevProj = QS.activeProj;
      var prevPage = QS.activePage;
      if (!QS.projects.length) {
        QS.projects = [
          { id: "qp-" + Date.now(), name: "Proyecto 1", pages: ["Página 1"] },
        ];
        QS.canvasData["0-0"] = QS.canvasData["0-0"] || [];
        QS.drawings["0-0"] = QS.drawings["0-0"] || [];
      }
      QS.projects.forEach(function (project) {
        if (!project.pages.length) project.pages.push("Página 1");
      });
      QS.activeProj = Math.min(
        QS.activeProj,
        Math.max(0, QS.projects.length - 1),
      );
      QS.activePage = Math.min(
        QS.activePage,
        Math.max(
          0,
          QS.projects[QS.activeProj]
            ? QS.projects[QS.activeProj].pages.length - 1
            : 0,
        ),
      );
      if (prevProj !== QS.activeProj || prevPage !== QS.activePage) {
        qLoadPage(QS.activeProj, QS.activePage, true);
      } else {
        qRenderProjects();
      }
    };

    function qSetupWorkspaceButtons() {
      document
        .getElementById("q-center-canvas-btn")
        ?.addEventListener("click", function () {
          var bounds = qGetCanvasBounds();
          var rect = QD.viewport.getBoundingClientRect();
          QS.panX = (rect.width - bounds.size * QS.zoom) / 2;
          QS.panY = (rect.height - bounds.size * QS.zoom) / 2;
          QS.zoom = 1.0;
          qUpdateTransform();
        });
      document
        .getElementById("q-export-project-btn")
        ?.addEventListener("click", function () {
          if (!window.isMembershipPlanReady)
            return window.showPlanPopup(
              "Cargando tu plan. Inténtalo de nuevo en un momento.",
            );
          if (window.userPlan === "normal")
            return window.showPlanPopup(
              "Export Project requiere Extended o Premium.",
            );
          qSaveWorkspace();
          var blob = new Blob(
            [localStorage.getItem(quantisStorageKey()) || "{}"],
            { type: "application/json;charset=utf-8" },
          );
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "quantis_workspace.json";
          a.click();
          URL.revokeObjectURL(a.href);
        });
      document
        .getElementById("q-import-project-btn")
        ?.addEventListener("click", function () {
          if (!window.isMembershipPlanReady)
            return window.showPlanPopup(
              "Cargando tu plan. Inténtalo de nuevo en un momento.",
            );
          if (window.userPlan === "normal")
            return window.showPlanPopup(
              "Import Project requiere Extended o Premium.",
            );
          document.getElementById("q-import-project-input")?.click();
        });
      document
        .getElementById("q-import-project-input")
        ?.addEventListener("change", function (e) {
          var file = e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function (ev) {
            try {
              var data = JSON.parse(ev.target.result);
              if (!Array.isArray(data.projects) || !data.canvasData)
                throw new Error("Formato inválido");
              QS.projects = data.projects;
              QS.canvasData = data.canvasData || {};
              QS.drawings = data.drawings || {};
              QS.activeProj = 0;
              QS.activePage = 0;
              qLoadPage(0, 0, true);
              qSaveWorkspace();
            } catch (error) {
              window.showPlanPopup("Archivo Quantis invalido.");
            }
          };
          reader.readAsText(file);
          e.target.value = "";
        });
    }

    // ---- CANVAS EVENTS ----
    function qSetupCanvas() {
      var clickT = 0,
        clickX = 0,
        clickY = 0,
        isMouseDragging = false;
      QD.viewport.addEventListener("mousedown", function (e) {
        if (e.button === 0) {
          if (QS.drawMode) {
            qBeginDraw(e);
          } else {
            if (e.target === QD.viewport || e.target === QD.canvas) {
              QS.isPanning = true;
              QS.startX = e.clientX - QS.panX;
              QS.startY = e.clientY - QS.panY;
              QD.viewport.classList.add("grabbing");
              QD.ctxMenu.style.display = "none";
              clickT = Date.now();
              clickX = e.clientX;
              clickY = e.clientY;
              isMouseDragging = false;
            }
          }
        } else if (e.button === 2) {
          if (e.target === QD.viewport || e.target === QD.canvas) {
            QS.isPanning = true;
            QS.startX = e.clientX - QS.panX;
            QS.startY = e.clientY - QS.panY;
            QD.viewport.classList.add("grabbing");
            QD.ctxMenu.style.display = "none";
            isMouseDragging = false;
          }
        }
      });
      window.addEventListener("mousemove", function (e) {
        if (QS.isPanning) {
          var dist = Math.hypot(e.clientX - clickX, e.clientY - clickY);
          if (dist > 5) isMouseDragging = true;
          QS.panX = e.clientX - QS.startX;
          QS.panY = e.clientY - QS.startY;
          qUpdateTransform();
        }
      });
      window.addEventListener("mouseup", function () {
        if (QS.isPanning) {
          QS.isPanning = false;
          QD.viewport.classList.remove("grabbing");
        }
      });
      QD.viewport.addEventListener("mouseup", function (e) {
        if (QS.drawMode) return;
        if (e.target === QD.viewport || e.target === QD.canvas) {
          if (e.button === 0) {
            var diff = Date.now() - clickT;
            var dist = Math.hypot(e.clientX - clickX, e.clientY - clickY);
            if (diff < 250 && dist < 5) {
              var rect = QD.canvas.getBoundingClientRect();
              var x = (e.clientX - rect.left) / QS.zoom;
              var y = (e.clientY - rect.top) / QS.zoom;
              if (!qIsWithinBounds(x, y)) {
                window.showPlanPopup("Fuera de los límites del canvas.");
                return;
              }
              qCreateText(x, y);
            }
          }
        }
      });
      QD.viewport.addEventListener("contextmenu", function (e) {
        if (isMouseDragging) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        var rect = QD.canvas.getBoundingClientRect();
        var cx = (e.clientX - rect.left) / QS.zoom;
        var cy = (e.clientY - rect.top) / QS.zoom;
        if (!qIsWithinBounds(cx, cy)) {
          window.showPlanPopup("Fuera de los límites del canvas.");
          return;
        }
        QS.ctxCoords.x = cx;
        QS.ctxCoords.y = cy;
        QD.ctxMenu.style.display = "block";
        QD.ctxMenu.style.left = e.clientX + "px";
        QD.ctxMenu.style.top = e.clientY + "px";
      });
      document.addEventListener("click", function (e) {
        if (!QD.ctxMenu.contains(e.target) && !isMouseDragging)
          QD.ctxMenu.style.display = "none";
      });
    }

    // =========================================================
    // --- QUANTIS DRAWING CONTROLS ---
    // =========================================================
    function qIsPremiumBrush() {
      return !!(
        window.isMembershipPlanReady &&
        window.getPlanLimits &&
        window.getPlanLimits().hasBrush
      );
    }

    function qCanvasPoint(e) {
      var rect = QD.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / QS.zoom,
        y: (e.clientY - rect.top) / QS.zoom,
      };
    }

    function qBeginDraw(e) {
      if (!QS.drawMode) return;
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      if (!qIsPremiumBrush()) {
        QS.drawMode = null;
        window.qUpdateDrawingControls();
        window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
        return;
      }
       if (!(e.target === QD.viewport || e.target === QD.canvas)) return;
       e.preventDefault();
       var p = qCanvasPoint(e);
      if (!qIsWithinBounds(p.x, p.y)) {
        window.showPlanPopup("Fuera de los límites del canvas.");
        return;
      }
      QS.isDrawing = true;
      QS.eraseGesturePushed = false;
      QS.selDragPushed = false;
        if (QS.drawMode === "select") {
        QS.isSelecting = true;
        QS.marqueeStart = { x: p.x, y: p.y };
        QS.marqueeEnd = { x: p.x, y: p.y };
        QS.marqueeShift = !!e.shiftKey;
        var clickedPath = null;
        var paths = qNormalizeDrawingPaths(qWorkspaceKey());
        for (var i = paths.length - 1; i >= 0; i--) {
          if (qHitTestPath(paths[i], p.x, p.y, 6)) {
            clickedPath = paths[i];
            break;
          }
        }
        if (clickedPath) {
          qTogglePathSelection(clickedPath, e.shiftKey);
          if (QS.selectedPaths.length > 0) {
            QS.selectionDragStart = { x: p.x, y: p.y };
            QS.isDraggingSelection = true;
            QS.isSelecting = false;
          }
        } else {
          if (!e.shiftKey) {
            QS.selectedPaths = [];
            qUpdateSelectionVisual();
          }
           QS.isSelecting = true;
           var marqueeEl = document.getElementById("q-selection-marquee");
           if (marqueeEl) {
             marqueeEl.style.display = "block";
             marqueeEl.style.left = p.x + "px";
             marqueeEl.style.top = p.y + "px";
             marqueeEl.style.width = "0px";
             marqueeEl.style.height = "0px";
             qSetSelectionBorder();
           }
        }
        return;
      }
      if (QS.drawMode === "eraser") {
        return;
      }
      if (
        QS.drawMode === "line" || QS.drawMode === "circle" ||
        QS.drawMode === "rectangle" || QS.drawMode === "square" ||
        QS.drawMode === "lineh" || QS.drawMode === "linev"
      ) {
        QS.activePath = {
          id: qNextDrawId(),
          mode: QS.drawMode,
          color: QS.drawColor,
          size: QS.drawSize,
          points: [
            { x: p.x, y: p.y },
            { x: p.x, y: p.y },
          ],
          origin: { x: p.x, y: p.y },
        };
      } else {
        qPushUndo();
        QS.activePath = {
          id: qNextDrawId(),
          mode: QS.drawMode,
          color: QS.drawColor,
          size: QS.drawSize,
          points: [{ x: p.x, y: p.y }],
        };
        qNormalizeDrawingPaths(qWorkspaceKey()).push(QS.activePath);
        qStrokeVectorPath(QS.activePath);
      }
    }

function qMoveDraw(e) {
        if (!QS.isDrawing || !QS.drawMode) return;
        e.preventDefault();
        var p = qCanvasPoint(e);
        if (QS.drawMode === "select") {
          QS.marqueeEnd = { x: p.x, y: p.y };
          if (QS.isDraggingSelection && QS.selectedPaths.length > 0 && QS.selectionDragStart) {
            var dx = (p.x - QS.selectionDragStart.x) / QS.zoom;
            var dy = (p.y - QS.selectionDragStart.y) / QS.zoom;
            if ((dx !== 0 || dy !== 0) && !QS.selDragPushed) { QS.selDragPushed = true; qPushUndo(); }
            QS.selectionDragStart = { x: p.x, y: p.y };
            QS.selectedPaths.forEach(function(path) {
              path.points.forEach(function(pt) {
                pt.x += dx;
                pt.y += dy;
              });
              if (path.origin) {
                path.origin.x += dx;
                path.origin.y += dy;
              }
            });
            var container = document.getElementById("quantis-canvas-container");
            if (container) {
              var selBox = document.getElementById("q-selection-box");
              if (selBox) {
                var box = qGetSelectedPathsBoundingBox();
                if (box) {
               selBox.style.left = box.x + "px";
                   selBox.style.top = box.y + "px";
                   selBox.style.width = box.w + "px";
                   selBox.style.height = box.h + "px";
                 }
               }
               qSetSelectionBorder();
            }
            qRedrawCanvas();
            return;
          }
           if (QS.isSelecting && QS.marqueeStart) {
            var marqueeEl = document.getElementById("q-selection-marquee");
            if (marqueeEl) {
              var mx = Math.min(QS.marqueeStart.x, p.x);
              var my = Math.min(QS.marqueeStart.y, p.y);
              var mw = Math.abs(p.x - QS.marqueeStart.x);
              var mh = Math.abs(p.y - QS.marqueeStart.y);
              marqueeEl.style.left = mx + "px";
              marqueeEl.style.top = my + "px";
              marqueeEl.style.width = mw + "px";
              marqueeEl.style.height = mh + "px";
              qSetSelectionBorder();
            }
          }
          return;
        }
        if (QS.drawMode === "eraser") {
          var drawings = qNormalizeDrawingPaths(qWorkspaceKey());
          var eraseRadius = QS.drawSize;
          var changed = false;
          for (var i = drawings.length - 1; i >= 0; i--) {
            var path = drawings[i];
            if (!path.points || path.points.length === 0) continue;
            var hit = false;
            for (var j = 0; j < path.points.length; j++) {
              if (Math.hypot(path.points[j].x - p.x, path.points[j].y - p.y) <= eraseRadius + (path.size || 8)) { hit = true; break; }
            }
            if (!hit && path.points.length >= 2) {
              var minX = Math.min(path.points[0].x, path.points[1].x) - eraseRadius;
              var maxX = Math.max(path.points[0].x, path.points[1].x) + eraseRadius;
              var minY = Math.min(path.points[0].y, path.points[1].y) - eraseRadius;
              var maxY = Math.max(path.points[0].y, path.points[1].y) + eraseRadius;
              if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) hit = true;
            }
            if (hit) {
              if (!QS.eraseGesturePushed) { QS.eraseGesturePushed = true; qPushUndo(); }
              drawings.splice(i, 1); changed = true;
            }
          }
          if (changed) { qRedrawCanvas(); qSaveWorkspace(); }
          return;
        }
        if (!QS.activePath) return;
        if (
          QS.drawMode === "line" || QS.drawMode === "circle" ||
          QS.drawMode === "rectangle" || QS.drawMode === "square" ||
          QS.drawMode === "lineh" || QS.drawMode === "linev"
        ) {
          QS.activePath.points[1] = { x: p.x, y: p.y };
          qRedrawCanvas();
          qStrokeVectorPath(QS.activePath);
          return;
        }
        var points = QS.activePath.points;
        var lastPoint = points[points.length - 1];
        if (lastPoint && Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) < 0.75)
          return;
        points.push({ x: p.x, y: p.y });
        qStrokeLiveSegment(QS.activePath, lastPoint, p);
      }

function qEndDraw() {
        if (!QS.isDrawing) return;
        QS.isDrawing = false;
        QS.eraseGesturePushed = false;
        QS.selDragPushed = false;
        if (QS.drawMode === "select") {
          QS.isSelecting = false;
          QS.isDraggingSelection = false;
          var marqueeEl = document.getElementById("q-selection-marquee");
          if (marqueeEl) marqueeEl.style.display = "none";
          if (QS.marqueeStart && QS.marqueeEnd && !QS.selectionDragStart) {
            var paths = qNormalizeDrawingPaths(qWorkspaceKey());
            var marqueeLeft = Math.min(QS.marqueeStart.x, QS.marqueeEnd.x);
            var marqueeTop = Math.min(QS.marqueeStart.y, QS.marqueeEnd.y);
            var marqueeRight = Math.max(QS.marqueeStart.x, QS.marqueeEnd.x);
            var marqueeBottom = Math.max(QS.marqueeStart.y, QS.marqueeEnd.y);
            if (!QS.marqueeShift) {
              QS.selectedPaths = [];
            }
            paths.forEach(function(path) {
              var pb = qGetPathBoundingBox(path);
              if (!pb) return;
              if (pb.x < marqueeRight && pb.x + pb.w > marqueeLeft && pb.y < marqueeBottom && pb.y + pb.h > marqueeTop) {
                QS.selectedPaths.push(path);
              }
            });
            qUpdateSelectionVisual();
          } else if (QS.selectionDragStart) {
            qUpdateSelectionVisual();
          }
          QS.marqueeStart = null;
          QS.marqueeEnd = null;
          QS.selectionDragStart = null;
          qSaveWorkspace();
          return;
        }
        if (QS.drawMode === "eraser") {
          qRedrawCanvas();
          qSaveWorkspace();
          QS.activePath = null;
          return;
        }
        if (
          QS.activePath &&
          (QS.activePath.mode === "line" || QS.activePath.mode === "circle" ||
           QS.activePath.mode === "rectangle" || QS.activePath.mode === "square" ||
           QS.activePath.mode === "lineh" || QS.activePath.mode === "linev")
        ) {
          qPushUndo();
          qNormalizeDrawingPaths(qWorkspaceKey()).push(QS.activePath);
          qRedrawCanvas();
        }
        QS.activePath = null;
        qSaveWorkspace();
      }

    function qSetDrawMode(mode) {
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      if (!qIsPremiumBrush()) {
        window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
        return;
      }
      var wasSelect = QS.drawMode === "select";
      var isSameMode = QS.drawMode === mode;
      QS.drawMode = QS.drawMode === mode ? null : mode;
      if (wasSelect && !isSameMode) {
        qClearSelection();
      }
      window.qUpdateDrawingControls();
      if (QS.drawMode) {
        var panel = document.getElementById("quantis-drawing-tools-panel");
        if (panel) panel.classList.add("open");
      }
      if (!QS.drawMode) {
        qClearSelection();
      }
    }

    function qToggleDrawPanel() {
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      if (!qIsPremiumBrush()) {
        window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
        return;
      }
      var panel = document.getElementById("quantis-drawing-tools-panel");
      if (panel) panel.classList.toggle("open");
    }

    function qCloseDrawPanel() {
      var panel = document.getElementById("quantis-drawing-tools-panel");
      if (panel) panel.classList.remove("open");
    }

     window.qSetDrawMode = qSetDrawMode;
     window.qToggleDrawPanel = qToggleDrawPanel;
     window.qCloseDrawPanel = qCloseDrawPanel;
     window.qClearSelection = qClearSelection;

     window.qSelectDrawColor = function (color) {
      if (!window.isMembershipPlanReady) {
        window.showPlanPopup(
          "Cargando tu plan. Inténtalo de nuevo en un momento.",
        );
        return;
      }
      if (!qIsPremiumBrush()) {
        window.showPlanPopup("Drawing Tools son exclusivos de Premium.");
        return;
      }
 QS.drawColor = color;
        qClearSelection();
        QS.drawMode = "pencil";
        document.querySelectorAll("#quantis-drawing-tools-panel .q-draw-color-toggle").forEach(function (b) {
           b.classList.toggle("active", b.getAttribute("data-color")?.toUpperCase() === color?.toUpperCase());
         });
         var cc = document.getElementById("q-draw-custom-color");
         if (cc) cc.value = color;
        window.qUpdateDrawingControls();
       if (QD.ctxMenu) QD.ctxMenu.style.display = "none";
     };

     window.qSetFreeMode = function () {
       qClearSelection();
       QS.drawMode = null;
       window.qUpdateDrawingControls();
       var panel = document.getElementById("quantis-drawing-tools-panel");
      if (panel) panel.classList.remove("open");
      if (QD.ctxMenu) QD.ctxMenu.style.display = "none";
    };

      function qSetupDrawingControls() {
        if (!QD.viewport) return;
        QS.lastMouse = null;
        window.addEventListener("mousemove", function(e) {
          var qv = document.getElementById("quantis-view");
          if (qv && !qv.classList.contains("hidden-view")) {
            QS.lastMouse = {x: e.clientX, y: e.clientY};
          }
        });
        QD.viewport.addEventListener("mousedown", qBeginDraw);
      window.addEventListener("mousemove", qMoveDraw);
      window.addEventListener("mouseup", qEndDraw);

        document
         .getElementById("q-draw-select")
         ?.addEventListener("click", function () { qSetDrawMode("select"); });
       document
         .getElementById("q-draw-pencil")
         ?.addEventListener("click", function () {
           qSetDrawMode("pencil");
         });
      document
        .getElementById("q-draw-eraser")
        ?.addEventListener("click", function () {
          qSetDrawMode("eraser");
        });
      document
        .getElementById("q-draw-line")
        ?.addEventListener("click", function () {
          qSetDrawMode("line");
        });
      document
        .getElementById("q-draw-circle")
        ?.addEventListener("click", function () {
          qSetDrawMode("circle");
        });

      document
        .getElementById("q-draw-thickness")
        ?.addEventListener("input", function (e) {
          if (!window.isMembershipPlanReady)
            return window.showPlanPopup(
              "Cargando tu plan. Inténtalo de nuevo en un momento.",
            );
          if (!qIsPremiumBrush())
            return window.showPlanPopup(
              "Drawing Tools son exclusivos de Premium.",
            );
          QS.drawSize = parseInt(e.target.value, 10) || 8;
        });

document.querySelectorAll("#quantis-drawing-tools-panel .q-draw-color-toggle").forEach(function (btn) {
         btn.addEventListener("click", function () {
           if (!window.isMembershipPlanReady)
             return window.showPlanPopup(
               "Cargando tu plan. Inténtalo de nuevo en un momento.",
             );
           if (!qIsPremiumBrush())
             return window.showPlanPopup(
               "Drawing Tools son exclusivos de Premium.",
             );
           var c = this.getAttribute("data-color");
           if (!c) return;
           QS.drawColor = c;
           document.querySelectorAll("#quantis-drawing-tools-panel .q-draw-color-toggle").forEach(function (b) {
             b.classList.remove("active");
           });
           this.classList.add("active");
           var cc = document.getElementById("q-draw-custom-color");
           if (cc) cc.value = c;
           window.qUpdateDrawingControls();
           var panel = document.getElementById("quantis-drawing-tools-panel");
           if (panel) panel.classList.add("open");
         });
       });

document.getElementById("q-draw-custom-color")?.addEventListener("input", function (e) {
            if (!window.isMembershipPlanReady)
              return window.showPlanPopup(
                "Cargando tu plan. Inténtalo de nuevo en un momento.",
              );
            if (!qIsPremiumBrush())
              return window.showPlanPopup(
                "Drawing Tools son exclusivos de Premium.",
              );
            QS.drawColor = e.target.value;
            document.querySelectorAll("#quantis-drawing-tools-panel .q-draw-color-toggle").forEach(function (b) {
              b.classList.remove("active");
            });
            window.qUpdateDrawingControls();
            var panel = document.getElementById("quantis-drawing-tools-panel");
            if (panel) panel.classList.add("open");
          });

         document.getElementById("q-draw-rect")?.addEventListener("click", function () { qSetDrawMode("rectangle"); });
         document.getElementById("q-draw-lineh")?.addEventListener("click", function () { qSetDrawMode("lineh"); });
         document.getElementById("q-draw-linev")?.addEventListener("click", function () { qSetDrawMode("linev"); });

        document.getElementById("q-draw-undo")?.addEventListener("click", function () { window.qUndo(); });
        document.getElementById("q-draw-redo")?.addEventListener("click", function () { window.qRedo(); });
        document.getElementById("q-draw-copy")?.addEventListener("click", function () { window.qCopySelection(); });
        document.getElementById("q-draw-paste")?.addEventListener("click", function () { window.qPasteSelection(); });
        document.getElementById("q-draw-delete")?.addEventListener("click", function () { window.qDeleteSelection(); });

        var panel = document.getElementById("quantis-drawing-tools-panel");
        var panelHeader = panel ? panel.querySelector(".q-draw-header") : null;
        if (panel && panelHeader) {
          var pDrag = false,
            pSX,
            pSY,
            pLX,
            pLY;
          panelHeader.addEventListener("mousedown", function (e) {
            if (e.target.closest("button")) return;
            pDrag = true;
            pSX = e.clientX;
            pSY = e.clientY;
            pLX = panel.offsetLeft;
            pLY = panel.offsetTop;
            e.preventDefault();
          });
          document.addEventListener("mousemove", function (e) {
            if (!pDrag) return;
            panel.style.left = pLX + e.clientX - pSX + "px";
            panel.style.top = pLY + e.clientY - pSY + "px";
          });
          document.addEventListener("mouseup", function () {
            pDrag = false;
          });
        }

        document.getElementById("q-draw-close")?.addEventListener("click", qCloseDrawPanel);
      }

      window.qUpdateDrawingControls = function () {
        if (!window.isMembershipPlanReady) return;
        var hasBrush = qIsPremiumBrush();
        document.querySelectorAll(".q-draw-tool").forEach(function (el) {
          el.style.opacity = hasBrush ? "1" : "0.58";
          el.title = hasBrush ? el.title || "" : "Premium only";
        });
        document
          .getElementById("q-draw-select")
          ?.classList.toggle("active", QS.drawMode === "select");
        document
          .getElementById("q-draw-pencil")
          ?.classList.toggle("active", QS.drawMode === "pencil");
        document
          .getElementById("q-draw-eraser")
          ?.classList.toggle("active", QS.drawMode === "eraser");
        document
          .getElementById("q-draw-line")
          ?.classList.toggle("active", QS.drawMode === "line");
        document
          .getElementById("q-draw-circle")
          ?.classList.toggle("active", QS.drawMode === "circle");
        document
          .getElementById("q-draw-rect")
          ?.classList.toggle("active", QS.drawMode === "rectangle");
        document
          .getElementById("q-draw-lineh")
          ?.classList.toggle("active", QS.drawMode === "lineh");
        document
          .getElementById("q-draw-linev")
          ?.classList.toggle("active", QS.drawMode === "linev");

        var key = qWorkspaceKey();
        var undoBtn = document.getElementById("q-draw-undo");
        var redoBtn = document.getElementById("q-draw-redo");
        if (undoBtn) undoBtn.style.opacity = (QS.undoStack[key] && QS.undoStack[key].length > 0) ? "1" : "0.4";
        if (redoBtn) redoBtn.style.opacity = (QS.redoStack[key] && QS.redoStack[key].length > 0) ? "1" : "0.4";
        var copyBtn = document.getElementById("q-draw-copy");
        var pasteBtn = document.getElementById("q-draw-paste");
        var deleteBtn = document.getElementById("q-draw-delete");
        if (copyBtn) copyBtn.style.opacity = (QS.selectedPaths.length > 0) ? "1" : "0.4";
        if (pasteBtn) pasteBtn.style.opacity = (QS.clipboard.length > 0 && QS.drawMode === "select") ? "1" : "0.4";
        if (deleteBtn) deleteBtn.style.opacity = (QS.selectedPaths.length > 0 && QS.drawMode === "select") ? "1" : "0.4";

        if (!hasBrush) {
          QS.drawMode = null;
          qCloseDrawPanel();
        }
      };

      // Atajos de teclado globales para Quantis (FASE 3, FASE 4 y modo)
      document.addEventListener("keydown", function (e) {
        var quantisView = document.getElementById("quantis-view");
        if (!quantisView || quantisView.classList.contains("hidden-view")) return;
        var tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
        var isCtrl = e.ctrlKey || e.metaKey;
        var inSelectMode = QS.drawMode === "select";
        var movingSelection = inSelectMode && QS.isDraggingSelection;

        if ((e.key === "v" || e.key === "V") && (e.ctrlKey || e.metaKey) && !e.shiftKey && QS.clipboard.length > 0 && inSelectMode && !movingSelection) {
          e.preventDefault();
          window.qPasteSelection();
        }
        if ((e.key === "c" || e.key === "C") && (e.ctrlKey || e.metaKey) && !e.shiftKey && QS.selectedPaths.length > 0) {
          e.preventDefault();
          window.qCopySelection();
        }
        if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          window.qUndo();
        }
        if ((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey) || (e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          window.qRedo();
        }
        if ((e.key === "Delete" || e.key === "Backspace") && QS.selectedPaths.length > 0 && inSelectMode && !movingSelection) {
          e.preventDefault();
          window.qDeleteSelection();
        }
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          if (e.key === "v" || e.key === "V") {
            e.preventDefault();
            window.qSetDrawMode("select");
          }
          if (e.key === "b" || e.key === "B") {
            e.preventDefault();
            window.qSetFreeMode();
          }
        }
      });

     // =========================================================
     // --- QUANTIS BLOCK FACTORY ---
     // =========================================================
    function qMakeBlock(x, y, descVal) {
      var blk = document.createElement("div");
      blk.className = "q-canvas-el";
      blk.style.left = x + "px";
      blk.style.top = y + "px";

      var desc = document.createElement("input");
      desc.type = "text";
      desc.className = "q-block-desc";
      desc.value = descVal || "";
      desc.placeholder = "Añadir descripción...";
      // Guarda al salir del campo de descripción (resetea la sesión de edición)
      desc.addEventListener("blur", function () {
        blk._qEditSnap = false;
        qSavePage();
      });
      // También guarda al escribir (debounced); UNA entrada de historial por sesión
      var _descTimer;
      desc.addEventListener("input", function () {
        if (!blk._qEditSnap) { blk._qEditSnap = true; qPushUndo(); }
        clearTimeout(_descTimer);
        _descTimer = setTimeout(qSavePage, 800);
      });
      blk.appendChild(desc);

      var del = document.createElement("button");
      del.className = "q-block-del";
      del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      del.onclick = function () {
        qPushUndo();
        blk.remove();
        qSavePage();
      };
      blk.appendChild(del);

      // Drag
      blk.addEventListener("mousedown", function (e) {
        if (
          e.target.closest("input") ||
          e.target.closest("a") ||
          e.target.isContentEditable ||
          e.target.closest(".q-block-del")
        )
          return;
        e.stopPropagation();
        var prevZ = blk.style.zIndex;
        blk.style.zIndex = "40";
        var sx = e.clientX,
          sy = e.clientY;
        var dragPushed = false;
        var onMove = function (me) {
          var dx = (me.clientX - sx) / QS.zoom;
          var dy = (me.clientY - sy) / QS.zoom;
          if ((dx !== 0 || dy !== 0) && !dragPushed) { dragPushed = true; qPushUndo(); }
          blk.style.left = parseFloat(blk.style.left) + dx + "px";
          blk.style.top = parseFloat(blk.style.top) + dy + "px";
          sx = me.clientX;
          sy = me.clientY;
        };
        var onUp = function () {
          blk.style.zIndex = prevZ;
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          qSavePage();
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      return blk;
    }

    function qCreateText(x, y) {
      qPushUndo();
      qRecreateText(x, y, "", "Escribe algo aquí...", false);
      qSavePage();
    }

    // =========================================================
    // FIX: qRecreateText — eliminado { once: true } del blur.
    // Se usa un handler reutilizable con activateEditing() para
    // evitar acumulación de listeners al doble-clic sobre links.
    // También añadido listener de 'input' con debounce para
    // guardar mientras el usuario escribe, sin esperar al blur.
    // =========================================================
    function qRecreateText(x, y, desc, content, isLink) {
      var blk = qMakeBlock(x, y, desc);
      blk.style.width = "240px";
      var textNode = document.createElement("div");
      textNode.className = "q-block-text";

      var _inputTimer;

      // Handler de input: UNA entrada de historial por sesión + guardado debounce
      function onInput() {
        if (!blk._qEditSnap) { blk._qEditSnap = true; qPushUndo(); }
        clearTimeout(_inputTimer);
        _inputTimer = setTimeout(qSavePage, 800);
      }

      // Handler de blur: resetea la sesión de edición, detecta URL y guarda
      function onBlur() {
        blk._qEditSnap = false;
        var t = textNode.innerText.trim();
        if (qIsURL(t)) {
          qMakeLink(textNode, t, activateEditing);
        } else {
          qSavePage();
        }
      }

      // Activa el modo edición en el textNode y registra listeners
      function activateEditing() {
        textNode.contentEditable = "true";
        textNode.setAttribute("data-is-link", "false");
        // Remover antes de añadir para evitar duplicados
        textNode.removeEventListener("blur", onBlur);
        textNode.addEventListener("blur", onBlur);
        textNode.removeEventListener("input", onInput);
        textNode.addEventListener("input", onInput);
      }

      if (isLink) {
        qMakeLink(textNode, content, activateEditing);
      } else {
        activateEditing();
        textNode.innerText = content;
      }

      blk.appendChild(textNode);
      QD.canvas.appendChild(blk);
      if (content === "Escribe algo aquí...") {
        textNode.focus();
        document.execCommand("selectAll", false, null);
      }
    }

    // =========================================================
    // FIX: qMakeLink — ahora recibe onEdit callback para
    // reconectar listeners correctamente al doble-clic,
    // sin acumular handlers ni usar { once: true }.
    // =========================================================
    function qMakeLink(textNode, url, onEdit) {
      textNode.contentEditable = "false";
      textNode.setAttribute("data-is-link", "true");
      textNode.className = "q-block-text";
      textNode.innerHTML = "";

      var a = document.createElement("a");
      a.href = qFmtURL(url);
      a.target = "_blank";
      a.textContent = url;
      a.addEventListener("mousedown", function (e) {
        e.stopPropagation();
      });
      textNode.appendChild(a);

      // Doble clic: volver al modo edición
      function onDblClick(e) {
        textNode.removeEventListener("dblclick", onDblClick);
        e.stopPropagation();
        textNode.className = "q-block-text";
        textNode.innerText = url;
        if (typeof onEdit === "function") onEdit();
        textNode.focus();
      }
      textNode.addEventListener("dblclick", onDblClick);

      // Guardar el hecho de que es un link
      qSavePage();
    }

    function qRecreateFile(x, y, desc, fileName, fileType, fileData, w, h) {
      var blk = qMakeBlock(x, y, desc);
      blk.setAttribute("data-ftype", fileType || "unknown");
      if (w) blk.style.width = w + "px";
      if (h) blk.style.height = h + "px";

      var box = document.createElement("div");
      box.style.cssText =
        "flex:1;width:100%;min-height:80px;border:1px solid rgba(168,85,247,0.15);border-radius:3px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--quantis-bg);position:relative;";

      if (fileType === "image" && fileData) {
        if (!w) blk.style.width = "240px";
        if (!h) blk.style.height = "200px";
        var img = document.createElement("img");
        img.className = "q-file-img";
        img.style.cssText =
          "width:100%;height:100%;object-fit:cover;pointer-events:none;";
        img.src = fileData;
        box.appendChild(img);
        var rh = document.createElement("div");
        rh.style.cssText =
          "position:absolute;bottom:3px;right:3px;width:14px;height:14px;cursor:se-resize;color:var(--quantis-faint);display:flex;align-items:center;justify-content:center;font-size:10px;";
        rh.innerHTML =
          '<i class="fa-solid fa-maximize" style="transform:rotate(90deg)"></i>';
        rh.addEventListener("mousedown", function (re) {
          re.stopPropagation();
          re.preventDefault();
          var sw = blk.offsetWidth,
            sh = blk.offsetHeight,
            sx2 = re.clientX,
            sy2 = re.clientY;
          var mm = function (me) {
            blk.style.width =
              Math.max(140, sw + (me.clientX - sx2) / QS.zoom) + "px";
            blk.style.height =
              Math.max(100, sh + (me.clientY - sy2) / QS.zoom) + "px";
          };
          var mu = function () {
            document.removeEventListener("mousemove", mm);
            document.removeEventListener("mouseup", mu);
            qSavePage();
          };
          document.addEventListener("mousemove", mm);
          document.addEventListener("mouseup", mu);
        });
        blk.appendChild(rh);
      } else {
        var ico = document.createElement("i");
        ico.className =
          fileType === "pdf"
            ? "fa-solid fa-file-pdf"
            : "fa-solid fa-circle-question";
        ico.style.cssText =
          "font-size:2rem;color:" +
          (fileType === "pdf" ? "#ef4444" : "var(--quantis-faint)") +
          ";margin-bottom:6px;";
        box.appendChild(ico);
        var lbl = document.createElement("span");
        lbl.className = "q-file-label";
        lbl.style.cssText =
          'font-size:9px;color:var(--quantis-muted);text-align:center;padding:0 6px;word-break:break-all;font-family:"JetBrains Mono",monospace;';
        lbl.textContent = fileName || "";
        box.appendChild(lbl);
      }
      blk.appendChild(box);
      QD.canvas.appendChild(blk);
    }

    // ---- FILE HANDLING ----
    window.qTriggerFile = function () {
      QD.ctxMenu.style.display = "none";
      setTimeout(function () {
        QD.fileInput.click();
      }, 50);
    };
    window.qHandleFile = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var x = QS.ctxCoords.x,
        y = QS.ctxCoords.y;
      if (!qIsWithinBounds(x, y)) {
        window.showPlanPopup("Fuera de los límites del canvas.");
        e.target.value = "";
        return;
      }
      qPushUndo();
      if (file.type.startsWith("image/")) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          qRecreateFile(
            x,
            y,
            "",
            file.name,
            "image",
            ev.target.result,
            240,
            200,
          );
          qSavePage();
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        qRecreateFile(x, y, "", file.name, "pdf", null);
        qSavePage();
      } else {
        qRecreateFile(x, y, "", file.name, "unknown", null);
        qSavePage();
      }
      QD.fileInput.value = "";
    };

    // ---- HELPERS ----
    function qIsURL(s) {
      return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[^\s]*)?$/i.test(
        s,
      );
    }
    function qFmtURL(u) {
      return /^https?:\/\//i.test(u) ? u : "https://" + u;
    }

    // ---- BOOT ----
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", qInit);
    } else {
      qInit();
    }
  })();
