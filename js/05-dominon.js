/* 05-dominon.js - calculadora, temas, pomodoro (extraido verbatim de originalindex.html) */
    // =========================================================
    // --- DOMINON BUSINESS LOGIC (CALCULATOR, THEMES, POMODORO) ---
    // =========================================================
    // Calculadora
    const display = document.getElementById('display');
    let currentInput = '0'; let previousInput = ''; let operation = null; let waitingForSecondOperand = false;
    window.updateDisplay = function () { if (display) display.textContent = currentInput.length > 15 ? currentInput.slice(0, 15) : currentInput; };
    window.appendNumber = function (number) {
      if (waitingForSecondOperand) { currentInput = number; waitingForSecondOperand = false; }
      else { currentInput = currentInput === '0' && number !== '.' ? number : currentInput + number; }
      updateDisplay();
    };
    window.appendOperator = function (nextOperation) {
      const inputValue = parseFloat(currentInput);
      if (operation && waitingForSecondOperand) { operation = nextOperation; return; }
      if (previousInput === '') { previousInput = inputValue; }
      else if (operation) {
        const result = performCalculation[operation](previousInput, inputValue);
        currentInput = String(result); previousInput = result;
      }
      waitingForSecondOperand = true; operation = nextOperation; updateDisplay();
    };
    const performCalculation = { '/': (a, b) => a / b, '*': (a, b) => a * b, '+': (a, b) => a + b, '-': (a, b) => a - b };
    window.calculate = function () {
      if (!operation || waitingForSecondOperand) return;
      const result = performCalculation[operation](previousInput, parseFloat(currentInput));
      currentInput = String(result); operation = null; previousInput = ''; waitingForSecondOperand = false;
      updateDisplay();
    };
    window.clearDisplay = function () { currentInput = '0'; previousInput = ''; operation = null; updateDisplay(); };
    window.backspace = function () { if (currentInput.length > 1) currentInput = currentInput.slice(0, -1); else currentInput = '0'; updateDisplay(); };
    window.percentage = function () { currentInput = String(parseFloat(currentInput || '0') / 100); updateDisplay(); };

    // Tema visual aislado por vista
    function getThemeName(color) {
      var normalized = String(color || '').toLowerCase();
      if (normalized === '#ffffff' || normalized === 'white' || normalized === 'light') return 'light';
      if (normalized === '#a855f7' || normalized === 'purple') return 'purple';
      if (normalized === '#39ff14' || normalized === 'green') return 'green';
      if (normalized === '#ff3131' || normalized === 'red') return 'red';
      if (normalized === '#00aeef' || normalized === 'blue') return 'blue';
      return 'black';
    }

    function getActiveThemeView(explicitView) {
      if (explicitView === 'quantis' || explicitView === 'quantis-view') return 'quantis';
      if (explicitView === 'dominion' || explicitView === 'dominon' || explicitView === 'main-dashboard-view') return 'dominon';
      var quantis = document.getElementById('quantis-view');
      return quantis && !quantis.classList.contains('hidden-view') ? 'quantis' : 'dominon';
    }

    function applyDominonTheme(themeName) {
      var view = document.getElementById('main-dashboard-view');
      if (!view) return;
      var colors = { purple: '#A855F7', green: '#39FF14', red: '#FF3131', blue: '#00AEEF', light: '#1f2937', black: '#6B7280' };
      view.classList.remove('black-theme', 'light-theme', 'purple-theme', 'green-theme', 'red-theme', 'blue-theme');
      view.classList.add(themeName + '-theme');
      view.style.setProperty('--color-highlight', colors[themeName] || colors.black);
      // Sync TradingView iframe theme
      var iframe = document.getElementById('tradingViewChart');
      if (iframe) {
        var tvTheme = themeName === 'light' ? 'light' : 'dark';
        var src = iframe.src.replace(/theme=\w+/, 'theme=' + tvTheme);
        iframe.src = src;
      }
    }

    function applyQuantisTheme(themeName) {
      var view = document.getElementById('quantis-view');
      if (!view) return;
      view.classList.remove('black-theme', 'light-theme', 'purple-theme');
      view.classList.add((themeName === 'light' ? 'light' : 'black') + '-theme');
    }

    // Variables de paneles flotantes segun tema efectivo (misma fuente que setTheme).
    // Oscuro: fondo oscuro + sombra blanca sutil. Claro: fondo claro + sombra negra.
    function syncFloatVars(isLight) {
      var root = null;
      try { root = document.documentElement; } catch (e) { return; }
      if (!root || !root.style) return;
      root.style.setProperty('--float-bg', isLight ? '#ffffff' : '#111318');
      root.style.setProperty('--float-text', isLight ? '#1f2937' : '#e4e4e7');
      root.style.setProperty('--float-border', isLight ? 'rgba(168,85,247,0.45)' : 'rgba(168,85,247,0.34)');
      root.style.setProperty('--float-shadow', isLight ? '0 14px 36px rgba(0,0,0,0.25)' : '0 14px 36px rgba(255,255,255,0.08)');
    }

    window.setTheme = function (color, targetView) {
      var themeName = getThemeName(color);
      var viewName = getActiveThemeView(targetView);
      if (viewName === 'quantis') {
        applyQuantisTheme(themeName);
        localStorage.setItem('danifu_quantis_theme', themeName);
        syncFloatVars(themeName === 'light');
        return;
      }
      applyDominonTheme(themeName);
      localStorage.setItem('danifu_dominon_theme', themeName);
      syncFloatVars(themeName === 'light');
      
      // DYNAMIC THEME SYNC FOR FLOATING ELEMENTS (shared across views)
      const floatingElements = [
        '#musicPanel',
        '#plansModal',
        '#dominon-config-dropdown',
        '#quantis-config-dropdown',
        '#miniPlanPopup',
        '#trialContactPopup'
      ];
      floatingElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) return;
        // Apply the same theme class used for the active view
        if (themeName === 'light') {
          el.classList.add('light-theme');
          el.classList.remove('black-theme', 'purple-theme', 'green-theme', 'red-theme', 'blue-theme');
        } else if (themeName === 'purple') {
          el.classList.add('purple-theme');
          el.classList.remove('light-theme', 'black-theme', 'green-theme', 'red-theme', 'blue-theme');
        } else if (themeName === 'green') {
          el.classList.add('green-theme');
          el.classList.remove('light-theme', 'black-theme', 'purple-theme', 'red-theme', 'blue-theme');
        } else if (themeName === 'red') {
          el.classList.add('red-theme');
          el.classList.remove('light-theme', 'black-theme', 'purple-theme', 'green-theme', 'blue-theme');
        } else if (themeName === 'blue') {
          el.classList.add('blue-theme');
          el.classList.remove('light-theme', 'black-theme', 'purple-theme', 'green-theme', 'red-theme');
        } else { // black (default)
          el.classList.add('black-theme');
          el.classList.remove('light-theme', 'purple-theme', 'green-theme', 'red-theme', 'blue-theme');
        }
      });
      
      // Sync root --color-highlight for neon borders on root-level elements
      var dominonView = document.getElementById('main-dashboard-view');
      if (dominonView) {
        var rootHighlight = dominonView.style.getPropertyValue('--color-highlight') || getComputedStyle(dominonView).getPropertyValue('--color-highlight').trim();
        if (rootHighlight) document.documentElement.style.setProperty('--color-highlight', rootHighlight);
      }
    };

    // Grfico TradingView
    window.changeSymbol = function (symbol) {
      if (!symbol) return;
      const iframe = document.getElementById('tradingViewChart');
      if (!iframe) return;
      var view = document.getElementById('main-dashboard-view');
      var isLight = view && view.classList.contains('light-theme');
      var tvTheme = isLight ? 'light' : 'dark';
      const newSrc = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&theme=${tvTheme}&style=1&locale=es&toolbar_bg=f1f3f6&allow_symbol_change=1&enable_publishing=0&hide_side_toolbar=0&save_image=0&studies=[]&show_popup_button=0&calendar=0&hide_volume=1&no-cache`;
      iframe.src = newSrc;
    };

    // Pomodoro
    let pomoInterval;
    let pomoSeconds = 25 * 60;
    let isRunning = false;
    window.updatePomoUI = function () {
      const m = Math.floor(pomoSeconds / 60).toString().padStart(2, '0');
      const s = (pomoSeconds % 60).toString().padStart(2, '0');
      document.getElementById('pomo-display').innerText = `${m}:${s}`;
    };
    window.togglePomodoro = function () {
      const btn = document.getElementById('start-btn');
      if (isRunning) {
        clearInterval(pomoInterval);
        isRunning = false;
        btn.innerText = "INICIAR";
        btn.classList.remove('active');
      } else {
        isRunning = true;
        btn.innerText = "PAUSAR";
        btn.classList.add('active');
        pomoInterval = setInterval(() => {
          if (pomoSeconds > 0) {
            pomoSeconds--;
            updatePomoUI();
          } else {
            clearInterval(pomoInterval);
            isRunning = false;
            btn.innerText = "INICIAR";
            btn.classList.remove('active');
            alert("Tiempo terminado!");
          }
        }, 1000);
      }
    };
    window.resetPomodoro = function () {
      clearInterval(pomoInterval);
      isRunning = false;
      pomoSeconds = 25 * 60;
      updatePomoUI();
      document.getElementById('start-btn').innerText = "INICIAR";
      document.getElementById('start-btn').classList.remove('active');
    };
    window.setCustomTime = function () {
      const input = document.getElementById('custom-min');
      const mins = parseInt(input.value);
      if (!mins || mins <= 0) {
        alert("Por favor ingresa un número de minutos válido.");
        return;
      }
      clearInterval(pomoInterval);
      isRunning = false;
      pomoSeconds = mins * 60;
      updatePomoUI();
      document.getElementById('start-btn').innerText = "INICIAR";
      document.getElementById('start-btn').classList.remove('active');
    };
