/* 09-perf-measure.js - medicion de rendimiento (extraido verbatim de originalindex.html) */
    // =========================================================
    // --- MONITOR DE RENDIMIENTO: tiempo REAL de JS por modulo ---
    // =========================================================
    // Medicion sincrona (CPU, sin espera de red) con performance.now().
    // Solo el llamado mas externo registra: las funciones llamadas dentro
    // de otra ya envuelta NO se cuentan dos veces.
    window.__perfReg = window.__perfReg || {};
    window.__perfDepth = window.__perfDepth || 0;
    window.__perfWrap = function(nombre, fn) {
      if (typeof fn !== 'function' || fn._perfWrapped) return fn;
      var w = function() {
        var outer = (window.__perfDepth === 0);
        window.__perfDepth++;
        var t0 = 0;
        try { t0 = performance.now(); } catch (e) {}
        var out = fn.apply(this, arguments);
        var dt = 0;
        try { dt = performance.now() - t0; } catch (e) {}
        window.__perfDepth--;
        if (outer) {
          var r = window.__perfReg[nombre];
          if (!r) r = window.__perfReg[nombre] = { ms: 0, calls: 0 };
          r.ms += dt; r.calls++;
        }
        return out;
      };
      w._perfWrapped = true;
      return w;
    };
    // Envolver despues de que cada funcion exista (este script va al final del body).
    try { if (typeof dfPriceTick === 'function') dfPriceTick = window.__perfWrap('DF precio/poll', dfPriceTick); } catch (e) {}
    try { if (typeof dfTxTick === 'function') dfTxTick = window.__perfWrap('DF txs', dfTxTick); } catch (e) {}
    try { if (typeof prependLiveTxs === 'function') prependLiveTxs = window.__perfWrap('DF lista txs', prependLiveTxs); } catch (e) {}
    try { if (typeof renderBatch === 'function') renderBatch = window.__perfWrap('DF render lote', renderBatch); } catch (e) {}
    try { if (typeof updateOnchainSidebar === 'function') updateOnchainSidebar = window.__perfWrap('DF sidebar onchain', updateOnchainSidebar); } catch (e) {}
    try { if (typeof updateBinanceSidebar === 'function') updateBinanceSidebar = window.__perfWrap('DF sidebar binance', updateBinanceSidebar); } catch (e) {}
    try { if (typeof musicMasterTick === 'function') musicMasterTick = window.__perfWrap('Musica tick', musicMasterTick); } catch (e) {}
    try { if (typeof updateSongDisplay === 'function') updateSongDisplay = window.__perfWrap('Musica titulo', updateSongDisplay); } catch (e) {}
    try { if (typeof qLoadPage === 'function') qLoadPage = window.__perfWrap('Quantis pagina', qLoadPage); } catch (e) {}
    try { if (window.qSaveToFirebase) window.qSaveToFirebase = window.__perfWrap('Guardado Firebase', window.qSaveToFirebase); } catch (e) {}
