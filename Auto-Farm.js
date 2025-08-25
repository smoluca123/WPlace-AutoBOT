(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY: 1000,
    CHARGE_CHECK_INTERVAL: 60000,
    UI_UPDATE_INTERVAL: 500,
    MAIN_BUTTON_WAIT: 15000,
    MAIN_BUTTON_ENABLE_WAIT: 30000,
    TOKEN_CAPTURE_WAIT: 20000,
    THEME: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      text: '#ffffff',
      highlight: '#775ce3',
      success: '#00ff00',
      error: '#ff0000'
    }
  };

  const state = {
    running: false,
    loopActive: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    minimized: false,
    menuOpen: false,
    language: 'en',
    autoRefresh: true,
    pausedForManual: false,
    panelElement: null,
    stoppedForToken: false
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const waitForSelector = async (selector, interval = 200, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (e) {
        console.warn('waitForSelector error:', e);
      }
      await sleep(interval);
    }
    return null;
  };

  // Kiểm tra phần tử có "clickable" (không disabled / không loading / hiển thị) hay không
  const isElementClickable = el => {
    if (!el) return false;
    try {
      if (el.disabled) return false;
      if (typeof el.hasAttribute === 'function' && el.hasAttribute('disabled')) return false;
      const aria = typeof el.getAttribute === 'function' ? el.getAttribute('aria-disabled') : null;
      if (aria === 'true') return false;

      const cls = (el.className || '').toString().toLowerCase();
      const loadingFlags = [
        'disabled', 'loading', 'is-loading', 'btn-loading', 'btn--loading',
        'btn-disabled', 'opacity-50', 'spinner', 'busy', 'is-busy', 'is-disabled'
      ];
      if (loadingFlags.some(f => cls.includes(f))) return false;

      const ds = el.dataset || {};
      if (ds.loading === 'true' || ds.busy === 'true') return false;

      const style = window.getComputedStyle(el);
      if (!style) return false;
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
      if (parseFloat(style.opacity || '1') === 0) return false;

      return true;
    } catch (e) {
      return false;
    }
  };

  // Chờ cho selector xuất hiện và trở nên "clickable" trong timeout
  // Trả về phần tử (kể cả nếu timeout và phần tử vẫn disabled thì trả phần tử cuối tìm thấy)
  const waitForEnabledButton = async (selector, timeout = 30000, interval = 250) => {
    const start = Date.now();
    let lastFound = null;
    while (Date.now() - start < timeout) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          lastFound = el;
          if (isElementClickable(el)) return el;
        }
      } catch (e) {
        console.warn('waitForEnabledButton error:', e);
      }
      await sleep(interval);
    }
    return lastFound;
  };

  // Preserve original fetch
  const originalFetch = window.fetch.bind(window);
  let capturedCaptchaToken = null;

  window.fetch = async (url, options = {}) => {
    try {
      if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
        // try parse body if string
        if (options && options.body && typeof options.body === 'string') {
          try {
            const payload = JSON.parse(options.body);
            if (payload && payload.t) {
              capturedCaptchaToken = payload.t;
              console.log('✅ CAPTCHA Token Captured:', capturedCaptchaToken);

              // If previously marked as stopped due to token, reset that
              if (state.stoppedForToken) {
                state.stoppedForToken = false;
                updateUI(
                  state.language === 'pt' ? '🔄 Token CAPTCHA capturado!' : '🔄 CAPTCHA token captured!',
                  'success'
                );
              }

              // If we were paused waiting for manual token, resume
              if (state.pausedForManual) {
                state.pausedForManual = false;
                state.running = true;
                startPaintLoop();
              } else if (state.running && !state.loopActive) {
                // ensure loop runs if running and not active
                startPaintLoop();
              }
            }
          } catch (e) {
            // not JSON - ignore
          }
        }
      }
    } catch (e) {
      console.warn('fetch override parse error:', e);
    }
    return originalFetch(url, options);
  };

  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        credentials: 'include',
        ...options
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.warn('fetchAPI error:', e);
      return null;
    }
  };

  const getRandomPosition = () => ({
    x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE),
    y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE)
  });

  const paintPixel = async (x, y) => {
    const randomColor = Math.floor(Math.random() * 31) + 1;
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [x, y], colors: [randomColor], t: capturedCaptchaToken });
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      if (res.status === 403) {
        console.error('❌ 403 Forbidden. CAPTCHA token might be invalid or expired.');
        capturedCaptchaToken = null;
        state.stoppedForToken = true;
        return 'token_error';
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (e) {
      console.error('paintPixel error:', e);
      return null;
    }
  };

  const getCharge = async () => {
    const data = await fetchAPI('https://backend.wplace.live/me');
    if (data && data.charges) {
      state.userInfo = data;
      state.charges = {
        count: Math.floor(data.charges.count || 0),
        max: Math.floor(data.charges.max || 80),
        cooldownMs: data.charges.cooldownMs || 30000
      };
      if (data.level !== undefined) {
        state.userInfo.level = Math.floor(data.level);
      }
    }
    return state.charges;
  };

  const detectUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Location detection failed');
      const data = await response.json();
      if (data.country === 'BR') state.language = 'pt';
      else state.language = 'en';
    } catch (e) {
      console.warn('detectUserLocation error:', e);
      state.language = 'en';
    }
  };

  const waitForCaptchaToken = async (timeout = CONFIG.TOKEN_CAPTURE_WAIT, interval = 500) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (capturedCaptchaToken) return capturedCaptchaToken;
      await sleep(interval);
    }
    return null;
  };

  const startPaintLoop = () => {
    if (state.loopActive) return;
    // Ensure running state is true
    state.running = true;
    // Launch loop without awaiting to avoid blocking
    paintLoop().catch(err => {
      console.error('paintLoop uncaught error:', err);
    });
  };

  const paintLoop = async () => {
    if (state.loopActive) return;
    state.loopActive = true;
    try {
      while (state.running) {
        try {
          // If we've been stopped due to token and don't have a token, wait a bit
          if (state.stoppedForToken && !capturedCaptchaToken) {
            updateUI(
              state.language === 'pt' ? '⚠️ Aguardando novo token CAPTCHA...' : '⚠️ Waiting for new CAPTCHA token...',
              'status'
            );
            await sleep(2000);
            continue;
          }

          const { count, cooldownMs } = state.charges;

          if (count < 1) {
            const waitTime = Math.max(cooldownMs || 30000, 1000);
            updateUI(
              state.language === 'pt'
                ? `⌛ Sem cargas. Esperando ${Math.ceil(waitTime / 1000)}s...`
                : `⌛ No charges. Waiting ${Math.ceil(waitTime / 1000)}s...`,
              'status'
            );
            await sleep(waitTime);
            await getCharge();
            continue;
          }

          const randomPos = getRandomPosition();
          const paintResult = await paintPixel(randomPos.x, randomPos.y);

          if (paintResult === 'token_error') {
            // Mark stopped by token
            state.stoppedForToken = true;

            if (!state.autoRefresh) {
              if (!state.pausedForManual) {
                updateUI(
                  state.language === 'pt'
                    ? 'Auto-refresh desativado. Por favor, clique no botão Pintura manualmente.'
                    : 'Auto-refresh disabled. Please click the Paint button manually.',
                  'status'
                );
                state.pausedForManual = true;
              }
              state.running = false;
              return;
            }

            // Auto-refresh flow
            await getCharge();

            // If charges low, wait until at least 2 (configurable)
            if (state.charges.count < 2) {
              if (!state.pausedForManual) {
                updateUI(
                  state.language === 'pt'
                    ? '⚡ Aguardando pelo menos 2 cargas para auto-refresh...'
                    : '⚡ Waiting for at least 2 charges for auto-refresh...',
                  'status'
                );
                state.pausedForManual = true;
              }
              while (state.charges.count < 2 && state.running) {
                await sleep(CONFIG.CHARGE_CHECK_INTERVAL);
                await getCharge();
                updateStats();
              }
              if (!state.running) break;
              state.pausedForManual = false;
            }

            updateUI(
              state.language === 'pt'
                ? '❌ Token expirado. Tentando auto-refresh...'
                : '❌ CAPTCHA token expired. Trying auto-refresh...',
              'status'
            );

            // Wait for main Paint button to appear
            const mainSelector = 'button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl';
            const mainPaintBtnPresent = await waitForSelector(mainSelector, 300, CONFIG.MAIN_BUTTON_WAIT);

            let mainBtn = mainPaintBtnPresent;
            if (!mainBtn) {
              // fallback: last .btn-primary button on page
              const allPrimary = Array.from(document.querySelectorAll('button.btn-primary'));
              mainBtn = allPrimary.length ? allPrimary[allPrimary.length - 1] : null;
            }

            if (!mainBtn) {
              updateUI(
                state.language === 'pt'
                  ? '⛔ Botão Paint não encontrado. Por favor confirme manualmente.'
                  : '⛔ Paint button not found. Please confirm manually.',
                'error'
              );
              state.pausedForManual = true;
              state.running = false;
              return;
            }

            // Wait until button becomes enabled (not loading/disabled)
            const enabledMain = await waitForEnabledButton(mainSelector, CONFIG.MAIN_BUTTON_ENABLE_WAIT, 300);

            if (!enabledMain || !isElementClickable(enabledMain)) {
              updateUI(
                state.language === 'pt'
                  ? '⏳ Botão Paint ainda carregando. Por favor confirme manualmente.'
                  : '⏳ Paint button is still loading. Please confirm manually.',
                'status'
              );
              state.pausedForManual = true;
              state.running = false;
              return;
            }

            // Click main paint button
            try {
              enabledMain.click();
            } catch (e) {
              // fallback: dispatch click event
              try {
                enabledMain.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              } catch (e2) {
                console.warn('Could not click main paint button:', e2);
              }
            }
            await sleep(CONFIG.UI_UPDATE_INTERVAL);

            updateUI(
              state.language === 'pt' ? 'Selecionando transparente...' : 'Selecting transparent...',
              'status'
            );

            // Select transparent color if present
            const transBtn = await waitForEnabledButton('button#color-0', 5000, 200);
            if (transBtn && isElementClickable(transBtn)) {
              try {
                transBtn.click();
              } catch (e) {
                try { transBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e2) {}
              }
              await sleep(CONFIG.UI_UPDATE_INTERVAL);
            }

            // Move/focus canvas and simulate space press (to trigger paint UI if needed)
            const canvas = await waitForSelector('canvas', 300, 10000);
            if (canvas) {
              try {
                canvas.setAttribute('tabindex', '0');
                canvas.focus();
                const rect = canvas.getBoundingClientRect();
                const centerX = Math.round(rect.left + rect.width / 2);
                const centerY = Math.round(rect.top + rect.height / 2);
                const moveEvt = new MouseEvent('mousemove', { clientX: centerX, clientY: centerY, bubbles: true });
                canvas.dispatchEvent(moveEvt);
                const keyDown = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
                const keyUp = new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true });
                canvas.dispatchEvent(keyDown);
                canvas.dispatchEvent(keyUp);
              } catch (e) {
                console.warn('Canvas interaction error:', e);
              }
            }

            await sleep(500);
            updateUI(state.language === 'pt' ? 'Confirmando pintura...' : 'Confirming paint...', 'status');

            // Wait for confirm button and ensure it's enabled before clicking
            const confirmSelector = 'button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl';
            const confirmBtn = await waitForEnabledButton(confirmSelector, 10000, 300);
            if (confirmBtn && isElementClickable(confirmBtn)) {
              try {
                confirmBtn.click();
              } catch (e) {
                try { confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e2) {}
              }
            }

            // Wait for token to be captured by our fetch override
            updateUI(state.language === 'pt' ? 'Aguardando captura do token...' : 'Waiting for token capture...', 'status');
            const token = await waitForCaptchaToken(CONFIG.TOKEN_CAPTURE_WAIT, 500);
            if (!token) {
              updateUI(
                state.language === 'pt'
                  ? '❌ Token não capturado. Por favor resolva CAPTCHA manualmente.'
                  : '❌ Token not captured. Please complete CAPTCHA manually.',
                'error'
              );
              state.pausedForManual = true;
              state.running = false;
              return;
            }

            // If token captured, loop continues automatically
            continue;
          }

          // If paintResult indicates success
          if (paintResult && paintResult.painted === 1) {
            state.paintedCount++;
            state.lastPixel = {
              x: CONFIG.START_X + randomPos.x,
              y: CONFIG.START_Y + randomPos.y,
              time: new Date()
            };
            state.charges.count = Math.max(0, (state.charges.count || 1) - 1);

            const paintEffect = document.getElementById('paintEffect');
            if (paintEffect) {
              paintEffect.style.animation = 'pulse 0.5s';
              setTimeout(() => {
                const pe = document.getElementById('paintEffect');
                if (pe) pe.style.animation = '';
              }, 500);
            }

            // reset token-stopped flag if previously set
            if (state.stoppedForToken) state.stoppedForToken = false;

            updateUI(state.language === 'pt' ? '✅ Pixel pintado!' : '✅ Pixel painted!', 'success');
          } else {
            updateUI(state.language === 'pt' ? '❌ Falha ao pintar' : '❌ Failed to paint', 'error');
          }

          await sleep(CONFIG.DELAY);
          updateStats();
        } catch (innerErr) {
          console.error('Error in paint iteration:', innerErr);
          updateUI(state.language === 'pt' ? '❌ Erro no loop de pintura' : '❌ Error in paint loop', 'error');
          await sleep(CONFIG.DELAY);
        }
      }
    } finally {
      state.loopActive = false;
    }
  };

  const removeUI = () => {
    if (state.panelElement) {
      state.panelElement.remove();
      state.panelElement = null;
    }
    state.menuOpen = false;
  };

  const createUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
      }
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .wplace-bot-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: ${CONFIG.THEME.primary};
        border: 1px solid ${CONFIG.THEME.accent};
        border-radius: 8px;
        padding: 0;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        z-index: 9999;
        font-family: 'Segoe UI', Roboto, sans-serif;
        color: ${CONFIG.THEME.text};
        animation: slideIn 0.4s ease-out;
        overflow: hidden;
      }
      .wplace-header {
        padding: 12px 15px;
        background: ${CONFIG.THEME.secondary};
        color: ${CONFIG.THEME.highlight};
        font-size: 16px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }
      .wplace-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wplace-header-controls {
        display: flex;
        gap: 10px;
      }
      .wplace-header-btn {
        background: none;
        border: none;
        color: ${CONFIG.THEME.text};
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
        padding: 2px;
      }
      .wplace-header-btn:hover { opacity: 1; }
      .wplace-content { padding: 12px; display: ${state.minimized ? 'none' : 'block'}; }
      .wplace-controls { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
      .wplace-btn {
        flex: 1;
        min-width: 110px;
        padding: 8px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .wplace-btn:hover { transform: translateY(-2px); }
      .wplace-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .wplace-btn-primary { background: ${CONFIG.THEME.accent}; color: white; }
      .wplace-btn-stop { background: ${CONFIG.THEME.error}; color: white; }
      .wplace-stats { background: ${CONFIG.THEME.secondary}; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
      .wplace-stat-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
      .wplace-stat-label { display: flex; align-items: center; gap: 6px; opacity: 0.85; }
      .wplace-status { padding: 8px; border-radius: 4px; text-align: center; font-size: 13px; word-wrap: break-word; }
      .status-default { background: rgba(255,255,255,0.06); }
      .status-success { background: rgba(0, 255, 0, 0.08); color: ${CONFIG.THEME.success}; }
      .status-error { background: rgba(255, 0, 0, 0.08); color: ${CONFIG.THEME.error}; }
      .status-status { background: rgba(255, 255, 0, 0.06); color: #ffff00; }
      #paintEffect { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border-radius: 8px; }
      .auto-refresh-control { display:flex; align-items:center; gap:8px; margin-bottom: 10px; }
    `;
    document.head.appendChild(style);

    const translations = {
      pt: {
        title: "WPlace Auto-Farm",
        start: "Iniciar",
        stop: "Parar",
        ready: "Pronto para começar",
        user: "Usuário",
        pixels: "Pixels",
        charges: "Cargas",
        level: "Level"
      },
      en: {
        title: "WPlace Auto-Farm",
        start: "Start",
        stop: "Stop",
        ready: "Ready to start",
        user: "User",
        pixels: "Pixels",
        charges: "Charges",
        level: "Level"
      }
    };

    const t = translations[state.language] || translations.en;

    const panel = document.createElement('div');
    panel.className = 'wplace-bot-panel';
    panel.innerHTML = `
      <div id="paintEffect"></div>
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-paint-brush"></i>
          <span>${t.title}</span>
        </div>
        <div class="wplace-header-controls">
          <button id="minimizeBtn" class="wplace-header-btn" title="${state.language === 'pt' ? 'Minimizar' : 'Minimize'}">
            <i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>
          </button>
          <button id="closeBtn" class="wplace-header-btn" title="${state.language === 'pt' ? 'Fechar' : 'Close'}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="wplace-controls">
          <button id="toggleBtn" class="wplace-btn wplace-btn-primary">
            <i class="fas fa-play"></i>
            <span>${t.start}</span>
          </button>
        </div>

        <div class="auto-refresh-control">
          <input type="checkbox" id="autoRefreshCheckbox" ${state.autoRefresh ? 'checked' : ''}/>
          <span>Auto Refresh</span>
        </div>

        <div class="wplace-stats">
          <div id="statsArea">
            <div class="wplace-stat-item">
              <div class="wplace-stat-label"><i class="fas fa-spinner fa-spin"></i> ${state.language === 'pt' ? 'Carregando...' : 'Loading...'}</div>
            </div>
          </div>
        </div>

        <div id="statusText" class="wplace-status status-default">
          ${t.ready}
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    state.panelElement = panel;

    // Drag functionality
    const header = panel.querySelector('.wplace-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
      if (e.target.closest('.wplace-header-btn')) return;
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX; pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
      pos3 = e.clientX; pos4 = e.clientY;
      const newTop = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, panel.offsetTop - pos2));
      const newLeft = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, panel.offsetLeft - pos1));
      panel.style.top = newTop + "px";
      panel.style.left = newLeft + "px";
      panel.style.right = 'auto';
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }

    const toggleBtn = panel.querySelector('#toggleBtn');
    const minimizeBtn = panel.querySelector('#minimizeBtn');
    const closeBtn = panel.querySelector('#closeBtn');
    const content = panel.querySelector('.wplace-content');
    const autoRefreshCheckbox = panel.querySelector('#autoRefreshCheckbox');

    toggleBtn?.addEventListener('click', () => {
      // toggle running
      if (!state.running) {
        // starting
        if (!capturedCaptchaToken) {
          updateUI(
            state.language === 'pt'
              ? '❌ Token não capturado. Clique em qualquer pixel manualmente primeiro.'
              : '❌ CAPTCHA token not captured. Please click any pixel manually first.',
            'error'
          );
          return;
        }
        state.running = true;
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i> <span>${t.stop}</span>`;
        toggleBtn.classList.remove('wplace-btn-primary');
        toggleBtn.classList.add('wplace-btn-stop');
        updateUI(state.language === 'pt' ? '🚀 Pintura iniciada!' : '🚀 Painting started!', 'success');
        startPaintLoop();
      } else {
        // stopping
        state.running = false;
        toggleBtn.innerHTML = `<i class="fas fa-play"></i> <span>${t.start}</span>`;
        toggleBtn.classList.add('wplace-btn-primary');
        toggleBtn.classList.remove('wplace-btn-stop');
        updateUI(state.language === 'pt' ? '⏹️ Parado' : '⏹️ Stopped', 'default');
      }
    });

    minimizeBtn?.addEventListener('click', () => {
      state.minimized = !state.minimized;
      if (content) content.style.display = state.minimized ? 'none' : 'block';
      if (minimizeBtn) minimizeBtn.innerHTML = `<i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>`;
    });

    closeBtn?.addEventListener('click', () => {
      state.running = false;
      removeUI();
    });

    autoRefreshCheckbox?.addEventListener('change', () => {
      state.autoRefresh = autoRefreshCheckbox.checked;
    });

    window.addEventListener('beforeunload', () => {
      state.menuOpen = false;
    });
  };

  window.updateUI = (message, type = 'default') => {
    const statusText = document.querySelector('#statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
      statusText.style.animation = 'none';
      void statusText.offsetWidth;
      statusText.style.animation = 'slideIn 0.3s ease-out';
    } else {
      console.log('UI:', message);
    }
  };

  window.updateStats = async () => {
    await getCharge();
    const statsArea = document.querySelector('#statsArea');
    if (!statsArea || !state.userInfo) return;
    const t = {
      pt: { user: "Usuário", pixels: "Pixels", charges: "Cargas", level: "Level" },
      en: { user: "User", pixels: "Pixels", charges: "Charges", level: "Level" }
    }[state.language] || { user: "User", pixels: "Pixels", charges: "Charges", level: "Level" };

    statsArea.innerHTML = `
      <div class="wplace-stat-item">
        <div class="wplace-stat-label"><i class="fas fa-user"></i> ${t.user}</div>
        <div>${state.userInfo?.name || 'Unknown'}</div>
      </div>
      <div class="wplace-stat-item">
        <div class="wplace-stat-label"><i class="fas fa-paint-brush"></i> ${t.pixels}</div>
        <div>${state.paintedCount}</div>
      </div>
      <div class="wplace-stat-item">
        <div class="wplace-stat-label"><i class="fas fa-bolt"></i> ${t.charges}</div>
        <div>${Math.floor(state.charges.count || 0)}/${Math.floor(state.charges.max || 0)}</div>
      </div>
      <div class="wplace-stat-item">
        <div class="wplace-stat-label"><i class="fas fa-star"></i> ${t.level}</div>
        <div>${state.userInfo?.level || 0}</div>
      </div>
    `;
  };

  window.addEventListener('beforeunload', () => {
    state.running = false;
    removeUI();
  });

  // Initialize
  try {
    await detectUserLocation();
    createUI();
    await getCharge();
    updateStats();
  } catch (error) {
    console.error('Initialization error:', error);
  }
})();
