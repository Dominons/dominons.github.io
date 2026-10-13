/* 01-firebase.js - modulo Firebase (extraido verbatim de originalindex.html) */
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
    import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
    import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
    import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
    import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-check.js";

    const firebaseConfig = {
      apiKey: "AIzaSyDOuLA7meYcSX7zpxHl6sA8eDGS21QD0CY",
      authDomain: "danifu777-4732c.firebaseapp.com",
      projectId: "danifu777-4732c",
      databaseURL: "https://danifu777-4732c-default-rtdb.firebaseio.com",
      storageBucket: "danifu777-4732c.firebasestorage.app",
      messagingSenderId: "171480985650",
      appId: "1:171480985650:web:4873bc5cc38d67d6c10c2b",
      measurementId: "G-SL032V9XGM"
    };

    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const rtdb = getDatabase(app);
    const provider = new GoogleAuthProvider();

    // --- Firebase App Check (reCAPTCHA Enterprise) ---
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6LfNfdItAAAAADL3xJz5rm-vlEqMqtggXnOoWXXJ"),
      isTokenAutoRefreshEnabled: true
    });

    // Exportar instancias de bases de datos y auth al contexto de window
    window.db = db;
    window.auth = auth;
    window.rtdb = rtdb;

    // =========================================================
    // --- QUANTIS FIREBACKUP (guardado en la nube) ---
    // =========================================================
    function qFirebaseRef() {
      if (!auth || !auth.currentUser) return null;
      return doc(db, "users", auth.currentUser.uid, "quantis", "workspace");
    }
    window.qSaveToFirebase = async function() {
      // Quantis a la nube solo en plan Premium (igual que el notepad)
      if (!window.isPremiumPlan()) return;
      var ref = qFirebaseRef();
      if (!ref) return;
      if (!window.QS) return;
      window.showCloudLoader('quantisSaveLoader');
      try {
        await setDoc(ref, {
          projects: window.QS.projects,
          canvasData: window.QS.canvasData,
          drawings: window.QS.drawings,
          activeProj: window.QS.activeProj,
          activePage: window.QS.activePage,
          savedAt: Date.now()
        }, { merge: true });
      } catch (error) {
        console.warn("Error guardando Quantis en Firebase:", error);
      } finally {
        window.hideCloudLoader('quantisSaveLoader');
      }
    };
    window.qLoadFromFirebase = async function() {
      // Quantis desde la nube solo en plan Premium (igual que el notepad)
      if (!window.isPremiumPlan()) return;
      var ref = qFirebaseRef();
      if (!ref || !window.QS) return;
      try {
        var snap = await getDoc(ref);
        if (!snap.exists()) return;
        var data = snap.data();
        if (!data || !data.savedAt) return;
        var localRaw = localStorage.getItem(storageKeyForUser('quantis_local_data_'));
        var localAt = 0;
        try {
          if (localRaw) {
            var localData = JSON.parse(localRaw);
            localAt = localData.savedAt || 0;
          }
        } catch (e) {}
        if (data.savedAt > localAt) {
          if (Array.isArray(data.projects) && data.projects.length) window.QS.projects = data.projects;
          if (data.canvasData && typeof data.canvasData === 'object') window.QS.canvasData = data.canvasData;
          if (data.drawings && typeof data.drawings === 'object') window.QS.drawings = data.drawings;
          window.QS.activeProj = Number.isInteger(data.activeProj) ? data.activeProj : 0;
          window.QS.activePage = Number.isInteger(data.activePage) ? data.activePage : 0;
          localStorage.setItem(storageKeyForUser('quantis_local_data_'), JSON.stringify({
            uid: auth.currentUser ? auth.currentUser.uid : 'guest',
            projects: window.QS.projects,
            canvasData: window.QS.canvasData,
            drawings: window.QS.drawings,
            activeProj: window.QS.activeProj,
            activePage: window.QS.activePage,
            savedAt: data.savedAt
          }));
          if (typeof window.qReloadWorkspace === 'function') {
            window.qReloadWorkspace();
          } else if (typeof qLoadPage === 'function') {
            qLoadPage(window.QS.activeProj, window.QS.activePage, true);
          }
        }
      } catch (error) {
        console.warn("Error cargando Quantis desde Firebase:", error);
      }
    };

    // =========================================================
    // --- GLOBAL MEMBERSHIP PLANS & DATA PERSISTENCE ---
    // =========================================================
    const PLAN_LIMITS = {
      normal: { maxNotepadPages: 3, maxQuantisProjects: 2, maxQuantisPagesPerProj: 3, hasBrush: false, saveNotepad: 'local', quantisSize: 2000 },
      Extended: { maxNotepadPages: 5, maxQuantisProjects: 4, maxQuantisPagesPerProj: 7, hasBrush: false, saveNotepad: 'local', quantisSize: 4000 },
      Premium: { maxNotepadPages: 10, maxQuantisProjects: 10, maxQuantisPagesPerProj: 20, hasBrush: true, saveNotepad: 'cloud', quantisSize: 8000 }
    };
    window.PLAN_LIMITS = PLAN_LIMITS;
    window.userPlan = 'normal';
    window.isMembershipPlanReady = false;
    window.getPlanLimits = function() {
      return PLAN_LIMITS[window.userPlan] || PLAN_LIMITS.normal;
    };
    window.maxPages = window.getPlanLimits().maxNotepadPages;
    function storageKeyForUser(base) {
      return base + (window.auth && window.auth.currentUser ? window.auth.currentUser.uid : 'guest');
    }
    window.storageKeyForUser = storageKeyForUser;
    window.isPremiumPlan = function() {
      return window.getPlanLimits ? window.getPlanLimits().saveNotepad === 'cloud' : false;
    };

    // --- Loader de guardado en la nube (Premium) ---
    window._cloudLoaderCount = {};
    window.showCloudLoader = function(id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('visible');
      window._cloudLoaderCount[id] = (window._cloudLoaderCount[id] || 0) + 1;
    };
    window.hideCloudLoader = function(id) {
      window._cloudLoaderCount[id] = Math.max(0, (window._cloudLoaderCount[id] || 0) - 1);
      if (window._cloudLoaderCount[id] > 0) return;
      var el = document.getElementById(id);
      if (el) el.classList.remove('visible');
    };
    window.pulseCloudLoader = function(id) {
      if (!window.isPremiumPlan()) return;
      window.showCloudLoader(id);
      setTimeout(function() {
        window.hideCloudLoader(id);
      }, 900);
    };
    // --- Gemini chats: cloud sync (solo Premium) ---
    window.saveGeminiCloud = async function(chats) {
      if (!window.isPremiumPlan() || !auth.currentUser) return;
      try {
        await setDoc(doc(db, "users", auth.currentUser.uid, "gemini", "chats"),
          { chats: chats, savedAt: Date.now() }, { merge: true });
      } catch (e) { console.warn("Error guardando chats de Gemini en Firebase:", e); }
    };
    window.loadGeminiCloud = async function() {
      if (!window.isPremiumPlan() || !auth.currentUser) return;
      try {
        var snap = await getDoc(doc(db, "users", auth.currentUser.uid, "gemini", "chats"));
        if (!snap.exists()) return;
        var data = snap.data();
        if (!data || !data.chats) return;
        localStorage.setItem(storageKeyForUser('gemini_chats_history_'), JSON.stringify(data.chats));
      if (typeof window.initGeminiAssistant === 'function') window.initGeminiAssistant();
      if (window.isPremiumPlan && window.isPremiumPlan() && window.loadGeminiCloud) window.loadGeminiCloud();
      } catch (e) { console.warn("Error cargando chats de Gemini desde Firebase:", e); }
    };
    window.createdPagesCount = parseInt(localStorage.getItem(storageKeyForUser('danifu_pages_count_')), 10) || 3;

    async function detectUserPlan(user) {
      if (!user) return 'normal';
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        const plan = docSnap.exists() ? docSnap.data().plan : '';
        return PLAN_LIMITS[plan] ? plan : 'normal';
      } catch (error) {
        console.error("Error al obtener el plan del usuario de Firestore:", error);
        return 'normal';
      }
    }

    window.applyMembershipPlan = function(plan) {
      window.userPlan = PLAN_LIMITS[plan] ? plan : 'normal';
      window.isMembershipPlanReady = true;
      window.maxPages = window.getPlanLimits().maxNotepadPages;
      window.activeTab = localStorage.getItem(storageKeyForUser('danifu_active_tab_')) || "1";
      var storedCount = parseInt(localStorage.getItem(storageKeyForUser('danifu_pages_count_')), 10);
      if (!storedCount) storedCount = 3;
      window.createdPagesCount = Math.min(Math.max(1, storedCount), window.maxPages);
      localStorage.setItem(storageKeyForUser('danifu_pages_count_'), window.createdPagesCount);
      if (parseInt(window.activeTab, 10) > window.maxPages) {
        window.activeTab = "1";
        localStorage.setItem(storageKeyForUser('danifu_active_tab_'), window.activeTab);
      }
      const actions = document.getElementById('notepadActions');
      if (actions) actions.style.display = window.userPlan === 'Extended' ? 'flex' : 'none';
      if (typeof window.initGeminiAssistant === 'function') window.initGeminiAssistant();
      if (typeof window.renderTabs === 'function') window.renderTabs();
      if (typeof window.qApplyPlanLimits === 'function') window.qApplyPlanLimits();
      if (typeof window.qUpdateDrawingControls === 'function') window.qUpdateDrawingControls();
    };

    // =========================================================
    // --- FIREBASE AUTH & PLAN DETECTION ---
    // =========================================================
    onAuthStateChanged(auth, async (user) => {
      try { if (window.perfApplyToggles) window.perfApplyToggles(); } catch (e) {}
      if (user) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userName').textContent = user.displayName;
        document.getElementById('userAvatar').src = user.photoURL;

        window.applyMembershipPlan(await detectUserPlan(user));
        window.loadNote(window.activeTab);
        // Recarga el workspace de Quantis con el UID real del usuario:
        // en la carga inicial qInit() corre antes de que Firebase resuelva la
        // sesión, así que aquí se asegura que cada usuario vea su propio proyecto.
        window.qReloadWorkspace?.();
        window.qLoadFromFirebase?.();

      } else {
        window.applyMembershipPlan('normal');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
      }
    });

    document.getElementById('googleSignInBtn').onclick = () => signInWithPopup(auth, provider);
    document.getElementById('logoutBtn').onclick = async () => {
      await signOut(auth);
      window.location.reload();
    };

    // =========================================================
    // --- NOTEPAD CONTROLLER (LOCAL & CLOUD) ---
    // =========================================================
    window.activeTab = localStorage.getItem(storageKeyForUser('danifu_active_tab_')) || "1";

    if (parseInt(window.activeTab, 10) > window.maxPages) {
        window.activeTab = "1";
        localStorage.setItem(storageKeyForUser('danifu_active_tab_'), window.activeTab);
    }
    
    let saveTimeout;
    
    window.loadNote = async function(tabNum) {
       const notepadEl = document.getElementById('notepad');
       if (!notepadEl) return;
       if (window.getPlanLimits().saveNotepad === 'local' || !window.auth || !window.auth.currentUser) {
          notepadEl.value = localStorage.getItem(storageKeyForUser('notepad_page_') + '_' + tabNum) || "";
          return;
       }
       try {
          const userDocRef = doc(window.db, "users", window.auth.currentUser.uid, "notas", "pagina-" + tabNum);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
             notepadEl.value = docSnap.data().content || "";
          } else {
             notepadEl.value = "";
          }
       } catch (error) {
          console.error("Error cargando nota:", error);
          notepadEl.value = "";
       }
    };

    window.saveCurrentNote = async function() {
       const notepadEl = document.getElementById('notepad');
       if (!notepadEl) return;
       if (window.getPlanLimits().saveNotepad === 'local' || !window.auth || !window.auth.currentUser) {
          localStorage.setItem(storageKeyForUser('notepad_page_') + '_' + window.activeTab, notepadEl.value);
          return;
       }
       window.showCloudLoader('notepadSaveLoader');
       try {
          const userDocRef = doc(window.db, "users", window.auth.currentUser.uid, "notas", "pagina-" + window.activeTab);
          await setDoc(userDocRef, { content: notepadEl.value }, { merge: true });
       } catch (error) {
          console.error("Error guardando nota:", error);
       } finally {
          window.hideCloudLoader('notepadSaveLoader');
       }
    };

    const notepadEl = document.getElementById('notepad');
    if (notepadEl) {
        notepadEl.addEventListener('input', function() {
           if (window.getPlanLimits().saveNotepad === 'local' || !window.auth || !window.auth.currentUser) {
              window.saveCurrentNote();
           } else {
              window.pulseCloudLoader('notepadSaveLoader');
              clearTimeout(saveTimeout);
              saveTimeout = setTimeout(window.saveCurrentNote, 800);
           }
        });
    }

    window.renderTabs = function() {
      const tabsContainer = document.getElementById('notepad-tabs');
      if (!tabsContainer) return;
      
      tabsContainer.innerHTML = '';

      for (let i = 1; i <= window.createdPagesCount; i++) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (String(i) === window.activeTab ? ' active' : '');
        btn.id = 'btn-tab-' + i;
        btn.textContent = 'Nota ' + i;
        btn.onclick = function() { window.switchTab(i); };
        tabsContainer.appendChild(btn);
      }

      if (window.createdPagesCount < window.maxPages) {
        const plusBtn = document.createElement('button');
        plusBtn.className = 'tab-btn';
        plusBtn.id = 'btn-add-tab';
        plusBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        plusBtn.style.background = '#1F1F1F';
        plusBtn.style.borderColor = 'var(--color-highlight)';
        plusBtn.style.color = 'var(--color-highlight)';
        plusBtn.style.padding = '4px 12px';

        plusBtn.onclick = function() {
          if (window.createdPagesCount >= window.maxPages) {
            alert('Límite de páginas alcanzado para tu plan actual.');
          } else {
            window.createdPagesCount++;
            localStorage.setItem(storageKeyForUser('danifu_pages_count_'), window.createdPagesCount);
            window.switchTab(window.createdPagesCount);
            window.renderTabs();
          }
        };
        tabsContainer.appendChild(plusBtn);
      }
    };

    window.renderTabs();

    window.exportCurrentNote = function() {
      if (window.userPlan !== 'Extended') {
        window.showPlanPopup('Export Note está disponible en Extended.');
        return;
      }
      const note = document.getElementById('notepad');
      const blob = new Blob([note ? note.value : ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'notepad_page_' + window.activeTab + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    };

    window.importCurrentNote = function(file) {
      if (window.userPlan !== 'Extended') {
        window.showPlanPopup('Import Note está disponible en Extended.');
        return;
      }
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        const note = document.getElementById('notepad');
        if (note) {
          note.value = event.target.result || '';
          window.saveCurrentNote();
        }
      };
      reader.readAsText(file);
    };

    document.getElementById('exportNoteBtn')?.addEventListener('click', window.exportCurrentNote);
    document.getElementById('importNoteBtn')?.addEventListener('click', function() {
      if (window.userPlan !== 'Extended') return window.showPlanPopup('Import Note está disponible en Extended.');
      document.getElementById('importNoteInput')?.click();
    });
    document.getElementById('importNoteInput')?.addEventListener('change', function(e) {
      window.importCurrentNote(e.target.files[0]);
      e.target.value = '';
    });

    window.switchTab = function(tabNum) {
      window.saveCurrentNote();
      window.activeTab = String(tabNum);
      localStorage.setItem(storageKeyForUser('danifu_active_tab_'), window.activeTab);
      
      var notepadTitle = document.getElementById('notepad-title');
      if (notepadTitle) notepadTitle.innerText = (window.currentLang === 'en' ? "Notepad - Note " : "Bloc de Notas - Nota ") + window.activeTab;
      
      document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
      var activeBtn = document.getElementById('btn-tab-' + window.activeTab);
      if (activeBtn) activeBtn.classList.add('active');
      
      window.loadNote(window.activeTab);
    };
    window.maxPages = window.getPlanLimits ? window.getPlanLimits().maxNotepadPages : 3;

    // =========================================================
    // --- GEMINI AI ASSISTANT WITH TABS, CONTEXT & BUBBLES ---
    // =========================================================
    function getGeminiUserScope() {
      return window.auth && window.auth.currentUser ? window.auth.currentUser.uid : 'guest';
    }

    function readGeminiKeyStore() {
      try {
        return JSON.parse(localStorage.getItem('danifu_gemini_api_key') || '{}');
      } catch (error) {
        return {};
      }
    }

    // --- Cifrado local de la API Key ---
    // Se guarda cifrada (AES-GCM vía Web Crypto cuando está disponible),
    // con fallback XOR+base64 para contextos sin crypto.subtle (ej. file://).
    var GEMINI_ENC_SECRET = 'danifu_gemini_local_secret_v1';

    function geminiXorCrypt(str) {
      try {
        var out = '';
        for (var i = 0; i < str.length; i++) {
          out += String.fromCharCode(str.charCodeAt(i) ^ GEMINI_ENC_SECRET.charCodeAt(i % GEMINI_ENC_SECRET.length));
        }
        return 'ENC0:' + btoa(out);
      } catch (e) { return null; }
    }
    function geminiXorDecrypt(payload) {
      try {
        var raw = atob(payload.slice(5));
        var out = '';
        for (var i = 0; i < raw.length; i++) {
          out += String.fromCharCode(raw.charCodeAt(i) ^ GEMINI_ENC_SECRET.charCodeAt(i % GEMINI_ENC_SECRET.length));
        }
        return out;
      } catch (e) { return ''; }
    }
    async function geminiEncryptText(plain) {
      try {
        if (window.crypto && window.crypto.subtle && window.crypto.subtle.encrypt) {
          var enc = new TextEncoder();
          var baseKey = await crypto.subtle.importKey('raw', enc.encode(GEMINI_ENC_SECRET), 'PBKDF2', false, ['deriveKey']);
          var aesKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: enc.encode('danifu_gemini_salt'), iterations: 60000, hash: 'SHA-256' },
            baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
          );
          var iv = crypto.getRandomValues(new Uint8Array(12));
          var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, enc.encode(plain));
          var ivB64 = btoa(String.fromCharCode.apply(null, iv));
          var ctB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(ct)));
          return 'ENC1:' + ivB64 + ':' + ctB64;
        }
      } catch (e) {}
      return geminiXorCrypt(plain);
    }
    async function geminiDecryptText(payload) {
      if (!payload) return '';
      try {
        if (payload.indexOf('ENC1:') === 0 && window.crypto && window.crypto.subtle && window.crypto.subtle.decrypt) {
          var parts = payload.slice(5).split(':');
          if (parts.length < 2) return '';
          var enc = new TextEncoder();
          var baseKey = await crypto.subtle.importKey('raw', enc.encode(GEMINI_ENC_SECRET), 'PBKDF2', false, ['deriveKey']);
          var aesKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: enc.encode('danifu_gemini_salt'), iterations: 60000, hash: 'SHA-256' },
            baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
          );
          var iv = Uint8Array.from(atob(parts[0]), function(c){ return c.charCodeAt(0); });
          var ct = Uint8Array.from(atob(parts[1]), function(c){ return c.charCodeAt(0); });
          var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, aesKey, ct);
          return new TextDecoder().decode(pt);
        }
        if (payload.indexOf('ENC0:') === 0) return geminiXorDecrypt(payload);
      } catch (e) {}
      return '';
    }

    async function writeGeminiKeyForUser(apiKey) {
      var store = readGeminiKeyStore();
      var scope = getGeminiUserScope();
      if (apiKey) {
        var enc = await geminiEncryptText(apiKey.trim());
        if (!enc) { window.showPlanPopup('No se pudo cifrar la API Key en este navegador.'); return false; }
        store[scope] = enc;
      } else {
        delete store[scope];
      }
      localStorage.setItem('danifu_gemini_api_key', JSON.stringify(store));
      return true;
    }

    async function getGeminiKeyForUser() {
      var raw = readGeminiKeyStore()[getGeminiUserScope()] || '';
      if (!raw) return '';
      if (raw.indexOf('ENC0:') === 0 || raw.indexOf('ENC1:') === 0) {
        return await geminiDecryptText(raw);
      }
      return raw; // formato legacy (texto plano) -> se re-cifra al volver a guardar
    }

    // =========================================================
    // --- GEMINI TAB SYSTEM ---
    // =========================================================
    var geminiActiveTab = 1;
    var geminiMaxTabs = 5;
    var geminiChatCount = 3;

    function geminiChatStorageKey() {
      var scope = getGeminiUserScope();
      return 'gemini_chats_history_' + scope;
    }
    function geminiChatNamesKey() {
      return 'gemini_chat_names_' + getGeminiUserScope();
    }
    function geminiLoadNames() {
      try { return JSON.parse(localStorage.getItem(geminiChatNamesKey()) || '{}'); } catch(e){ return {}; }
    }
    function geminiSaveNames(names) {
      localStorage.setItem(geminiChatNamesKey(), JSON.stringify(names));
    }
    function geminiGetName(tab) {
      var names = geminiLoadNames();
      return names['chat_' + tab] || ('Chat ' + tab);
    }
    function geminiSetName(tab, name) {
      var names = geminiLoadNames();
      names['chat_' + tab] = name;
      geminiSaveNames(names);
    }

    function geminiLoadChats() {
      try {
        return JSON.parse(localStorage.getItem(geminiChatStorageKey()) || '{}');
      } catch (e) { return {}; }
    }

    function geminiSaveChats(chats) {
      localStorage.setItem(geminiChatStorageKey(), JSON.stringify(chats));
    }

    function geminiGetChat(tab) {
      var chats = geminiLoadChats();
      return chats['chat_' + tab] || [];
    }

    function geminiSetChat(tab, messages) {
      var chats = geminiLoadChats();
      chats['chat_' + tab] = messages;
      geminiSaveChats(chats);
      if (window.isPremiumPlan && window.isPremiumPlan() && window.saveGeminiCloud) {
        window.saveGeminiCloud(chats);
      }
    }

    function geminiRenderTabs() {
      var bar = document.getElementById('geminiTabBar');
      if (!bar) return;
      bar.innerHTML = '';
      for (var i = 1; i <= geminiChatCount; i++) {
        (function(n){
          var row = document.createElement('div');
          row.className = 'gemini-sidebar-item' + (n === geminiActiveTab ? ' active' : '');
          row.onclick = function(){ geminiSwitchTab(n); };
          var label = document.createElement('span');
          label.textContent = geminiGetName(n);
          row.appendChild(label);
          var dots = document.createElement('button');
          dots.className = 'gemini-rename-btn';
          dots.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
          dots.title = 'Renombrar';
          dots.onclick = function(e){
            e.stopPropagation();
            var cur = geminiGetName(n);
            var nuevo = prompt('Renombrar conversacion:', cur);
            if (nuevo === null) return;
            nuevo = nuevo.trim();
            if (!nuevo) return;
            if (nuevo.length > 30) nuevo = nuevo.slice(0,30);
            geminiSetName(n, nuevo);
            geminiRenderTabs();
          };
          row.appendChild(dots);
          bar.appendChild(row);
        })(i);
      }
    }

    function geminiSwitchTab(tab) {
      geminiActiveTab = tab;
      geminiRenderTabs();
      geminiLoadChat(tab);
    }

    function geminiLoadChat(tab) {
      var history = document.getElementById('geminiChatHistory');
      if (!history) return;
      history.innerHTML = '';
      var msgs = geminiGetChat(tab);
      msgs.forEach(function(msg) {
        var line = document.createElement('div');
        line.className = 'gemini-message gemini-' + msg.role;
        line.textContent = msg.text;
        history.appendChild(line);
      });
      history.scrollTop = history.scrollHeight;
    }

    function appendGeminiMessage(role, text) {
      var history = document.getElementById('geminiChatHistory');
      if (!history) return;
      var line = document.createElement('div');
      line.className = 'gemini-message gemini-' + role;
      line.textContent = text;
      history.appendChild(line);
      history.scrollTop = history.scrollHeight;
      var msgs = geminiGetChat(geminiActiveTab);
      msgs.push({ role: role, text: text });
      geminiSetChat(geminiActiveTab, msgs);
    }

    window.initGeminiAssistant = function() {
      var keyInput = document.getElementById('geminiApiKeyInput');
      if (keyInput) getGeminiKeyForUser().then(function(k) { keyInput.value = k; });
      geminiRenderTabs();
      geminiLoadChat(geminiActiveTab);
    };

    document.getElementById('geminiSidebarToggle')?.addEventListener('click', function() {
      document.getElementById('geminiSidebar')?.classList.toggle('open');
    });
    document.getElementById('geminiNewChatBtn')?.addEventListener('click', function() {
      if (geminiChatCount >= geminiMaxTabs) return window.showPlanPopup('Maximo 5 conversaciones.');
      geminiChatCount++;
      geminiActiveTab = geminiChatCount;
      geminiSetChat(geminiActiveTab, []);
      geminiSetName(geminiActiveTab, 'Chat ' + geminiActiveTab);
      document.getElementById('geminiSidebar')?.classList.add('open');
      geminiRenderTabs();
      geminiLoadChat(geminiActiveTab);
    });
    document.getElementById('geminiKeyIcon')?.addEventListener('click', function() {
      document.getElementById('geminiSidebar')?.classList.add('open');
      var row = document.getElementById('geminiKeyRow');
      if (row) row.classList.remove('hidden');
    });

    document.getElementById('saveGeminiKeyBtn')?.addEventListener('click', async function() {
      var keyInput = document.getElementById('geminiApiKeyInput');
      var ok = await writeGeminiKeyForUser(keyInput ? keyInput.value.trim() : '');
      if (ok === false) return;
      document.getElementById('geminiKeyRow')?.classList.add('hidden');
      window.showPlanPopup('Gemini API Key guardada para este usuario.');
    });

    document.getElementById('deleteGeminiKeyBtn')?.addEventListener('click', async function() {
      await writeGeminiKeyForUser('');
      var keyInput = document.getElementById('geminiApiKeyInput');
      if (keyInput) keyInput.value = '';
      document.getElementById('geminiKeyRow')?.classList.add('hidden');
      window.showPlanPopup('Gemini API Key eliminada.');
    });

    document.getElementById('geminiClearBtn')?.addEventListener('click', function() {
      if (!confirm('¿Borrar el historial de este chat?')) return;
      geminiSetChat(geminiActiveTab, []);
      geminiLoadChat(geminiActiveTab);
    });

    var GEMINI_SYSTEM_INSTRUCTION = "Eres un asesor experto, versatil y de maximo nivel. Tu mision es ayudar al usuario en cualquier tema que solicite, brindando siempre la respuesta más fina, completa, precisa y útil que puedas dar. Te diriges al usuario con respeto, cordialidad y profesionalismo en todo momento. Usas un lenguaje claro, bien estructurado y adaptado al nivel del usuario. Si la pregunta es compleja, razonas paso a paso y entregas la mejor calidad posible. No mencionas ni revelas informacion sobre la pagina web, paneles, codigo interno o estructura del sitio: actuas unicamente como un asistente independiente y general. Respondes por defecto en espanol, salvo que el usuario te pida otro idioma.";

    async function geminiSendMessage() {
      var promptInput = document.getElementById('geminiPromptInput');
      var prompt = promptInput ? promptInput.value.trim() : '';
      var apiKey = await getGeminiKeyForUser();
      if (!apiKey) return window.showPlanPopup('Guarda tu Google AI Studio API Key primero.');
      if (!prompt) return;

      appendGeminiMessage('user', prompt);
      if (promptInput) promptInput.value = '';

      var history = document.getElementById('geminiChatHistory');
      var loadingEl = document.createElement('div');
      loadingEl.className = 'gemini-message gemini-assistant gemini-thinking';
      loadingEl.innerHTML = '<span class="gemini-spinner"></span>';
      if (history) {
        history.appendChild(loadingEl);
        history.scrollTop = history.scrollHeight;
      }

      var chatHistory = geminiGetChat(geminiActiveTab);
      var contents = chatHistory.map(function(m) {
        return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] };
      });

      var sendBtn = document.getElementById('sendGeminiBtn');
      if (sendBtn) sendBtn.disabled = true;

      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 25000);
      fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }] }, contents: contents }),
        signal: controller.signal
      })
      .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
      .then(function(result) {
        clearTimeout(timeoutId);
        if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        if (sendBtn) sendBtn.disabled = false;
        if (!result.ok) {
          var googleError = result.data && result.data.error && result.data.error.message ? result.data.error.message : 'Error';
          appendGeminiMessage('assistant', 'Error: ' + googleError);
          return;
        }
        var text = result.data && result.data.candidates && result.data.candidates[0] && result.data.candidates[0].content && result.data.candidates[0].content.parts
          ? result.data.candidates[0].content.parts.map(function(part) { return part.text || ''; }).join('\n').trim()
          : '';
        appendGeminiMessage('assistant', text || 'Respuesta vacia del modelo.');
      })
      .catch(function(error) {
        clearTimeout(timeoutId);
        if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        if (sendBtn) sendBtn.disabled = false;
        console.error("Gemini error:", error);
        if (error.name === 'AbortError') {
          appendGeminiMessage('assistant', 'La solicitud tardo demasiado (timeout 25s). Por favor reintente.');
        } else {
          appendGeminiMessage('assistant', 'Error: ' + (error.message || 'Error de conexion.'));
        }
      });
    }

    document.getElementById('sendGeminiBtn')?.addEventListener('click', geminiSendMessage);

    document.getElementById('geminiPromptInput')?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        geminiSendMessage();
      }
    });

    window.initGeminiAssistant();
