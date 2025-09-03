(async () => {
  // ACCOUNT MANAGER CLASS FOR MULTI-ACCOUNT SUPPORT
  class AccountManager {
    constructor() {
      this.accounts = [];
      this.currentAccountIndex = 0;
      this.loadAccounts();
    }

    // Load accounts from localStorage
    loadAccounts() {
      try {
        const saved = localStorage.getItem('wplace_accounts');
        if (saved) {
          this.accounts = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Could not load accounts:', e);
        this.accounts = [];
      }
    }

    // Save accounts to localStorage
    saveAccounts() {
      try {
        localStorage.setItem('wplace_accounts', JSON.stringify(this.accounts));
      } catch (e) {
        console.warn('Could not save accounts:', e);
      }
    }

    // Add new account
    addAccount(name, cookies) {
      if (!name || !cookies) return false;

      const account = {
        id: Date.now(),
        name: name.trim(),
        cookies: cookies.trim(),
        charges: 0,
        lastUsed: null,
        active: true,
      };

      this.accounts.push(account);
      this.saveAccounts();
      return true;
    }

    // Remove account
    removeAccount(accountId) {
      this.accounts = this.accounts.filter((acc) => acc.id !== accountId);
      if (this.currentAccountIndex >= this.accounts.length) {
        this.currentAccountIndex = 0;
      }
      this.saveAccounts();
    }

    // Get current account
    getCurrentAccount() {
      if (this.accounts.length === 0) return null;
      return this.accounts[this.currentAccountIndex] || null;
    }

    // Switch to next available account
    switchToNextAccount() {
      if (this.accounts.length <= 1) return false;

      const startIndex = this.currentAccountIndex;
      do {
        this.currentAccountIndex =
          (this.currentAccountIndex + 1) % this.accounts.length;
        const account = this.accounts[this.currentAccountIndex];
        if (account && account.active) {
          account.lastUsed = Date.now();
          this.saveAccounts();
          return true;
        }
      } while (this.currentAccountIndex !== startIndex);

      return false;
    }

    // Update account charges
    updateAccountCharges(charges) {
      const account = this.getCurrentAccount();
      if (account) {
        account.charges = charges;
        this.saveAccounts();
      }
    }

    // Check if current account has enough charges
    hasEnoughCharges(threshold = 1) {
      const account = this.getCurrentAccount();
      return account ? account.charges >= threshold : false;
    }

    // Get account info for UI
    getAccountsInfo() {
      return this.accounts.map((acc, index) => ({
        ...acc,
        isCurrent: index === this.currentAccountIndex,
      }));
    }

    // Set cookies for current account to document.cookie
    async setCurrentAccountCookies() {
      const account = this.getCurrentAccount();
      if (!account || !account.cookies) return false;

      try {
        // Clear existing cookies first
        this.clearExistingCookies();

        // Wait a bit for clearing to take effect
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Set each cookie to document.cookie
        let cookieStr = account.cookies.trim();

        // Remove any existing "Cookie:" prefix if present
        if (cookieStr.toLowerCase().startsWith('cookie:')) {
          cookieStr = cookieStr.substring(7).trim();
        }

        console.log(`🍪 Setting cookies for account: ${account.name}`);
        console.log(`🍪 Raw cookies: ${cookieStr.substring(0, 200)}...`);

        // Split cookies and set each one
        const cookiePairs = cookieStr.split(';');
        cookiePairs.forEach((pair) => {
          const trimmed = pair.trim();
          if (trimmed && trimmed.includes('=')) {
            // Try multiple strategies to set the cookie
            const cookieName = trimmed.split('=')[0];

            // Strategy 1: Just the cookie as-is
            document.cookie = trimmed;

            // Strategy 2: With path and domain
            document.cookie = `${trimmed}; path=/; domain=.wplace.live`;

            // Strategy 3: Without domain
            document.cookie = `${trimmed}; path=/`;

            console.log(`🍪 Set cookie: ${cookieName}`);
          }
        });

        // Wait a bit and verify cookies were set
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log(
          `🍪 Final document.cookie: ${document.cookie.substring(0, 200)}...`,
        );
        console.log(`🍪 Successfully set cookies for account: ${account.name}`);
        return true;
      } catch (e) {
        console.error('Failed to set cookies for account:', account.name, e);
        return false;
      }
    }

    // Clear existing cookies thoroughly
    clearExistingCookies() {
      try {
        console.log('🧹 Starting to clear existing cookies...');
        console.log('🧹 Current cookies before clear:', document.cookie);

        // Get all current cookies
        const cookies = document.cookie.split(';');
        const cookieNames = [];

        cookies.forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name =
            eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name) {
            cookieNames.push(name);
          }
        });

        // Clear each cookie with various domain/path combinations to ensure complete removal
        cookieNames.forEach((name) => {
          // Different path and domain combinations to ensure thorough clearing
          const clearStrategies = [
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`,
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.wplace.live`,
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=wplace.live`,
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.wplace.live; secure`,
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=wplace.live; secure`,
            `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
            `${name}=; max-age=0; path=/`,
            `${name}=; max-age=0; path=/; domain=.wplace.live`,
            `${name}=; max-age=0; path=/; domain=wplace.live`,
          ];

          clearStrategies.forEach((strategy) => {
            document.cookie = strategy;
          });

          console.log(`🧹 Cleared cookie: ${name}`);
        });

        // Additional wait to ensure clearing took effect
        setTimeout(() => {
          console.log('🧹 Cookies after clear:', document.cookie);
        }, 100);

        console.log('🧹 Cookie clearing completed');
      } catch (e) {
        console.warn('Failed to clear existing cookies:', e);
      }
    }

    // Get cookies formatted for HTTP Cookie header
    getCurrentAccountCookieHeader() {
      const account = this.getCurrentAccount();
      if (!account || !account.cookies) return '';

      try {
        // Simply clean up and return the cookies string
        let cookieStr = account.cookies.trim();

        // Remove any existing "Cookie:" prefix if present
        if (cookieStr.toLowerCase().startsWith('cookie:')) {
          cookieStr = cookieStr.substring(7).trim();
        }

        return cookieStr;
      } catch (error) {
        console.error(
          `❌ Failed to get cookies for account ${account.name}:`,
          error,
        );
        return '';
      }
    }

    // Check if we should switch account due to low charges
    shouldSwitchAccount(currentCharges, threshold = 1) {
      this.updateAccountCharges(currentCharges);
      return currentCharges < threshold && this.accounts.length > 1;
    }
  }

  // Initialize global account manager
  const accountManager = new AccountManager();

  // Debug function to log current cookies
  function debugCurrentCookies() {
    const currentAccount = accountManager.getCurrentAccount();
    const cookieHeader = accountManager.getCurrentAccountCookieHeader();
    const documentCookies = document.cookie;

    console.log('🐛 Cookie Debug Info:');
    console.log('- Current account:', currentAccount?.name || 'None');
    console.log(
      '- Account cookies:',
      currentAccount?.cookies?.substring(0, 200) || 'None',
    );
    console.log(
      '- Formatted header:',
      cookieHeader?.substring(0, 200) || 'None',
    );
    console.log(
      '- Document.cookie:',
      documentCookies?.substring(0, 200) || 'None',
    );
  }

  // Expose functions globally for console debugging
  window.wplaceDebug = {
    accountManager,
    debugCurrentCookies,
    fetchWithAccountCookies,
    resetTurnstileForAccountSwitch,
    testApi: async () => {
      console.log('🧪 Testing API with current account cookies...');
      return await fetchWithAccountCookies(
        'https://backend.wplace.live/me',
        {},
      );
    },
    clearCookies: () => {
      accountManager.clearExistingCookies();
    },
  };

  // Fetch wrapper that ensures current account cookies are set in document.cookie
  async function fetchWithAccountCookies(url, options = {}) {
    // Ensure current account cookies are set in document.cookie
    const currentAccount = accountManager.getCurrentAccount();
    if (currentAccount) {
      await accountManager.setCurrentAccountCookies();
      console.log(`🍪 Using account: ${currentAccount.name}`);
    } else {
      console.log(`🍪 No current account set`);
    }

    // Make request with credentials: include to send document.cookie
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    // Log response status for debugging
    console.log(
      `📡 Response from ${url}: ${response.status} ${response.statusText}`,
    );

    return response;
  }

  // CONFIGURATION CONSTANTS
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    PAINTING_SPEED: {
      MIN: 1, // Minimum 1 pixel batch size
      MAX: 1000, // Maximum 1000 pixels batch size
      DEFAULT: 5, // Default 5 pixels batch size
    },
    BATCH_MODE: 'normal', // "normal" or "random" - default to normal
    RANDOM_BATCH_RANGE: {
      MIN: 3, // Random range minimum
      MAX: 20, // Random range maximum
    },
    PAINTING_SPEED_ENABLED: false, // Off by default
    AUTO_CAPTCHA_ENABLED: true, // Turnstile generator enabled by default
    TOKEN_SOURCE: 'generator', // "generator", "manual", or "hybrid" - default to generator
    COOLDOWN_CHARGE_THRESHOLD: 1, // Default wait threshold
    // Desktop Notifications (defaults)
    NOTIFICATIONS: {
      ENABLED: true,
      ON_CHARGES_REACHED: true,
      ONLY_WHEN_UNFOCUSED: true,
      REPEAT_MINUTES: 5, // repeat reminder while threshold condition holds
    },
    OVERLAY: {
      OPACITY_DEFAULT: 0.6,
      BLUE_MARBLE_DEFAULT: false,
      ditheringEnabled: false,
    },
    // --- START: Color data from colour-converter.js ---
    // New color structure with proper ID mapping
    COLOR_MAP: {
      0: { id: 1, name: 'Black', rgb: { r: 0, g: 0, b: 0 } },
      1: { id: 2, name: 'Dark Gray', rgb: { r: 60, g: 60, b: 60 } },
      2: { id: 3, name: 'Gray', rgb: { r: 120, g: 120, b: 120 } },
      3: { id: 4, name: 'Light Gray', rgb: { r: 210, g: 210, b: 210 } },
      4: { id: 5, name: 'White', rgb: { r: 255, g: 255, b: 255 } },
      5: { id: 6, name: 'Deep Red', rgb: { r: 96, g: 0, b: 24 } },
      6: { id: 7, name: 'Red', rgb: { r: 237, g: 28, b: 36 } },
      7: { id: 8, name: 'Orange', rgb: { r: 255, g: 127, b: 39 } },
      8: { id: 9, name: 'Gold', rgb: { r: 246, g: 170, b: 9 } },
      9: { id: 10, name: 'Yellow', rgb: { r: 249, g: 221, b: 59 } },
      10: { id: 11, name: 'Light Yellow', rgb: { r: 255, g: 250, b: 188 } },
      11: { id: 12, name: 'Dark Green', rgb: { r: 14, g: 185, b: 104 } },
      12: { id: 13, name: 'Green', rgb: { r: 19, g: 230, b: 123 } },
      13: { id: 14, name: 'Light Green', rgb: { r: 135, g: 255, b: 94 } },
      14: { id: 15, name: 'Dark Teal', rgb: { r: 12, g: 129, b: 110 } },
      15: { id: 16, name: 'Teal', rgb: { r: 16, g: 174, b: 166 } },
      16: { id: 17, name: 'Light Teal', rgb: { r: 19, g: 225, b: 190 } },
      17: { id: 20, name: 'Cyan', rgb: { r: 96, g: 247, b: 242 } },
      18: { id: 44, name: 'Light Cyan', rgb: { r: 187, g: 250, b: 242 } },
      19: { id: 18, name: 'Dark Blue', rgb: { r: 40, g: 80, b: 158 } },
      20: { id: 19, name: 'Blue', rgb: { r: 64, g: 147, b: 228 } },
      21: { id: 21, name: 'Indigo', rgb: { r: 107, g: 80, b: 246 } },
      22: { id: 22, name: 'Light Indigo', rgb: { r: 153, g: 177, b: 251 } },
      23: { id: 23, name: 'Dark Purple', rgb: { r: 120, g: 12, b: 153 } },
      24: { id: 24, name: 'Purple', rgb: { r: 170, g: 56, b: 185 } },
      25: { id: 25, name: 'Light Purple', rgb: { r: 224, g: 159, b: 249 } },
      26: { id: 26, name: 'Dark Pink', rgb: { r: 203, g: 0, b: 122 } },
      27: { id: 27, name: 'Pink', rgb: { r: 236, g: 31, b: 128 } },
      28: { id: 28, name: 'Light Pink', rgb: { r: 243, g: 141, b: 169 } },
      29: { id: 29, name: 'Dark Brown', rgb: { r: 104, g: 70, b: 52 } },
      30: { id: 30, name: 'Brown', rgb: { r: 149, g: 104, b: 42 } },
      31: { id: 31, name: 'Beige', rgb: { r: 248, g: 178, b: 119 } },
      32: { id: 52, name: 'Light Beige', rgb: { r: 255, g: 197, b: 165 } },
      33: { id: 32, name: 'Medium Gray', rgb: { r: 170, g: 170, b: 170 } },
      34: { id: 33, name: 'Dark Red', rgb: { r: 165, g: 14, b: 30 } },
      35: { id: 34, name: 'Light Red', rgb: { r: 250, g: 128, b: 114 } },
      36: { id: 35, name: 'Dark Orange', rgb: { r: 228, g: 92, b: 26 } },
      37: { id: 37, name: 'Dark Goldenrod', rgb: { r: 156, g: 132, b: 49 } },
      38: { id: 38, name: 'Goldenrod', rgb: { r: 197, g: 173, b: 49 } },
      39: { id: 39, name: 'Light Goldenrod', rgb: { r: 232, g: 212, b: 95 } },
      40: { id: 40, name: 'Dark Olive', rgb: { r: 74, g: 107, b: 58 } },
      41: { id: 41, name: 'Olive', rgb: { r: 90, g: 148, b: 74 } },
      42: { id: 42, name: 'Light Olive', rgb: { r: 132, g: 197, b: 115 } },
      43: { id: 43, name: 'Dark Cyan', rgb: { r: 15, g: 121, b: 159 } },
      44: { id: 45, name: 'Light Blue', rgb: { r: 125, g: 199, b: 255 } },
      45: { id: 46, name: 'Dark Indigo', rgb: { r: 77, g: 49, b: 184 } },
      46: { id: 47, name: 'Dark Slate Blue', rgb: { r: 74, g: 66, b: 132 } },
      47: { id: 48, name: 'Slate Blue', rgb: { r: 122, g: 113, b: 196 } },
      48: { id: 49, name: 'Light Slate Blue', rgb: { r: 181, g: 174, b: 241 } },
      49: { id: 53, name: 'Dark Peach', rgb: { r: 155, g: 82, b: 73 } },
      50: { id: 54, name: 'Peach', rgb: { r: 209, g: 128, b: 120 } },
      51: { id: 55, name: 'Light Peach', rgb: { r: 250, g: 182, b: 164 } },
      52: { id: 50, name: 'Light Brown', rgb: { r: 219, g: 164, b: 99 } },
      53: { id: 56, name: 'Dark Tan', rgb: { r: 123, g: 99, b: 82 } },
      54: { id: 57, name: 'Tan', rgb: { r: 156, g: 132, b: 107 } },
      55: { id: 36, name: 'Light Tan', rgb: { r: 214, g: 181, b: 148 } },
      56: { id: 51, name: 'Dark Beige', rgb: { r: 209, g: 128, b: 81 } },
      57: { id: 61, name: 'Dark Stone', rgb: { r: 109, g: 100, b: 63 } },
      58: { id: 62, name: 'Stone', rgb: { r: 148, g: 140, b: 107 } },
      59: { id: 63, name: 'Light Stone', rgb: { r: 205, g: 197, b: 158 } },
      60: { id: 58, name: 'Dark Slate', rgb: { r: 51, g: 57, b: 65 } },
      61: { id: 59, name: 'Slate', rgb: { r: 109, g: 117, b: 141 } },
      62: { id: 60, name: 'Light Slate', rgb: { r: 179, g: 185, b: 209 } },
      63: { id: 0, name: 'Transparent', rgb: null },
    },
    // --- END: Color data ---
    // Optimized CSS Classes for reuse
    CSS_CLASSES: {
      BUTTON_PRIMARY: `
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white; border: none; border-radius: 8px; padding: 10px 16px;
          cursor: pointer; font-weight: 500; transition: all 0.3s ease;
          display: flex; align-items: center; gap: 8px;
        `,
      BUTTON_SECONDARY: `
          background: rgba(255,255,255,0.1); color: white;
          border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
          padding: 8px 12px; cursor: pointer; transition: all 0.3s ease;
        `,
      MODERN_CARD: `
          background: rgba(255,255,255,0.1); border-radius: 12px;
          padding: 18px; border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(5px);
        `,
      GRADIENT_TEXT: `
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; font-weight: bold;
        `,
    },
    THEMES: {
      'Classic Autobot': {
        primary: '#000000',
        secondary: '#111111',
        accent: '#222222',
        text: '#ffffff',
        highlight: '#775ce3',
        success: '#00ff00',
        error: '#ff0000',
        warning: '#ffaa00',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        borderRadius: '12px',
        borderStyle: 'solid',
        borderWidth: '1px',
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        animations: {
          glow: false,
          scanline: false,
          pixelBlink: false,
        },
      },
      'Neon Retro': {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#0f3460',
        text: '#00ff41',
        highlight: '#ff6b35',
        success: '#39ff14',
        error: '#ff073a',
        warning: '#ffff00',
        neon: '#00ffff',
        purple: '#bf00ff',
        pink: '#ff1493',
        fontFamily: "'Press Start 2P', monospace",
        borderRadius: '0',
        borderStyle: 'solid',
        borderWidth: '3px',
        boxShadow:
          '0 0 20px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)',
        backdropFilter: 'none',
        animations: {
          glow: true,
          scanline: true,
          pixelBlink: true,
        },
      },
    },
    currentTheme: 'Classic Autobot',
  };

  const getCurrentTheme = () => CONFIG.THEMES[CONFIG.currentTheme];

  const switchTheme = (themeName) => {
    if (CONFIG.THEMES[themeName]) {
      CONFIG.currentTheme = themeName;
      saveThemePreference();

      // Remove existing theme styles
      const existingStyle = document.querySelector(
        'style[data-wplace-theme="true"]',
      );
      if (existingStyle) {
        existingStyle.remove();
      }

      // Recreate UI with new theme (cleanup is handled in createUI)
      createUI();
    }
  };

  const saveThemePreference = () => {
    try {
      localStorage.setItem('wplace-theme', CONFIG.currentTheme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  };

  const loadThemePreference = () => {
    try {
      const saved = localStorage.getItem('wplace-theme');
      if (saved && CONFIG.THEMES[saved]) {
        CONFIG.currentTheme = saved;
      }
    } catch (e) {
      console.warn('Could not load theme preference:', e);
    }
  };

  const loadLanguagePreference = () => {
    try {
      const saved = localStorage.getItem('wplace_language');
      if (saved && TEXT[saved]) {
        state.language = saved;
      }
    } catch (e) {
      console.warn('Could not load language preference:', e);
    }
  };

  // BILINGUAL TEXT STRINGS:)
  const TEXT = {
    en: {
      title: 'WPlace Auto-Image',
      toggleOverlay: 'Toggle Overlay',
      scanColors: 'Scan Colors',
      uploadImage: 'Upload Image',
      resizeImage: 'Resize Image',
      selectPosition: 'Select Position',
      startPainting: 'Start Painting',
      stopPainting: 'Stop Painting',
      checkingColors: '🔍 Checking available colors...',
      noColorsFound: '❌ Open the color palette on the site and try again!',
      colorsFound: '✅ {count} available colors found. Ready to upload.',
      loadingImage: '🖼️ Loading image...',
      imageLoaded: '✅ Image loaded with {count} valid pixels',
      imageError: '❌ Error loading image',
      selectPositionAlert:
        'Paint the first pixel at the location where you want the art to start!',
      waitingPosition: '👆 Waiting for you to paint the reference pixel...',
      positionSet: '✅ Position set successfully!',
      positionTimeout: '❌ Timeout for position selection',
      startPaintingMsg: '🎨 Starting painting...',
      paintingProgress: '🧱 Progress: {painted}/{total} pixels...',
      noCharges: '⌛ No charges. Waiting {time}...',
      paintingStopped: '⏹️ Painting stopped by user',
      paintingComplete: '✅ Painting complete! {count} pixels painted.',
      paintingError: '❌ Error during painting',
      missingRequirements: '❌ Load an image and select a position first',
      progress: 'Progress',
      pixels: 'Pixels',
      charges: 'Charges',
      estimatedTime: 'Estimated time',
      initMessage: "Click 'Upload Image' to begin",
      waitingInit: 'Waiting for initialization...',
      initializingToken: '🔧 Initializing Turnstile token generator...',
      tokenReady: '✅ Token generator ready - you can now start painting!',
      tokenRetryLater: '⚠️ Token generator will retry when needed',
      resizeSuccess: '✅ Image resized to {width}x{height}',
      paintingPaused: '⏸️ Painting paused at position X: {x}, Y: {y}',
      captchaNeeded:
        '❗ Token generation failed. Please try again in a moment.',
      saveData: 'Save Progress',
      loadData: 'Load Progress',
      saveToFile: 'Save to File',
      loadFromFile: 'Load from File',
      dataManager: 'Data Manager',
      autoSaved: '✅ Progress saved automatically',
      dataLoaded: '✅ Progress loaded successfully',
      fileSaved: '✅ Progress saved to file successfully',
      fileLoaded: '✅ Progress loaded from file successfully',
      noSavedData: '❌ No saved progress found',
      savedDataFound: '✅ Saved progress found! Load to continue?',
      savedDate: 'Saved on: {date}',
      clickLoadToContinue: "Click 'Load Progress' to continue.",
      fileError: '❌ Error processing file',
      invalidFileFormat: '❌ Invalid file format',
      paintingSpeed: 'Painting Speed',
      pixelsPerSecond: 'pixels/second',
      speedSetting: 'Speed: {speed} pixels/sec',
      settings: 'Settings',
      botSettings: 'Bot Settings',
      close: 'Close',
      language: 'Language',
      themeSettings: 'Theme Settings',
      themeSettingsDesc: 'Choose your preferred color theme for the interface.',
      languageSelectDesc:
        'Select your preferred language. Changes will take effect immediately.',
      autoCaptcha: 'Auto-CAPTCHA Solver (Turnstile)',
      autoCaptchaDesc:
        'Automatically generates Turnstile tokens using integrated generator. Falls back to browser automation if needed.',
      applySettings: 'Apply Settings',
      settingsSaved: '✅ Settings saved successfully!',
      cooldownSettings: 'Cooldown Settings',
      waitCharges: 'Wait until charges reach',
      captchaSolving: '🔑 Generating Turnstile token...',
      captchaFailed:
        '❌ Turnstile token generation failed. Trying fallback method...',
      automation: 'Automation',
      noChargesThreshold:
        '⌛ Waiting for charges to reach {threshold}. Currently {current}. Next in {time}...',
      // Multi-account strings
      multiAccount: 'Multi-Account',
      accountManager: 'Account Manager',
      addAccount: 'Add Account',
      accountName: 'Account Name',
      accountCookies: 'Account Cookies',
      currentAccount: 'Current Account',
      switchAccount: 'Account Switched',
      accountAdded: '✅ Account added successfully!',
      accountRemoved: '✅ Account removed successfully!',
      accountSwitched: '✅ Switched to account: {name}',
      noAccountsAvailable: '❌ No accounts available to switch to',
      invalidAccountData: '❌ Please provide both account name and cookies',
      cookiesPlaceholder:
        'Paste your cookies here (e.g., session=abc123; token=xyz789)',
      accountNamePlaceholder:
        'Enter account name (e.g., Account 1, Main Account)',
      removeAccount: 'Remove',
      accountCharges: 'Charges: {charges}',
      accountLastUsed: 'Last used: {time}',
      switchingAccount: '🔄 Switching to next account due to low charges...',
    },
    ru: {
      title: 'WPlace Авто-Изображение',
      scanColors: 'Сканировать цвета',
      uploadImage: 'Загрузить изображение',
      resizeImage: 'Изменить размер изображения',
      selectPosition: 'Выбрать позицию',
      startPainting: 'Начать рисование',
      stopPainting: 'Остановить рисование',
      checkingColors: '🔍 Проверка доступных цветов...',
      noColorsFound: '❌ Откройте палитру цветов на сайте и попробуйте снова!',
      colorsFound: '✅ Найдено доступных цветов: {count}. Готово к загрузке.',
      loadingImage: '🖼️ Загрузка изображения...',
      imageLoaded: '✅ Изображение загружено, валидных пикселей: {count}',
      imageError: '❌ Ошибка при загрузке изображения',
      selectPositionAlert:
        'Нарисуйте первый пиксель в месте, откуда начнётся рисунок!',
      waitingPosition: '👆 Ожидание, пока вы нарисуете опорный пиксель...',
      positionSet: '✅ Позиция успешно установлена!',
      positionTimeout: '❌ Время ожидания выбора позиции истекло',
      startPaintingMsg: '🎨 Начинаем рисование...',
      paintingProgress: '🧱 Прогресс: {painted}/{total} пикселей...',
      noCharges: '⌛ Нет зарядов. Ожидание {time}...',
      paintingStopped: '⏹️ Рисование остановлено пользователем',
      paintingComplete: '✅ Рисование завершено! Нарисовано пикселей: {count}.',
      paintingError: '❌ Ошибка во время рисования',
      missingRequirements:
        '❌ Сначала загрузите изображение и выберите позицию',
      progress: 'Прогресс',
      pixels: 'Пиксели',
      charges: 'Заряды',
      estimatedTime: 'Примерное время',
      initMessage: "Нажмите 'Загрузить изображение', чтобы начать",
      waitingInit: 'Ожидание инициализации...',
      initializingToken: '🔧 Инициализация генератора Turnstile токенов...',
      tokenReady: '✅ Генератор токенов готов - можете начинать рисование!',
      tokenRetryLater:
        '⚠️ Генератор токенов повторит попытку при необходимости',
      resizeSuccess: '✅ Изображение изменено до {width}x{height}',
      paintingPaused: '⏸️ Рисование приостановлено на позиции X: {x}, Y: {y}',
      captchaNeeded:
        '❗ Генерация токена не удалась. Пожалуйста, попробуйте через некоторое время.',
      saveData: 'Сохранить прогресс',
      loadData: 'Загрузить прогресс',
      saveToFile: 'Сохранить в файл',
      loadFromFile: 'Загрузить из файла',
      dataManager: 'Менеджер данных',
      autoSaved: '✅ Прогресс сохранён автоматически',
      dataLoaded: '✅ Прогресс успешно загружен',
      fileSaved: '✅ Прогресс успешно сохранён в файл',
      fileLoaded: '✅ Прогресс успешно загружен из файла',
      noSavedData: '❌ Сохранённый прогресс не найден',
      savedDataFound:
        '✅ Найден сохранённый прогресс! Загрузить, чтобы продолжить?',
      savedDate: 'Сохранено: {date}',
      clickLoadToContinue: "Нажмите 'Загрузить прогресс', чтобы продолжить.",
      fileError: '❌ Ошибка при обработке файла',
      invalidFileFormat: '❌ Неверный формат файла',
      paintingSpeed: 'Скорость рисования',
      pixelsPerSecond: 'пикселей/сек',
      speedSetting: 'Скорость: {speed} пикс./сек',
      settings: 'Настройки',
      botSettings: 'Настройки бота',
      close: 'Закрыть',
      language: 'Язык',
      themeSettings: 'Настройки темы',
      themeSettingsDesc: 'Выберите предпочтительную цветовую тему интерфейса.',
      languageSelectDesc:
        'Выберите предпочтительный язык. Изменения вступят в силу немедленно.',
      autoCaptcha: 'Авто-решение CAPTCHA (Turnstile)',
      autoCaptchaDesc:
        'Автоматически генерирует Turnstile токены используя встроенный генератор. Возвращается к автоматизации браузера при необходимости.',
      applySettings: 'Применить настройки',
      settingsSaved: '✅ Настройки успешно сохранены!',
      cooldownSettings: 'Настройки перезарядки',
      waitCharges: 'Ждать до накопления зарядов',
      captchaSolving: '🔑 Генерирую Turnstile токен...',
      captchaFailed:
        '❌ Не удалось сгенерировать Turnstile токен. Пробую резервный метод...',
      automation: 'Автоматизация',
      noChargesThreshold:
        '⌛ Ожидание зарядов до {threshold}. Сейчас {current}. Следующий через {time}...',
      // Multi-account strings
      multiAccount: 'Мульти-аккаунт',
      accountManager: 'Менеджер аккаунтов',
      addAccount: 'Добавить аккаунт',
      accountName: 'Имя аккаунта',
      accountCookies: 'Cookies аккаунта',
      currentAccount: 'Текущий аккаунт',
      switchAccount: 'Аккаунт переключен',
      accountAdded: '✅ Аккаунт успешно добавлен!',
      accountRemoved: '✅ Аккаунт успешно удален!',
      accountSwitched: '✅ Переключено на аккаунт: {name}',
      noAccountsAvailable: '❌ Нет доступных аккаунтов для переключения',
      invalidAccountData: '❌ Укажите имя аккаунта и cookies',
      cookiesPlaceholder:
        'Вставьте ваши cookies (например, session=abc123; token=xyz789)',
      accountNamePlaceholder:
        'Введите имя аккаунта (например, Аккаунт 1, Основной)',
      removeAccount: 'Удалить',
      accountCharges: 'Заряды: {charges}',
      accountLastUsed: 'Последнее использование: {time}',
      switchingAccount:
        '🔄 Переключение на следующий аккаунт из-за низкого заряда...',
    },
    pt: {
      title: 'WPlace Auto-Image',
      scanColors: 'Escanear Cores',
      uploadImage: 'Upload da Imagem',
      resizeImage: 'Redimensionar Imagem',
      selectPosition: 'Selecionar Posição',
      startPainting: 'Iniciar Pintura',
      stopPainting: 'Parar Pintura',
      checkingColors: '🔍 Verificando cores disponíveis...',
      noColorsFound: '❌ Abra a paleta de cores no site e tente novamente!',
      colorsFound: '✅ {count} cores encontradas. Pronto para upload.',
      loadingImage: '🖼️ Carregando imagem...',
      imageLoaded: '✅ Imagem carregada com {count} pixels válidos',
      imageError: '❌ Erro ao carregar imagem',
      selectPositionAlert:
        'Pinte o primeiro pixel на localização onde deseja que a arte comece!',
      waitingPosition: '👆 Aguardando você pintar o pixel de referência...',
      positionSet: '✅ Posição definida com sucesso!',
      positionTimeout: '❌ Tempo esgotado para selecionar posição',
      startPaintingMsg: '🎨 Iniciando pintura...',
      paintingProgress: '🧱 Progresso: {painted}/{total} pixels...',
      noCharges: '⌛ Sem cargas. Aguardando {time}...',
      paintingStopped: '⏹️ Pintura interromпида pelo usuário',
      paintingComplete: '✅ Pintura concluída! {count} pixels pintados.',
      paintingError: '❌ Erro durante a pintura',
      missingRequirements:
        '❌ Carregue uma imagem e selecione uma posição primeiro',
      progress: 'Progresso',
      pixels: 'Pixels',
      charges: 'Cargas',
      estimatedTime: 'Tempo estimado',
      initMessage: "Clique em 'Upload da Imagem' para começar",
      waitingInit: 'Aguardando inicialização...',
      initializingToken: '🔧 Inicializando gerador de tokens Turnstile...',
      tokenReady: '✅ Gerador de tokens pronto - você pode começar a pintar!',
      tokenRetryLater:
        '⚠️ Gerador de tokens tentará novamente quando necessário',
      resizeSuccess: '✅ Imagem redimensionada для {width}x{height}',
      paintingPaused: '⏸️ Pintura pausada na posição X: {x}, Y: {y}',
      captchaNeeded:
        '❗ Falha na geração de token. Tente novamente em alguns instantes.',
      saveData: 'Salvar Progresso',
      loadData: 'Carregar Progresso',
      saveToFile: 'Salvar em Arquivo',
      loadFromFile: 'Carregar de Arquivo',
      dataManager: 'Dados',
      autoSaved: '✅ Progresso salvo automaticamente',
      dataLoaded: '✅ Progresso carregado com sucesso',
      fileSaved: '✅ Salvo em arquivo com sucesso',
      fileLoaded: '✅ Carregado de arquivo com sucesso',
      noSavedData: '❌ Nenhum progresso salvo encontrado',
      savedDataFound: '✅ Progresso salvo encontrado! Carregar para continuar?',
      savedDate: 'Salvo em: {date}',
      clickLoadToContinue: "Clique em 'Carregar Progresso' para continuar.",
      fileError: '❌ Erro ao processar arquivo',
      invalidFileFormat: '❌ Formato de arquivo inválido',
      paintingSpeed: 'Velocidade de Pintura',
      pixelsPerSecond: 'pixels/segundo',
      speedSetting: 'Velocidade: {speed} pixels/seg',
      settings: 'Configurações',
      botSettings: 'Configurações do Bot',
      close: 'Fechar',
      language: 'Idioma',
      themeSettings: 'Configurações de Tema',
      themeSettingsDesc:
        'Escolha seu tema de cores preferido para a interface.',
      languageSelectDesc:
        'Selecione seu idioma preferido. As alterações terão efeito imediatamente.',
      autoCaptcha: 'Resolvedor de CAPTCHA Automático',
      autoCaptchaDesc:
        'Tenta resolver o CAPTCHA automaticamente simulando a colocação manual de um pixel quando o token expira.',
      applySettings: 'Aplicar Configurações',
      settingsSaved: '✅ Configurações salvas com sucesso!',
      cooldownSettings: 'Configurações de Cooldown',
      waitCharges: 'Aguardar até as cargas atingirem',
      captchaSolving: '🤖 Tentando resolver o CAPTCHA...',
      captchaFailed:
        '❌ Falha ao resolver CAPTCHA. Pinte um pixel manualmente.',
      automation: 'Automação',
      noChargesThreshold:
        '⌛ Aguardando cargas atingirem {threshold}. Atual: {current}. Próxima em {time}...',
      // Multi-account strings
      multiAccount: 'Multi-Conta',
      accountManager: 'Gerenciador de Contas',
      addAccount: 'Adicionar Conta',
      accountName: 'Nome da Conta',
      accountCookies: 'Cookies da Conta',
      currentAccount: 'Conta Atual',
      switchAccount: 'Conta Alterada',
      accountAdded: '✅ Conta adicionada com sucesso!',
      accountRemoved: '✅ Conta removida com sucesso!',
      accountSwitched: '✅ Alterado para conta: {name}',
      noAccountsAvailable: '❌ Nenhuma conta disponível para alternar',
      invalidAccountData: '❌ Forneça nome da conta e cookies',
      cookiesPlaceholder:
        'Cole seus cookies aqui (ex: session=abc123; token=xyz789)',
      accountNamePlaceholder:
        'Digite o nome da conta (ex: Conta 1, Conta Principal)',
      removeAccount: 'Remover',
      accountCharges: 'Cargas: {charges}',
      accountLastUsed: 'Último uso: {time}',
      switchingAccount:
        '🔄 Alternando para próxima conta devido a poucas cargas...',
    },
    vi: {
      title: 'WPlace Auto-Image',
      scanColors: 'Quét màu',
      uploadImage: 'Tải lên hình ảnh',
      resizeImage: 'Thay đổi kích thước',
      selectPosition: 'Chọn vị trí',
      startPainting: 'Bắt đầu vẽ',
      stopPainting: 'Dừng vẽ',
      checkingColors: '🔍 Đang kiểm tra màu sắc có sẵn...',
      noColorsFound: '❌ Hãy mở bảng màu trên trang web và thử lại!',
      colorsFound: '✅ Tìm thấy {count} màu. Sẵn sàng để tải lên.',
      loadingImage: '🖼️ Đang tải hình ảnh...',
      imageLoaded: '✅ Đã tải hình ảnh với {count} pixel hợp lệ',
      imageError: '❌ Lỗi khi tải hình ảnh',
      selectPositionAlert:
        'Vẽ pixel đầu tiên tại vị trí bạn muốn tác phẩm nghệ thuật bắt đầu!',
      waitingPosition: '👆 Đang chờ bạn vẽ pixel tham chiếu...',
      positionSet: '✅ Đã đặt vị trí thành công!',
      positionTimeout: '❌ Hết thời gian chọn vị trí',
      startPaintingMsg: '🎨 Bắt đầu vẽ...',
      paintingProgress: '🧱 Tiến trình: {painted}/{total} pixel...',
      noCharges: '⌛ Không có điện tích. Đang chờ {time}...',
      paintingStopped: '⏹️ Người dùng đã dừng vẽ',
      paintingComplete: '✅ Hoàn thành vẽ! Đã vẽ {count} pixel.',
      paintingError: '❌ Lỗi trong quá trình vẽ',
      missingRequirements: '❌ Hãy tải lên hình ảnh và chọn vị trí trước',
      progress: 'Tiến trình',
      pixels: 'Pixel',
      charges: 'Điện tích',
      estimatedTime: 'Thời gian ước tính',
      initMessage: "Nhấp 'Tải lên hình ảnh' để bắt đầu",
      waitingInit: 'Đang chờ khởi tạo...',
      initializingToken: '🔧 Đang khởi tạo bộ tạo token Turnstile...',
      tokenReady: '✅ Bộ tạo token đã sẵn sàng - bạn có thể bắt đầu vẽ!',
      tokenRetryLater: '⚠️ Bộ tạo token sẽ thử lại khi cần thiết',
      resizeSuccess:
        '✅ Đã thay đổi kích thước hình ảnh thành {width}x{height}',
      paintingPaused: '⏸️ Tạm dừng vẽ tại vị trí X: {x}, Y: {y}',
      captchaNeeded: '❗ Tạo token thất bại. Vui lòng thử lại sau.',
      saveData: 'Lưu tiến trình',
      loadData: 'Tải tiến trình',
      saveToFile: 'Lưu vào tệp',
      loadFromFile: 'Tải từ tệp',
      dataManager: 'Dữ liệu',
      autoSaved: '✅ Đã tự động lưu tiến trình',
      dataLoaded: '✅ Đã tải tiến trình thành công',
      fileSaved: '✅ Đã lưu vào tệp thành công',
      fileLoaded: '✅ Đã tải từ tệp thành công',
      noSavedData: '❌ Không tìm thấy tiến trình đã lưu',
      savedDataFound: '✅ Tìm thấy tiến trình đã lưu! Tải để tiếp tục?',
      savedDate: 'Đã lưu vào: {date}',
      clickLoadToContinue: "Nhấp 'Tải tiến trình' để tiếp tục.",
      fileError: '❌ Lỗi khi xử lý tệp',
      invalidFileFormat: '❌ Định dạng tệp không hợp lệ',
      paintingSpeed: 'Tốc độ vẽ',
      pixelsPerSecond: 'pixel/giây',
      speedSetting: 'Tốc độ: {speed} pixel/giây',
      settings: 'Cài đặt',
      botSettings: 'Cài đặt Bot',
      close: 'Đóng',
      language: 'Ngôn ngữ',
      themeSettings: 'Cài đặt Giao diện',
      themeSettingsDesc: 'Chọn chủ đề màu sắc yêu thích cho giao diện.',
      languageSelectDesc:
        'Chọn ngôn ngữ ưa thích. Thay đổi sẽ có hiệu lực ngay lập tức.',
      autoCaptcha: 'Tự động giải CAPTCHA',
      autoCaptchaDesc:
        'Tự động cố gắng giải CAPTCHA bằng cách mô phỏng việc đặt pixel thủ công khi token hết hạn.',
      applySettings: 'Áp dụng cài đặt',
      settingsSaved: '✅ Đã lưu cài đặt thành công!',
      cooldownSettings: 'Cài đặt thời gian chờ',
      waitCharges: 'Chờ cho đến khi số lần sạc đạt',
      captchaSolving: '🤖 Đang cố gắng giải CAPTCHA...',
      captchaFailed:
        '❌ Giải CAPTCHA tự động thất bại. Vui lòng vẽ một pixel thủ công.',
      automation: 'Tự động hóa',
      noChargesThreshold:
        '⌛ Đang chờ số lần sạc đạt {threshold}. Hiện tại {current}. Lần tiếp theo trong {time}...',
      // Multi-account strings
      multiAccount: 'Đa tài khoản',
      accountManager: 'Quản lý tài khoản',
      addAccount: 'Thêm tài khoản',
      accountName: 'Tên tài khoản',
      accountCookies: 'Cookies tài khoản',
      currentAccount: 'Tài khoản hiện tại',
      switchAccount: 'Đã chuyển tài khoản',
      accountAdded: '✅ Thêm tài khoản thành công!',
      accountRemoved: '✅ Xóa tài khoản thành công!',
      accountSwitched: '✅ Đã chuyển sang tài khoản: {name}',
      noAccountsAvailable: '❌ Không có tài khoản nào để chuyển',
      invalidAccountData: '❌ Vui lòng cung cấp tên tài khoản và cookies',
      cookiesPlaceholder:
        'Dán cookies của bạn vào đây (vd: session=abc123; token=xyz789)',
      accountNamePlaceholder:
        'Nhập tên tài khoản (vd: Tài khoản 1, Tài khoản chính)',
      removeAccount: 'Xóa',
      accountCharges: 'Điện tích: {charges}',
      accountLastUsed: 'Sử dụng lần cuối: {time}',
      switchingAccount:
        '🔄 Đang chuyển sang tài khoản tiếp theo do điện tích thấp...',
    },
    fr: {
      title: 'WPlace Auto-Image',
      scanColors: 'Scanner les couleurs',
      uploadImage: "Télécharger l'image",
      resizeImage: "Redimensionner l'image",
      selectPosition: 'Sélectionner la position',
      startPainting: 'Commencer à peindre',
      stopPainting: 'Arrêter de peindre',
      checkingColors: '🔍 Vérification des couleurs disponibles...',
      noColorsFound:
        '❌ Ouvrez la palette de couleurs sur le site et réessayez!',
      colorsFound: '✅ {count} couleurs trouvées. Prêt à télécharger.',
      loadingImage: "🖼️ Chargement de l'image...",
      imageLoaded: '✅ Image chargée avec {count} pixels valides',
      imageError: "❌ Erreur lors du chargement de l'image",
      selectPositionAlert:
        "Peignez le premier pixel à l'endroit où vous voulez que l'art commence!",
      waitingPosition:
        '👆 En attente que vous peigniez le pixel de référence...',
      positionSet: '✅ Position définie avec succès!',
      positionTimeout: "❌ Délai d'attente pour la sélection de position",
      startPaintingMsg: '🎨 Début de la peinture...',
      paintingProgress: '🧱 Progrès: {painted}/{total} pixels...',
      noCharges: '⌛ Aucune charge. En attente {time}...',
      paintingStopped: "⏹️ Peinture arrêtée par l'utilisateur",
      paintingComplete: '✅ Peinture terminée! {count} pixels peints.',
      paintingError: '❌ Erreur pendant la peinture',
      missingRequirements:
        "❌ Veuillez charger une image et sélectionner une position d'abord",
      progress: 'Progrès',
      pixels: 'Pixels',
      charges: 'Charges',
      estimatedTime: 'Temps estimé',
      initMessage: "Cliquez sur 'Télécharger l'image' pour commencer",
      waitingInit: "En attente d'initialisation...",
      initializingToken:
        '🔧 Initialisation du générateur de tokens Turnstile...',
      tokenReady:
        '✅ Générateur de tokens prêt - vous pouvez commencer à peindre!',
      tokenRetryLater: '⚠️ Le générateur de tokens réessaiera si nécessaire',
      resizeSuccess: '✅ Image redimensionnée en {width}x{height}',
      paintingPaused: '⏸️ Peinture en pause à la position X: {x}, Y: {y}',
      captchaNeeded:
        '❗ Échec de la génération de token. Veuillez réessayer dans un moment.',
      saveData: 'Sauvegarder le progrès',
      loadData: 'Charger le progrès',
      saveToFile: 'Sauvegarder dans un fichier',
      loadFromFile: 'Charger depuis un fichier',
      dataManager: 'Données',
      autoSaved: '✅ Progrès sauvegardé automatiquement',
      dataLoaded: '✅ Progrès chargé avec succès',
      fileSaved: '✅ Sauvegardé dans un fichier avec succès',
      fileLoaded: '✅ Chargé depuis un fichier avec succès',
      noSavedData: '❌ Aucun progrès sauvegardé trouvé',
      savedDataFound: '✅ Progrès sauvegardé trouvé! Charger pour continuer?',
      savedDate: 'Sauvegardé le: {date}',
      clickLoadToContinue: "Cliquez sur 'Charger le progrès' pour continuer.",
      fileError: '❌ Erreur lors du traitement du fichier',
      invalidFileFormat: '❌ Format de fichier invalide',
      paintingSpeed: 'Vitesse de peinture',
      pixelsPerSecond: 'pixels/seconde',
      speedSetting: 'Vitesse: {speed} pixels/sec',
      settings: 'Paramètres',
      botSettings: 'Paramètres du Bot',
      close: 'Fermer',
      language: 'Langue',
      themeSettings: 'Paramètres de Thème',
      themeSettingsDesc:
        "Choisissez votre thème de couleurs préféré pour l'interface.",
      languageSelectDesc:
        'Sélectionnez votre langue préférée. Les changements prendront effet immédiatement.',
      autoCaptcha: 'Résolveur de CAPTCHA automatique',
      autoCaptchaDesc:
        'Tente automatiquement de résoudre le CAPTCHA en simulant un placement manuel de pixel lorsque le jeton expire.',
      applySettings: 'Appliquer les paramètres',
      settingsSaved: '✅ Paramètres enregistrés avec succès !',
      cooldownSettings: 'Paramètres de recharge',
      waitCharges: 'Attendre que les charges atteignent',
      captchaSolving: '🤖 Tentative de résolution du CAPTCHA...',
      captchaFailed:
        "❌ Échec de l'Auto-CAPTCHA. Peignez un pixel manuellement.",
      automation: 'Automatisation',
      noChargesThreshold:
        '⌛ En attente que les charges atteignent {threshold}. Actuel: {current}. Prochaine dans {time}...',
    },
    id: {
      title: 'WPlace Auto-Image',
      scanColors: 'Pindai Warna',
      uploadImage: 'Unggah Gambar',
      resizeImage: 'Ubah Ukuran Gambar',
      selectPosition: 'Pilih Posisi',
      startPainting: 'Mulai Melukis',
      stopPainting: 'Berhenti Melukis',
      checkingColors: '🔍 Memeriksa warna yang tersedia...',
      noColorsFound: '❌ Buka palet warna di situs dan coba lagi!',
      colorsFound: '✅ {count} warna ditemukan. Siap untuk diunggah.',
      loadingImage: '🖼️ Memuat gambar...',
      imageLoaded: '✅ Gambar dimuat dengan {count} piksel valid',
      imageError: '❌ Kesalahan saat memuat gambar',
      selectPositionAlert:
        'Lukis piksel pertama di lokasi tempat karya seni akan dimulai!',
      waitingPosition: '👆 Menunggu Anda melukis piksel referensi...',
      positionSet: '✅ Posisi berhasil diatur!',
      positionTimeout: '❌ Waktu habis untuk memilih posisi',
      startPaintingMsg: '🎨 Mulai melukis...',
      paintingProgress: '🧱 Progres: {painted}/{total} piksel...',
      noCharges: '⌛ Tidak ada muatan. Menunggu {time}...',
      paintingStopped: '⏹️ Melukis dihentikan oleh pengguna',
      paintingComplete: '✅ Melukis selesai! {count} piksel telah dilukis.',
      paintingError: '❌ Kesalahan selama melukis',
      missingRequirements: '❌ Unggah gambar dan pilih posisi terlebih dahulu',
      progress: 'Progres',
      pixels: 'Piksel',
      charges: 'Muatan',
      estimatedTime: 'Perkiraan waktu',
      initMessage: "Klik 'Unggah Gambar' untuk memulai",
      waitingInit: 'Menunggu inisialisasi...',
      initializingToken: '🔧 Menginisialisasi generator token Turnstile...',
      tokenReady: '✅ Generator token siap - Anda bisa mulai melukis!',
      tokenRetryLater: '⚠️ Generator token akan mencoba lagi saat diperlukan',
      resizeSuccess:
        '✅ Gambar berhasil diubah ukurannya menjadi {width}x{height}',
      paintingPaused: '⏸️ Melukis dijeda di posisi X: {x}, Y: {y}',
      captchaNeeded:
        '❗ Pembuatan token gagal. Silakan coba lagi sebentar lagi.',
      saveData: 'Simpan Progres',
      loadData: 'Muat Progres',
      saveToFile: 'Simpan ke File',
      loadFromFile: 'Muat dari File',
      dataManager: 'Data',
      autoSaved: '✅ Progres disimpan secara otomatis',
      dataLoaded: '✅ Progres berhasil dimuat',
      fileSaved: '✅ Berhasil disimpan ke file',
      fileLoaded: '✅ Berhasil dimuat dari file',
      noSavedData: '❌ Tidak ditemukan progres yang disimpan',
      savedDataFound:
        '✅ Progres yang disimpan ditemukan! Muat untuk melanjutkan?',
      savedDate: 'Disimpan pada: {date}',
      clickLoadToContinue: "Klik 'Muat Progres' untuk melanjutkan.",
      fileError: '❌ Kesalahan saat memproses file',
      invalidFileFormat: '❌ Format file tidak valid',
      paintingSpeed: 'Kecepatan Melukis',
      pixelsPerSecond: 'piksel/detik',
      speedSetting: 'Kecepatan: {speed} piksel/detik',
      settings: 'Pengaturan',
      botSettings: 'Pengaturan Bot',
      close: 'Tutup',
      language: 'Bahasa',
      themeSettings: 'Pengaturan Tema',
      themeSettingsDesc: 'Pilih tema warna favorit Anda untuk antarmuka.',
      languageSelectDesc:
        'Pilih bahasa yang Anda inginkan. Perubahan akan berlaku segera.',
      autoCaptcha: 'Penyelesai CAPTCHA Otomatis',
      autoCaptchaDesc:
        'Mencoba menyelesaikan CAPTCHA secara otomatis dengan mensimulasikan penempatan piksel manual saat token kedaluwarsa.',
      applySettings: 'Terapkan Pengaturan',
      settingsSaved: '✅ Pengaturan berhasil disimpan!',
      cooldownSettings: 'Pengaturan Cooldown',
      waitCharges: 'Tunggu hingga muatan mencapai',
      captchaSolving: '🤖 Mencoba menyelesaikan CAPTCHA...',
      captchaFailed:
        '❌ Gagal menyelesaikan CAPTCHA. Lukis satu piksel secara manual.',
      automation: 'Automasi',
      noChargesThreshold:
        '⌛ Menunggu muatan mencapai {threshold}. Saat ini: {current}. Berikutnya dalam {time}...',
    },
    tr: {
      title: 'WPlace Otomatik-Resim',
      toggleOverlay: 'Katmanı Aç/Kapat',
      scanColors: 'Renkleri Tara',
      uploadImage: 'Resim Yükle',
      resizeImage: 'Resmi Yeniden Boyutlandır',
      selectPosition: 'Konum Seç',
      startPainting: 'Boyamayı Başlat',
      stopPainting: 'Boyamayı Durdur',
      checkingColors: '🔍 Uygun renkler kontrol ediliyor...',
      noColorsFound: '❌ Sitede renk paletini açın ve tekrar deneyin!',
      colorsFound: '✅ {count} uygun renk bulundu. Yüklemeye hazır.',
      loadingImage: '🖼️ Resim yükleniyor...',
      imageLoaded: '✅ Resim {count} geçerli piksel ile yüklendi',
      imageError: '❌ Resim yüklenirken hata oluştu',
      selectPositionAlert: 'Sanatı başlatmak istediğiniz ilk pikseli boyayın!',
      waitingPosition: '👆 Referans pikseli boyamanız bekleniyor...',
      positionSet: '✅ Konum başarıyla ayarlandı!',
      positionTimeout: '❌ Konum seçme süresi doldu',
      startPaintingMsg: '🎨 Boyama başlatılıyor...',
      paintingProgress: '🧱 İlerleme: {painted}/{total} piksel...',
      noCharges: '⌛ Yeterli hak yok. Bekleniyor {time}...',
      paintingStopped: '⏹️ Boyama kullanıcı tarafından durduruldu',
      paintingComplete: '✅ Boyama tamamlandı! {count} piksel boyandı.',
      paintingError: '❌ Boyama sırasında hata oluştu',
      missingRequirements: '❌ Önce resim yükleyip konum seçmelisiniz',
      progress: 'İlerleme',
      pixels: 'Pikseller',
      charges: 'Haklar',
      estimatedTime: 'Tahmini süre',
      initMessage: "Başlamak için 'Resim Yükle'ye tıklayın",
      waitingInit: 'Başlatma bekleniyor...',
      resizeSuccess:
        '✅ Resim {width}x{height} boyutuna yeniden boyutlandırıldı',
      paintingPaused: '⏸️ Boyama duraklatıldı, Konum X: {x}, Y: {y}',
      captchaNeeded:
        '❗ CAPTCHA gerekli. Devam etmek için bir pikseli manuel olarak boyayın.',
      saveData: 'İlerlemeyi Kaydet',
      loadData: 'İlerlemeyi Yükle',
      saveToFile: 'Dosyaya Kaydet',
      loadFromFile: 'Dosyadan Yükle',
      dataManager: 'Veri Yöneticisi',
      autoSaved: '✅ İlerleme otomatik olarak kaydedildi',
      dataLoaded: '✅ İlerleme başarıyla yüklendi',
      fileSaved: '✅ İlerleme dosyaya başarıyla kaydedildi',
      fileLoaded: '✅ İlerleme dosyadan başarıyla yüklendi',
      noSavedData: '❌ Kayıtlı ilerleme bulunamadı',
      savedDataFound: '✅ Kayıtlı ilerleme bulundu! Devam etmek için yükleyin.',
      savedDate: 'Kaydedilme tarihi: {date}',
      clickLoadToContinue: "Devam etmek için 'İlerlemeyi Yükle'ye tıklayın.",
      fileError: '❌ Dosya işlenirken hata oluştu',
      invalidFileFormat: '❌ Geçersiz dosya formatı',
      paintingSpeed: 'Boyama Hızı',
      pixelsPerSecond: 'piksel/saniye',
      speedSetting: 'Hız: {speed} piksel/sn',
      settings: 'Ayarlar',
      botSettings: 'Bot Ayarları',
      close: 'Kapat',
      language: 'Dil',
      themeSettings: 'Tema Ayarları',
      themeSettingsDesc: 'Arayüz için tercih ettiğiniz renk temasını seçin.',
      languageSelectDesc:
        'Tercih ettiğiniz dili seçin. Değişiklikler hemen uygulanacaktır.',
      autoCaptcha: 'Oto-CAPTCHA Çözücü',
      autoCaptchaDesc:
        'CAPTCHA süresi dolduğunda manuel piksel yerleştirmeyi taklit ederek otomatik çözmeyi dener.',
      applySettings: 'Ayarları Uygula',
      settingsSaved: '✅ Ayarlar başarıyla kaydedildi!',
      cooldownSettings: 'Bekleme Süresi Ayarları',
      waitCharges: 'Haklar şu seviyeye ulaşana kadar bekle',
      captchaSolving: '🤖 CAPTCHA çözülmeye çalışılıyor...',
      captchaFailed:
        '❌ Oto-CAPTCHA başarısız oldu. Bir pikseli manuel boyayın.',
      automation: 'Otomasyon',
      noChargesThreshold:
        '⌛ Hakların {threshold} seviyesine ulaşması bekleniyor. Şu anda {current}. Sonraki {time} içinde...',
    },
    zh: {
      title: 'WPlace 自动图像',
      toggleOverlay: '切换覆盖层',
      scanColors: '扫描颜色',
      uploadImage: '上传图像',
      resizeImage: '调整大小',
      selectPosition: '选择位置',
      startPainting: '开始绘制',
      stopPainting: '停止绘制',
      checkingColors: '🔍 正在检查可用颜色...',
      noColorsFound: '❌ 请在网站上打开调色板后再试！',
      colorsFound: '✅ 找到 {count} 个可用颜色，准备上传。',
      loadingImage: '🖼️ 正在加载图像...',
      imageLoaded: '✅ 图像已加载，包含 {count} 个有效像素',
      imageError: '❌ 加载图像时出错',
      selectPositionAlert: '请在你想让作品开始的位置绘制第一个像素！',
      waitingPosition: '👆 正在等待你绘制参考像素...',
      positionSet: '✅ 位置设置成功！',
      positionTimeout: '❌ 选择位置超时',
      startPaintingMsg: '🎨 开始绘制...',
      paintingProgress: '🧱 进度: {painted}/{total} 像素...',
      noCharges: '⌛ 无可用次数，等待 {time}...',
      paintingStopped: '⏹️ 已被用户停止',
      paintingComplete: '✅ 绘制完成！共绘制 {count} 个像素。',
      paintingError: '❌ 绘制过程中出错',
      missingRequirements: '❌ 请先加载图像并选择位置',
      progress: '进度',
      pixels: '像素',
      charges: '次数',
      estimatedTime: '预计时间',
      initMessage: '点击“上传图像”开始',
      waitingInit: '正在等待初始化...',
      initializingToken: '🔧 正在初始化 Turnstile 令牌生成器...',
      tokenReady: '✅ 令牌生成器已就绪 - 可以开始绘制！',
      tokenRetryLater: '⚠️ 令牌生成器稍后将重试',
      resizeSuccess: '✅ 图像已调整为 {width}x{height}',
      paintingPaused: '⏸️ 在位置 X: {x}, Y: {y} 暂停',
      captchaNeeded: '❗ 令牌生成失败，请稍后再试。',
      saveData: '保存进度',
      loadData: '加载进度',
      saveToFile: '保存到文件',
      loadFromFile: '从文件加载',
      dataManager: '数据管理',
      autoSaved: '✅ 进度已自动保存',
      dataLoaded: '✅ 进度加载成功',
      fileSaved: '✅ 已成功保存到文件',
      fileLoaded: '✅ 已成功从文件加载',
      noSavedData: '❌ 未找到已保存进度',
      savedDataFound: '✅ 找到已保存进度！是否加载继续？',
      savedDate: '保存时间: {date}',
      clickLoadToContinue: '点击“加载进度”继续。',
      fileError: '❌ 处理文件时出错',
      invalidFileFormat: '❌ 文件格式无效',
      paintingSpeed: '绘制速度',
      pixelsPerSecond: '像素/秒',
      speedSetting: '速度: {speed} 像素/秒',
      settings: '设置',
      botSettings: '机器人设置',
      close: '关闭',
      language: '语言',
      themeSettings: '主题设置',
      themeSettingsDesc: '为界面选择你喜欢的配色主题。',
      languageSelectDesc: '选择你偏好的语言，变更立即生效。',
      autoCaptcha: '自动 CAPTCHA 解决',
      autoCaptchaDesc:
        '使用集成的生成器自动生成 Turnstile 令牌，必要时回退到浏览器自动化。',
      applySettings: '应用设置',
      settingsSaved: '✅ 设置保存成功！',
      speedOn: '开启',
      speedOff: '关闭',
      cooldownSettings: '冷却设置',
      waitCharges: '等待次数达到',
      captchaSolving: '🔑 正在生成 Turnstile 令牌...',
      captchaFailed: '❌ 令牌生成失败。尝试回退方法...',
      automation: '自动化',
      noChargesThreshold:
        '⌛ 等待次数达到 {threshold}。当前 {current}。下次在 {time}...',
    },
    'zh-tw': {
      title: 'WPlace 自動圖像',
      toggleOverlay: '切換覆蓋層',
      scanColors: '掃描顏色',
      uploadImage: '上傳圖像',
      resizeImage: '調整大小',
      selectPosition: '選擇位置',
      startPainting: '開始繪製',
      stopPainting: '停止繪製',
      checkingColors: '🔍 正在檢查可用顏色...',
      noColorsFound: '❌ 請在網站上打開調色板後再試！',
      colorsFound: '✅ 找到 {count} 個可用顏色，準備上傳。',
      loadingImage: '🖼️ 正在載入圖像...',
      imageLoaded: '✅ 圖像已載入，包含 {count} 個有效像素',
      imageError: '❌ 載入圖像時出錯',
      selectPositionAlert: '請在你想讓作品開始的位置繪製第一個像素！',
      waitingPosition: '👆 正在等待你繪製參考像素...',
      positionSet: '✅ 位置設定成功！',
      positionTimeout: '❌ 選擇位置逾時',
      startPaintingMsg: '🎨 開始繪製...',
      paintingProgress: '🧱 進度: {painted}/{total} 像素...',
      noCharges: '⌛ 無可用次數，等待 {time}...',
      paintingStopped: '⏹️ 已被使用者停止',
      paintingComplete: '✅ 繪製完成！共繪製 {count} 個像素。',
      paintingError: '❌ 繪製過程中出錯',
      missingRequirements: '❌ 請先載入圖像並選擇位置',
      progress: '進度',
      pixels: '像素',
      charges: '次數',
      estimatedTime: '預計時間',
      initMessage: '點擊「上傳圖像」開始',
      waitingInit: '正在等待初始化...',
      initializingToken: '🔧 正在初始化 Turnstile 令牌產生器...',
      tokenReady: '✅ 令牌產生器已就緒 - 可以開始繪製！',
      tokenRetryLater: '⚠️ 令牌產生器稍後將重試',
      resizeSuccess: '✅ 圖像已調整為 {width}x{height}',
      paintingPaused: '⏸️ 在位置 X: {x}, Y: {y} 暫停',
      captchaNeeded: '❗ 令牌產生失敗，請稍後再試。',
      saveData: '儲存進度',
      loadData: '載入進度',
      saveToFile: '儲存至檔案',
      loadFromFile: '從檔案載入',
      dataManager: '資料管理',
      autoSaved: '✅ 進度已自動儲存',
      dataLoaded: '✅ 進度載入成功',
      fileSaved: '✅ 已成功儲存至檔案',
      fileLoaded: '✅ 已成功從檔案載入',
      noSavedData: '❌ 未找到已儲存進度',
      savedDataFound: '✅ 找到已儲存進度！是否載入以繼續？',
      savedDate: '儲存時間: {date}',
      clickLoadToContinue: '點擊「載入進度」繼續。',
      fileError: '❌ 處理檔案時出錯',
      invalidFileFormat: '❌ 檔案格式無效',
      paintingSpeed: '繪製速度',
      pixelsPerSecond: '像素/秒',
      speedSetting: '速度: {speed} 像素/秒',
      settings: '設定',
      botSettings: '機器人設定',
      close: '關閉',
      language: '語言',
      themeSettings: '主題設定',
      themeSettingsDesc: '為介面選擇你喜歡的配色主題。',
      languageSelectDesc: '選擇你偏好的語言，變更立即生效。',
      autoCaptcha: '自動 CAPTCHA 解決',
      autoCaptchaDesc:
        '使用整合的產生器自動產生 Turnstile 令牌，必要時回退到瀏覽器自動化。',
      applySettings: '套用設定',
      settingsSaved: '✅ 設定儲存成功！',
      speedOn: '開啟',
      speedOff: '關閉',
      cooldownSettings: '冷卻設定',
      waitCharges: '等待次數達到',
      captchaSolving: '🔑 正在產生 Turnstile 令牌...',
      captchaFailed: '❌ 令牌產生失敗。嘗試回退方法...',
      automation: '自動化',
      noChargesThreshold:
        '⌛ 等待次數達到 {threshold}。目前 {current}。下次在 {time}...',
    },
    ja: {
      title: 'WPlace 自動画像',
      toggleOverlay: 'オーバーレイ切替',
      scanColors: '色をスキャン',
      uploadImage: '画像をアップロード',
      resizeImage: '画像サイズ変更',
      selectPosition: '位置を選択',
      startPainting: '描画開始',
      stopPainting: '描画停止',
      checkingColors: '🔍 利用可能な色を確認中...',
      noColorsFound: '❌ サイトでカラーパレットを開いて再試行してください！',
      colorsFound: '✅ 利用可能な色 {count} 件を検出。アップロード可能。',
      loadingImage: '🖼️ 画像を読み込み中...',
      imageLoaded: '✅ 画像を読み込みました。有効なピクセル {count}',
      imageError: '❌ 画像の読み込みエラー',
      selectPositionAlert:
        '作品を開始したい位置に最初のピクセルを置いてください！',
      waitingPosition: '👆 参照ピクセルの描画を待っています...',
      positionSet: '✅ 位置を設定しました！',
      positionTimeout: '❌ 位置選択のタイムアウト',
      startPaintingMsg: '🎨 描画を開始...',
      paintingProgress: '🧱 進捗: {painted}/{total} ピクセル...',
      noCharges: '⌛ チャージなし。{time} 待機...',
      paintingStopped: '⏹️ ユーザーにより停止されました',
      paintingComplete: '✅ 描画完了！ {count} ピクセル描画。',
      paintingError: '❌ 描画中にエラー',
      missingRequirements: '❌ 先に画像を読み込み位置を選択してください',
      progress: '進捗',
      pixels: 'ピクセル',
      charges: 'チャージ',
      estimatedTime: '推定時間',
      initMessage: '「画像をアップロード」をクリックして開始',
      waitingInit: '初期化待機中...',
      initializingToken: '🔧 Turnstile トークン生成器を初期化中...',
      tokenReady: '✅ トークン生成器準備完了 - 描画できます！',
      tokenRetryLater: '⚠️ 必要に応じて再試行します',
      resizeSuccess: '✅ 画像を {width}x{height} にリサイズ',
      paintingPaused: '⏸️ X: {x}, Y: {y} で一時停止',
      captchaNeeded: '❗ トークン生成に失敗。少ししてから再試行してください。',
      saveData: '進捗を保存',
      loadData: '進捗を読み込み',
      saveToFile: 'ファイルへ保存',
      loadFromFile: 'ファイルから読み込み',
      dataManager: 'データ管理',
      autoSaved: '✅ 自動保存しました',
      dataLoaded: '✅ 進捗を読み込みました',
      fileSaved: '✅ ファイルに保存しました',
      fileLoaded: '✅ ファイルから読み込みました',
      noSavedData: '❌ 保存された進捗がありません',
      savedDataFound: '✅ 保存された進捗が見つかりました。続行しますか？',
      savedDate: '保存日時: {date}',
      clickLoadToContinue: '「進捗を読み込み」をクリックして続行。',
      fileError: '❌ ファイル処理エラー',
      invalidFileFormat: '❌ 無効なファイル形式',
      paintingSpeed: '描画速度',
      pixelsPerSecond: 'ピクセル/秒',
      speedSetting: '速度: {speed} ピクセル/秒',
      settings: '設定',
      botSettings: 'ボット設定',
      close: '閉じる',
      language: '言語',
      themeSettings: 'テーマ設定',
      themeSettingsDesc: 'インターフェースの好きなカラーテーマを選択。',
      languageSelectDesc: '希望言語を選択。変更は即時反映されます。',
      autoCaptcha: '自動 CAPTCHA ソルバー',
      autoCaptchaDesc:
        '統合ジェネレーターで Turnstile トークンを自動生成し必要に応じてブラウザ自動化にフォールバック。',
      applySettings: '設定を適用',
      settingsSaved: '✅ 設定を保存しました！',
      speedOn: 'オン',
      speedOff: 'オフ',
      cooldownSettings: 'クールダウン設定',
      waitCharges: 'チャージ数が次に達するまで待機',
      captchaSolving: '🔑 Turnstile トークン生成中...',
      captchaFailed: '❌ トークン生成失敗。フォールバックを試行...',
      automation: '自動化',
      noChargesThreshold:
        '⌛ チャージ {threshold} を待機中。現在 {current}。次は {time} 後...',
    },
    ko: {
      title: 'WPlace 자동 이미지',
      toggleOverlay: '오버레이 전환',
      scanColors: '색상 스캔',
      uploadImage: '이미지 업로드',
      resizeImage: '크기 조정',
      selectPosition: '위치 선택',
      startPainting: '그리기 시작',
      stopPainting: '그리기 중지',
      checkingColors: '🔍 사용 가능한 색상 확인 중...',
      noColorsFound: '❌ 사이트에서 색상 팔레트를 연 후 다시 시도하세요!',
      colorsFound: '✅ 사용 가능한 색상 {count}개 발견. 업로드 준비 완료.',
      loadingImage: '🖼️ 이미지 불러오는 중...',
      imageLoaded: '✅ 이미지 로드 완료. 유효 픽셀 {count}개',
      imageError: '❌ 이미지 로드 오류',
      selectPositionAlert: '작품을 시작할 위치에 첫 픽셀을 칠하세요!',
      waitingPosition: '👆 기준 픽셀을 칠할 때까지 대기 중...',
      positionSet: '✅ 위치 설정 완료!',
      positionTimeout: '❌ 위치 선택 시간 초과',
      startPaintingMsg: '🎨 그리기 시작...',
      paintingProgress: '🧱 진행: {painted}/{total} 픽셀...',
      noCharges: '⌛ 사용 가능 횟수 없음. {time} 대기...',
      paintingStopped: '⏹️ 사용자에 의해 중지됨',
      paintingComplete: '✅ 그리기 완료! {count} 픽셀 그렸습니다.',
      paintingError: '❌ 그리는 중 오류',
      missingRequirements: '❌ 먼저 이미지를 불러오고 위치를 선택하세요',
      progress: '진행',
      pixels: '픽셀',
      charges: '횟수',
      estimatedTime: '예상 시간',
      initMessage: "'이미지 업로드'를 클릭하여 시작",
      waitingInit: '초기화 대기 중...',
      initializingToken: '🔧 Turnstile 토큰 생성기 초기화 중...',
      tokenReady: '✅ 토큰 생성 준비 완료 - 그리기를 시작할 수 있습니다!',
      tokenRetryLater: '⚠️ 필요 시 다시 시도합니다',
      resizeSuccess: '✅ 이미지가 {width}x{height} 크기로 조정됨',
      paintingPaused: '⏸️ 위치 X: {x}, Y: {y} 에서 일시 중지',
      captchaNeeded: '❗ 토큰 생성 실패. 잠시 후 다시 시도하세요.',
      saveData: '진행 저장',
      loadData: '진행 불러오기',
      saveToFile: '파일로 저장',
      loadFromFile: '파일에서 불러오기',
      dataManager: '데이터',
      autoSaved: '✅ 진행 자동 저장됨',
      dataLoaded: '✅ 진행 불러오기 성공',
      fileSaved: '✅ 파일 저장 성공',
      fileLoaded: '✅ 파일 불러오기 성공',
      noSavedData: '❌ 저장된 진행 없음',
      savedDataFound: '✅ 저장된 진행 발견! 계속하려면 불러오시겠습니까?',
      savedDate: '저장 시각: {date}',
      clickLoadToContinue: "'진행 불러오기'를 클릭하여 계속.",
      fileError: '❌ 파일 처리 오류',
      invalidFileFormat: '❌ 잘못된 파일 형식',
      paintingSpeed: '그리기 속도',
      pixelsPerSecond: '픽셀/초',
      speedSetting: '속도: {speed} 픽셀/초',
      settings: '설정',
      botSettings: '봇 설정',
      close: '닫기',
      language: '언어',
      themeSettings: '테마 설정',
      themeSettingsDesc: '인터페이스용 선호 색상 테마를 선택하세요.',
      languageSelectDesc:
        '선호 언어를 선택하세요. 변경 사항은 즉시 적용됩니다.',
      autoCaptcha: '자동 CAPTCHA 해결',
      autoCaptchaDesc:
        '통합 생성기를 사용해 Turnstile 토큰을 자동 생성하고 필요 시 브라우저 자동화로 폴백.',
      applySettings: '설정 적용',
      settingsSaved: '✅ 설정 저장 완료!',
      speedOn: '켜짐',
      speedOff: '꺼짐',
      cooldownSettings: '쿨다운 설정',
      waitCharges: '횟수가 다음 값에 도달할 때까지 대기',
      captchaSolving: '🔑 Turnstile 토큰 생성 중...',
      captchaFailed: '❌ 토큰 생성 실패. 폴백 시도...',
      automation: '자동화',
      noChargesThreshold:
        '⌛ 횟수가 {threshold} 에 도달할 때까지 대기 중. 현재 {current}. 다음 {time} 후...',
    },
  };

  // GLOBAL STATE
  const state = {
    running: false,
    imageLoaded: false,
    processing: false,
    totalPixels: 0,
    paintedPixels: 0,
    availableColors: [],
    activeColorPalette: [], // User-selected colors for conversion
    paintWhitePixels: true, // Default to ON
    currentCharges: 0,
    maxCharges: 1, // Default max charges
    cooldown: CONFIG.COOLDOWN_DEFAULT,
    imageData: null,
    stopFlag: false,
    colorsChecked: false,
    startPosition: null,
    selectingPosition: false,
    region: null,
    minimized: false,
    lastPosition: { x: 0, y: 0 },
    estimatedTime: 0,
    language: 'en',
    paintingSpeed: CONFIG.PAINTING_SPEED.DEFAULT, // pixels batch size
    batchMode: CONFIG.BATCH_MODE, // "normal" or "random"
    randomBatchMin: CONFIG.RANDOM_BATCH_RANGE.MIN, // Random range minimum
    randomBatchMax: CONFIG.RANDOM_BATCH_RANGE.MAX, // Random range maximum
    cooldownChargeThreshold: CONFIG.COOLDOWN_CHARGE_THRESHOLD,
    tokenSource: CONFIG.TOKEN_SOURCE, // "generator" or "manual"
    initialSetupComplete: false, // Track if initial startup setup is complete (only happens once)
    overlayOpacity: CONFIG.OVERLAY.OPACITY_DEFAULT,
    blueMarbleEnabled: CONFIG.OVERLAY.BLUE_MARBLE_DEFAULT,
    ditheringEnabled: true,
    // Advanced color matching settings
    colorMatchingAlgorithm: 'lab',
    enableChromaPenalty: true,
    chromaPenaltyWeight: 0.15,
    customTransparencyThreshold: CONFIG.TRANSPARENCY_THRESHOLD,
    customWhiteThreshold: CONFIG.WHITE_THRESHOLD,
    resizeSettings: null,
    originalImage: null,
    resizeIgnoreMask: null,
    // Notification prefs and runtime bookkeeping
    notificationsEnabled: CONFIG.NOTIFICATIONS.ENABLED,
    notifyOnChargesReached: CONFIG.NOTIFICATIONS.ON_CHARGES_REACHED,
    notifyOnlyWhenUnfocused: CONFIG.NOTIFICATIONS.ONLY_WHEN_UNFOCUSED,
    notificationIntervalMinutes: CONFIG.NOTIFICATIONS.REPEAT_MINUTES,
    _lastChargesNotifyAt: 0,
    _lastChargesBelow: true,
    // Smart save tracking
    _lastSavePixelCount: 0,
    _lastSaveTime: 0,
    _saveInProgress: false,
    paintedMap: null,
  };

  let _updateResizePreview = () => {};
  let _resizeDialogCleanup = null;

  // --- OVERLAY UPDATE: Optimized OverlayManager class with performance improvements ---
  class OverlayManager {
    constructor() {
      this.isEnabled = false;
      this.startCoords = null; // { region: {x, y}, pixel: {x, y} }
      this.imageBitmap = null;
      this.chunkedTiles = new Map(); // Map<"tileX,tileY", ImageBitmap>
      this.originalTiles = new Map(); // Map<"tileX,tileY", ImageBitmap> store latest original tile bitmaps
      this.originalTilesData = new Map(); // Map<"tileX,tileY", {w,h,data:Uint8ClampedArray}> cache full ImageData for fast pixel reads
      this.tileSize = 1000;
      this.processPromise = null; // Track ongoing processing
      this.lastProcessedHash = null; // Cache invalidation
      this.workerPool = null; // Web worker pool for heavy processing
    }

    toggle() {
      this.isEnabled = !this.isEnabled;
      console.log(`Overlay ${this.isEnabled ? 'enabled' : 'disabled'}.`);
      return this.isEnabled;
    }

    enable() {
      this.isEnabled = true;
    }
    disable() {
      this.isEnabled = false;
    }
    clear() {
      this.disable();
      this.imageBitmap = null;
      this.chunkedTiles.clear();
      this.originalTiles.clear();
      this.originalTilesData.clear();
      this.lastProcessedHash = null;
      if (this.processPromise) {
        this.processPromise = null;
      }
    }

    async setImage(imageBitmap) {
      this.imageBitmap = imageBitmap;
      this.lastProcessedHash = null; // Invalidate cache
      if (this.imageBitmap && this.startCoords) {
        await this.processImageIntoChunks();
      }
    }

    async setPosition(startPosition, region) {
      if (!startPosition || !region) {
        this.startCoords = null;
        this.chunkedTiles.clear();
        this.lastProcessedHash = null;
        return;
      }
      this.startCoords = { region, pixel: startPosition };
      this.lastProcessedHash = null; // Invalidate cache
      if (this.imageBitmap) {
        await this.processImageIntoChunks();
      }
    }

    // Generate hash for cache invalidation
    _generateProcessHash() {
      if (!this.imageBitmap || !this.startCoords) return null;
      const { width, height } = this.imageBitmap;
      const { x: px, y: py } = this.startCoords.pixel;
      const { x: rx, y: ry } = this.startCoords.region;
      return `${width}x${height}_${px},${py}_${rx},${ry}_${state.blueMarbleEnabled}_${state.overlayOpacity}`;
    }

    // --- OVERLAY UPDATE: Optimized chunking with caching and batch processing ---
    async processImageIntoChunks() {
      if (!this.imageBitmap || !this.startCoords) return;

      // Check if we're already processing to avoid duplicate work
      if (this.processPromise) {
        return this.processPromise;
      }

      // Check cache validity
      const currentHash = this._generateProcessHash();
      if (
        this.lastProcessedHash === currentHash &&
        this.chunkedTiles.size > 0
      ) {
        console.log(
          `📦 Using cached overlay chunks (${this.chunkedTiles.size} tiles)`,
        );
        return;
      }

      // Start processing
      this.processPromise = this._doProcessImageIntoChunks();
      try {
        await this.processPromise;
        this.lastProcessedHash = currentHash;
      } finally {
        this.processPromise = null;
      }
    }

    async _doProcessImageIntoChunks() {
      const startTime = performance.now();
      this.chunkedTiles.clear();

      const { width: imageWidth, height: imageHeight } = this.imageBitmap;
      const { x: startPixelX, y: startPixelY } = this.startCoords.pixel;
      const { x: startRegionX, y: startRegionY } = this.startCoords.region;

      const endPixelX = startPixelX + imageWidth;
      const endPixelY = startPixelY + imageHeight;

      const startTileX = startRegionX + Math.floor(startPixelX / this.tileSize);
      const startTileY = startRegionY + Math.floor(startPixelY / this.tileSize);
      const endTileX = startRegionX + Math.floor(endPixelX / this.tileSize);
      const endTileY = startRegionY + Math.floor(endPixelY / this.tileSize);

      const totalTiles =
        (endTileX - startTileX + 1) * (endTileY - startTileY + 1);
      console.log(`🔄 Processing ${totalTiles} overlay tiles...`);

      // Process tiles in batches to avoid blocking the main thread
      const batchSize = 4; // Process 4 tiles at a time
      const tilesToProcess = [];

      for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
          tilesToProcess.push({ tx, ty });
        }
      }

      // Process tiles in batches with yielding
      for (let i = 0; i < tilesToProcess.length; i += batchSize) {
        const batch = tilesToProcess.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async ({ tx, ty }) => {
            const tileKey = `${tx},${ty}`;
            const chunkBitmap = await this._processTile(
              tx,
              ty,
              imageWidth,
              imageHeight,
              startPixelX,
              startPixelY,
              startRegionX,
              startRegionY,
            );
            if (chunkBitmap) {
              this.chunkedTiles.set(tileKey, chunkBitmap);
            }
          }),
        );

        // Yield control to prevent blocking
        if (i + batchSize < tilesToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const processingTime = performance.now() - startTime;
      console.log(
        `✅ Overlay processed ${this.chunkedTiles.size} tiles in ${Math.round(processingTime)}ms`,
      );
    }

    async _processTile(
      tx,
      ty,
      imageWidth,
      imageHeight,
      startPixelX,
      startPixelY,
      startRegionX,
      startRegionY,
    ) {
      const tileKey = `${tx},${ty}`;

      // Calculate the portion of the image that overlaps with this tile
      const imgStartX = (tx - startRegionX) * this.tileSize - startPixelX;
      const imgStartY = (ty - startRegionY) * this.tileSize - startPixelY;

      // Crop coordinates within the source image
      const sX = Math.max(0, imgStartX);
      const sY = Math.max(0, imgStartY);
      const sW = Math.min(imageWidth - sX, this.tileSize - (sX - imgStartX));
      const sH = Math.min(imageHeight - sY, this.tileSize - (sY - imgStartY));

      if (sW <= 0 || sH <= 0) return null;

      // Destination coordinates on the new chunk canvas
      const dX = Math.max(0, -imgStartX);
      const dY = Math.max(0, -imgStartY);

      const chunkCanvas = new OffscreenCanvas(this.tileSize, this.tileSize);
      const chunkCtx = chunkCanvas.getContext('2d');
      chunkCtx.imageSmoothingEnabled = false;

      chunkCtx.drawImage(this.imageBitmap, sX, sY, sW, sH, dX, dY, sW, sH);

      // --- OPTIMIZED: Blue marble effect with faster pixel manipulation ---
      if (state.blueMarbleEnabled) {
        const imageData = chunkCtx.getImageData(dX, dY, sW, sH);
        const data = imageData.data;

        // Faster pixel manipulation using typed arrays
        for (let i = 0; i < data.length; i += 4) {
          const pixelIndex = i / 4;
          const pixelY = Math.floor(pixelIndex / sW);
          const pixelX = pixelIndex % sW;

          if ((pixelX + pixelY) % 2 === 0 && data[i + 3] > 0) {
            data[i + 3] = 0; // Set alpha to 0
          }
        }

        chunkCtx.putImageData(imageData, dX, dY);
      }

      return await chunkCanvas.transferToImageBitmap();
    }

    // --- OVERLAY UPDATE: Optimized compositing with caching ---
    async processAndRespondToTileRequest(eventData) {
      const { endpoint, blobID, blobData } = eventData;

      let finalBlob = blobData;

      if (this.isEnabled && this.chunkedTiles.size > 0) {
        const tileMatch = endpoint.match(/(\d+)\/(\d+)\.png/);
        if (tileMatch) {
          const tileX = parseInt(tileMatch[1], 10);
          const tileY = parseInt(tileMatch[2], 10);
          const tileKey = `${tileX},${tileY}`;

          const chunkBitmap = this.chunkedTiles.get(tileKey);
          // Also store the original tile bitmap for later pixel color checks
          try {
            const originalBitmap = await createImageBitmap(blobData);
            this.originalTiles.set(tileKey, originalBitmap);
            // Cache full ImageData for fast pixel access (avoid repeated drawImage/getImageData)
            try {
              let canvas, ctx;
              if (typeof OffscreenCanvas !== 'undefined') {
                canvas = new OffscreenCanvas(
                  originalBitmap.width,
                  originalBitmap.height,
                );
                ctx = canvas.getContext('2d');
              } else {
                canvas = document.createElement('canvas');
                canvas.width = originalBitmap.width;
                canvas.height = originalBitmap.height;
                ctx = canvas.getContext('2d');
              }
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(originalBitmap, 0, 0);
              const imgData = ctx.getImageData(
                0,
                0,
                originalBitmap.width,
                originalBitmap.height,
              );
              // Store typed array copy to avoid retaining large canvas
              this.originalTilesData.set(tileKey, {
                w: originalBitmap.width,
                h: originalBitmap.height,
                data: new Uint8ClampedArray(imgData.data),
              });
            } catch (e) {
              // If ImageData extraction fails, still keep the bitmap as fallback
              console.warn(
                'OverlayManager: could not cache ImageData for',
                tileKey,
                e,
              );
            }
          } catch (e) {
            console.warn(
              'OverlayManager: could not create original bitmap for',
              tileKey,
              e,
            );
          }
          if (chunkBitmap) {
            try {
              // Use faster compositing for better performance
              finalBlob = await this._compositeTileOptimized(
                blobData,
                chunkBitmap,
              );
            } catch (e) {
              console.error('Error compositing overlay:', e);
              // Fallback to original tile on error
              finalBlob = blobData;
            }
          }
        }
      }

      // Send the (possibly modified) blob back to the injected script
      window.postMessage(
        {
          source: 'auto-image-overlay',
          blobID: blobID,
          blobData: finalBlob,
        },
        '*',
      );
    }

    // Returns [r,g,b,a] for a pixel inside a region tile (tileX, tileY are region coords)
    async getTilePixelColor(tileX, tileY, pixelX, pixelY) {
      const tileKey = `${tileX},${tileY}`;
      // Prefer cached ImageData if available
      const cached = this.originalTilesData.get(tileKey);
      if (cached && cached.data && cached.w > 0 && cached.h > 0) {
        const x = Math.max(0, Math.min(cached.w - 1, pixelX));
        const y = Math.max(0, Math.min(cached.h - 1, pixelY));
        const idx = (y * cached.w + x) * 4;
        const d = cached.data;
        const a = d[idx + 3];
        const alphaThresh =
          state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;
        if (a < alphaThresh) {
          // Treat as transparent / unavailable
          // Lightweight debug: show when transparency causes skip (only if verbose enabled)
          if (window._overlayDebug)
            console.debug(
              'getTilePixelColor: transparent pixel, skipping',
              tileKey,
              x,
              y,
              a,
            );
          return null;
        }
        return [d[idx], d[idx + 1], d[idx + 2], a];
      }

      // Fallback: draw stored bitmap to canvas and read single pixel
      const bitmap = this.originalTiles.get(tileKey);
      if (!bitmap) return null;

      try {
        let canvas, ctx;
        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          ctx = canvas.getContext('2d');
        } else {
          canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          ctx = canvas.getContext('2d');
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bitmap, 0, 0);

        const x = Math.max(0, Math.min(bitmap.width - 1, pixelX));
        const y = Math.max(0, Math.min(bitmap.height - 1, pixelY));
        const data = ctx.getImageData(x, y, 1, 1).data;
        const a = data[3];
        const alphaThresh =
          state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;
        if (a < alphaThresh) {
          if (window._overlayDebug)
            console.debug(
              'getTilePixelColor: transparent pixel (fallback), skipping',
              tileKey,
              x,
              y,
              a,
            );
          return null;
        }
        return [data[0], data[1], data[2], a];
      } catch (e) {
        console.warn(
          'OverlayManager.getTilePixelColor failed for',
          tileKey,
          pixelX,
          pixelY,
          e,
        );
        return null;
      }
    }

    async _compositeTileOptimized(originalBlob, overlayBitmap) {
      const originalBitmap = await createImageBitmap(originalBlob);
      const canvas = new OffscreenCanvas(
        originalBitmap.width,
        originalBitmap.height,
      );
      const ctx = canvas.getContext('2d');

      // Disable antialiasing for pixel-perfect rendering
      ctx.imageSmoothingEnabled = false;

      // Draw original tile first
      ctx.drawImage(originalBitmap, 0, 0);

      // Set opacity and draw overlay with optimized blend mode
      ctx.globalAlpha = state.overlayOpacity;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(overlayBitmap, 0, 0);

      // Use faster blob conversion with compression settings
      return await canvas.convertToBlob({
        type: 'image/png',
        quality: 0.95, // Slight compression for faster processing
      });
    }
  }

  const overlayManager = new OverlayManager();

  // Optimized Turnstile token handling with improved caching and retry logic
  let turnstileToken = null;
  let tokenExpiryTime = 0;
  let tokenGenerationInProgress = false;
  let _resolveToken = null;
  let tokenPromise = new Promise((resolve) => {
    _resolveToken = resolve;
  });
  let retryCount = 0;
  const MAX_RETRIES = 10;
  const MAX_BATCH_RETRIES = 10; // Maximum attempts for batch sending
  const TOKEN_LIFETIME = 240000; // 4 minutes (tokens typically last 5 min, use 4 for safety)

  function setTurnstileToken(token) {
    if (_resolveToken) {
      _resolveToken(token);
      _resolveToken = null;
    }
    turnstileToken = token;
    tokenExpiryTime = Date.now() + TOKEN_LIFETIME;
    console.log('✅ Turnstile token set successfully');
  }

  function isTokenValid() {
    return turnstileToken && Date.now() < tokenExpiryTime;
  }

  function invalidateToken() {
    turnstileToken = null;
    tokenExpiryTime = 0;
    console.log('🗑️ Token invalidated, will force fresh generation');
  }

  // Reset all Turnstile state (for account switching)
  function resetTurnstileForAccountSwitch() {
    console.log('🔄 Resetting Turnstile state for account switch...');

    // Reset all token-related variables
    turnstileToken = null;
    tokenExpiryTime = 0;
    tokenGenerationInProgress = false;

    // Reset promise and resolver
    tokenPromise = new Promise((resolve) => {
      _resolveToken = resolve;
    });

    // Clear any existing Turnstile widgets
    try {
      if (window.turnstile) {
        // Remove existing widgets if any
        const widgets = document.querySelectorAll('.cf-turnstile');
        widgets.forEach((widget) => {
          if (widget.dataset.widgetId) {
            window.turnstile.remove(widget.dataset.widgetId);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to clear Turnstile widgets:', e);
    }

    console.log('✅ Turnstile state reset completed');
  }

  async function ensureToken(forceRefresh = false) {
    // Return cached token if still valid and not forcing refresh
    if (isTokenValid() && !forceRefresh) {
      return turnstileToken;
    }

    // Invalidate token if forcing refresh
    if (forceRefresh) invalidateToken();

    // Avoid multiple simultaneous token generations
    if (tokenGenerationInProgress) {
      console.log('🔄 Token generation already in progress, waiting...');
      await Utils.sleep(2000);
      return isTokenValid() ? turnstileToken : null;
    }

    tokenGenerationInProgress = true;

    try {
      console.log('🔄 Token expired or missing, generating new one...');
      const token = await handleCaptchaWithRetry();
      if (token && token.length > 20) {
        setTurnstileToken(token);
        console.log('✅ Token captured and cached successfully');
        return token;
      }

      console.log(
        '⚠️ Invisible Turnstile failed, forcing browser automation...',
      );
      const fallbackToken = await handleCaptchaFallback();
      if (fallbackToken && fallbackToken.length > 20) {
        setTurnstileToken(fallbackToken);
        console.log('✅ Fallback token captured successfully');
        return fallbackToken;
      }

      console.log('❌ All token generation methods failed');
      return null;
    } finally {
      tokenGenerationInProgress = false;
    }
  }

  async function handleCaptchaWithRetry() {
    const startTime = Date.now();
    try {
      const sitekey = Utils.detectSitekey();
      console.log('🔑 Generating Turnstile token for sitekey:', sitekey);

      if (typeof window !== 'undefined' && window.navigator) {
        console.log(
          '🧭 UA:',
          window.navigator.userAgent,
          'Platform:',
          window.navigator.platform,
        );
      }

      const token = await Utils.generatePaintToken(sitekey);
      if (token && token.length > 20) {
        const elapsed = Math.round(Date.now() - startTime);
        console.log(
          `✅ Turnstile token generated successfully in ${elapsed}ms`,
        );
        return token;
      } else {
        throw new Error('Invalid or empty token received');
      }
    } catch (error) {
      const elapsed = Math.round(Date.now() - startTime);
      console.log(
        `❌ Turnstile token generation failed after ${elapsed}ms:`,
        error,
      );
      throw error;
    }
  }

  async function handleCaptchaFallback() {
    // Implementation for fallback token generation would go here
    // This is a placeholder for browser automation fallback
    console.log('🔄 Attempting fallback token generation...');
    return null;
  }

  function inject(callback) {
    const script = document.createElement('script');
    script.textContent = `(${callback})();`;
    document.documentElement?.appendChild(script);
    script.remove();
  }

  inject(() => {
    const fetchedBlobQueue = new Map();

    window.addEventListener('message', (event) => {
      const { source, blobID, blobData } = event.data;
      if (source === 'auto-image-overlay' && blobID && blobData) {
        const callback = fetchedBlobQueue.get(blobID);
        if (typeof callback === 'function') {
          callback(blobData);
        }
        fetchedBlobQueue.delete(blobID);
      }
    });

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const url = args[0] instanceof Request ? args[0].url : args[0];

      if (typeof url === 'string') {
        if (url.includes('https://backend.wplace.live/s0/pixel/')) {
          try {
            const payload = JSON.parse(args[1].body);
            if (payload.t) {
              console.log('✅ Turnstile Token Captured:', payload.t);
              window.postMessage(
                { source: 'turnstile-capture', token: payload.t },
                '*',
              );
            }
          } catch (_) {
            /* ignore */
          }
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('image/png') && url.includes('.png')) {
          const cloned = response.clone();
          return new Promise(async (resolve) => {
            const blobUUID = crypto.randomUUID();
            const originalBlob = await cloned.blob();

            fetchedBlobQueue.set(blobUUID, (processedBlob) => {
              resolve(
                new Response(processedBlob, {
                  headers: cloned.headers,
                  status: cloned.status,
                  statusText: cloned.statusText,
                }),
              );
            });

            window.postMessage(
              {
                source: 'auto-image-tile',
                endpoint: url,
                blobID: blobUUID,
                blobData: originalBlob,
              },
              '*',
            );
          });
        }
      }

      return response;
    };
  });

  window.addEventListener('message', (event) => {
    const { source, endpoint, blobID, blobData, token } = event.data;

    if (source === 'auto-image-tile' && endpoint && blobID && blobData) {
      overlayManager.processAndRespondToTileRequest(event.data);
    }

    if (source === 'turnstile-capture' && token) {
      setTurnstileToken(token);
      if (
        document.querySelector('#statusText')?.textContent.includes('CAPTCHA')
      ) {
        Utils.showAlert(
          'Token captured successfully! You can start the bot now.',
          'success',
        );
        updateUI('colorsFound', 'success', {
          count: state.availableColors.length,
        });
      }
    }
  });

  async function detectLanguage() {
    try {
      const response = await fetchWithAccountCookies(
        'https://backend.wplace.live/me',
        {},
      );
      const data = await response.json();
      state.language = data.language === 'pt' ? 'pt' : 'en';
    } catch {
      state.language = navigator.language.startsWith('pt') ? 'pt' : 'en';
    }
  }

  // UTILITY FUNCTIONS
  const Utils = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),

    waitForSelector: async (selector, interval = 200, timeout = 5000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await Utils.sleep(interval);
      }
      return null;
    },

    // Turnstile Generator Integration - Optimized with widget reuse and proper cleanup
    turnstileLoaded: false,
    _turnstileContainer: null,
    _turnstileOverlay: null,
    _turnstileWidgetId: null,
    _lastSitekey: null,

    async loadTurnstile() {
      // If Turnstile is already present, just resolve.
      if (window.turnstile) {
        this.turnstileLoaded = true;
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        // Avoid adding the script twice
        if (
          document.querySelector(
            'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
          )
        ) {
          const checkReady = () => {
            if (window.turnstile) {
              this.turnstileLoaded = true;
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          return checkReady();
        }

        const script = document.createElement('script');
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.turnstileLoaded = true;
          console.log('✅ Turnstile script loaded successfully');
          resolve();
        };
        script.onerror = () => {
          console.error('❌ Failed to load Turnstile script');
          reject(new Error('Failed to load Turnstile'));
        };
        document.head.appendChild(script);
      });
    },

    // Create or reuse the turnstile container - completely hidden for token generation
    ensureTurnstileContainer() {
      if (
        !this._turnstileContainer ||
        !document.body.contains(this._turnstileContainer)
      ) {
        // Clean up old container if it exists
        if (this._turnstileContainer) {
          this._turnstileContainer.remove();
        }

        this._turnstileContainer = document.createElement('div');
        this._turnstileContainer.style.cssText = `
            position: fixed !important;
            left: -99999px !important;
            top: -99999px !important;
            width: 1px !important;
            height: 1px !important;
            pointer-events: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            z-index: -99999 !important;
            overflow: hidden !important;
          `;
        this._turnstileContainer.setAttribute('aria-hidden', 'true');
        this._turnstileContainer.id = 'turnstile-widget-container';
        document.body.appendChild(this._turnstileContainer);
      }
      return this._turnstileContainer;
    },

    // Interactive overlay container for visible widgets when needed
    ensureTurnstileOverlayContainer() {
      if (
        this._turnstileOverlay &&
        document.body.contains(this._turnstileOverlay)
      ) {
        return this._turnstileOverlay;
      }

      const overlay = document.createElement('div');
      overlay.id = 'turnstile-overlay-container';
      overlay.style.cssText = `
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 99999 !important;
          background: rgba(0,0,0,0.9) !important;
          border-radius: 12px !important;
          padding: 20px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          color: white !important;
          font-family: 'Segoe UI', sans-serif !important;
          display: none !important;
          max-width: 350px !important;
          min-width: 300px !important;
        `;

      const title = document.createElement('div');
      title.textContent =
        'Cloudflare Turnstile — please complete the check if shown';
      title.style.cssText =
        'font: 600 12px/1.3 "Segoe UI",sans-serif; margin-bottom: 8px; opacity: 0.9;';

      const host = document.createElement('div');
      host.id = 'turnstile-overlay-host';
      host.style.cssText = 'width: 100%; min-height: 70px;';

      const hideBtn = document.createElement('button');
      hideBtn.textContent = 'Hide';
      hideBtn.style.cssText =
        'position:absolute; top:6px; right:6px; font-size:11px; background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; padding:2px 6px; cursor:pointer;';
      hideBtn.addEventListener('click', () => overlay.remove());

      overlay.appendChild(title);
      overlay.appendChild(host);
      overlay.appendChild(hideBtn);
      document.body.appendChild(overlay);

      this._turnstileOverlay = overlay;
      return overlay;
    },

    async executeTurnstile(sitekey, action = 'paint') {
      await this.loadTurnstile();

      // Try reusing existing widget first if sitekey matches
      if (
        this._turnstileWidgetId &&
        this._lastSitekey === sitekey &&
        window.turnstile?.execute
      ) {
        try {
          console.log('🔄 Reusing existing Turnstile widget...');
          const token = await Promise.race([
            window.turnstile.execute(this._turnstileWidgetId, { action }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Execute timeout')), 15000),
            ),
          ]);
          if (token && token.length > 20) {
            console.log('✅ Token generated via widget reuse');
            return token;
          }
        } catch (error) {
          console.log(
            '� Widget reuse failed, will create a fresh widget:',
            error.message,
          );
        }
      }

      // Try invisible widget first
      const invisibleToken = await this.createTurnstileWidget(sitekey, action);
      if (invisibleToken && invisibleToken.length > 20) {
        return invisibleToken;
      }

      console.log('� Falling back to interactive Turnstile (visible).');
      return await this.createTurnstileWidgetInteractive(sitekey, action);
    },

    async createTurnstileWidget(sitekey, action) {
      return new Promise((resolve) => {
        try {
          // Force cleanup of any existing widget
          if (this._turnstileWidgetId && window.turnstile?.remove) {
            try {
              window.turnstile.remove(this._turnstileWidgetId);
              console.log('🧹 Cleaned up existing Turnstile widget');
            } catch (e) {
              console.warn('⚠️ Widget cleanup warning:', e.message);
            }
          }

          const container = this.ensureTurnstileContainer();
          container.innerHTML = '';

          // Verify Turnstile is available
          if (!window.turnstile?.render) {
            console.error('❌ Turnstile not available for rendering');
            resolve(null);
            return;
          }

          console.log('🔧 Creating invisible Turnstile widget...');
          const widgetId = window.turnstile.render(container, {
            sitekey,
            action,
            size: 'invisible',
            retry: 'auto',
            'retry-interval': 8000,
            callback: (token) => {
              console.log('✅ Invisible Turnstile callback');
              resolve(token);
            },
            'error-callback': () => resolve(null),
            'timeout-callback': () => resolve(null),
          });

          this._turnstileWidgetId = widgetId;
          this._lastSitekey = sitekey;

          if (!widgetId) {
            return resolve(null);
          }

          // Execute the widget and race with timeout
          Promise.race([
            window.turnstile.execute(widgetId, { action }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Invisible execute timeout')),
                12000,
              ),
            ),
          ])
            .then(resolve)
            .catch(() => resolve(null));
        } catch (e) {
          console.error('❌ Invisible Turnstile creation failed:', e);
          resolve(null);
        }
      });
    },

    async createTurnstileWidgetInteractive(sitekey, action) {
      // Create a visible widget that users can interact with if needed
      console.log('🔄 Creating interactive Turnstile widget (visible)');

      return new Promise((resolve) => {
        try {
          // Force cleanup of any existing widget
          if (this._turnstileWidgetId && window.turnstile?.remove) {
            try {
              window.turnstile.remove(this._turnstileWidgetId);
            } catch (e) {
              console.warn('⚠️ Widget cleanup warning:', e.message);
            }
          }

          const overlay = this.ensureTurnstileOverlayContainer();
          overlay.style.display = 'block';

          const host = overlay.querySelector('#turnstile-overlay-host');
          host.innerHTML = '';

          // Set a timeout for interactive mode
          const timeout = setTimeout(() => {
            console.warn('⏰ Interactive Turnstile widget timeout');
            overlay.style.display = 'none';
            resolve(null);
          }, 60000); // 60 seconds for user interaction

          const widgetId = window.turnstile.render(host, {
            sitekey,
            action,
            size: 'normal',
            theme: 'light',
            callback: (token) => {
              clearTimeout(timeout);
              overlay.style.display = 'none';
              console.log('✅ Interactive Turnstile completed successfully');

              if (typeof token === 'string' && token.length > 20) {
                resolve(token);
              } else {
                console.warn('❌ Invalid token from interactive widget');
                resolve(null);
              }
            },
            'error-callback': (error) => {
              clearTimeout(timeout);
              overlay.style.display = 'none';
              console.warn('❌ Interactive Turnstile error:', error);
              resolve(null);
            },
          });

          this._turnstileWidgetId = widgetId;
          this._lastSitekey = sitekey;

          if (!widgetId) {
            clearTimeout(timeout);
            overlay.style.display = 'none';
            console.warn('❌ Failed to create interactive Turnstile widget');
            resolve(null);
          } else {
            console.log(
              '✅ Interactive Turnstile widget created, waiting for user interaction...',
            );
          }
        } catch (e) {
          console.error('❌ Interactive Turnstile creation failed:', e);
          resolve(null);
        }
      });
    },

    async generatePaintToken(sitekey) {
      return this.executeTurnstile(sitekey, 'paint');
    },

    // Cleanup method for when the script is disabled/reloaded
    cleanupTurnstile() {
      if (this._turnstileWidgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(this._turnstileWidgetId);
        } catch (e) {
          console.warn('Failed to cleanup Turnstile widget:', e);
        }
      }

      if (
        this._turnstileContainer &&
        document.body.contains(this._turnstileContainer)
      ) {
        this._turnstileContainer.remove();
      }

      if (
        this._turnstileOverlay &&
        document.body.contains(this._turnstileOverlay)
      ) {
        this._turnstileOverlay.remove();
      }

      this._turnstileWidgetId = null;
      this._turnstileContainer = null;
      this._turnstileOverlay = null;
      this._lastSitekey = null;
    },

    detectSitekey(fallback = '0x4AAAAAABpqJe8FO0N84q0F') {
      // Cache sitekey to avoid repeated DOM queries
      if (this._cachedSitekey) {
        console.log('🔍 Using cached sitekey:', this._cachedSitekey);
        return this._cachedSitekey;
      }

      // List of potential sitekeys to try
      const potentialSitekeys = [
        '0x4AAAAAABpqJe8FO0N84q0F', // WPlace common sitekey
        '0x4AAAAAAAJ7xjKAp6Mt_7zw', // Alternative WPlace sitekey
        '0x4AAAAAADm5QWx6Ov2LNF2g', // Another common sitekey
      ];

      try {
        // Try to find sitekey in data attributes
        const sitekeySel = document.querySelector('[data-sitekey]');
        if (sitekeySel) {
          const sitekey = sitekeySel.getAttribute('data-sitekey');
          if (sitekey && sitekey.length > 10) {
            this._cachedSitekey = sitekey;
            console.log('🔍 Sitekey detected from data attribute:', sitekey);
            return sitekey;
          }
        }

        // Try turnstile element
        const turnstileEl = document.querySelector('.cf-turnstile');
        if (
          turnstileEl?.dataset?.sitekey &&
          turnstileEl.dataset.sitekey.length > 10
        ) {
          this._cachedSitekey = turnstileEl.dataset.sitekey;
          console.log(
            '🔍 Sitekey detected from turnstile element:',
            this._cachedSitekey,
          );
          return this._cachedSitekey;
        }

        // Try to find sitekey in meta tags
        const metaTags = document.querySelectorAll(
          'meta[name*="turnstile"], meta[property*="turnstile"]',
        );
        for (const meta of metaTags) {
          const content = meta.getAttribute('content');
          if (content && content.length > 10) {
            this._cachedSitekey = content;
            console.log(
              '🔍 Sitekey detected from meta tag:',
              this._cachedSitekey,
            );
            return this._cachedSitekey;
          }
        }

        // Try global variable
        if (
          typeof window !== 'undefined' &&
          window.__TURNSTILE_SITEKEY &&
          window.__TURNSTILE_SITEKEY.length > 10
        ) {
          this._cachedSitekey = window.__TURNSTILE_SITEKEY;
          console.log(
            '🔍 Sitekey detected from global variable:',
            this._cachedSitekey,
          );
          return this._cachedSitekey;
        }

        // Try script tags for inline sitekey
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML;
          const sitekeyMatch = content.match(
            /sitekey['":\s]+(['"0-9a-zA-X_-]{20,})/i,
          );
          if (sitekeyMatch && sitekeyMatch[1] && sitekeyMatch[1].length > 10) {
            this._cachedSitekey = sitekeyMatch[1].replace(/['"]/g, '');
            console.log(
              '🔍 Sitekey detected from script content:',
              this._cachedSitekey,
            );
            return this._cachedSitekey;
          }
        }

        // If no sitekey found through detection, try the known working sitekeys
        console.log('🔍 No sitekey detected, trying known working sitekeys...');
        for (const testSitekey of potentialSitekeys) {
          console.log('🔍 Trying sitekey:', testSitekey);
          this._cachedSitekey = testSitekey;
          return testSitekey;
        }
      } catch (error) {
        console.warn('Error detecting sitekey:', error);
      }

      console.log('🔍 Using fallback sitekey:', fallback);
      this._cachedSitekey = fallback;
      return fallback;
    },

    createElement: (tag, props = {}, children = []) => {
      const element = document.createElement(tag);

      Object.entries(props).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key === 'className') {
          element.className = value;
        } else if (key === 'innerHTML') {
          element.innerHTML = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      if (typeof children === 'string') {
        element.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach((child) => {
          if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
          } else {
            element.appendChild(child);
          }
        });
      }

      return element;
    },

    createButton: (
      id,
      text,
      icon,
      onClick,
      style = CONFIG.CSS_CLASSES.BUTTON_PRIMARY,
    ) => {
      const button = Utils.createElement('button', {
        id: id,
        style: style,
        innerHTML: `${icon ? `<i class="${icon}"></i>` : ''}<span>${text}</span>`,
      });
      if (onClick) button.addEventListener('click', onClick);
      return button;
    },

    t: (key, params = {}) => {
      let text = TEXT[state.language]?.[key] || TEXT.en[key] || key;
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, params[param]);
      });
      return text;
    },

    showAlert: (message, type = 'info') => {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          z-index: 10001;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideDown 0.3s ease-out;
          font-family: 'Segoe UI', sans-serif;
        `;

      const colors = {
        info: 'background: linear-gradient(135deg, #3498db, #2980b9);',
        success: 'background: linear-gradient(135deg, #27ae60, #229954);',
        warning: 'background: linear-gradient(135deg, #f39c12, #e67e22);',
        error: 'background: linear-gradient(135deg, #e74c3c, #c0392b);',
      };

      alertDiv.style.cssText += colors[type] || colors.info;

      const style = document.createElement('style');
      style.textContent = `
          @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `;
      document.head.appendChild(style);

      alertDiv.textContent = message;
      document.body.appendChild(alertDiv);

      setTimeout(() => {
        alertDiv.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => {
          document.body.removeChild(alertDiv);
          document.head.removeChild(style);
        }, 300);
      }, 4000);
    },

    colorDistance: (a, b) =>
      Math.sqrt(
        Math.pow(a[0] - b[0], 2) +
          Math.pow(a[1] - b[1], 2) +
          Math.pow(a[2] - b[2], 2),
      ),
    _labCache: new Map(), // key: (r<<16)|(g<<8)|b  value: [L,a,b]
    _rgbToLab: (r, g, b) => {
      // sRGB -> linear
      const srgbToLinear = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const rl = srgbToLinear(r);
      const gl = srgbToLinear(g);
      const bl = srgbToLinear(b);
      let X = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
      let Y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
      let Z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
      X /= 0.95047;
      Y /= 1.0;
      Z /= 1.08883;
      const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const fX = f(X),
        fY = f(Y),
        fZ = f(Z);
      const L = 116 * fY - 16;
      const a = 500 * (fX - fY);
      const b2 = 200 * (fY - fZ);
      return [L, a, b2];
    },
    _lab: (r, g, b) => {
      const key = (r << 16) | (g << 8) | b;
      let v = Utils._labCache.get(key);
      if (!v) {
        v = Utils._rgbToLab(r, g, b);
        Utils._labCache.set(key, v);
      }
      return v;
    },
    findClosestPaletteColor: (r, g, b, palette) => {
      // Use provided palette or derive from COLOR_MAP
      if (!palette || palette.length === 0) {
        palette = Object.values(CONFIG.COLOR_MAP)
          .filter((c) => c.rgb)
          .map((c) => [c.rgb.r, c.rgb.g, c.rgb.b]);
      }
      if (state.colorMatchingAlgorithm === 'legacy') {
        let menorDist = Infinity;
        let cor = [0, 0, 0];
        for (let i = 0; i < palette.length; i++) {
          const [pr, pg, pb] = palette[i];
          const rmean = (pr + r) / 2;
          const rdiff = pr - r;
          const gdiff = pg - g;
          const bdiff = pb - b;
          const dist = Math.sqrt(
            (((512 + rmean) * rdiff * rdiff) >> 8) +
              4 * gdiff * gdiff +
              (((767 - rmean) * bdiff * bdiff) >> 8),
          );
          if (dist < menorDist) {
            menorDist = dist;
            cor = [pr, pg, pb];
          }
        }
        return cor;
      }
      // LAB algorithm
      const [Lt, at, bt] = Utils._lab(r, g, b);
      const targetChroma = Math.sqrt(at * at + bt * bt);
      let best = null;
      let bestDist = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const [pr, pg, pb] = palette[i];
        const [Lp, ap, bp] = Utils._lab(pr, pg, pb);
        const dL = Lt - Lp;
        const da = at - ap;
        const db = bt - bp;
        let dist = dL * dL + da * da + db * db;
        if (state.enableChromaPenalty && targetChroma > 20) {
          const candChroma = Math.sqrt(ap * ap + bp * bp);
          if (candChroma < targetChroma) {
            const chromaDiff = targetChroma - candChroma;
            dist += chromaDiff * chromaDiff * state.chromaPenaltyWeight;
          }
        }
        if (dist < bestDist) {
          bestDist = dist;
          best = palette[i];
          if (bestDist === 0) break;
        }
      }
      return best || [0, 0, 0];
    },

    isWhitePixel: (r, g, b) => {
      const wt = state.customWhiteThreshold || CONFIG.WHITE_THRESHOLD;
      return r >= wt && g >= wt && b >= wt;
    },

    createImageUploader: () =>
      new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg';
        input.onchange = () => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(input.files[0]);
        };
        input.click();
      }),

    createFileDownloader: (data, filename) => {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    createFileUploader: () =>
      new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const data = JSON.parse(reader.result);
                resolve(data);
              } catch (error) {
                reject(new Error('Invalid JSON file'));
              }
            };
            reader.onerror = () => reject(new Error('File reading error'));
            reader.readAsText(file);
          } else {
            reject(new Error('No file selected'));
          }
        };
        input.click();
      }),

    extractAvailableColors: () => {
      const colorElements = document.querySelectorAll('[id^="color-"]');

      // Separate available and unavailable colors
      const availableColors = [];
      const unavailableColors = [];

      Array.from(colorElements).forEach((el) => {
        const id = Number.parseInt(el.id.replace('color-', ''));
        if (id === 0) return; // Skip transparent color

        const rgbStr = el.style.backgroundColor.match(/\d+/g);
        const rgb = rgbStr ? rgbStr.map(Number) : [0, 0, 0];

        // Find color name from COLOR_MAP
        const colorInfo = Object.values(CONFIG.COLOR_MAP).find(
          (color) => color.id === id,
        );
        const name = colorInfo ? colorInfo.name : `Unknown Color ${id}`;

        const colorData = { id, name, rgb };

        // Check if color is available (no SVG overlay means available)
        if (!el.querySelector('svg')) {
          availableColors.push(colorData);
        } else {
          unavailableColors.push(colorData);
        }
      });

      // Console log detailed color information
      console.log('=== CAPTURED COLORS STATUS ===');
      console.log(`Total available colors: ${availableColors.length}`);
      console.log(`Total unavailable colors: ${unavailableColors.length}`);
      console.log(
        `Total colors scanned: ${availableColors.length + unavailableColors.length}`,
      );

      if (availableColors.length > 0) {
        console.log('\n--- AVAILABLE COLORS ---');
        availableColors.forEach((color, index) => {
          console.log(
            `${index + 1}. ID: ${color.id}, Name: "${color.name}", RGB: (${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`,
          );
        });
      }

      if (unavailableColors.length > 0) {
        console.log('\n--- UNAVAILABLE COLORS ---');
        unavailableColors.forEach((color, index) => {
          console.log(
            `${index + 1}. ID: ${color.id}, Name: "${color.name}", RGB: (${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]}) [LOCKED]`,
          );
        });
      }

      console.log('=== END COLOR STATUS ===');

      return availableColors;
    },

    formatTime: (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));

      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;

      return result;
    },

    calculateEstimatedTime: (remainingPixels, charges, cooldown) => {
      if (remainingPixels <= 0) return 0;

      const paintingSpeedDelay =
        state.paintingSpeed > 0 ? 1000 / state.paintingSpeed : 1000;
      const timeFromSpeed = remainingPixels * paintingSpeedDelay;

      const cyclesNeeded = Math.ceil(remainingPixels / Math.max(charges, 1));
      const timeFromCharges = cyclesNeeded * cooldown;

      return Math.max(timeFromSpeed, timeFromCharges);
    },

    // --- Painted pixel tracking helpers ---
    initializePaintedMap: (width, height) => {
      if (!state.paintedMap || state.paintedMap.length !== height) {
        state.paintedMap = Array(height)
          .fill()
          .map(() => Array(width).fill(false));
        console.log(`📋 Initialized painted map: ${width}x${height}`);
      }
    },

    markPixelPainted: (x, y, regionX = 0, regionY = 0) => {
      const actualX = x + regionX;
      const actualY = y + regionY;

      if (
        state.paintedMap &&
        state.paintedMap[actualY] &&
        actualX >= 0 &&
        actualX < state.paintedMap[actualY].length
      ) {
        state.paintedMap[actualY][actualX] = true;
      }
    },

    isPixelPainted: (x, y, regionX = 0, regionY = 0) => {
      const actualX = x + regionX;
      const actualY = y + regionY;

      if (
        state.paintedMap &&
        state.paintedMap[actualY] &&
        actualX >= 0 &&
        actualX < state.paintedMap[actualY].length
      ) {
        return state.paintedMap[actualY][actualX];
      }
      return false;
    },

    // Smart save - only save if significant changes
    shouldAutoSave: () => {
      const now = Date.now();
      const pixelsSinceLastSave =
        state.paintedPixels - state._lastSavePixelCount;
      const timeSinceLastSave = now - state._lastSaveTime;

      // Save conditions:
      // 1. Every 25 pixels (reduced from 50 for more frequent saves)
      // 2. At least 30 seconds since last save (prevent spam)
      // 3. Not already saving
      return (
        !state._saveInProgress &&
        pixelsSinceLastSave >= 25 &&
        timeSinceLastSave >= 30000
      );
    },

    performSmartSave: () => {
      if (!Utils.shouldAutoSave()) return false;

      state._saveInProgress = true;
      const success = Utils.saveProgress();

      if (success) {
        state._lastSavePixelCount = state.paintedPixels;
        state._lastSaveTime = Date.now();
        console.log(`💾 Auto-saved at ${state.paintedPixels} pixels`);
      }

      state._saveInProgress = false;
      return success;
    },

    // --- Data management helpers ---

    // Base64 compression helpers for efficient storage
    packPaintedMapToBase64: (paintedMap, width, height) => {
      if (!paintedMap || !width || !height) return null;
      const totalBits = width * height;
      const byteLen = Math.ceil(totalBits / 8);
      const bytes = new Uint8Array(byteLen);
      let bitIndex = 0;
      for (let y = 0; y < height; y++) {
        const row = paintedMap[y];
        for (let x = 0; x < width; x++) {
          const bit = row && row[x] ? 1 : 0;
          const b = bitIndex >> 3; // byte index
          const o = bitIndex & 7; // bit offset
          if (bit) bytes[b] |= 1 << o;
          bitIndex++;
        }
      }
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(i, Math.min(i + chunk, bytes.length)),
        );
      }
      return btoa(binary);
    },

    unpackPaintedMapFromBase64: (base64, width, height) => {
      if (!base64 || !width || !height) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const map = Array(height)
        .fill()
        .map(() => Array(width).fill(false));
      let bitIndex = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const b = bitIndex >> 3;
          const o = bitIndex & 7;
          map[y][x] = ((bytes[b] >> o) & 1) === 1;
          bitIndex++;
        }
      }
      return map;
    },

    // Migration helpers for backward compatibility
    migrateProgressToV2: (saved) => {
      if (!saved) return saved;
      const isV1 =
        !saved.version ||
        saved.version === '1' ||
        saved.version === '1.0' ||
        saved.version === '1.1';
      if (!isV1) return saved;

      try {
        const migrated = { ...saved };
        const width = migrated.imageData?.width;
        const height = migrated.imageData?.height;
        if (migrated.paintedMap && width && height) {
          const data = Utils.packPaintedMapToBase64(
            migrated.paintedMap,
            width,
            height,
          );
          migrated.paintedMapPacked = { width, height, data };
        }
        delete migrated.paintedMap;
        migrated.version = '2';
        return migrated;
      } catch (e) {
        console.warn('Migration to v2 failed, using original data:', e);
        return saved;
      }
    },

    migrateProgressToV21: (saved) => {
      if (!saved) return saved;
      if (saved.version === '2.1') return saved;
      const isV2 = saved.version === '2' || saved.version === '2.0';
      const isV1 =
        !saved.version ||
        saved.version === '1' ||
        saved.version === '1.0' ||
        saved.version === '1.1';
      if (!isV2 && !isV1) return saved; // save this for future
      try {
        const migrated = { ...saved };
        // First migrate to v2 if needed
        if (isV1) {
          const width = migrated.imageData?.width;
          const height = migrated.imageData?.height;
          if (migrated.paintedMap && width && height) {
            const data = Utils.packPaintedMapToBase64(
              migrated.paintedMap,
              width,
              height,
            );
            migrated.paintedMapPacked = { width, height, data };
          }
          delete migrated.paintedMap;
        }
        migrated.version = '2.1';
        return migrated;
      } catch (e) {
        console.warn('Migration to v2.1 failed, using original data:', e);
        return saved;
      }
    },

    saveProgress: () => {
      try {
        // Pack painted map if available
        let paintedMapPacked = null;
        if (state.paintedMap && state.imageData) {
          const data = Utils.packPaintedMapToBase64(
            state.paintedMap,
            state.imageData.width,
            state.imageData.height,
          );
          if (data) {
            paintedMapPacked = {
              width: state.imageData.width,
              height: state.imageData.height,
              data: data,
            };
          }
        }

        const progressData = {
          timestamp: Date.now(),
          version: '2.1',
          state: {
            totalPixels: state.totalPixels,
            paintedPixels: state.paintedPixels,
            lastPosition: state.lastPosition,
            startPosition: state.startPosition,
            region: state.region,
            imageLoaded: state.imageLoaded,
            colorsChecked: state.colorsChecked,
            availableColors: state.availableColors,
          },
          imageData: state.imageData
            ? {
                width: state.imageData.width,
                height: state.imageData.height,
                pixels: Array.from(state.imageData.pixels),
                totalPixels: state.imageData.totalPixels,
              }
            : null,
          paintedMapPacked: paintedMapPacked,
        };

        localStorage.setItem(
          'wplace-bot-progress',
          JSON.stringify(progressData),
        );
        return true;
      } catch (error) {
        console.error('Error saving progress:', error);
        return false;
      }
    },

    loadProgress: () => {
      try {
        const saved = localStorage.getItem('wplace-bot-progress');
        if (!saved) return null;
        let data = JSON.parse(saved);
        const ver = data.version;
        let migrated = data;
        if (ver === '2.1') {
          // already latest
        } else if (ver === '2' || ver === '2.0') {
          migrated = Utils.migrateProgressToV21(data);
        } else {
          migrated = Utils.migrateProgressToV21(data);
        }
        if (migrated && migrated !== data) {
          try {
            localStorage.setItem(
              'wplace-bot-progress',
              JSON.stringify(migrated),
            );
          } catch {}
          data = migrated;
        }
        return data;
      } catch (error) {
        console.error('Error loading progress:', error);
        return null;
      }
    },

    clearProgress: () => {
      try {
        localStorage.removeItem('wplace-bot-progress');
        // Also clear painted map from memory
        state.paintedMap = null;
        state._lastSavePixelCount = 0;
        state._lastSaveTime = 0;
        console.log('📋 Progress and painted map cleared');
        return true;
      } catch (error) {
        console.error('Error clearing progress:', error);
        return false;
      }
    },

    restoreProgress: (savedData) => {
      try {
        Object.assign(state, savedData.state);

        if (savedData.imageData) {
          state.imageData = {
            ...savedData.imageData,
            pixels: new Uint8ClampedArray(savedData.imageData.pixels),
          };

          try {
            const canvas = document.createElement('canvas');
            canvas.width = state.imageData.width;
            canvas.height = state.imageData.height;
            const ctx = canvas.getContext('2d');
            const imageData = new ImageData(
              state.imageData.pixels,
              state.imageData.width,
              state.imageData.height,
            );
            ctx.putImageData(imageData, 0, 0);
            const proc = new ImageProcessor('');
            proc.img = canvas;
            proc.canvas = canvas;
            proc.ctx = ctx;
            state.imageData.processor = proc;
          } catch (e) {
            console.warn(
              'Could not rebuild processor from saved image data:',
              e,
            );
          }
        }

        // Prefer packed form if available; fallback to legacy paintedMap array for backward compatibility
        if (savedData.paintedMapPacked && savedData.paintedMapPacked.data) {
          const { width, height, data } = savedData.paintedMapPacked;
          state.paintedMap = Utils.unpackPaintedMapFromBase64(
            data,
            width,
            height,
          );
        } else if (savedData.paintedMap) {
          state.paintedMap = savedData.paintedMap.map((row) => Array.from(row));
        }

        return true;
      } catch (error) {
        console.error('Error restoring progress:', error);
        return false;
      }
    },

    saveProgressToFile: () => {
      try {
        // Pack painted map if available
        let paintedMapPacked = null;
        if (state.paintedMap && state.imageData) {
          const data = Utils.packPaintedMapToBase64(
            state.paintedMap,
            state.imageData.width,
            state.imageData.height,
          );
          if (data) {
            paintedMapPacked = {
              width: state.imageData.width,
              height: state.imageData.height,
              data: data,
            };
          }
        }

        const progressData = {
          timestamp: Date.now(),
          version: '2.1',
          state: {
            totalPixels: state.totalPixels,
            paintedPixels: state.paintedPixels,
            lastPosition: state.lastPosition,
            startPosition: state.startPosition,
            region: state.region,
            imageLoaded: state.imageLoaded,
            colorsChecked: state.colorsChecked,
            availableColors: state.availableColors,
          },
          imageData: state.imageData
            ? {
                width: state.imageData.width,
                height: state.imageData.height,
                pixels: Array.from(state.imageData.pixels),
                totalPixels: state.imageData.totalPixels,
              }
            : null,
          paintedMapPacked: paintedMapPacked,
        };

        const filename = `wplace-bot-progress-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        Utils.createFileDownloader(
          JSON.stringify(progressData, null, 2),
          filename,
        );
        return true;
      } catch (error) {
        console.error('Error saving to file:', error);
        return false;
      }
    },

    loadProgressFromFile: async () => {
      try {
        const data = await Utils.createFileUploader();
        if (!data || !data.state) {
          throw new Error('Invalid file format');
        }
        const ver = data.version;
        let migrated = data;
        if (ver === '2.1') {
        } else if (ver === '2' || ver === '2.0') {
          migrated = Utils.migrateProgressToV21(data) || data;
        } else {
          migrated = Utils.migrateProgressToV21(data) || data;
        }
        const success = Utils.restoreProgress(migrated);
        return success;
      } catch (error) {
        console.error('Error loading from file:', error);
        throw error;
      }
    },

    // Helper function to restore overlay from loaded data
    restoreOverlayFromData: async () => {
      if (
        !state.imageLoaded ||
        !state.imageData ||
        !state.startPosition ||
        !state.region
      ) {
        return false;
      }

      try {
        // Recreate ImageBitmap from loaded pixel data
        const imageData = new ImageData(
          state.imageData.pixels,
          state.imageData.width,
          state.imageData.height,
        );

        const canvas = new OffscreenCanvas(
          state.imageData.width,
          state.imageData.height,
        );
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        const imageBitmap = await canvas.transferToImageBitmap();

        // Set up overlay with restored data
        await overlayManager.setImage(imageBitmap);
        await overlayManager.setPosition(state.startPosition, state.region);
        overlayManager.enable();

        // Update overlay button state
        const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
        if (toggleOverlayBtn) {
          toggleOverlayBtn.disabled = false;
          toggleOverlayBtn.classList.add('active');
        }

        console.log('Overlay restored from data');
        return true;
      } catch (error) {
        console.error('Failed to restore overlay from data:', error);
        return false;
      }
    },
  };

  // IMAGE PROCESSOR CLASS
  class ImageProcessor {
    constructor(imageSrc) {
      this.imageSrc = imageSrc;
      this.img = null;
      this.canvas = null;
      this.ctx = null;
    }

    async load() {
      return new Promise((resolve, reject) => {
        this.img = new Image();
        this.img.crossOrigin = 'anonymous';
        this.img.onload = () => {
          this.canvas = document.createElement('canvas');
          this.ctx = this.canvas.getContext('2d');
          this.canvas.width = this.img.width;
          this.canvas.height = this.img.height;
          this.ctx.drawImage(this.img, 0, 0);
          resolve();
        };
        this.img.onerror = reject;
        this.img.src = this.imageSrc;
      });
    }

    getDimensions() {
      return {
        width: this.canvas.width,
        height: this.canvas.height,
      };
    }

    getPixelData() {
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        .data;
    }

    resize(newWidth, newHeight) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      tempCanvas.width = newWidth;
      tempCanvas.height = newHeight;

      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);

      this.canvas.width = newWidth;
      this.canvas.height = newHeight;
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(tempCanvas, 0, 0);

      return this.ctx.getImageData(0, 0, newWidth, newHeight).data;
    }

    generatePreview(width, height) {
      const previewCanvas = document.createElement('canvas');
      const previewCtx = previewCanvas.getContext('2d');

      previewCanvas.width = width;
      previewCanvas.height = height;

      previewCtx.imageSmoothingEnabled = false;
      previewCtx.drawImage(this.img, 0, 0, width, height);

      return previewCanvas.toDataURL();
    }
  }

  // WPLACE API SERVICE
  const WPlaceService = {
    async paintPixelInRegion(regionX, regionY, pixelX, pixelY, color) {
      try {
        await ensureToken();
        if (!turnstileToken) return 'token_error';
        const payload = {
          coords: [pixelX, pixelY],
          colors: [color],
          t: turnstileToken,
        };
        const res = await fetchWithAccountCookies(
          `https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify(payload),
          },
        );
        if (res.status === 403) {
          console.error(
            '❌ 403 Forbidden. Turnstile token might be invalid or expired.',
          );
          turnstileToken = null;
          tokenPromise = new Promise((resolve) => {
            _resolveToken = resolve;
          });
          return 'token_error';
        }
        const data = await res.json();
        return data?.painted === 1;
      } catch (e) {
        console.error('Paint request failed:', e);
        return false;
      }
    },

    async getCharges() {
      try {
        const res = await fetchWithAccountCookies(
          'https://backend.wplace.live/me',
          {},
        );
        const data = await res.json();
        const charges = data.charges?.count || 0;

        // Update account manager with current charges
        accountManager.updateAccountCharges(charges);
        updateAccountUI();

        return {
          charges: charges,
          max: data.charges?.max || 1,
          cooldown: data.charges?.next || CONFIG.COOLDOWN_DEFAULT,
        };
      } catch (e) {
        console.error('Failed to get charges:', e);
        return {
          charges: 0,
          max: 1,
          cooldown: CONFIG.COOLDOWN_DEFAULT,
        };
      }
    },
  };

  // Desktop Notification Manager
  const NotificationManager = {
    pollTimer: null,
    pollIntervalMs: 60_000,
    icon() {
      const link = document.querySelector("link[rel~='icon']");
      return link?.href || location.origin + '/favicon.ico';
    },
    async requestPermission() {
      if (!('Notification' in window)) {
        Utils.showAlert(
          'Notifications are not supported in this browser.',
          'warning',
        );
        return 'denied';
      }
      if (Notification.permission === 'granted') return 'granted';
      try {
        const perm = await Notification.requestPermission();
        return perm;
      } catch {
        return Notification.permission;
      }
    },
    canNotify() {
      return (
        state.notificationsEnabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      );
    },
    notify(title, body, tag = 'wplace-charges', force = false) {
      if (!this.canNotify()) return false;
      if (!force && state.notifyOnlyWhenUnfocused && document.hasFocus())
        return false;
      try {
        new Notification(title, {
          body,
          tag,
          renotify: true,
          icon: this.icon(),
          badge: this.icon(),
          silent: false,
        });
        return true;
      } catch {
        // Graceful fallback
        Utils.showAlert(body, 'info');
        return false;
      }
    },
    resetEdgeTracking() {
      state._lastChargesBelow =
        state.currentCharges < state.cooldownChargeThreshold;
      state._lastChargesNotifyAt = 0;
    },
    maybeNotifyChargesReached(force = false) {
      if (!state.notificationsEnabled || !state.notifyOnChargesReached) return;
      const reached = state.currentCharges >= state.cooldownChargeThreshold;
      const now = Date.now();
      const repeatMs =
        Math.max(1, Number(state.notificationIntervalMinutes || 5)) * 60_000;
      if (reached) {
        const shouldEdge = state._lastChargesBelow || force;
        const shouldRepeat =
          now - (state._lastChargesNotifyAt || 0) >= repeatMs;
        if (shouldEdge || shouldRepeat) {
          const msg = `Charges ready: ${Math.floor(state.currentCharges)} / ${state.maxCharges}. Threshold: ${state.cooldownChargeThreshold}.`;
          this.notify('WPlace — Charges Ready', msg, 'wplace-notify-charges');
          state._lastChargesNotifyAt = now;
        }
        state._lastChargesBelow = false;
      } else {
        state._lastChargesBelow = true;
      }
    },
    startPolling() {
      this.stopPolling();
      if (!state.notificationsEnabled || !state.notifyOnChargesReached) return;
      // lightweight background polling
      this.pollTimer = setInterval(async () => {
        try {
          const { charges, cooldown, max } = await WPlaceService.getCharges();
          state.currentCharges = Math.floor(charges);
          state.cooldown = cooldown;
          state.maxCharges = Math.max(1, Math.floor(max));
          this.maybeNotifyChargesReached();
        } catch {
          /* ignore */
        }
      }, this.pollIntervalMs);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    syncFromState() {
      this.resetEdgeTracking();
      if (state.notificationsEnabled && state.notifyOnChargesReached)
        this.startPolling();
      else this.stopPolling();
    },
  };

  // COLOR MATCHING FUNCTION - Optimized with caching
  const colorCache = new Map();

  function findClosestColor(targetRgb, availableColors) {
    if (!availableColors || availableColors.length === 0) return 1;
    const cacheKey = `${targetRgb[0]},${targetRgb[1]},${targetRgb[2]}|${state.colorMatchingAlgorithm}|${state.enableChromaPenalty ? 'c' : 'nc'}|${state.chromaPenaltyWeight}`;
    if (colorCache.has(cacheKey)) return colorCache.get(cacheKey);

    const whiteThreshold = state.customWhiteThreshold || CONFIG.WHITE_THRESHOLD;
    if (
      targetRgb[0] >= whiteThreshold &&
      targetRgb[1] >= whiteThreshold &&
      targetRgb[2] >= whiteThreshold
    ) {
      const whiteEntry = availableColors.find(
        (c) =>
          c.rgb[0] >= whiteThreshold &&
          c.rgb[1] >= whiteThreshold &&
          c.rgb[2] >= whiteThreshold,
      );
      if (whiteEntry) {
        colorCache.set(cacheKey, whiteEntry.id);
        return whiteEntry.id;
      }
    }

    let bestId = availableColors[0].id;
    let bestScore = Infinity;

    if (state.colorMatchingAlgorithm === 'legacy') {
      for (let i = 0; i < availableColors.length; i++) {
        const c = availableColors[i];
        const [r, g, b] = c.rgb;
        const rmean = (r + targetRgb[0]) / 2;
        const rdiff = r - targetRgb[0];
        const gdiff = g - targetRgb[1];
        const bdiff = b - targetRgb[2];
        const dist = Math.sqrt(
          (((512 + rmean) * rdiff * rdiff) >> 8) +
            4 * gdiff * gdiff +
            (((767 - rmean) * bdiff * bdiff) >> 8),
        );
        if (dist < bestScore) {
          bestScore = dist;
          bestId = c.id;
          if (dist === 0) break;
        }
      }
    } else {
      // lab
      const [Lt, at, bt] = Utils._lab(targetRgb[0], targetRgb[1], targetRgb[2]);
      const targetChroma = Math.sqrt(at * at + bt * bt);
      const penaltyWeight = state.enableChromaPenalty
        ? state.chromaPenaltyWeight || 0.15
        : 0;
      for (let i = 0; i < availableColors.length; i++) {
        const c = availableColors[i];
        const [r, g, b] = c.rgb;
        const [L2, a2, b2] = Utils._lab(r, g, b);
        const dL = Lt - L2,
          da = at - a2,
          db = bt - b2;
        let dist = dL * dL + da * da + db * db;
        if (penaltyWeight > 0 && targetChroma > 20) {
          const candChroma = Math.sqrt(a2 * a2 + b2 * b2);
          if (candChroma < targetChroma) {
            const cd = targetChroma - candChroma;
            dist += cd * cd * penaltyWeight;
          }
        }
        if (dist < bestScore) {
          bestScore = dist;
          bestId = c.id;
          if (dist === 0) break;
        }
      }
    }

    colorCache.set(cacheKey, bestId);
    if (colorCache.size > 15000) {
      const firstKey = colorCache.keys().next().value;
      colorCache.delete(firstKey);
    }
    return bestId;
  }

  // UI UPDATE FUNCTIONS (declared early to avoid reference errors)
  let updateUI = () => {};
  let updateStats = () => {};
  let updateDataButtons = () => {};

  function updateActiveColorPalette() {
    state.activeColorPalette = [];
    const activeSwatches = document.querySelectorAll(
      '.wplace-color-swatch.active',
    );
    if (activeSwatches) {
      activeSwatches.forEach((swatch) => {
        const rgbStr = swatch.getAttribute('data-rgb');
        if (rgbStr) {
          const rgb = rgbStr.split(',').map(Number);
          state.activeColorPalette.push(rgb);
        }
      });
    }
    if (
      document.querySelector('.resize-container')?.style.display === 'block'
    ) {
      _updateResizePreview();
    }
  }

  function toggleAllColors(select, showingUnavailable = false) {
    const swatches = document.querySelectorAll('.wplace-color-swatch');
    if (swatches) {
      swatches.forEach((swatch) => {
        // Only toggle colors that are available or if we're showing unavailable colors
        const isUnavailable = swatch.classList.contains('unavailable');
        if (!isUnavailable || showingUnavailable) {
          // Don't try to select unavailable colors
          if (!isUnavailable) {
            swatch.classList.toggle('active', select);
          }
        }
      });
    }
    updateActiveColorPalette();
  }

  function initializeColorPalette(container) {
    const colorsContainer = container.querySelector('#colors-container');
    const showAllToggle = container.querySelector('#showAllColorsToggle');
    if (!colorsContainer) return;

    // Use already captured colors from state (captured during upload)
    // Don't re-fetch colors here, use what was captured when user clicked upload
    if (!state.availableColors || state.availableColors.length === 0) {
      // If no colors have been captured yet, show message
      colorsContainer.innerHTML =
        '<div style="text-align: center; color: #888; padding: 20px;">Upload an image first to capture available colors</div>';
      return;
    }

    function populateColors(showUnavailable = false) {
      colorsContainer.innerHTML = '';
      let availableCount = 0;
      let totalCount = 0;

      // Convert COLOR_MAP to array and filter out transparent
      const allColors = Object.values(CONFIG.COLOR_MAP).filter(
        (color) => color.rgb !== null,
      );

      allColors.forEach((colorData) => {
        const { id, name, rgb } = colorData;
        const rgbKey = `${rgb.r},${rgb.g},${rgb.b}`;
        totalCount++;

        // Check if this color is available in the captured colors
        const isAvailable = state.availableColors.some(
          (c) => c.rgb[0] === rgb.r && c.rgb[1] === rgb.g && c.rgb[2] === rgb.b,
        );

        // If not showing all colors and this color is not available, skip it
        if (!showUnavailable && !isAvailable) {
          return;
        }

        if (isAvailable) availableCount++;

        const colorItem = Utils.createElement('div', {
          className: 'wplace-color-item',
        });
        const swatch = Utils.createElement('button', {
          className: `wplace-color-swatch ${!isAvailable ? 'unavailable' : ''}`,
          title: `${name} (ID: ${id})${!isAvailable ? ' (Unavailable)' : ''}`,
          'data-rgb': rgbKey,
          'data-color-id': id,
        });
        swatch.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

        // Make unavailable colors visually distinct
        if (!isAvailable) {
          swatch.style.opacity = '0.4';
          swatch.style.filter = 'grayscale(50%)';
          swatch.disabled = true;
        } else {
          // Select available colors by default
          swatch.classList.add('active');
        }

        const nameLabel = Utils.createElement(
          'span',
          {
            className: 'wplace-color-item-name',
            style: !isAvailable ? 'color: #888; font-style: italic;' : '',
          },
          name + (!isAvailable ? ' (N/A)' : ''),
        );

        // Only add click listener for available colors
        if (isAvailable) {
          swatch.addEventListener('click', () => {
            swatch.classList.toggle('active');
            updateActiveColorPalette();
          });
        }

        colorItem.appendChild(swatch);
        colorItem.appendChild(nameLabel);
        colorsContainer.appendChild(colorItem);
      });

      updateActiveColorPalette();
    }

    // Initialize with only available colors
    populateColors(false);

    // Add toggle functionality
    if (showAllToggle) {
      showAllToggle.addEventListener('change', (e) => {
        populateColors(e.target.checked);
      });
    }

    container
      .querySelector('#selectAllBtn')
      ?.addEventListener('click', () =>
        toggleAllColors(true, showAllToggle?.checked),
      );
    container
      .querySelector('#unselectAllBtn')
      ?.addEventListener('click', () =>
        toggleAllColors(false, showAllToggle?.checked),
      );
  }
  async function handleCaptcha() {
    const startTime = performance.now();

    // Check user's token source preference
    if (state.tokenSource === 'manual') {
      console.log(
        '🎯 Manual token source selected - using pixel placement automation',
      );
      return await handleCaptchaFallback();
    }

    // Generator mode (pure) or Hybrid mode - try generator first
    try {
      // Use optimized token generation with automatic sitekey detection
      const sitekey = Utils.detectSitekey();
      console.log('🔑 Generating Turnstile token for sitekey:', sitekey);
      console.log(
        '🧭 UA:',
        navigator.userAgent.substring(0, 50) + '...',
        'Platform:',
        navigator.platform,
      );

      // Add additional checks before token generation
      if (!window.turnstile) {
        await Utils.loadTurnstile();
      }

      const token = await Utils.generatePaintToken(sitekey);

      console.log(
        `🔍 Token received - Type: ${typeof token}, Value: ${token ? (typeof token === 'string' ? (token.length > 50 ? token.substring(0, 50) + '...' : token) : JSON.stringify(token)) : 'null/undefined'}, Length: ${token?.length || 0}`,
      );

      if (typeof token === 'string' && token.length > 20) {
        const duration = Math.round(performance.now() - startTime);
        console.log(
          `✅ Turnstile token generated successfully in ${duration}ms`,
        );
        return token;
      } else {
        throw new Error(
          `Invalid or empty token received - Type: ${typeof token}, Value: ${JSON.stringify(token)}, Length: ${token?.length || 0}`,
        );
      }
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      console.error(
        `❌ Turnstile token generation failed after ${duration}ms:`,
        error,
      );

      // Fallback to manual pixel placement for hybrid mode
      if (state.tokenSource === 'hybrid') {
        console.log(
          '🔄 Hybrid mode: Generator failed, automatically switching to manual pixel placement...',
        );
        const fbToken = await handleCaptchaFallback();
        return fbToken;
      } else {
        // Pure generator mode - don't fallback, just fail
        throw error;
      }
    }
  }

  // Keep original method as fallback
  async function handleCaptchaFallback() {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure we have a fresh promise to await for a new token capture
        if (!_resolveToken) {
          tokenPromise = new Promise((res) => {
            _resolveToken = res;
          });
        }
        const timeoutPromise = Utils.sleep(20000).then(() =>
          reject(new Error('Auto-CAPTCHA timed out.')),
        );

        const solvePromise = (async () => {
          const mainPaintBtn = await Utils.waitForSelector(
            'button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl',
            200,
            10000,
          );
          if (!mainPaintBtn)
            throw new Error('Could not find the main paint button.');
          mainPaintBtn.click();
          await Utils.sleep(500);

          const transBtn = await Utils.waitForSelector(
            'button#color-0',
            200,
            5000,
          );
          if (!transBtn)
            throw new Error('Could not find the transparent color button.');
          transBtn.click();
          await Utils.sleep(500);

          const canvas = await Utils.waitForSelector('canvas', 200, 5000);
          if (!canvas) throw new Error('Could not find the canvas element.');

          canvas.setAttribute('tabindex', '0');
          canvas.focus();
          const rect = canvas.getBoundingClientRect();
          const centerX = Math.round(rect.left + rect.width / 2);
          const centerY = Math.round(rect.top + rect.height / 2);

          canvas.dispatchEvent(
            new MouseEvent('mousemove', {
              clientX: centerX,
              clientY: centerY,
              bubbles: true,
            }),
          );
          canvas.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: ' ',
              code: 'Space',
              bubbles: true,
            }),
          );
          await Utils.sleep(50);
          canvas.dispatchEvent(
            new KeyboardEvent('keyup', {
              key: ' ',
              code: 'Space',
              bubbles: true,
            }),
          );
          await Utils.sleep(500);

          // 800ms delay before sending confirmation
          await Utils.sleep(800);

          // Keep confirming until token is captured
          const confirmLoop = async () => {
            while (!turnstileToken) {
              let confirmBtn = await Utils.waitForSelector(
                'button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl',
              );
              if (!confirmBtn) {
                const allPrimary = Array.from(
                  document.querySelectorAll('button.btn-primary'),
                );
                confirmBtn = allPrimary.length
                  ? allPrimary[allPrimary.length - 1]
                  : null;
              }
              if (confirmBtn) {
                confirmBtn.click();
              }
              await Utils.sleep(500); // 500ms delay between confirmation attempts
            }
          };

          // Start confirmation loop and wait for token
          confirmLoop();
          const token = await tokenPromise;
          await Utils.sleep(300); // small delay after token is captured
          resolve(token);
        })();

        await Promise.race([solvePromise, timeoutPromise]);
      } catch (error) {
        console.error('Auto-CAPTCHA process failed:', error);
        reject(error);
      }
    });
  }

  // ACCOUNT MANAGER UI FUNCTIONS
  function updateAccountUI() {
    const currentAccountInfo = document.getElementById('currentAccountInfo');
    const currentAccountName = document.getElementById('currentAccountName');
    const currentAccountCharges = document.getElementById(
      'currentAccountCharges',
    );

    if (!currentAccountInfo || !currentAccountName || !currentAccountCharges)
      return;

    const currentAccount = accountManager.getCurrentAccount();
    if (currentAccount) {
      currentAccountInfo.style.display = 'block';
      currentAccountName.textContent = currentAccount.name;
      currentAccountCharges.textContent = currentAccount.charges || 0;
    } else {
      currentAccountInfo.style.display = 'none';
    }
  }

  function showAccountManagerModal() {
    const modal = document.createElement('div');
    modal.className = 'wplace-account-modal';
    modal.innerHTML = `
        <div class="wplace-account-modal-content">
          <div class="wplace-modal-header">
            <div class="wplace-modal-title">
              <i class="fas fa-users"></i>
              ${Utils.t('accountManager')}
            </div>
            <button class="wplace-close-btn" onclick="this.closest('.wplace-account-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="wplace-add-account">
            <h3 style="margin-top: 0;">${Utils.t('addAccount')}</h3>
            <div class="wplace-form-group">
              <label class="wplace-form-label">${Utils.t('accountName')}</label>
              <input type="text" id="accountNameInput" class="wplace-form-input" placeholder="${Utils.t('accountNamePlaceholder')}">
            </div>
            <div class="wplace-form-group">
              <label class="wplace-form-label">${Utils.t('accountCookies')}</label>
              <textarea id="accountCookiesInput" class="wplace-form-input wplace-textarea" placeholder="${Utils.t('cookiesPlaceholder')}"></textarea>
            </div>
            <button id="addAccountBtn" class="wplace-btn wplace-btn-primary">
              <i class="fas fa-plus"></i>
              ${Utils.t('addAccount')}
            </button>
            <button id="debugCookiesBtn" class="wplace-btn" style="margin-left: 10px; background: #ff9800;">
              <i class="fas fa-bug"></i>
              Debug Cookies
            </button>
          </div>
          
          <div class="wplace-accounts-list">
            <h3>${Utils.t('currentAccount')} (${accountManager.accounts.length})</h3>
            <div id="accountsList"></div>
          </div>
        </div>
      `;

    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Add account button handler
    const addAccountBtn = modal.querySelector('#addAccountBtn');
    const accountNameInput = modal.querySelector('#accountNameInput');
    const accountCookiesInput = modal.querySelector('#accountCookiesInput');

    addAccountBtn.addEventListener('click', () => {
      const name = accountNameInput.value.trim();
      const cookies = accountCookiesInput.value.trim();

      if (!name || !cookies) {
        Utils.showAlert(Utils.t('invalidAccountData'), 'error');
        return;
      }

      if (accountManager.addAccount(name, cookies)) {
        Utils.showAlert(Utils.t('accountAdded'), 'success');
        accountNameInput.value = '';
        accountCookiesInput.value = '';
        refreshAccountsList(modal);
        updateAccountUI();
      }
    });

    // Debug cookies button handler
    const debugCookiesBtn = modal.querySelector('#debugCookiesBtn');
    debugCookiesBtn.addEventListener('click', () => {
      console.log('🐛 Manual Cookie Debug Triggered');
      debugCurrentCookies();

      // Also test making a request to see what cookies are actually sent
      fetchWithAccountCookies('https://backend.wplace.live/me', {})
        .then((res) => res.json())
        .then((data) => {
          console.log('🐛 Test API Response:', data);
          Utils.showAlert('Cookie debug info logged to console', 'info');
        })
        .catch((err) => {
          console.error('🐛 Test API Error:', err);
          Utils.showAlert('Check console for cookie debug info', 'warning');
        });
    });

    refreshAccountsList(modal);
  }

  function refreshAccountsList(modal) {
    const accountsList = modal.querySelector('#accountsList');
    const accounts = accountManager.getAccountsInfo();

    if (accounts.length === 0) {
      accountsList.innerHTML =
        '<div style="text-align: center; color: #888; padding: 20px;">No accounts added yet</div>';
      return;
    }

    accountsList.innerHTML = accounts
      .map((account) => {
        const lastUsed = account.lastUsed
          ? new Date(account.lastUsed).toLocaleString()
          : 'Never';
        return `
          <div class="wplace-account-item ${account.isCurrent ? 'current' : ''}">
            <div class="wplace-account-details">
              <div class="wplace-account-name">${account.name} ${account.isCurrent ? '(Current)' : ''}</div>
              <div class="wplace-account-status">
                <span>${Utils.t('accountCharges').replace('{charges}', account.charges || 0)}</span>
                <span>${Utils.t('accountLastUsed').replace('{time}', lastUsed)}</span>
              </div>
            </div>
            <div class="wplace-account-actions">
              ${!account.isCurrent ? `<button class="wplace-btn wplace-btn-small wplace-btn-primary" onclick="switchToAccount(${account.id})">Use</button>` : ''}
              <button class="wplace-btn wplace-btn-small wplace-btn-danger" onclick="removeAccount(${account.id})">
                ${Utils.t('removeAccount')}
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Global functions for account actions
  window.switchToAccount = async function (accountId) {
    const accounts = accountManager.accounts;
    const targetIndex = accounts.findIndex((acc) => acc.id === accountId);
    if (targetIndex !== -1) {
      accountManager.currentAccountIndex = targetIndex;
      await accountManager.setCurrentAccountCookies();
      accountManager.saveAccounts();

      // Reset Turnstile state for new account
      resetTurnstileForAccountSwitch();

      updateAccountUI();

      const modal = document.querySelector('.wplace-account-modal');
      if (modal) {
        refreshAccountsList(modal);
      }

      const account = accounts[targetIndex];
      Utils.showAlert(
        Utils.t('accountSwitched').replace('{name}', account.name),
        'success',
      );
    }
  };

  window.removeAccount = function (accountId) {
    if (confirm('Are you sure you want to remove this account?')) {
      accountManager.removeAccount(accountId);
      updateAccountUI();

      const modal = document.querySelector('.wplace-account-modal');
      if (modal) {
        refreshAccountsList(modal);
      }

      Utils.showAlert(Utils.t('accountRemoved'), 'success');
    }
  };

  async function createUI() {
    await detectLanguage();

    const existingContainer = document.getElementById(
      'wplace-image-bot-container',
    );
    const existingStats = document.getElementById('wplace-stats-container');
    const existingSettings = document.getElementById(
      'wplace-settings-container',
    );
    const existingResizeContainer = document.querySelector('.resize-container');
    const existingResizeOverlay = document.querySelector('.resize-overlay');

    if (existingContainer) existingContainer.remove();
    if (existingStats) existingStats.remove();
    if (existingSettings) existingSettings.remove();
    if (existingResizeContainer) existingResizeContainer.remove();
    if (existingResizeOverlay) existingResizeOverlay.remove();

    loadThemePreference();
    loadLanguagePreference();

    const theme = getCurrentTheme();

    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href =
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    if (theme.fontFamily.includes('Press Start 2P')) {
      const googleFonts = document.createElement('link');
      googleFonts.rel = 'stylesheet';
      googleFonts.href =
        'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
      document.head.appendChild(googleFonts);
    }

    const style = document.createElement('style');
    style.setAttribute('data-wplace-theme', 'true');

    style.textContent = `
        ${
          theme.animations.glow
            ? `
        @keyframes neonGlow {
          0%, 100% {
            text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
          }
          50% {
            text-shadow: 0 0 2px currentColor, 0 0 5px currentColor, 0 0 8px currentColor;
          }
        }`
            : ''
        }
  
        ${
          theme.animations.pixelBlink
            ? `
        @keyframes pixelBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.7; }
        }`
            : ''
        }
  
        ${
          theme.animations.scanline
            ? `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400px); }
        }`
            : ''
        }
  
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
        }
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
  
        #wplace-image-bot-container {
          position: fixed;
          top: 20px;
          left: 20px;
          width: ${CONFIG.currentTheme === 'Neon Retro' ? '280px' : '280px'};
          max-height: calc(100vh - 40px);
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.primary} 0%, #1a1a1a 100%)`
              : theme.primary
          };
          border: ${theme.borderWidth} ${theme.borderStyle} ${CONFIG.currentTheme === 'Classic Autobot' ? theme.accent : theme.text};
          border-radius: ${theme.borderRadius};
          padding: 0;
          box-shadow: ${theme.boxShadow};
          z-index: 9998;
          font-family: ${theme.fontFamily};
          color: ${theme.text};
          animation: slideIn 0.4s ease-out;
          overflow-y: auto; /* Allow scrolling for main panel */
          overflow-x: hidden;
          ${theme.backdropFilter ? `backdrop-filter: ${theme.backdropFilter};` : ''}
          transition: all 0.3s ease;
          user-select: none;
          ${CONFIG.currentTheme === 'Neon Retro' ? 'image-rendering: pixelated;' : ''}
        }
  
        ${
          theme.animations.scanline
            ? `
        #wplace-image-bot-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${theme.neon}, transparent);
          animation: scanline 3s linear infinite;
          z-index: 1;
          pointer-events: none;
        }`
            : ''
        }
  
        ${
          CONFIG.currentTheme === 'Neon Retro'
            ? `
        #wplace-image-bot-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 65, 0.03) 2px,
              rgba(0, 255, 65, 0.03) 4px
            );
          pointer-events: none;
          z-index: 1;
        }`
            : ''
        }
  
        #wplace-image-bot-container.wplace-dragging {
          transition: none;
          box-shadow: 0 12px 40px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.2);
          transform: scale(1.02);
          z-index: 9999;
        }
        #wplace-image-bot-container.wplace-minimized {
          width: 200px;
          height: auto;
          overflow: hidden;
        }
        #wplace-image-bot-container.wplace-compact {
          width: 240px;
        }
  
        /* Stats Container */
        #wplace-stats-container {
          position: fixed;
          top: 20px;
          left: 330px;
          width: ${CONFIG.currentTheme === 'Neon Retro' ? '280px' : '280px'};
          max-height: calc(100vh - 40px);
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.primary} 0%, #1a1a1a 100%)`
              : theme.primary
          };
          border: ${theme.borderWidth} ${theme.borderStyle} ${CONFIG.currentTheme === 'Classic Autobot' ? theme.accent : theme.text};
          border-radius: ${theme.borderRadius};
          padding: 0;
          box-shadow: ${theme.boxShadow};
          z-index: 9997;
          font-family: ${theme.fontFamily};
          color: ${theme.text};
          animation: slideIn 0.4s ease-out;
          overflow-y: auto; /* Make stats panel scrollable */
          ${theme.backdropFilter ? `backdrop-filter: ${theme.backdropFilter};` : ''}
          transition: all 0.3s ease;
          user-select: none;
          ${CONFIG.currentTheme === 'Neon Retro' ? 'image-rendering: pixelated;' : ''}
        }
  
        /* FIX: Disable transition during drag to prevent lag */
        #wplace-stats-container.wplace-dragging {
          transition: none;
        }
  
        .wplace-header {
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '8px 12px' : '8px 12px'};
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.secondary} 0%, #2a2a2a 100%)`
              : theme.secondary
          };
          color: ${theme.highlight};
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '11px' : '13px'};
          font-weight: ${CONFIG.currentTheme === 'Neon Retro' ? 'normal' : '700'};
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
          border-bottom: ${CONFIG.currentTheme === 'Neon Retro' ? '2px' : '1px'} solid ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255,255,255,0.1)' : theme.text};
          ${CONFIG.currentTheme === 'Classic Autobot' ? 'text-shadow: 0 1px 2px rgba(0,0,0,0.5);' : 'text-transform: uppercase; letter-spacing: 1px;'}
          transition: background 0.2s ease;
          position: relative;
          z-index: 2;
          ${theme.animations.glow ? 'animation: neonGlow 2s ease-in-out infinite alternate;' : ''}
        }
  
        .wplace-header-title {
          display: flex;
          align-items: center;
          gap: ${CONFIG.currentTheme === 'Neon Retro' ? '6px' : '6px'};
        }
  
        .wplace-header-controls {
          display: flex;
          gap: ${CONFIG.currentTheme === 'Neon Retro' ? '6px' : '6px'};
        }
  
        .wplace-header-btn {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255,255,255,0.1)' : theme.accent};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? `2px solid ${theme.text}` : 'none'};
          color: ${theme.text};
          cursor: pointer;
          border-radius: ${CONFIG.currentTheme === 'Classic Autobot' ? '4px' : '0'};
          width: ${CONFIG.currentTheme === 'Classic Autobot' ? '18px' : 'auto'};
          height: ${CONFIG.currentTheme === 'Classic Autobot' ? '18px' : 'auto'};
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '4px 6px' : '0'};
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '10px'};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-family: ${theme.fontFamily};
          ${CONFIG.currentTheme === 'Neon Retro' ? 'image-rendering: pixelated;' : ''}
        }
        .wplace-header-btn:hover {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? theme.accent : theme.text};
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? theme.text : theme.primary};
          transform: ${CONFIG.currentTheme === 'Classic Autobot' ? 'scale(1.1)' : 'none'};
          ${CONFIG.currentTheme === 'Neon Retro' ? `box-shadow: 0 0 10px ${theme.text};` : ''}
        }
  
        .wplace-content {
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '12px' : '12px'};
          display: block;
          position: relative;
          z-index: 2;
        }
        .wplace-content.wplace-hidden {
          display: none;
        }
  
        .wplace-status-section {
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(255,255,255,0.03);
          border-radius: ${theme.borderRadius};
          border: 1px solid rgba(255,255,255,0.1);
        }
  
        .wplace-section {
          margin-bottom: ${CONFIG.currentTheme === 'Neon Retro' ? '12px' : '12px'};
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: ${theme.borderRadius};
          border: 1px solid rgba(255,255,255,0.1);
        }
  
        .wplace-section-title {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 8px;
          color: ${theme.highlight};
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
  
        .wplace-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .wplace-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .wplace-row.single {
          grid-template-columns: 1fr;
        }
  
        .wplace-btn {
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '12px 8px' : '8px 12px'};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? '2px solid' : 'none'};
          border-radius: ${theme.borderRadius};
          font-weight: ${CONFIG.currentTheme === 'Neon Retro' ? 'normal' : '500'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '6px'};
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '11px'};
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          font-family: ${theme.fontFamily};
          ${CONFIG.currentTheme === 'Neon Retro' ? 'text-transform: uppercase; letter-spacing: 1px; image-rendering: pixelated;' : ''}
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.accent} 0%, #4a4a4a 100%)`
              : theme.accent
          };
          ${CONFIG.currentTheme === 'Classic Autobot' ? 'border: 1px solid rgba(255,255,255,0.1);' : ''}
        }
  
        ${
          CONFIG.currentTheme === 'Classic Autobot'
            ? `
        .wplace-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s ease;
        }
        .wplace-btn:hover:not(:disabled)::before {
          left: 100%;
        }`
            : `
        .wplace-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        .wplace-btn:hover::before {
          left: 100%;
        }`
        }
  
        .wplace-btn:hover:not(:disabled) {
          transform: ${CONFIG.currentTheme === 'Classic Autobot' ? 'translateY(-1px)' : 'none'};
          box-shadow: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? '0 4px 12px rgba(0,0,0,0.4)'
              : '0 0 15px currentColor'
          };
          ${theme.animations.pixelBlink ? 'animation: pixelBlink 0.5s infinite;' : ''}
        }
        .wplace-btn:active:not(:disabled) {
          transform: translateY(0);
        }
  
        .wplace-btn-primary {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.accent} 0%, #6a5acd 100%)`
              : theme.accent
          };
          color: ${theme.text};
          ${CONFIG.currentTheme === 'Neon Retro' ? `border-color: ${theme.text};` : ''}
        }
        .wplace-btn-upload {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.secondary} 0%, #4a4a4a 100%)`
              : theme.purple
          };
          color: ${theme.text};
          ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `border: 1px dashed ${theme.highlight};`
              : `border-color: ${theme.text}; border-style: dashed;`
          }
        }
        .wplace-btn-start {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.success} 0%, #228b22 100%)`
              : theme.success
          };
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? 'white' : theme.primary};
          ${CONFIG.currentTheme === 'Neon Retro' ? `border-color: ${theme.success};` : ''}
        }
        .wplace-btn-stop {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.error} 0%, #dc143c 100%)`
              : theme.error
          };
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? 'white' : theme.text};
          ${CONFIG.currentTheme === 'Neon Retro' ? `border-color: ${theme.error};` : ''}
        }
        .wplace-btn-select {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.highlight} 0%, #9370db 100%)`
              : theme.highlight
          };
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? 'white' : theme.primary};
          ${CONFIG.currentTheme === 'Neon Retro' ? `border-color: ${theme.highlight};` : ''}
        }
        .wplace-btn-file {
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? 'linear-gradient(135deg, #ff8c00 0%, #ff7f50 100%)'
              : theme.warning
          };
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? 'white' : theme.primary};
          ${CONFIG.currentTheme === 'Neon Retro' ? `border-color: ${theme.warning};` : ''}
        }
        .wplace-btn:disabled {
          opacity: ${CONFIG.currentTheme === 'Classic Autobot' ? '0.5' : '0.3'};
          cursor: not-allowed;
          transform: none !important;
          ${theme.animations.pixelBlink ? 'animation: none !important;' : ''}
          box-shadow: none !important;
        }
        .wplace-btn:disabled::before {
          display: none;
        }
        
        .wplace-btn-overlay.active {
          background: linear-gradient(135deg, #29b6f6 0%, #8e2de2 100%);
          box-shadow: 0 0 15px #8e2de2;
        }
  
        .wplace-stats {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255,255,255,0.03)' : theme.secondary};
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '12px' : '8px'};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? `2px solid ${theme.text}` : '1px solid rgba(255,255,255,0.1)'};
          border-radius: ${theme.borderRadius};
          margin-bottom: ${CONFIG.currentTheme === 'Neon Retro' ? '15px' : '8px'};
          ${CONFIG.currentTheme === 'Neon Retro' ? 'box-shadow: inset 0 0 10px rgba(0, 255, 65, 0.1);' : ''}
        }
  
        .wplace-stat-item {
          display: flex;
          justify-content: space-between;
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '6px 0' : '4px 0'};
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '11px'};
          border-bottom: 1px solid rgba(255,255,255,0.05);
          ${CONFIG.currentTheme === 'Neon Retro' ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
        }
        .wplace-stat-item:last-child {
          border-bottom: none;
        }
        .wplace-stat-label {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0.9;
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '10px'};
        }
        .wplace-stat-value {
          font-weight: 600;
          color: ${theme.highlight};
        }
  
        .wplace-colors-section {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
  
        .wplace-stat-colors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(16px, 1fr));
          gap: 4px;
          margin-top: 8px;
          padding: 4px;
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
          max-height: 80px; /* Limit height and allow scrolling */
          overflow-y: auto;
        }
        
        .wplace-stat-color-swatch {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
        }
  
        .wplace-progress {
          width: 100%;
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(0,0,0,0.3)' : theme.secondary};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? `2px solid ${theme.text}` : '1px solid rgba(255,255,255,0.1)'};
          border-radius: ${theme.borderRadius};
          margin: ${CONFIG.currentTheme === 'Neon Retro' ? '10px 0' : '8px 0'};
          overflow: hidden;
          height: ${CONFIG.currentTheme === 'Neon Retro' ? '16px' : '6px'};
          position: relative;
        }
  
        ${
          CONFIG.currentTheme === 'Neon Retro'
            ? `
        .wplace-progress::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 65, 0.1) 2px,
              rgba(0, 255, 65, 0.1) 4px
            );
          pointer-events: none;
        }`
            : ''
        }
  
        .wplace-progress-bar {
          height: ${CONFIG.currentTheme === 'Neon Retro' ? '100%' : '6px'};
          background: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? `linear-gradient(135deg, ${theme.highlight} 0%, #9370db 100%)`
              : `linear-gradient(90deg, ${theme.success}, ${theme.neon})`
          };
          transition: width ${CONFIG.currentTheme === 'Neon Retro' ? '0.3s' : '0.5s'} ease;
          position: relative;
          ${CONFIG.currentTheme === 'Neon Retro' ? `box-shadow: 0 0 10px ${theme.success};` : ''}
        }
  
        ${
          CONFIG.currentTheme === 'Classic Autobot'
            ? `
        .wplace-progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }`
            : `
        .wplace-progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: ${theme.text};
          animation: pixelBlink 1s infinite;
        }`
        }
  
        .wplace-status {
          padding: ${CONFIG.currentTheme === 'Neon Retro' ? '10px' : '6px'};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? '2px solid' : '1px solid'};
          border-radius: ${theme.borderRadius};
          text-align: center;
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '11px'};
          ${CONFIG.currentTheme === 'Neon Retro' ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
          position: relative;
          overflow: hidden;
        }
  
        .status-default {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255,255,255,0.1)' : theme.accent};
          border-color: ${theme.text};
          color: ${theme.text};
        }
        .status-success {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(0, 255, 0, 0.1)' : theme.success};
          border-color: ${theme.success};
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? theme.success : theme.primary};
          box-shadow: 0 0 15px ${theme.success};
        }
        .status-error {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255, 0, 0, 0.1)' : theme.error};
          border-color: ${theme.error};
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? theme.error : theme.text};
          box-shadow: 0 0 15px ${theme.error};
          ${theme.animations.pixelBlink ? 'animation: pixelBlink 0.5s infinite;' : ''}
        }
        .status-warning {
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? 'rgba(255, 165, 0, 0.1)' : theme.warning};
          border-color: ${theme.warning};
          color: ${CONFIG.currentTheme === 'Classic Autobot' ? 'orange' : theme.primary};
          box-shadow: 0 0 15px ${theme.warning};
        }
  
        .resize-container {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: ${theme.primary};
          padding: 20px;
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.text};
          border-radius: ${theme.borderRadius};
          z-index: 10000;
          box-shadow: ${
            CONFIG.currentTheme === 'Classic Autobot'
              ? '0 0 20px rgba(0,0,0,0.5)'
              : '0 0 30px rgba(0, 255, 65, 0.5)'
          };
          width: 90%;
          max-width: 700px;
          max-height: 90%;
          overflow: auto;
          font-family: ${theme.fontFamily};
        }
  
        .resize-preview-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid ${theme.accent};
          background: rgba(0,0,0,0.2);
          margin: 15px 0;
          height: 300px;
          overflow: hidden;
        }
  
    .resize-canvas-stack { position: relative; transform-origin: center center; display: inline-block; }
        .resize-base-canvas, .resize-mask-canvas {
          position: absolute; left: 0; top: 0;
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        .resize-mask-canvas { pointer-events: auto; }
        .resize-tools { display:flex; gap:8px; align-items:center; margin-top:8px; font-size:12px; }
        .resize-tools button { padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color:#fff; cursor:pointer; }
        .wplace-btn.active,
        .wplace-btn[aria-pressed="true"] {
          background: ${theme.highlight} !important;
          color: ${theme.primary} !important;
          border-color: ${theme.text} !important;
          box-shadow: 0 0 8px rgba(0,0,0,0.25) inset, 0 0 6px rgba(0,0,0,0.2) !important;
        }
        .wplace-btn.active i,
        .wplace-btn[aria-pressed="true"] i { filter: drop-shadow(0 0 3px ${theme.primary}); }
        .mask-mode-group .wplace-btn.active,
        .mask-mode-group .wplace-btn[aria-pressed="true"] {
          background: ${theme.highlight};
          color: ${theme.primary};
          border-color: ${theme.text};
          box-shadow: 0 0 8px rgba(0,0,0,0.25) inset, 0 0 6px rgba(0,0,0,0.2);
        }
  
        .resize-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          align-items: center;
        }
  
        .resize-controls label {
          font-size: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '12px'};
          ${CONFIG.currentTheme === 'Neon Retro' ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
          color: ${theme.text};
        }
  
        .resize-slider {
          width: 100%;
          height: ${CONFIG.currentTheme === 'Neon Retro' ? '8px' : '4px'};
          background: ${CONFIG.currentTheme === 'Classic Autobot' ? '#ccc' : theme.secondary};
          border: ${CONFIG.currentTheme === 'Neon Retro' ? `2px solid ${theme.text}` : 'none'};
          border-radius: ${theme.borderRadius};
          outline: none;
          -webkit-appearance: none;
        }
  
        ${
          CONFIG.currentTheme === 'Neon Retro'
            ? `
        .resize-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: ${theme.highlight};
          border: 2px solid ${theme.text};
          border-radius: 0;
          cursor: pointer;
          box-shadow: 0 0 5px ${theme.highlight};
        }
  
        .resize-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: ${theme.highlight};
          border: 2px solid ${theme.text};
          border-radius: 0;
          cursor: pointer;
          box-shadow: 0 0 5px ${theme.highlight};
        }`
            : ''
        }
        
        .resize-zoom-controls {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
        }
  
        .resize-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }
  
        .resize-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 9999;
          display: none;
        }
        .wplace-color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 10px;
          padding-top: 8px;
          max-height: 300px;
          overflow-y: auto;
        }
        .wplace-color-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .wplace-color-item-name {
          font-size: 9px;
          color: #ccc;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .wplace-color-swatch {
          width: 22px;
          height: 22px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.2s ease;
          position: relative;
          margin: 0 auto;
        }
        .wplace-color-swatch.unavailable {
          border-color: #666;
          border-style: dashed;
          cursor: not-allowed;
        }
        .wplace-color-swatch:hover {
          transform: scale(1.1);
          z-index: 1;
        }
        .wplace-color-swatch:not(.active) {
          opacity: 0.3;
          filter: grayscale(80%);
        }
        .wplace-color-swatch.unavailable:not(.active) {
          opacity: 0.2;
          filter: grayscale(90%);
        }
        .wplace-color-swatch.active::after {
          content: '✔';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 0 0 3px black;
        }
        .wplace-color-divider {
          border: none;
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 8px 0;
        }
  
          .wplace-cooldown-control {
              margin-top: 8px;
          }
          .wplace-cooldown-control label {
              font-size: 11px;
              margin-bottom: 4px;
              display: block;
          }
          .wplace-slider-container {
              display: flex;
              align-items: center;
              gap: 8px;
          }
          .wplace-slider {
              flex: 1;
              -webkit-appearance: none;
              appearance: none;
              height: 4px;
              background: #444;
              border-radius: 2px;
              outline: none;
          }
          .wplace-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 14px;
              height: 14px;
              background: ${theme.highlight};
              border-radius: 50%;
              cursor: pointer;
          }
  
  
        ${
          CONFIG.currentTheme === 'Neon Retro'
            ? `
        input[type="checkbox"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid ${theme.text};
          background: ${theme.secondary};
          margin-right: 8px;
          position: relative;
          cursor: pointer;
        }
  
        input[type="checkbox"]:checked {
          background: ${theme.success};
        }
  
        input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: -2px;
          left: 1px;
          color: ${theme.primary};
          font-size: 12px;
          font-weight: bold;
        }
  
        .fas, .fa {
          filter: drop-shadow(0 0 3px currentColor);
        }
  
        .wplace-speed-control {
          margin-top: 12px;
          padding: 12px;
          background: ${theme.secondary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: ${theme.borderRadius};
          backdrop-filter: ${theme.backdropFilter};
        }
  
        .wplace-speed-label {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          color: ${theme.text};
          font-size: 13px;
          font-weight: 600;
        }
  
        .wplace-speed-label i {
          margin-right: 6px;
          color: ${theme.highlight};
        }
  
        .wplace-speed-slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
  
        .wplace-speed-slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: ${theme.primary};
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }
  
        .wplace-speed-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${theme.highlight};
          cursor: pointer;
          border: 2px solid ${theme.text};
          box-shadow: ${theme.boxShadow};
        }
  
        .wplace-speed-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${theme.highlight};
          cursor: pointer;
          border: 2px solid ${theme.text};
          box-shadow: ${theme.boxShadow};
        }
  
        .wplace-speed-display {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 90px;
          justify-content: flex-end;
        }
  
        #speedValue {
          color: ${theme.highlight};
          font-weight: 600;
          font-size: 14px;
        }
  
        .wplace-speed-unit {
          color: ${theme.text};
          font-size: 11px;
          opacity: 0.8;
        }
  
        #wplace-settings-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10001;
          min-width: 400px;
          max-width: 500px;
          background: ${theme.primary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: ${theme.borderRadius};
          box-shadow: ${theme.boxShadow};
          backdrop-filter: ${theme.backdropFilter};
        }
  
        .wplace-settings {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
  
        .wplace-setting-section {
          margin-bottom: 20px;
          padding: 12px;
          background: ${theme.secondary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: ${theme.borderRadius};
        }
  
        .wplace-setting-title {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          color: ${theme.text};
          font-size: 14px;
          font-weight: 600;
        }
  
        .wplace-setting-title i {
          margin-right: 8px;
          color: ${theme.highlight};
        }
  
        .wplace-setting-content {
          color: ${theme.text};
        }
  
        .wplace-section {
          margin-bottom: 20px;
          padding: 15px;
          background: ${theme.secondary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: ${theme.borderRadius};
        }
  
        .wplace-section-title {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          color: ${theme.text};
          font-size: 14px;
          font-weight: 600;
        }
  
        .wplace-section-title i {
          margin-right: 8px;
          color: ${theme.highlight};
        }
  
        .wplace-speed-container {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 10px;
        }
  
        .wplace-slider {
          flex: 1;
          height: 6px;
          background: ${theme.accent};
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }
  
        .wplace-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: ${theme.highlight};
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid ${theme.primary};
        }
  
        .wplace-speed-display {
          background: ${theme.accent};
          padding: 5px 10px;
          border-radius: 4px;
          color: ${theme.text};
          font-weight: 600;
          min-width: 80px;
          text-align: center;
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.highlight};
        }
  
        .wplace-select {
          width: 100%;
          padding: 8px 12px;
          background: ${theme.secondary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: ${theme.borderRadius};
          color: ${theme.text};
          font-size: 14px;
          margin-bottom: 10px;
        }
  
        .wplace-select:focus {
          outline: none;
          border-color: ${theme.highlight};
        }
  
        .wplace-description {
          color: ${theme.text};
          font-size: 12px;
          opacity: 0.8;
          line-height: 1.4;
        }
  
        .wplace-theme-custom {
          margin-top: 15px;
          padding: 15px;
          background: ${theme.accent};
          border-radius: ${theme.borderRadius};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.highlight};
        }
  
        .wplace-custom-group {
          margin-bottom: 15px;
        }
  
        .wplace-custom-label {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          color: ${theme.text};
          font-size: 13px;
          font-weight: 600;
        }
  
        .wplace-custom-label i {
          margin-right: 8px;
          color: ${theme.highlight};
          width: 16px;
        }
  
        .wplace-color-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
  
        .wplace-color-input {
          width: 50px;
          height: 30px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
        }
  
        .wplace-color-text {
          flex: 1;
          padding: 6px 10px;
          background: ${theme.secondary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.accent};
          border-radius: 4px;
          color: ${theme.text};
          font-size: 12px;
          font-family: monospace;
        }
  
        .wplace-animation-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
  
        .wplace-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${theme.text};
          font-size: 12px;
          cursor: pointer;
        }
  
        .wplace-checkbox-label input[type="checkbox"] {
          accent-color: ${theme.highlight};
        }
  
        .wplace-slider-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
  
        .wplace-slider-container .wplace-slider {
          flex: 1;
        }
  
        .wplace-slider-container span {
          color: ${theme.text};
          font-size: 12px;
          font-weight: 600;
          min-width: 40px;
        }
  
        .wplace-custom-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          border-top: 1px solid ${theme.accent};
          padding-top: 15px;
        }
  
        .wplace-btn-secondary {
          background: ${theme.accent};
          color: ${theme.text};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.highlight};
        }
  
        .wplace-btn-secondary:hover {
          background: ${theme.secondary};
        }`
            : ''
        }

        /* Account Manager Styles */
        .wplace-account-info {
          margin-top: 8px;
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .wplace-current-account {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        
        .wplace-charges-badge {
          background: ${theme.success};
          color: ${theme.primary};
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .wplace-account-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .wplace-account-modal-content {
          background: ${theme.primary};
          border: ${theme.borderWidth} ${theme.borderStyle} ${theme.highlight};
          border-radius: ${theme.borderRadius};
          padding: 24px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          color: ${theme.text};
        }
        
        .wplace-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }
        
        .wplace-modal-title {
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .wplace-close-btn {
          background: none;
          border: none;
          color: ${theme.text};
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        
        .wplace-close-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        
        .wplace-add-account {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .wplace-form-group {
          margin-bottom: 12px;
        }
        
        .wplace-form-label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 14px;
        }
        
        .wplace-form-input {
          width: 100%;
          padding: 8px 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: ${theme.text};
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .wplace-form-input::placeholder {
          color: rgba(255,255,255,0.5);
        }
        
        .wplace-form-input:focus {
          outline: none;
          border-color: ${theme.highlight};
          box-shadow: 0 0 0 2px rgba(119, 92, 227, 0.2);
        }
        
        .wplace-textarea {
          min-height: 80px;
          resize: vertical;
        }
        
        .wplace-accounts-list {
          margin-top: 20px;
        }
        
        .wplace-account-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .wplace-account-item.current {
          background: rgba(119, 92, 227, 0.2);
          border-color: ${theme.highlight};
        }
        
        .wplace-account-details {
          flex: 1;
        }
        
        .wplace-account-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .wplace-account-status {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          display: flex;
          gap: 12px;
        }
        
        .wplace-account-actions {
          display: flex;
          gap: 8px;
        }
        
        .wplace-btn-small {
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
        }
        
        .wplace-btn-danger {
          background: ${theme.error};
          color: white;
          border: none;
        }
        
        .wplace-btn-danger:hover {
          background: #dc143c;
        }
      `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'wplace-image-bot-container';
    container.innerHTML = `
        <div class="wplace-header">
          <div class="wplace-header-title">
            <i class="fas fa-image"></i>
            <span>${Utils.t('title')}</span>
          </div>
          <div class="wplace-header-controls">
            <button id="settingsBtn" class="wplace-header-btn" title="${Utils.t('settings')}">
              <i class="fas fa-cog"></i>
            </button>
            <button id="statsBtn" class="wplace-header-btn" title="Show Stats">
              <i class="fas fa-chart-bar"></i>
            </button>
            <button id="compactBtn" class="wplace-header-btn" title="Compact Mode">
              <i class="fas fa-compress"></i>
            </button>
            <button id="minimizeBtn" class="wplace-header-btn" title="${Utils.t('minimize')}">
              <i class="fas fa-minus"></i>
            </button>
          </div>
        </div>
        <div class="wplace-content">
          <!-- Status Section - Always visible -->
          <div class="wplace-status-section">
            <div id="statusText" class="wplace-status status-default">
              ${Utils.t('initMessage')}
            </div>
            <div class="wplace-progress">
              <div id="progressBar" class="wplace-progress-bar" style="width: 0%"></div>
            </div>
          </div>
  
          <!-- Image Section -->
          <div class="wplace-section">
            <div class="wplace-section-title">🖼️ Image Management</div>
            <div class="wplace-controls">
              <div class="wplace-row">
                <button id="uploadBtn" class="wplace-btn wplace-btn-upload" disabled title="🔄 Waiting for initial setup to complete...">
                  <i class="fas fa-upload"></i>
                  <span>${Utils.t('uploadImage')}</span>
                </button>
                <button id="resizeBtn" class="wplace-btn wplace-btn-primary" disabled>
                  <i class="fas fa-expand"></i>
                  <span>${Utils.t('resizeImage')}</span>
                </button>
              </div>
              <div class="wplace-row single">
                <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled>
                  <i class="fas fa-crosshairs"></i>
                  <span>${Utils.t('selectPosition')}</span>
                </button>
              </div>
            </div>
          </div>
  
          <!-- Control Section -->
          <div class="wplace-section">
            <div class="wplace-section-title">🎮 Painting Control</div>
            <div class="wplace-controls">
              <div class="wplace-row">
                <button id="startBtn" class="wplace-btn wplace-btn-start" disabled>
                  <i class="fas fa-play"></i>
                  <span>${Utils.t('startPainting')}</span>
                </button>
                <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled>
                  <i class="fas fa-stop"></i>
                  <span>${Utils.t('stopPainting')}</span>
                </button>
              </div>
              <div class="wplace-row single">
                  <button id="toggleOverlayBtn" class="wplace-btn wplace-btn-overlay" disabled>
                      <i class="fas fa-eye"></i>
                      <span>${Utils.t('toggleOverlay')}</span>
                  </button>
              </div>
            </div>
          </div>
  
          <!-- Cooldown Section -->
          <div class="wplace-section">
              <div class="wplace-section-title">⏱️ ${Utils.t('cooldownSettings')}</div>
              <div class="wplace-cooldown-control">
                  <label id="cooldownLabel">${Utils.t('waitCharges')}:</label>
                  <div class="wplace-slider-container">
                      <input type="range" id="cooldownSlider" class="wplace-slider" min="1" max="1" value="${state.cooldownChargeThreshold}">
                      <span id="cooldownValue" style="font-weight:bold; min-width: 20px; text-align: center;">${state.cooldownChargeThreshold}</span>
                  </div>
              </div>
          </div>
  
          <!-- Account Manager Section -->
          <div class="wplace-section">
            <div class="wplace-section-title">👥 ${Utils.t('accountManager')}</div>
            <div class="wplace-controls">
              <div class="wplace-row single">
                <button id="accountManagerBtn" class="wplace-btn wplace-btn-primary">
                  <i class="fas fa-users"></i>
                  <span>${Utils.t('multiAccount')}</span>
                </button>
              </div>
              <div id="currentAccountInfo" class="wplace-account-info" style="display: none;">
                <div class="wplace-current-account">
                  <i class="fas fa-user"></i>
                  <span id="currentAccountName">No account</span>
                  <span id="currentAccountCharges" class="wplace-charges-badge">0</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Section -->
          <div class="wplace-section">
            <div class="wplace-section-title">💾 Data Management</div>
            <div class="wplace-controls">
              <div class="wplace-row">
                <button id="saveBtn" class="wplace-btn wplace-btn-primary" disabled>
                  <i class="fas fa-save"></i>
                  <span>${Utils.t('saveData')}</span>
                </button>
                <button id="loadBtn" class="wplace-btn wplace-btn-primary" disabled title="🔄 Waiting for token generator to initialize...">
                  <i class="fas fa-folder-open"></i>
                  <span>${Utils.t('loadData')}</span>
                </button>
              </div>
              <div class="wplace-row">
                <button id="saveToFileBtn" class="wplace-btn wplace-btn-file" disabled>
                  <i class="fas fa-download"></i>
                  <span>${Utils.t('saveToFile')}</span>
                </button>
                <button id="loadFromFileBtn" class="wplace-btn wplace-btn-file" disabled title="🔄 Waiting for token generator to initialize...">
                  <i class="fas fa-upload"></i>
                  <span>${Utils.t('loadFromFile')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

    // Stats Window - Separate UI
    const statsContainer = document.createElement('div');
    statsContainer.id = 'wplace-stats-container';
    statsContainer.style.display = 'none';
    statsContainer.innerHTML = `
        <div class="wplace-header">
          <div class="wplace-header-title">
            <i class="fas fa-chart-bar"></i>
            <span>Painting Stats</span>
          </div>
          <div class="wplace-header-controls">
            <button id="refreshChargesBtn" class="wplace-header-btn" title="Refresh Charges">
              <i class="fas fa-sync"></i>
            </button>
            <button id="closeStatsBtn" class="wplace-header-btn" title="Close Stats">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="wplace-content">
          <div class="wplace-stats">
            <div id="statsArea">
              <div class="wplace-stat-item">
                <div class="wplace-stat-label"><i class="fas fa-info-circle"></i> ${Utils.t('initMessage')}</div>
              </div>
            </div>
          </div>
        </div>
      `;

    // Modern Settings Container with Theme Support
    // Use the theme variable already declared at the top of createUI function
    const settingsContainer = document.createElement('div');
    settingsContainer.id = 'wplace-settings-container';

    // Apply theme-based styling
    const themeBackground = theme.primary
      ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary || theme.primary} 100%)`
      : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;

    settingsContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${themeBackground};
        border: ${theme.borderWidth || '1px'} ${theme.borderStyle || 'solid'} ${theme.accent || 'rgba(255,255,255,0.1)'};
        border-radius: ${theme.borderRadius || '16px'};
        padding: 0;
        z-index: 10002;
        display: none;
        min-width: 420px;
        max-width: 480px;
        color: ${theme.text || 'white'};
        font-family: ${theme.fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"};
        box-shadow: ${theme.boxShadow || '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)'};
        backdrop-filter: ${theme.backdropFilter || 'blur(10px)'};
        overflow: hidden;
        animation: settingsSlideIn 0.4s ease-out;
        ${
          theme.animations?.glow
            ? `
          box-shadow: ${theme.boxShadow || '0 20px 40px rgba(0,0,0,0.3)'}, 
                     0 0 30px ${theme.highlight || theme.neon || '#00ffff'};
        `
            : ''
        }
      `;

    settingsContainer.innerHTML = `
        <div class="wplace-settings-header" style="
          background: ${theme.accent ? `${theme.accent}33` : 'rgba(255,255,255,0.1)'}; 
          padding: 20px; 
          border-bottom: 1px solid ${theme.accent || 'rgba(255,255,255,0.1)'}; 
          cursor: move;
          ${
            theme.animations?.scanline
              ? `
            position: relative;
            overflow: hidden;
          `
              : ''
          }
        ">
          ${
            theme.animations?.scanline
              ? `
            <div style="
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 2px;
              background: linear-gradient(90deg, transparent, ${theme.neon || '#00ffff'}, transparent);
              animation: scanline 2s linear infinite;
            "></div>
          `
              : ''
          }
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="
              margin: 0; 
              color: ${theme.text || 'white'}; 
              font-size: 20px; 
              font-weight: 300; 
              display: flex; 
              align-items: center; 
              gap: 10px;
              ${
                theme.animations?.glow
                  ? `
                text-shadow: 0 0 10px ${theme.highlight || theme.neon || '#00ffff'};
              `
                  : ''
              }
            ">
              <i class="fas fa-cog" style="
                font-size: 18px; 
                animation: spin 2s linear infinite;
                color: ${theme.highlight || theme.neon || '#00ffff'};
              "></i>
              ${Utils.t('settings')}
            </h3>
            <button id="closeSettingsBtn" style="
              background: ${theme.accent ? `${theme.accent}66` : 'rgba(255,255,255,0.1)'};
              color: ${theme.text || 'white'};
              border: 1px solid ${theme.accent || 'rgba(255,255,255,0.2)'};
              border-radius: ${theme.borderRadius === '0' ? '0' : '50%'};
              width: 32px;
              height: 32px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              font-size: 14px;
              font-weight: 300;
              ${
                theme.animations?.glow
                  ? `
                box-shadow: 0 0 10px ${theme.error || '#ff0000'}33;
              `
                  : ''
              }
            " onmouseover="
              this.style.background='${theme.error || '#ff0000'}66'; 
              this.style.transform='scale(1.1)';
              ${theme.animations?.glow ? `this.style.boxShadow='0 0 20px ${theme.error || '#ff0000'}';` : ''}
            " onmouseout="
              this.style.background='${theme.accent ? `${theme.accent}66` : 'rgba(255,255,255,0.1)'}'; 
              this.style.transform='scale(1)';
              ${theme.animations?.glow ? `this.style.boxShadow='0 0 10px ${theme.error || '#ff0000'}33';` : ''}
            ">✕</button>
          </div>
        </div>
  
        <div style="padding: 25px; max-height: 70vh; overflow-y: auto;">
          
          <!-- Token Source Selection -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-key" style="color: #4facfe; font-size: 16px;"></i>
              Token Source
            </label>
            <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1);">
              <select id="tokenSourceSelect" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(255,255,255,0.15);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                box-shadow: 0 3px 10px rgba(0,0,0,0.1);
              ">
                <option value="generator" ${state.tokenSource === 'generator' ? 'selected' : ''} style="background: #2d3748; color: white; padding: 10px;">🤖 Automatic Token Generator (Recommended)</option>
                <option value="hybrid" ${state.tokenSource === 'hybrid' ? 'selected' : ''} style="background: #2d3748; color: white; padding: 10px;">🔄 Generator + Auto Fallback</option>
                <option value="manual" ${state.tokenSource === 'manual' ? 'selected' : ''} style="background: #2d3748; color: white; padding: 10px;">🎯 Manual Pixel Placement</option>
              </select>
              <p style="font-size: 12px; color: rgba(255,255,255,0.7); margin: 8px 0 0 0;">
                Generator mode creates tokens automatically. Hybrid mode falls back to manual when generator fails. Manual mode only uses pixel placement.
              </p>
            </div>
          </div>
  
          <!-- Automation Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-robot" style="color: #4facfe; font-size: 16px;"></i>
              ${Utils.t('automation')}
            </label>
            <!-- Token generator is always enabled - settings moved to Token Source above -->
          </div>
  
          <!-- Overlay Settings Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: ${theme.text || 'white'}; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-eye" style="color: ${theme.highlight || '#48dbfb'}; font-size: 16px;"></i>
              Overlay Settings
            </label>
            <div style="
              background: ${theme.accent ? `${theme.accent}20` : 'rgba(255,255,255,0.1)'}; 
              border-radius: ${theme.borderRadius || '12px'}; 
              padding: 18px; 
              border: 1px solid ${theme.accent || 'rgba(255,255,255,0.1)'};
              ${
                theme.animations?.glow
                  ? `
                box-shadow: 0 0 15px ${theme.accent || 'rgba(255,255,255,0.1)'}33;
              `
                  : ''
              }
            ">
                <!-- Opacity Slider -->
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                     <span style="font-weight: 500; font-size: 13px; color: ${theme.text || 'white'};">Overlay Opacity</span>
                     <div id="overlayOpacityValue" style="
                       min-width: 40px; 
                       text-align: center; 
                       background: ${theme.secondary || 'rgba(0,0,0,0.2)'}; 
                       color: ${theme.text || 'white'};
                       padding: 4px 8px; 
                       border-radius: ${theme.borderRadius === '0' ? '0' : '6px'}; 
                       font-size: 12px;
                       border: 1px solid ${theme.accent || 'transparent'};
                     ">${Math.round(state.overlayOpacity * 100)}%</div>
                  </div>
                  <input type="range" id="overlayOpacitySlider" min="0.1" max="1" step="0.05" value="${state.overlayOpacity}" style="
                    width: 100%; 
                    -webkit-appearance: none; 
                    height: 8px; 
                    background: linear-gradient(to right, ${theme.highlight || '#48dbfb'} 0%, ${theme.purple || theme.neon || '#d3a4ff'} 100%); 
                    border-radius: ${theme.borderRadius === '0' ? '0' : '4px'}; 
                    outline: none; 
                    cursor: pointer;
                  ">
                </div>
                <!-- Blue Marble Toggle -->
                <label for="enableBlueMarbleToggle" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                    <div>
                        <span style="font-weight: 500; color: ${theme.text || 'white'};">Blue Marble Effect</span>
                        <p style="font-size: 12px; color: ${theme.text ? `${theme.text}BB` : 'rgba(255,255,255,0.7)'}; margin: 4px 0 0 0;">Renders a dithered "shredded" overlay.</p>
                    </div>
                    <input type="checkbox" id="enableBlueMarbleToggle" ${state.blueMarbleEnabled ? 'checked' : ''} style="
                      cursor: pointer; 
                      width: 20px; 
                      height: 20px;
                      accent-color: ${theme.highlight || '#48dbfb'};
                    "/>
                </label>
            </div>
          </div>
  
          <!-- Speed Control Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-tachometer-alt" style="color: #4facfe; font-size: 16px;"></i>
              ${Utils.t('paintingSpeed')}
            </label>
            
            <!-- Batch Mode Selection -->
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">
                <i class="fas fa-dice" style="color: #f093fb; margin-right: 6px;"></i>
                Batch Mode
              </label>
              <select id="batchModeSelect" style="
                width: 100%;
                padding: 10px 12px;
                background: rgba(255,255,255,0.15);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                font-size: 13px;
                outline: none;
                cursor: pointer;
              ">
                <option value="normal" style="background: #2d3748; color: white;">📦 Normal (Fixed Size)</option>
                <option value="random" style="background: #2d3748; color: white;">🎲 Random (Range)</option>
              </select>
            </div>
            
            <!-- Normal Mode: Fixed Size Slider -->
            <div id="normalBatchControls" style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <input type="range" id="speedSlider" min="${CONFIG.PAINTING_SPEED.MIN}" max="${CONFIG.PAINTING_SPEED.MAX}" value="${CONFIG.PAINTING_SPEED.DEFAULT}"
                  style="
                    flex: 1;
                    height: 8px;
                    background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
                    border-radius: 4px;
                    outline: none;
                    -webkit-appearance: none;
                    cursor: pointer;
                  ">
                <div id="speedValue" style="
                  min-width: 100px;
                  text-align: center;
                  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                  padding: 8px 12px;
                  border-radius: 8px;
                  color: white;
                  font-weight: bold;
                  font-size: 13px;
                  box-shadow: 0 3px 10px rgba(79, 172, 254, 0.3);
                  border: 1px solid rgba(255,255,255,0.2);
                ">${CONFIG.PAINTING_SPEED.DEFAULT} (batch size)</div>
              </div>
              <div style="display: flex; justify-content: space-between; color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 8px;">
                <span><i class="fas fa-turtle"></i> ${CONFIG.PAINTING_SPEED.MIN}</span>
                <span><i class="fas fa-rabbit"></i> ${CONFIG.PAINTING_SPEED.MAX}</span>
              </div>
            </div>
            
            <!-- Random Mode: Range Controls -->
            <div id="randomBatchControls" style="display: none; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <label style="display: block; color: rgba(255,255,255,0.8); font-size: 12px; margin-bottom: 8px;">
                    <i class="fas fa-arrow-down" style="color: #4facfe; margin-right: 4px;"></i>
                    Minimum Batch Size
                  </label>
                  <input type="number" id="randomBatchMin" min="1" max="1000" value="${CONFIG.RANDOM_BATCH_RANGE.MIN}" style="
                    width: 100%;
                    padding: 10px 12px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    font-size: 13px;
                    outline: none;
                  ">
                </div>
                <div>
                  <label style="display: block; color: rgba(255,255,255,0.8); font-size: 12px; margin-bottom: 8px;">
                    <i class="fas fa-arrow-up" style="color: #00f2fe; margin-right: 4px;"></i>
                    Maximum Batch Size
                  </label>
                  <input type="number" id="randomBatchMax" min="1" max="1000" value="${CONFIG.RANDOM_BATCH_RANGE.MAX}" style="
                    width: 100%;
                    padding: 10px 12px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    font-size: 13px;
                    outline: none;
                  ">
                </div>
              </div>
              <p style="font-size: 11px; color: rgba(255,255,255,0.6); margin: 8px 0 0 0; text-align: center;">
                🎲 Random batch size between min and max values
              </p>
            </div>
            
            <!-- Speed Control Toggle -->
            <label style="display: flex; align-items: center; gap: 8px; color: white;">
              <input type="checkbox" id="enableSpeedToggle" ${CONFIG.PAINTING_SPEED_ENABLED ? 'checked' : ''} style="cursor: pointer;"/>
              <span>Enable painting speed limit (batch size control)</span>
            </label>
          </div>
  
          <!-- Notifications Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-bell" style="color: #ffd166; font-size: 16px;"></i>
              Desktop Notifications
            </label>
            <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; gap:10px;">
              <label style="display:flex; align-items:center; justify-content:space-between;">
                <span>Enable notifications</span>
                <input type="checkbox" id="notifEnabledToggle" ${state.notificationsEnabled ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;" />
              </label>
              <label style="display:flex; align-items:center; justify-content:space-between;">
                <span>Notify when charges reach threshold</span>
                <input type="checkbox" id="notifOnChargesToggle" ${state.notifyOnChargesReached ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;" />
              </label>
              <label style="display:flex; align-items:center; justify-content:space-between;">
                <span>Only when tab is not focused</span>
                <input type="checkbox" id="notifOnlyUnfocusedToggle" ${state.notifyOnlyWhenUnfocused ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;" />
              </label>
              <div style="display:flex; align-items:center; gap:10px;">
                <span>Repeat every</span>
                <input type="number" id="notifIntervalInput" min="1" max="60" value="${state.notificationIntervalMinutes}" style="width:70px; padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color:#fff;" />
                <span>minute(s)</span>
              </div>
              <div style="display:flex; gap:10px;">
                <button id="notifRequestPermBtn" class="wplace-btn wplace-btn-secondary" style="flex:1;"><i class="fas fa-unlock"></i><span>Grant Permission</span></button>
                <button id="notifTestBtn" class="wplace-btn" style="flex:1;"><i class="fas fa-bell"></i><span>Test</span></button>
              </div>
            </div>
          </div>
  
          <!-- Theme Selection Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-palette" style="color: #f093fb; font-size: 16px;"></i>
              ${Utils.t('themeSettings')}
            </label>
            <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1);">
              <select id="themeSelect" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(255,255,255,0.15);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                box-shadow: 0 3px 10px rgba(0,0,0,0.1);
              ">
                ${Object.keys(CONFIG.THEMES)
                  .map(
                    (themeName) =>
                      `<option value="${themeName}" ${CONFIG.currentTheme === themeName ? 'selected' : ''} style="background: #2d3748; color: white; padding: 10px;">${themeName}</option>`,
                  )
                  .join('')}
              </select>
            </div>
          </div>
  
          <!-- Language Selection Section -->
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 12px; color: white; font-weight: 500; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-globe" style="color: #ffeaa7; font-size: 16px;"></i>
              ${Utils.t('language')}
            </label>
            <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; border: 1px solid rgba(255,255,255,0.1);">
              <select id="languageSelect" style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(255,255,255,0.15);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                box-shadow: 0 3px 10px rgba(0,0,0,0.1);
              ">
                <option value="vi" ${state.language === 'vi' ? 'selected' : ''} style="background: #2d3748; color: white;">🇻🇳 Tiếng Việt</option>
                <option value="id" ${state.language === 'id' ? 'selected' : ''} style="background: #2d3748; color: white;">🇮🇩 Bahasa Indonesia</option>
                <option value="ru" ${state.language === 'ru' ? 'selected' : ''} style="background: #2d3748; color: white;">🇷🇺 Русский</option>
                <option value="en" ${state.language === 'en' ? 'selected' : ''} style="background: #2d3748; color: white;">🇺🇸 English</option>
                <option value="pt" ${state.language === 'pt' ? 'selected' : ''} style="background: #2d3748; color: white;">🇧🇷 Português</option>
                <option value="fr" ${state.language === 'fr' ? 'selected' : ''} style="background: #2d3748; color: white;">🇫🇷 Français</option>
                <option value="tr" ${state.language === 'tr' ? 'selected' : ''} style="background: #2d3748; color: white;">🇹🇷 Türkçe</option>
                <option value="zh" ${state.language === 'zh' ? 'selected' : ''} style="background: #2d3748; color: white;">🇨🇳 简体中文</option>
                <option value="zh-tw" ${state.language === 'zh-tw' ? 'selected' : ''} style="background: #2d3748; color: white;">🇹🇼 繁體中文</option>
                <option value="ja" ${state.language === 'ja' ? 'selected' : ''} style="background: #2d3748; color: white;">🇯🇵 日本語</option>
                <option value="ko" ${state.language === 'ko' ? 'selected' : ''} style="background: #2d3748; color: white;">🇰🇷 한국어</option>
                </select>
            </div>
          </div>
  
          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 10px;">
               <button id="applySettingsBtn" style="
                  width: 100%;
                  ${CONFIG.CSS_CLASSES.BUTTON_PRIMARY}
               ">
                   <i class="fas fa-check"></i> ${Utils.t('applySettings')}
               </button>
          </div>
  
        </div>
  
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
  
          @keyframes settingsSlideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
  
          @keyframes settingsFadeOut {
            from {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            to {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
          }
  
          #speedSlider::-webkit-slider-thumb, #overlayOpacitySlider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
            cursor: pointer;
            transition: all 0.2s ease;
          }
  
          #speedSlider::-webkit-slider-thumb:hover, #overlayOpacitySlider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 8px rgba(0,0,0,0.4), 0 0 0 3px #4facfe;
          }
  
          #speedSlider::-moz-range-thumb, #overlayOpacitySlider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
          }
  
          #themeSelect:hover, #languageSelect:hover {
            border-color: rgba(255,255,255,0.4);
            background: rgba(255,255,255,0.2);
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
          }
  
          #themeSelect:focus, #languageSelect:focus {
            border-color: #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.3);
          }
  
          #themeSelect option, #languageSelect option {
            background: #2d3748;
            color: white;
            padding: 10px;
            border-radius: 6px;
          }
  
          #themeSelect option:hover, #languageSelect option:hover {
            background: #4a5568;
          }
  
          .wplace-dragging {
            opacity: 0.9;
            box-shadow: 0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2);
            transition: none;
          }
  
          .wplace-settings-header:hover {
            background: rgba(255,255,255,0.15) !important;
          }
  
          .wplace-settings-header:active {
            background: rgba(255,255,255,0.2) !important;
          }
        </style>
      `;

    const resizeContainer = document.createElement('div');
    resizeContainer.className = 'resize-container';
    resizeContainer.innerHTML = `
        <h3 style="margin-top: 0; color: ${theme.text}">${Utils.t('resizeImage')}</h3>
        <div class="resize-controls">
          <label>
            Width: <span id="widthValue">0</span>px
            <input type="range" id="widthSlider" class="resize-slider" min="10" max="500" value="100">
          </label>
          <label>
            Height: <span id="heightValue">0</span>px
            <input type="range" id="heightSlider" class="resize-slider" min="10" max="500" value="100">
          </label>
          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="keepAspect" checked>
            Keep Aspect Ratio
          </label>
          <label style="display: flex; align-items: center;">
              <input type="checkbox" id="paintWhiteToggle" checked>
              Paint White Pixels
          </label>
          <div class="resize-zoom-controls">
            <button id="zoomOutBtn" class="wplace-btn" title="Zoom Out" style="padding:4px 8px;"><i class="fas fa-search-minus"></i></button>
            <input type="range" id="zoomSlider" class="resize-slider" min="0.1" max="20" value="1" step="0.05" style="max-width: 220px;">
            <button id="zoomInBtn" class="wplace-btn" title="Zoom In" style="padding:4px 8px;"><i class="fas fa-search-plus"></i></button>
            <button id="zoomFitBtn" class="wplace-btn" title="Fit to view" style="padding:4px 8px;">Fit</button>
            <button id="zoomActualBtn" class="wplace-btn" title="Actual size (100%)" style="padding:4px 8px;">100%</button>
            <button id="panModeBtn" class="wplace-btn" title="Pan (drag to move view)" style="padding:4px 8px;">
              <i class="fas fa-hand-paper"></i>
            </button>
            <span id="zoomValue" style="margin-left:6px; min-width:48px; text-align:right; opacity:.85; font-size:12px;">100%</span>
            <div id="cameraHelp" style="font-size:11px; opacity:.75; margin-left:auto;">
              Drag to pan • Pinch to zoom • Double‑tap to zoom
            </div>
          </div>
        </div>
  
        <div class="resize-preview-wrapper">
            <div id="resizePanStage" style="position:relative; width:100%; height:100%; overflow:hidden;">
              <div id="resizeCanvasStack" class="resize-canvas-stack" style="position:absolute; left:0; top:0; transform-origin: top left;">
                <canvas id="resizeCanvas" class="resize-base-canvas"></canvas>
                <canvas id="maskCanvas" class="resize-mask-canvas"></canvas>
              </div>
            </div>
        </div>
        <div class="resize-tools">
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div>
                <div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">
                  <label style="font-size:12px; opacity:.85;">Brush</label>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <input id="maskBrushSize" type="range" min="1" max="7" step="1" value="1" style="width:120px;">
                    <span id="maskBrushSizeValue" style="font-size:12px; opacity:.85; min-width:18px; text-align:center;">1</span>
                  </div>
                </div>
              <div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">
                <label style="font-size:12px; opacity:.85;">Row/col size</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input id="rowColSize" type="range" min="1" max="7" step="1" value="1" style="width:120px;">
                  <span id="rowColSizeValue" style="font-size:12px; opacity:.85; min-width:18px; text-align:center;">1</span>
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <label style="font-size:12px; opacity:.85;">Mode</label>
              <div class="mask-mode-group" style="display:flex; gap:6px;">
                <button id="maskModeIgnore" class="wplace-btn" style="padding:4px 8px; font-size:12px;">Ignore</button>
                <button id="maskModeUnignore" class="wplace-btn" style="padding:4px 8px; font-size:12px;">Unignore</button>
                <button id="maskModeToggle" class="wplace-btn wplace-btn-primary" style="padding:4px 8px; font-size:12px;">Toggle</button>
              </div>
            </div>
            <button id="clearIgnoredBtn" class="wplace-btn" title="Clear all ignored pixels" style="padding:4px 8px; font-size:12px;">Clear</button>
            <button id="invertMaskBtn" class="wplace-btn" title="Invert mask" style="padding:4px 8px; font-size:12px;">Invert</button>
            <span style="opacity:.8; font-size:12px;">Shift = Row • Alt = Column</span>
          </div>
        </div>
  
        <div class="wplace-section" id="color-palette-section" style="margin-top: 15px;">
            <div class="wplace-section-title">
                <i class="fas fa-palette"></i>&nbsp;Color Palette
            </div>
            <div class="wplace-controls">
                <div class="wplace-row single">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <input type="checkbox" id="showAllColorsToggle" style="cursor: pointer;">
                        <span>Show All Colors (including unavailable)</span>
                    </label>
                </div>
                <div class="wplace-row">
                    <button id="selectAllBtn" class="wplace-btn">Select All</button>
                    <button id="unselectAllBtn" class="wplace-btn">Unselect All</button>
                </div>
                <div id="colors-container" class="wplace-color-grid"></div>
            </div>
        </div>
  
        <div class="wplace-section" id="advanced-color-section" style="margin-top: 15px;">
          <div class="wplace-section-title">
            <i class="fas fa-flask"></i>&nbsp;Advanced Color Matching
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <label style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
              <span style="font-weight:600;">Algorithm</span>
              <select id="colorAlgorithmSelect" style="padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color:#fff;">
                <option value="lab" ${state.colorMatchingAlgorithm === 'lab' ? 'selected' : ''}>Perceptual (Lab)</option>
              <option value="legacy" ${state.colorMatchingAlgorithm === 'legacy' ? 'selected' : ''}>Legacy (RGB)</option>
              </select>
            </label>
            <label style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
              <div style="flex:1;">
                <span style="font-weight:600;">Chroma Penalty</span>
                <div style="margin-top:2px; opacity:0.65;">Preserve vivid colors (Lab only)</div>
              </div>
              <input type="checkbox" id="enableChromaPenaltyToggle" ${state.enableChromaPenalty ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;" />
            </label>
            <div>
              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                <span>Chroma Weight</span>
                <span id="chromaWeightValue" style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">${state.chromaPenaltyWeight}</span>
              </div>
              <input type="range" id="chromaPenaltyWeightSlider" min="0" max="0.5" step="0.01" value="${state.chromaPenaltyWeight}" style="width:100%;" />
            </div>
            <label style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
              <div style="flex:1;">
                <span style="font-weight:600;">Enable Dithering</span>
                <div style="margin-top:2px; opacity:0.65;">Floyd–Steinberg error diffusion in preview and applied output</div>
              </div>
              <input type="checkbox" id="enableDitheringToggle" ${state.ditheringEnabled ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;" />
            </label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <label style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                <span style="font-weight:600;">Transparency</span>
                <input type="number" id="transparencyThresholdInput" min="0" max="255" value="${state.customTransparencyThreshold}" style="padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color:#fff;" />
              </label>
              <label style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                <span style="font-weight:600;">White Thresh</span>
                <input type="number" id="whiteThresholdInput" min="200" max="255" value="${state.customWhiteThreshold}" style="padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color:#fff;" />
              </label>
            </div>
            <button id="resetAdvancedColorBtn" class="wplace-btn" style="background:linear-gradient(135deg,#ff6a6a,#ff4757); font-size:11px;">Reset Advanced</button>
          </div>
        </div>
  
        <div class="resize-buttons">
          <button id="downloadPreviewBtn" class="wplace-btn wplace-btn-primary">
            <i class="fas fa-download"></i>
            <span>Download Preview</span>
          </button>
          <button id="confirmResize" class="wplace-btn wplace-btn-start">
            <i class="fas fa-check"></i>
            <span>Apply</span>
          </button>
          <button id="cancelResize" class="wplace-btn wplace-btn-stop">
            <i class="fas fa-times"></i>
            <span>Cancel</span>
          </button>
        </div>
      `;

    const resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'resize-overlay';

    document.body.appendChild(container);
    document.body.appendChild(resizeOverlay);
    document.body.appendChild(resizeContainer);
    document.body.appendChild(statsContainer);
    document.body.appendChild(settingsContainer);

    const uploadBtn = container.querySelector('#uploadBtn');
    const resizeBtn = container.querySelector('#resizeBtn');
    const selectPosBtn = container.querySelector('#selectPosBtn');
    const startBtn = container.querySelector('#startBtn');
    const stopBtn = container.querySelector('#stopBtn');
    const saveBtn = container.querySelector('#saveBtn');
    const loadBtn = container.querySelector('#loadBtn');
    const saveToFileBtn = container.querySelector('#saveToFileBtn');
    const loadFromFileBtn = container.querySelector('#loadFromFileBtn');

    // Disable load/upload buttons until initial setup is complete (startup only)
    if (loadBtn) {
      loadBtn.disabled = !state.initialSetupComplete;
      loadBtn.title = state.initialSetupComplete
        ? ''
        : '🔄 Waiting for initial setup to complete...';
    }
    if (loadFromFileBtn) {
      loadFromFileBtn.disabled = !state.initialSetupComplete;
      loadFromFileBtn.title = state.initialSetupComplete
        ? ''
        : '🔄 Waiting for initial setup to complete...';
    }
    if (uploadBtn) {
      uploadBtn.disabled = !state.initialSetupComplete;
      uploadBtn.title = state.initialSetupComplete
        ? ''
        : '🔄 Waiting for initial setup to complete...';
    }

    const minimizeBtn = container.querySelector('#minimizeBtn');
    const compactBtn = container.querySelector('#compactBtn');
    const statsBtn = container.querySelector('#statsBtn');
    const toggleOverlayBtn = container.querySelector('#toggleOverlayBtn');
    const statusText = container.querySelector('#statusText');
    const progressBar = container.querySelector('#progressBar');
    const statsArea = statsContainer.querySelector('#statsArea');
    const content = container.querySelector('.wplace-content');
    const closeStatsBtn = statsContainer.querySelector('#closeStatsBtn');
    const refreshChargesBtn =
      statsContainer.querySelector('#refreshChargesBtn');
    const cooldownSlider = container.querySelector('#cooldownSlider');
    const cooldownValue = container.querySelector('#cooldownValue');

    if (!uploadBtn || !selectPosBtn || !startBtn || !stopBtn) {
      console.error('Some UI elements not found:', {
        uploadBtn: !!uploadBtn,
        selectPosBtn: !!selectPosBtn,
        startBtn: !!startBtn,
        stopBtn: !!stopBtn,
      });
    }

    if (!statsContainer || !statsArea || !closeStatsBtn) {
      console.error('Stats UI elements not found:', {
        statsContainer: !!statsContainer,
        statsArea: !!statsArea,
        closeStatsBtn: !!closeStatsBtn,
      });
    }

    const header = container.querySelector('.wplace-header');

    makeDraggable(container);

    function makeDraggable(element) {
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
      let isDragging = false;
      const header =
        element.querySelector('.wplace-header') ||
        element.querySelector('.wplace-settings-header');

      if (!header) {
        console.warn('No draggable header found for element:', element);
        return;
      }

      header.onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        if (
          e.target.closest('.wplace-header-btn') ||
          e.target.closest('button')
        )
          return;

        e.preventDefault();
        isDragging = true;

        const rect = element.getBoundingClientRect();

        element.style.transform = 'none';
        element.style.top = rect.top + 'px';
        element.style.left = rect.left + 'px';

        pos3 = e.clientX;
        pos4 = e.clientY;
        element.classList.add('wplace-dragging');
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;

        document.body.style.userSelect = 'none';
      }

      function elementDrag(e) {
        if (!isDragging) return;

        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        const rect = element.getBoundingClientRect();
        const maxTop = window.innerHeight - rect.height;
        const maxLeft = window.innerWidth - rect.width;

        newTop = Math.max(0, Math.min(newTop, maxTop));
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));

        element.style.top = newTop + 'px';
        element.style.left = newLeft + 'px';
      }

      function closeDragElement() {
        isDragging = false;
        element.classList.remove('wplace-dragging');
        document.onmouseup = null;
        document.onmousemove = null;
        document.body.style.userSelect = '';
      }
    }

    makeDraggable(statsContainer);
    makeDraggable(container);

    if (statsBtn && closeStatsBtn) {
      statsBtn.addEventListener('click', () => {
        const isVisible = statsContainer.style.display !== 'none';
        if (isVisible) {
          statsContainer.style.display = 'none';
          statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
          statsBtn.title = 'Show Stats';
        } else {
          statsContainer.style.display = 'block';
          statsBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
          statsBtn.title = 'Hide Stats';
        }
      });

      closeStatsBtn.addEventListener('click', () => {
        statsContainer.style.display = 'none';
        statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
        statsBtn.title = 'Show Stats';
      });

      if (refreshChargesBtn) {
        refreshChargesBtn.addEventListener('click', async () => {
          refreshChargesBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i>';
          refreshChargesBtn.disabled = true;

          try {
            await updateStats();
          } catch (error) {
            console.error('Error refreshing charges:', error);
          } finally {
            refreshChargesBtn.innerHTML = '<i class="fas fa-sync"></i>';
            refreshChargesBtn.disabled = false;
          }
        });
      }
    }
    if (statsContainer && statsBtn) {
      statsContainer.style.display = 'block';
      statsBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
      statsBtn.title = 'Hide Stats';
    }

    const settingsBtn = container.querySelector('#settingsBtn');
    const closeSettingsBtn =
      settingsContainer.querySelector('#closeSettingsBtn');
    const applySettingsBtn =
      settingsContainer.querySelector('#applySettingsBtn');

    if (settingsBtn && closeSettingsBtn && applySettingsBtn) {
      settingsBtn.addEventListener('click', () => {
        const isVisible = settingsContainer.style.display !== 'none';
        if (isVisible) {
          settingsContainer.style.animation =
            'settingsFadeOut 0.3s ease-out forwards';
          setTimeout(() => {
            settingsContainer.style.display = 'none';
            settingsContainer.style.animation = '';
          }, 300);
        } else {
          settingsContainer.style.top = '50%';
          settingsContainer.style.left = '50%';
          settingsContainer.style.transform = 'translate(-50%, -50%)';
          settingsContainer.style.display = 'block';
          settingsContainer.style.animation = 'settingsSlideIn 0.4s ease-out';
        }
      });

      closeSettingsBtn.addEventListener('click', () => {
        settingsContainer.style.animation =
          'settingsFadeOut 0.3s ease-out forwards';
        setTimeout(() => {
          settingsContainer.style.display = 'none';
          settingsContainer.style.animation = '';
          settingsContainer.style.top = '50%';
          settingsContainer.style.left = '50%';
          settingsContainer.style.transform = 'translate(-50%, -50%)';
        }, 300);
      });

      applySettingsBtn.addEventListener('click', () => {
        // Sync advanced settings before save
        const colorAlgorithmSelect = document.getElementById(
          'colorAlgorithmSelect',
        );
        if (colorAlgorithmSelect)
          state.colorMatchingAlgorithm = colorAlgorithmSelect.value;
        const enableChromaPenaltyToggle = document.getElementById(
          'enableChromaPenaltyToggle',
        );
        if (enableChromaPenaltyToggle)
          state.enableChromaPenalty = enableChromaPenaltyToggle.checked;
        const chromaPenaltyWeightSlider = document.getElementById(
          'chromaPenaltyWeightSlider',
        );
        if (chromaPenaltyWeightSlider)
          state.chromaPenaltyWeight =
            parseFloat(chromaPenaltyWeightSlider.value) || 0.15;
        const transparencyThresholdInput = document.getElementById(
          'transparencyThresholdInput',
        );
        if (transparencyThresholdInput) {
          const v = parseInt(transparencyThresholdInput.value, 10);
          if (!isNaN(v) && v >= 0 && v <= 255)
            state.customTransparencyThreshold = v;
        }
        const whiteThresholdInput = document.getElementById(
          'whiteThresholdInput',
        );
        if (whiteThresholdInput) {
          const v = parseInt(whiteThresholdInput.value, 10);
          if (!isNaN(v) && v >= 200 && v <= 255) state.customWhiteThreshold = v;
        }
        // Update functional thresholds
        CONFIG.TRANSPARENCY_THRESHOLD = state.customTransparencyThreshold;
        CONFIG.WHITE_THRESHOLD = state.customWhiteThreshold;
        // Notifications
        const notifEnabledToggle =
          document.getElementById('notifEnabledToggle');
        const notifOnChargesToggle = document.getElementById(
          'notifOnChargesToggle',
        );
        const notifOnlyUnfocusedToggle = document.getElementById(
          'notifOnlyUnfocusedToggle',
        );
        const notifIntervalInput =
          document.getElementById('notifIntervalInput');
        if (notifEnabledToggle)
          state.notificationsEnabled = !!notifEnabledToggle.checked;
        if (notifOnChargesToggle)
          state.notifyOnChargesReached = !!notifOnChargesToggle.checked;
        if (notifOnlyUnfocusedToggle)
          state.notifyOnlyWhenUnfocused = !!notifOnlyUnfocusedToggle.checked;
        if (notifIntervalInput) {
          const v = parseInt(notifIntervalInput.value, 10);
          if (!isNaN(v) && v >= 1 && v <= 60)
            state.notificationIntervalMinutes = v;
        }
        saveBotSettings();
        Utils.showAlert(Utils.t('settingsSaved'), 'success');
        closeSettingsBtn.click();
        NotificationManager.syncFromState();
      });

      makeDraggable(settingsContainer);

      const tokenSourceSelect =
        settingsContainer.querySelector('#tokenSourceSelect');
      if (tokenSourceSelect) {
        tokenSourceSelect.addEventListener('change', (e) => {
          state.tokenSource = e.target.value;
          saveBotSettings();
          console.log(`🔑 Token source changed to: ${state.tokenSource}`);
          const sourceNames = {
            generator: 'Automatic Generator',
            hybrid: 'Generator + Auto Fallback',
            manual: 'Manual Pixel Placement',
          };
          Utils.showAlert(
            `Token source set to: ${sourceNames[state.tokenSource]}`,
            'success',
          );
        });
      }

      // Batch mode controls
      const batchModeSelect =
        settingsContainer.querySelector('#batchModeSelect');
      const normalBatchControls = settingsContainer.querySelector(
        '#normalBatchControls',
      );
      const randomBatchControls = settingsContainer.querySelector(
        '#randomBatchControls',
      );
      const randomBatchMin = settingsContainer.querySelector('#randomBatchMin');
      const randomBatchMax = settingsContainer.querySelector('#randomBatchMax');

      if (batchModeSelect) {
        batchModeSelect.addEventListener('change', (e) => {
          state.batchMode = e.target.value;

          // Switch between normal and random controls
          if (normalBatchControls && randomBatchControls) {
            if (e.target.value === 'random') {
              normalBatchControls.style.display = 'none';
              randomBatchControls.style.display = 'block';
            } else {
              normalBatchControls.style.display = 'block';
              randomBatchControls.style.display = 'none';
            }
          }

          saveBotSettings();
          console.log(`📦 Batch mode changed to: ${state.batchMode}`);
          Utils.showAlert(
            `Batch mode set to: ${state.batchMode === 'random' ? 'Random Range' : 'Normal Fixed Size'}`,
            'success',
          );
        });
      }

      if (randomBatchMin) {
        randomBatchMin.addEventListener('input', (e) => {
          const min = parseInt(e.target.value);
          if (min >= 1 && min <= 1000) {
            state.randomBatchMin = min;
            // Ensure min doesn't exceed max
            if (randomBatchMax && min > state.randomBatchMax) {
              state.randomBatchMax = min;
              randomBatchMax.value = min;
            }
            saveBotSettings();
          }
        });
      }

      if (randomBatchMax) {
        randomBatchMax.addEventListener('input', (e) => {
          const max = parseInt(e.target.value);
          if (max >= 1 && max <= 1000) {
            state.randomBatchMax = max;
            // Ensure max doesn't go below min
            if (randomBatchMin && max < state.randomBatchMin) {
              state.randomBatchMin = max;
              randomBatchMin.value = max;
            }
            saveBotSettings();
          }
        });
      }

      const languageSelect = settingsContainer.querySelector('#languageSelect');
      if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
          const newLanguage = e.target.value;
          state.language = newLanguage;
          localStorage.setItem('wplace_language', newLanguage);

          setTimeout(() => {
            settingsContainer.style.display = 'none';
            createUI();
          }, 100);
        });
      }

      const themeSelect = settingsContainer.querySelector('#themeSelect');
      if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
          const newTheme = e.target.value;
          switchTheme(newTheme);
        });
      }

      const overlayOpacitySlider = settingsContainer.querySelector(
        '#overlayOpacitySlider',
      );
      const overlayOpacityValue = settingsContainer.querySelector(
        '#overlayOpacityValue',
      );
      const enableBlueMarbleToggle = settingsContainer.querySelector(
        '#enableBlueMarbleToggle',
      );

      if (overlayOpacitySlider && overlayOpacityValue) {
        overlayOpacitySlider.addEventListener('input', (e) => {
          const opacity = parseFloat(e.target.value);
          state.overlayOpacity = opacity;
          overlayOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
        });
      }

      // Speed slider event listener
      const speedSlider = settingsContainer.querySelector('#speedSlider');
      const speedValue = settingsContainer.querySelector('#speedValue');
      if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
          const speed = parseInt(e.target.value, 10);
          state.paintingSpeed = speed;
          speedValue.textContent = `${speed} (batch size)`;
          saveBotSettings();
        });
      }

      if (enableBlueMarbleToggle) {
        enableBlueMarbleToggle.addEventListener('click', async () => {
          state.blueMarbleEnabled = enableBlueMarbleToggle.checked;
          if (state.imageLoaded && overlayManager.imageBitmap) {
            Utils.showAlert('Re-processing overlay...', 'info');
            await overlayManager.processImageIntoChunks();
            Utils.showAlert('Overlay updated!', 'success');
          }
        });
      }

      // (Advanced color listeners moved outside to work with resize dialog)
      // (Advanced color listeners moved outside to work with resize dialog)
      // Notifications listeners
      const notifPermBtn = settingsContainer.querySelector(
        '#notifRequestPermBtn',
      );
      const notifTestBtn = settingsContainer.querySelector('#notifTestBtn');
      if (notifPermBtn) {
        notifPermBtn.addEventListener('click', async () => {
          const perm = await NotificationManager.requestPermission();
          if (perm === 'granted')
            Utils.showAlert('Notifications enabled.', 'success');
          else Utils.showAlert('Notifications permission denied.', 'warning');
        });
      }
      if (notifTestBtn) {
        notifTestBtn.addEventListener('click', () => {
          NotificationManager.notify(
            'WPlace — Test',
            'This is a test notification.',
            'wplace-notify-test',
            true,
          );
        });
      }
    }

    const widthSlider = resizeContainer.querySelector('#widthSlider');
    const heightSlider = resizeContainer.querySelector('#heightSlider');
    const widthValue = resizeContainer.querySelector('#widthValue');
    const heightValue = resizeContainer.querySelector('#heightValue');
    const keepAspect = resizeContainer.querySelector('#keepAspect');
    const paintWhiteToggle = resizeContainer.querySelector('#paintWhiteToggle');
    const zoomSlider = resizeContainer.querySelector('#zoomSlider');
    const zoomValue = resizeContainer.querySelector('#zoomValue');
    const zoomInBtn = resizeContainer.querySelector('#zoomInBtn');
    const zoomOutBtn = resizeContainer.querySelector('#zoomOutBtn');
    const zoomFitBtn = resizeContainer.querySelector('#zoomFitBtn');
    const zoomActualBtn = resizeContainer.querySelector('#zoomActualBtn');
    const panModeBtn = resizeContainer.querySelector('#panModeBtn');
    const panStage = resizeContainer.querySelector('#resizePanStage');
    const canvasStack = resizeContainer.querySelector('#resizeCanvasStack');
    const baseCanvas = resizeContainer.querySelector('#resizeCanvas');
    const maskCanvas = resizeContainer.querySelector('#maskCanvas');
    const baseCtx = baseCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const confirmResize = resizeContainer.querySelector('#confirmResize');
    const cancelResize = resizeContainer.querySelector('#cancelResize');
    const downloadPreviewBtn = resizeContainer.querySelector(
      '#downloadPreviewBtn',
    );
    const clearIgnoredBtn = resizeContainer.querySelector('#clearIgnoredBtn');

    if (compactBtn) {
      compactBtn.addEventListener('click', () => {
        container.classList.toggle('wplace-compact');
        const isCompact = container.classList.contains('wplace-compact');

        if (isCompact) {
          compactBtn.innerHTML = '<i class="fas fa-expand"></i>';
          compactBtn.title = 'Expand Mode';
        } else {
          compactBtn.innerHTML = '<i class="fas fa-compress"></i>';
          compactBtn.title = 'Compact Mode';
        }
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        state.minimized = !state.minimized;
        if (state.minimized) {
          container.classList.add('wplace-minimized');
          content.classList.add('wplace-hidden');
          minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
          minimizeBtn.title = 'Restore';
        } else {
          container.classList.remove('wplace-minimized');
          content.classList.remove('wplace-hidden');
          minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
          minimizeBtn.title = 'Minimize';
        }
        saveBotSettings();
      });
    }

    if (toggleOverlayBtn) {
      toggleOverlayBtn.addEventListener('click', () => {
        const isEnabled = overlayManager.toggle();
        toggleOverlayBtn.classList.toggle('active', isEnabled);
        toggleOverlayBtn.setAttribute(
          'aria-pressed',
          isEnabled ? 'true' : 'false',
        );
        Utils.showAlert(
          `Overlay ${isEnabled ? 'enabled' : 'disabled'}.`,
          'info',
        );
      });
    }

    if (state.minimized) {
      container.classList.add('wplace-minimized');
      content.classList.add('wplace-hidden');
      if (minimizeBtn) {
        minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        minimizeBtn.title = 'Restore';
      }
    } else {
      container.classList.remove('wplace-minimized');
      content.classList.remove('wplace-hidden');
      if (minimizeBtn) {
        minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
        minimizeBtn.title = 'Minimize';
      }
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!state.imageLoaded) {
          Utils.showAlert(Utils.t('missingRequirements'), 'error');
          return;
        }

        const success = Utils.saveProgress();
        if (success) {
          updateUI('autoSaved', 'success');
          Utils.showAlert(Utils.t('autoSaved'), 'success');
        } else {
          Utils.showAlert('❌ Erro ao salvar progresso', 'error');
        }
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        // Check if initial setup is complete
        if (!state.initialSetupComplete) {
          Utils.showAlert(
            '🔄 Please wait for the initial setup to complete before loading progress.',
            'warning',
          );
          return;
        }

        const savedData = Utils.loadProgress();
        if (!savedData) {
          updateUI('noSavedData', 'warning');
          Utils.showAlert(Utils.t('noSavedData'), 'warning');
          return;
        }

        const confirmLoad = confirm(
          `${Utils.t('savedDataFound')}\n\n` +
            `Saved: ${new Date(savedData.timestamp).toLocaleString()}\n` +
            `Progress: ${savedData.state.paintedPixels}/${savedData.state.totalPixels} pixels`,
        );

        if (confirmLoad) {
          const success = Utils.restoreProgress(savedData);
          if (success) {
            updateUI('dataLoaded', 'success');
            Utils.showAlert(Utils.t('dataLoaded'), 'success');
            updateDataButtons();

            updateStats();

            // Restore overlay if image data was loaded from localStorage
            Utils.restoreOverlayFromData().catch((error) => {
              console.error(
                'Failed to restore overlay from localStorage:',
                error,
              );
            });

            if (!state.colorsChecked) {
              uploadBtn.disabled = false;
            } else {
              uploadBtn.disabled = false;
              selectPosBtn.disabled = false;
            }

            if (
              state.imageLoaded &&
              state.startPosition &&
              state.region &&
              state.colorsChecked
            ) {
              startBtn.disabled = false;
            }
          } else {
            Utils.showAlert('❌ Erro ao carregar progresso', 'error');
          }
        }
      });
    }

    if (saveToFileBtn) {
      saveToFileBtn.addEventListener('click', () => {
        const success = Utils.saveProgressToFile();
        if (success) {
          updateUI('fileSaved', 'success');
          Utils.showAlert(Utils.t('fileSaved'), 'success');
        } else {
          Utils.showAlert(Utils.t('fileError'), 'error');
        }
      });
    }

    if (loadFromFileBtn) {
      loadFromFileBtn.addEventListener('click', async () => {
        // Check if initial setup is complete
        if (!state.initialSetupComplete) {
          Utils.showAlert(
            '🔄 Please wait for the initial setup to complete before loading from file.',
            'warning',
          );
          return;
        }

        try {
          const success = await Utils.loadProgressFromFile();
          if (success) {
            updateUI('fileLoaded', 'success');
            Utils.showAlert(Utils.t('fileLoaded'), 'success');
            updateDataButtons();

            await updateStats();

            // Restore overlay if image data was loaded from file
            await Utils.restoreOverlayFromData().catch((error) => {
              console.error('Failed to restore overlay from file:', error);
            });

            if (state.colorsChecked) {
              uploadBtn.disabled = false;
              selectPosBtn.disabled = false;
              resizeBtn.disabled = false;
            } else {
              uploadBtn.disabled = false;
            }

            if (
              state.imageLoaded &&
              state.startPosition &&
              state.region &&
              state.colorsChecked
            ) {
              startBtn.disabled = false;
            }
          }
        } catch (error) {
          if (error.message === 'Invalid JSON file') {
            Utils.showAlert(Utils.t('invalidFileFormat'), 'error');
          } else {
            Utils.showAlert(Utils.t('fileError'), 'error');
          }
        }
      });
    }

    updateUI = (messageKey, type = 'default', params = {}) => {
      const message = Utils.t(messageKey, params);
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
      statusText.style.animation = 'none';
      void statusText.offsetWidth;
      statusText.style.animation = 'slideIn 0.3s ease-out';
    };

    updateStats = async () => {
      const { charges, cooldown, max } = await WPlaceService.getCharges();
      state.currentCharges = Math.floor(charges);
      state.cooldown = cooldown;
      state.maxCharges =
        Math.floor(max) > 1 ? Math.floor(max) : state.maxCharges;
      // Evaluate notifications every time we refresh server-side charges
      NotificationManager.maybeNotifyChargesReached();

      if (cooldownSlider.max != state.maxCharges) {
        cooldownSlider.max = state.maxCharges;
      }

      let imageStatsHTML = '';
      if (state.imageLoaded) {
        const progress =
          state.totalPixels > 0
            ? Math.round((state.paintedPixels / state.totalPixels) * 100)
            : 0;
        const remainingPixels = state.totalPixels - state.paintedPixels;
        state.estimatedTime = Utils.calculateEstimatedTime(
          remainingPixels,
          state.currentCharges,
          state.cooldown,
        );
        progressBar.style.width = `${progress}%`;

        imageStatsHTML = `
                  <div class="wplace-stat-item">
                  <div class="wplace-stat-label"><i class="fas fa-image"></i> ${Utils.t('progress')}</div>
                  <div class="wplace-stat-value">${progress}%</div>
                  </div>
                  <div class="wplace-stat-item">
                  <div class="wplace-stat-label"><i class="fas fa-paint-brush"></i> ${Utils.t('pixels')}</div>
                  <div class="wplace-stat-value">${state.paintedPixels}/${state.totalPixels}</div>
                  </div>
                  <div class="wplace-stat-item">
                  <div class="wplace-stat-label"><i class="fas fa-clock"></i> ${Utils.t('estimatedTime')}</div>
                  <div class="wplace-stat-value">${Utils.formatTime(state.estimatedTime)}</div>
                  </div>
              `;
      }

      let colorSwatchesHTML = '';
      if (state.colorsChecked) {
        colorSwatchesHTML = state.availableColors
          .map((color) => {
            const rgbString = `rgb(${color.rgb.join(',')})`;
            return `<div class="wplace-stat-color-swatch" style="background-color: ${rgbString};" title="ID: ${color.id}\nRGB: ${color.rgb.join(', ')}"></div>`;
          })
          .join('');
      }

      statsArea.innerHTML = `
              ${imageStatsHTML}
              <div class="wplace-stat-item">
              <div class="wplace-stat-label"><i class="fas fa-bolt"></i> ${Utils.t('charges')}</div>
              <div class="wplace-stat-value">${Math.floor(state.currentCharges)} / ${state.maxCharges}</div>
              </div>
              ${
                state.colorsChecked
                  ? `
              <div class="wplace-colors-section">
                  <div class="wplace-stat-label"><i class="fas fa-palette"></i> Available Colors (${state.availableColors.length})</div>
                  <div class="wplace-stat-colors-grid">
                      ${colorSwatchesHTML}
                  </div>
              </div>
              `
                  : ''
              }
          `;
    };

    updateDataButtons = () => {
      const hasImageData = state.imageLoaded && state.imageData;
      saveBtn.disabled = !hasImageData;
      saveToFileBtn.disabled = !hasImageData;
    };

    updateDataButtons();

    function showResizeDialog(processor) {
      let baseProcessor = processor;
      let width, height;
      if (state.originalImage?.dataUrl) {
        baseProcessor = new ImageProcessor(state.originalImage.dataUrl);
        width = state.originalImage.width;
        height = state.originalImage.height;
      } else {
        const dims = processor.getDimensions();
        width = dims.width;
        height = dims.height;
      }
      const aspectRatio = width / height;

      const rs = state.resizeSettings;
      widthSlider.max = width * 2;
      heightSlider.max = height * 2;
      let initialW = width;
      let initialH = height;
      if (
        rs &&
        Number.isFinite(rs.width) &&
        Number.isFinite(rs.height) &&
        rs.width > 0 &&
        rs.height > 0
      ) {
        initialW = rs.width;
        initialH = rs.height;
      }
      // Clamp to slider ranges
      initialW = Math.max(
        parseInt(widthSlider.min, 10) || 10,
        Math.min(initialW, parseInt(widthSlider.max, 10)),
      );
      initialH = Math.max(
        parseInt(heightSlider.min, 10) || 10,
        Math.min(initialH, parseInt(heightSlider.max, 10)),
      );
      widthSlider.value = initialW;
      heightSlider.value = initialH;
      widthValue.textContent = initialW;
      heightValue.textContent = initialH;
      zoomSlider.value = 1;
      if (zoomValue) zoomValue.textContent = '100%';
      paintWhiteToggle.checked = state.paintWhitePixels;

      let _previewTimer = null;
      let _previewJobId = 0;
      let _isDraggingSize = false;
      let _zoomLevel = 1;
      let _ditherWorkBuf = null;
      let _ditherEligibleBuf = null;
      const ensureDitherBuffers = (n) => {
        if (!_ditherWorkBuf || _ditherWorkBuf.length !== n * 3)
          _ditherWorkBuf = new Float32Array(n * 3);
        if (!_ditherEligibleBuf || _ditherEligibleBuf.length !== n)
          _ditherEligibleBuf = new Uint8Array(n);
        return { work: _ditherWorkBuf, eligible: _ditherEligibleBuf };
      };
      let _maskImageData = null;
      let _maskData = null;
      let _dirty = null;
      const _resetDirty = () => {
        _dirty = { minX: Infinity, minY: Infinity, maxX: -1, maxY: -1 };
      };
      const _markDirty = (x, y) => {
        if (!_dirty) _resetDirty();
        if (x < _dirty.minX) _dirty.minX = x;
        if (y < _dirty.minY) _dirty.minY = y;
        if (x > _dirty.maxX) _dirty.maxX = x;
        if (y > _dirty.maxY) _dirty.maxY = y;
      };
      const _flushDirty = () => {
        if (!_dirty || _dirty.maxX < _dirty.minX || _dirty.maxY < _dirty.minY)
          return;
        const x = Math.max(0, _dirty.minX);
        const y = Math.max(0, _dirty.minY);
        const w = Math.min(maskCanvas.width - x, _dirty.maxX - x + 1);
        const h = Math.min(maskCanvas.height - y, _dirty.maxY - y + 1);
        if (w > 0 && h > 0)
          maskCtx.putImageData(_maskImageData, 0, 0, x, y, w, h);
        _resetDirty();
      };
      const _ensureMaskOverlayBuffers = (w, h, rebuildFromMask = false) => {
        if (
          !_maskImageData ||
          _maskImageData.width !== w ||
          _maskImageData.height !== h
        ) {
          _maskImageData = maskCtx.createImageData(w, h);
          _maskData = _maskImageData.data;
          rebuildFromMask = true;
        }
        if (rebuildFromMask) {
          const m = state.resizeIgnoreMask;
          const md = _maskData;
          md.fill(0);
          if (m) {
            for (let i = 0; i < m.length; i++)
              if (m[i]) {
                const p = i * 4;
                md[p] = 255;
                md[p + 1] = 0;
                md[p + 2] = 0;
                md[p + 3] = 150;
              }
          }
          maskCtx.putImageData(_maskImageData, 0, 0);
          _resetDirty();
        }
      };
      const ensureMaskSize = (w, h) => {
        if (
          !state.resizeIgnoreMask ||
          state.resizeIgnoreMask.length !== w * h
        ) {
          state.resizeIgnoreMask = new Uint8Array(w * h);
        }
        baseCanvas.width = w;
        baseCanvas.height = h;
        maskCanvas.width = w;
        maskCanvas.height = h;
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        // Ensure overlay buffers exist and rebuild from mask when dimensions change
        _ensureMaskOverlayBuffers(w, h, true);
      };
      _updateResizePreview = async () => {
        const jobId = ++_previewJobId;
        const newWidth = parseInt(widthSlider.value, 10);
        const newHeight = parseInt(heightSlider.value, 10);
        _zoomLevel = parseFloat(zoomSlider.value);

        widthValue.textContent = newWidth;
        heightValue.textContent = newHeight;

        ensureMaskSize(newWidth, newHeight);
        canvasStack.style.width = newWidth + 'px';
        canvasStack.style.height = newHeight + 'px';
        baseCtx.imageSmoothingEnabled = false;
        if (!state.availableColors || state.availableColors.length === 0) {
          if (
            baseProcessor !== processor &&
            (!baseProcessor.img || !baseProcessor.canvas)
          ) {
            await baseProcessor.load();
          }
          baseCtx.clearRect(0, 0, newWidth, newHeight);
          baseCtx.drawImage(baseProcessor.img, 0, 0, newWidth, newHeight);
          // Draw existing mask overlay buffer
          maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          if (_maskImageData) maskCtx.putImageData(_maskImageData, 0, 0);
          updateZoomLayout();
          return;
        }
        if (
          baseProcessor !== processor &&
          (!baseProcessor.img || !baseProcessor.canvas)
        ) {
          await baseProcessor.load();
        }
        baseCtx.clearRect(0, 0, newWidth, newHeight);
        baseCtx.drawImage(baseProcessor.img, 0, 0, newWidth, newHeight);
        const imgData = baseCtx.getImageData(0, 0, newWidth, newHeight);
        const data = imgData.data;

        const tThresh =
          state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;

        const applyFSDither = () => {
          const w = newWidth,
            h = newHeight;
          const n = w * h;
          const { work, eligible } = ensureDitherBuffers(n);
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = y * w + x;
              const i4 = idx * 4;
              const r = data[i4],
                g = data[i4 + 1],
                b = data[i4 + 2],
                a = data[i4 + 3];
              const isEligible =
                a >= tThresh &&
                (state.paintWhitePixels || !Utils.isWhitePixel(r, g, b));
              eligible[idx] = isEligible ? 1 : 0;
              work[idx * 3] = r;
              work[idx * 3 + 1] = g;
              work[idx * 3 + 2] = b;
              if (!isEligible) {
                data[i4 + 3] = 0; // transparent in preview overlay
              }
            }
          }

          const diffuse = (nx, ny, er, eg, eb, factor) => {
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
            const nidx = ny * w + nx;
            if (!eligible[nidx]) return;
            const base = nidx * 3;
            work[base] = Math.min(255, Math.max(0, work[base] + er * factor));
            work[base + 1] = Math.min(
              255,
              Math.max(0, work[base + 1] + eg * factor),
            );
            work[base + 2] = Math.min(
              255,
              Math.max(0, work[base + 2] + eb * factor),
            );
          };

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = y * w + x;
              if (!eligible[idx]) continue;
              const base = idx * 3;
              const r0 = work[base],
                g0 = work[base + 1],
                b0 = work[base + 2];
              const [nr, ng, nb] = Utils.findClosestPaletteColor(
                r0,
                g0,
                b0,
                state.activeColorPalette,
              );
              const i4 = idx * 4;
              data[i4] = nr;
              data[i4 + 1] = ng;
              data[i4 + 2] = nb;
              data[i4 + 3] = 255;

              const er = r0 - nr;
              const eg = g0 - ng;
              const eb = b0 - nb;

              diffuse(x + 1, y, er, eg, eb, 7 / 16);
              diffuse(x - 1, y + 1, er, eg, eb, 3 / 16);
              diffuse(x, y + 1, er, eg, eb, 5 / 16);
              diffuse(x + 1, y + 1, er, eg, eb, 1 / 16);
            }
          }
        };

        // Skip expensive dithering while user is dragging sliders
        if (state.ditheringEnabled && !_isDraggingSize) {
          applyFSDither();
        } else {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i],
              g = data[i + 1],
              b = data[i + 2],
              a = data[i + 3];
            if (
              a < tThresh ||
              (!state.paintWhitePixels && Utils.isWhitePixel(r, g, b))
            ) {
              data[i + 3] = 0;
              continue;
            }
            const [nr, ng, nb] = Utils.findClosestPaletteColor(
              r,
              g,
              b,
              state.activeColorPalette,
            );
            data[i] = nr;
            data[i + 1] = ng;
            data[i + 2] = nb;
            data[i + 3] = 255;
          }
        }

        if (jobId !== _previewJobId) return;
        baseCtx.putImageData(imgData, 0, 0);
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        if (_maskImageData) maskCtx.putImageData(_maskImageData, 0, 0);
        updateZoomLayout();
      };

      const onWidthInput = () => {
        if (keepAspect.checked) {
          heightSlider.value = Math.round(
            parseInt(widthSlider.value, 10) / aspectRatio,
          );
        }
        _updateResizePreview();
        const curW = parseInt(widthSlider.value, 10);
        const curH = parseInt(heightSlider.value, 10);
        state.resizeSettings = {
          baseWidth: width,
          baseHeight: height,
          width: curW,
          height: curH,
        };
        saveBotSettings();
        // Auto-fit after size changes
        const fit = typeof computeFitZoom === 'function' ? computeFitZoom() : 1;
        if (!isNaN(fit) && isFinite(fit)) applyZoom(fit);
      };

      const onHeightInput = () => {
        if (keepAspect.checked) {
          widthSlider.value = Math.round(
            parseInt(heightSlider.value, 10) * aspectRatio,
          );
        }
        _updateResizePreview();
        const curW = parseInt(widthSlider.value, 10);
        const curH = parseInt(heightSlider.value, 10);
        state.resizeSettings = {
          baseWidth: width,
          baseHeight: height,
          width: curW,
          height: curH,
        };
        saveBotSettings();
        // Auto-fit after size changes
        const fit = typeof computeFitZoom === 'function' ? computeFitZoom() : 1;
        if (!isNaN(fit) && isFinite(fit)) applyZoom(fit);
      };

      paintWhiteToggle.onchange = (e) => {
        state.paintWhitePixels = e.target.checked;
        _updateResizePreview();
      };

      let panX = 0,
        panY = 0;
      const clampPan = () => {
        const wrapRect = panStage?.getBoundingClientRect() || {
          width: 0,
          height: 0,
        };
        const w = (baseCanvas.width || 1) * _zoomLevel;
        const h = (baseCanvas.height || 1) * _zoomLevel;
        if (w <= wrapRect.width) {
          panX = Math.floor((wrapRect.width - w) / 2);
        } else {
          const minX = wrapRect.width - w;
          panX = Math.min(0, Math.max(minX, panX));
        }
        if (h <= wrapRect.height) {
          panY = Math.floor((wrapRect.height - h) / 2);
        } else {
          const minY = wrapRect.height - h;
          panY = Math.min(0, Math.max(minY, panY));
        }
      };
      let _panRaf = 0;
      const applyPan = () => {
        if (_panRaf) return;
        _panRaf = requestAnimationFrame(() => {
          clampPan();
          canvasStack.style.transform = `translate3d(${Math.round(panX)}px, ${Math.round(panY)}px, 0) scale(${_zoomLevel})`;
          _panRaf = 0;
        });
      };

      const updateZoomLayout = () => {
        const w = baseCanvas.width || 1,
          h = baseCanvas.height || 1;
        baseCanvas.style.width = w + 'px';
        baseCanvas.style.height = h + 'px';
        maskCanvas.style.width = w + 'px';
        maskCanvas.style.height = h + 'px';
        canvasStack.style.width = w + 'px';
        canvasStack.style.height = h + 'px';
        applyPan();
      };
      const applyZoom = (z) => {
        _zoomLevel = Math.max(0.05, Math.min(20, z || 1));
        zoomSlider.value = _zoomLevel;
        updateZoomLayout();
        if (zoomValue)
          zoomValue.textContent = `${Math.round(_zoomLevel * 100)}%`;
      };
      zoomSlider.addEventListener('input', () => {
        applyZoom(parseFloat(zoomSlider.value));
      });
      if (zoomInBtn)
        zoomInBtn.addEventListener('click', () =>
          applyZoom(parseFloat(zoomSlider.value) + 0.1),
        );
      if (zoomOutBtn)
        zoomOutBtn.addEventListener('click', () =>
          applyZoom(parseFloat(zoomSlider.value) - 0.1),
        );
      const computeFitZoom = () => {
        const wrapRect = panStage?.getBoundingClientRect();
        if (!wrapRect) return 1;
        const w = baseCanvas.width || 1;
        const h = baseCanvas.height || 1;
        const margin = 10;
        const scaleX = (wrapRect.width - margin) / w;
        const scaleY = (wrapRect.height - margin) / h;
        return Math.max(0.05, Math.min(20, Math.min(scaleX, scaleY)));
      };
      if (zoomFitBtn)
        zoomFitBtn.addEventListener('click', () => {
          applyZoom(computeFitZoom());
          centerInView();
        });
      if (zoomActualBtn)
        zoomActualBtn.addEventListener('click', () => {
          applyZoom(1);
          centerInView();
        });

      const centerInView = () => {
        if (!panStage) return;
        const rect = panStage.getBoundingClientRect();
        const w = (baseCanvas.width || 1) * _zoomLevel;
        const h = (baseCanvas.height || 1) * _zoomLevel;
        panX = Math.floor((rect.width - w) / 2);
        panY = Math.floor((rect.height - h) / 2);
        applyPan();
      };

      let isPanning = false;
      let startX = 0,
        startY = 0,
        startPanX = 0,
        startPanY = 0;
      let allowPan = false; // Space key
      let panMode = false; // Explicit pan mode toggle for touch/one-button mice
      const isPanMouseButton = (e) => e.button === 1 || e.button === 2;
      const setCursor = (val) => {
        if (panStage) panStage.style.cursor = val;
      };
      const isPanActive = (e) => panMode || allowPan || isPanMouseButton(e);
      const updatePanModeBtn = () => {
        if (!panModeBtn) return;
        panModeBtn.classList.toggle('active', panMode);
        panModeBtn.setAttribute('aria-pressed', panMode ? 'true' : 'false');
      };
      if (panModeBtn) {
        updatePanModeBtn();
        panModeBtn.addEventListener('click', () => {
          panMode = !panMode;
          updatePanModeBtn();
          setCursor(panMode ? 'grab' : '');
        });
      }
      if (panStage) {
        panStage.addEventListener('contextmenu', (e) => {
          if (allowPan) e.preventDefault();
        });
        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space') {
            allowPan = true;
            setCursor('grab');
          }
        });
        window.addEventListener('keyup', (e) => {
          if (e.code === 'Space') {
            allowPan = false;
            if (!isPanning) setCursor('');
          }
        });
        panStage.addEventListener('mousedown', (e) => {
          if (!isPanActive(e)) return;
          e.preventDefault();
          isPanning = true;
          startX = e.clientX;
          startY = e.clientY;
          startPanX = panX;
          startPanY = panY;
          setCursor('grabbing');
        });
        window.addEventListener('mousemove', (e) => {
          if (!isPanning) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          panX = startPanX + dx;
          panY = startPanY + dy;
          applyPan();
        });
        window.addEventListener('mouseup', () => {
          if (isPanning) {
            isPanning = false;
            setCursor(allowPan ? 'grab' : '');
          }
        });
        panStage.addEventListener(
          'wheel',
          (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const rect = panStage.getBoundingClientRect();
            const cx = e.clientX - rect.left - panX;
            const cy = e.clientY - rect.top - panY;
            const before = _zoomLevel;
            const step = Math.max(
              0.05,
              Math.min(0.5, Math.abs(e.deltaY) > 20 ? 0.2 : 0.1),
            );
            const next = Math.max(
              0.05,
              Math.min(20, before + (e.deltaY > 0 ? -step : step)),
            );
            if (next === before) return;
            const scale = next / before;
            panX = panX - cx * (scale - 1);
            panY = panY - cy * (scale - 1);
            applyZoom(next);
          },
          { passive: false },
        );
        let lastTouchDist = null;
        let touchStartTime = 0;
        let doubleTapTimer = null;
        panStage.addEventListener(
          'touchstart',
          (e) => {
            if (e.touches.length === 1) {
              const t = e.touches[0];
              isPanning = true;
              startX = t.clientX;
              startY = t.clientY;
              startPanX = panX;
              startPanY = panY;
              setCursor('grabbing');
              const now = Date.now();
              if (now - touchStartTime < 300) {
                // double tap -> toggle 100%/fit
                const z =
                  Math.abs(_zoomLevel - 1) < 0.01 ? computeFitZoom() : 1;
                applyZoom(z);
                centerInView();
                if (doubleTapTimer) clearTimeout(doubleTapTimer);
              } else {
                touchStartTime = now;
                doubleTapTimer = setTimeout(() => {
                  doubleTapTimer = null;
                }, 320);
              }
            } else if (e.touches.length === 2) {
              // Pinch start
              const [a, b] = e.touches;
              lastTouchDist = Math.hypot(
                b.clientX - a.clientX,
                b.clientY - a.clientY,
              );
            }
          },
          { passive: true },
        );
        panStage.addEventListener(
          'touchmove',
          (e) => {
            if (e.touches.length === 1 && isPanning) {
              const t = e.touches[0];
              const dx = t.clientX - startX;
              const dy = t.clientY - startY;
              panX = startPanX + dx;
              panY = startPanY + dy;
              applyPan();
            } else if (e.touches.length === 2 && lastTouchDist != null) {
              e.preventDefault();
              const [a, b] = e.touches;
              const dist = Math.hypot(
                b.clientX - a.clientX,
                b.clientY - a.clientY,
              );
              const rect = panStage.getBoundingClientRect();
              const centerX = (a.clientX + b.clientX) / 2 - rect.left - panX;
              const centerY = (a.clientY + b.clientY) / 2 - rect.top - panY;
              const before = _zoomLevel;
              const scale = dist / (lastTouchDist || dist);
              const next = Math.max(0.05, Math.min(20, before * scale));
              if (next !== before) {
                panX = panX - centerX * (next / before - 1);
                panY = panY - centerY * (next / before - 1);
                applyZoom(next);
              }
              lastTouchDist = dist;
            }
          },
          { passive: false },
        );
        panStage.addEventListener('touchend', () => {
          isPanning = false;
          lastTouchDist = null;
          setCursor(panMode || allowPan ? 'grab' : '');
        });
      }
      const schedulePreview = () => {
        if (_previewTimer) clearTimeout(_previewTimer);
        const run = () => {
          _previewTimer = null;
          _updateResizePreview();
        };
        if (window.requestIdleCallback) {
          _previewTimer = setTimeout(
            () => requestIdleCallback(run, { timeout: 150 }),
            50,
          );
        } else {
          _previewTimer = setTimeout(() => requestAnimationFrame(run), 50);
        }
      };
      // Track dragging to reduce work and skip dithering during drag
      const markDragStart = () => {
        _isDraggingSize = true;
      };
      const markDragEnd = () => {
        _isDraggingSize = false;
        schedulePreview();
      };
      widthSlider.addEventListener('pointerdown', markDragStart);
      heightSlider.addEventListener('pointerdown', markDragStart);
      widthSlider.addEventListener('pointerup', markDragEnd);
      heightSlider.addEventListener('pointerup', markDragEnd);
      widthSlider.addEventListener('input', () => {
        onWidthInput();
        schedulePreview();
      });
      heightSlider.addEventListener('input', () => {
        onHeightInput();
        schedulePreview();
      });

      // Mask painting UX: brush size, modes, row/column fills, and precise coords
      let draggingMask = false;
      let lastPaintX = -1,
        lastPaintY = -1;
      let brushSize = 1;
      let rowColSize = 1;
      let maskMode = 'ignore'; // 'ignore' | 'unignore' | 'toggle'
      const brushEl = resizeContainer.querySelector('#maskBrushSize');
      const brushValEl = resizeContainer.querySelector('#maskBrushSizeValue');
      const btnIgnore = resizeContainer.querySelector('#maskModeIgnore');
      const btnUnignore = resizeContainer.querySelector('#maskModeUnignore');
      const btnToggle = resizeContainer.querySelector('#maskModeToggle');
      const clearIgnoredBtnEl =
        resizeContainer.querySelector('#clearIgnoredBtn');
      const invertMaskBtn = resizeContainer.querySelector('#invertMaskBtn');
      const rowColSizeEl = resizeContainer.querySelector('#rowColSize');
      const rowColSizeValEl = resizeContainer.querySelector('#rowColSizeValue');

      const updateModeButtons = () => {
        const map = [
          [btnIgnore, 'ignore'],
          [btnUnignore, 'unignore'],
          [btnToggle, 'toggle'],
        ];
        for (const [el, m] of map) {
          if (!el) continue;
          const active = maskMode === m;
          el.classList.toggle('active', active);
          el.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      };
      const setMode = (mode) => {
        maskMode = mode;
        updateModeButtons();
      };
      if (brushEl && brushValEl) {
        brushEl.addEventListener('input', () => {
          brushSize = parseInt(brushEl.value, 10) || 1;
          brushValEl.textContent = brushSize;
        });
        brushValEl.textContent = brushEl.value;
        brushSize = parseInt(brushEl.value, 10) || 1;
      }
      if (rowColSizeEl && rowColSizeValEl) {
        rowColSizeEl.addEventListener('input', () => {
          rowColSize = parseInt(rowColSizeEl.value, 10) || 1;
          rowColSizeValEl.textContent = rowColSize;
        });
        rowColSizeValEl.textContent = rowColSizeEl.value;
        rowColSize = parseInt(rowColSizeEl.value, 10) || 1;
      }
      if (btnIgnore)
        btnIgnore.addEventListener('click', () => setMode('ignore'));
      if (btnUnignore)
        btnUnignore.addEventListener('click', () => setMode('unignore'));
      if (btnToggle)
        btnToggle.addEventListener('click', () => setMode('toggle'));
      // Initialize button state (default to toggle mode)
      updateModeButtons();

      const mapClientToPixel = (clientX, clientY) => {
        // Compute without rounding until final step to avoid drift at higher zoom
        const rect = baseCanvas.getBoundingClientRect();
        const scaleX = rect.width / baseCanvas.width;
        const scaleY = rect.height / baseCanvas.height;
        const dx = (clientX - rect.left) / scaleX;
        const dy = (clientY - rect.top) / scaleY;
        const x = Math.floor(dx);
        const y = Math.floor(dy);
        return { x, y };
      };

      const ensureMask = (w, h) => {
        if (
          !state.resizeIgnoreMask ||
          state.resizeIgnoreMask.length !== w * h
        ) {
          state.resizeIgnoreMask = new Uint8Array(w * h);
        }
      };

      const paintCircle = (cx, cy, radius, value) => {
        const w = baseCanvas.width,
          h = baseCanvas.height;
        ensureMask(w, h);
        const r2 = radius * radius;
        for (let yy = cy - radius; yy <= cy + radius; yy++) {
          if (yy < 0 || yy >= h) continue;
          for (let xx = cx - radius; xx <= cx + radius; xx++) {
            if (xx < 0 || xx >= w) continue;
            const dx = xx - cx,
              dy = yy - cy;
            if (dx * dx + dy * dy <= r2) {
              const idx = yy * w + xx;
              let val = state.resizeIgnoreMask[idx];
              if (maskMode === 'toggle') {
                val = val ? 0 : 1;
              } else if (maskMode === 'ignore') {
                val = 1;
              } else {
                val = 0;
              }
              state.resizeIgnoreMask[idx] = val;
              if (_maskData) {
                const p = idx * 4;
                if (val) {
                  _maskData[p] = 255;
                  _maskData[p + 1] = 0;
                  _maskData[p + 2] = 0;
                  _maskData[p + 3] = 150;
                } else {
                  _maskData[p] = 0;
                  _maskData[p + 1] = 0;
                  _maskData[p + 2] = 0;
                  _maskData[p + 3] = 0;
                }
                _markDirty(xx, yy);
              }
            }
          }
        }
      };

      const paintRow = (y, value) => {
        const w = baseCanvas.width,
          h = baseCanvas.height;
        ensureMask(w, h);
        if (y < 0 || y >= h) return;

        // Paint multiple rows based on rowColSize
        const halfSize = Math.floor(rowColSize / 2);
        const startY = Math.max(0, y - halfSize);
        const endY = Math.min(h - 1, y + halfSize);

        for (let rowY = startY; rowY <= endY; rowY++) {
          for (let x = 0; x < w; x++) {
            const idx = rowY * w + x;
            let val = state.resizeIgnoreMask[idx];
            if (maskMode === 'toggle') {
              val = val ? 0 : 1;
            } else if (maskMode === 'ignore') {
              val = 1;
            } else {
              val = 0;
            }
            state.resizeIgnoreMask[idx] = val;
            if (_maskData) {
              const p = idx * 4;
              if (val) {
                _maskData[p] = 255;
                _maskData[p + 1] = 0;
                _maskData[p + 2] = 0;
                _maskData[p + 3] = 150;
              } else {
                _maskData[p] = 0;
                _maskData[p + 1] = 0;
                _maskData[p + 2] = 0;
                _maskData[p + 3] = 0;
              }
            }
          }
          if (_maskData) {
            _markDirty(0, rowY);
            _markDirty(w - 1, rowY);
          }
        }
      };

      const paintColumn = (x, value) => {
        const w = baseCanvas.width,
          h = baseCanvas.height;
        ensureMask(w, h);
        if (x < 0 || x >= w) return;

        // Paint multiple columns based on rowColSize
        const halfSize = Math.floor(rowColSize / 2);
        const startX = Math.max(0, x - halfSize);
        const endX = Math.min(w - 1, x + halfSize);

        for (let colX = startX; colX <= endX; colX++) {
          for (let y = 0; y < h; y++) {
            const idx = y * w + colX;
            let val = state.resizeIgnoreMask[idx];
            if (maskMode === 'toggle') {
              val = val ? 0 : 1;
            } else if (maskMode === 'ignore') {
              val = 1;
            } else {
              val = 0;
            }
            state.resizeIgnoreMask[idx] = val;
            if (_maskData) {
              const p = idx * 4;
              if (val) {
                _maskData[p] = 255;
                _maskData[p + 1] = 0;
                _maskData[p + 2] = 0;
                _maskData[p + 3] = 150;
              } else {
                _maskData[p] = 0;
                _maskData[p + 1] = 0;
                _maskData[p + 2] = 0;
                _maskData[p + 3] = 0;
              }
            }
          }
          if (_maskData) {
            _markDirty(colX, 0);
            _markDirty(colX, h - 1);
          }
        }
      };

      const redrawMaskOverlay = () => {
        // Only flush the dirty region; full rebuild happens on size change
        _flushDirty();
      };

      const handlePaint = (e) => {
        // Suppress painting while panning
        if ((e.buttons & 4) === 4 || (e.buttons & 2) === 2 || allowPan) return;
        const { x, y } = mapClientToPixel(e.clientX, e.clientY);
        const w = baseCanvas.width,
          h = baseCanvas.height;
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const radius = Math.max(1, Math.floor(brushSize / 2));
        if (e.shiftKey) {
          paintRow(y);
        } else if (e.altKey) {
          paintColumn(x);
        } else {
          paintCircle(x, y, radius);
        }
        lastPaintX = x;
        lastPaintY = y;
        redrawMaskOverlay();
      };

      maskCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || e.button === 2 || allowPan) return; // let pan handler manage
        draggingMask = true;
        handlePaint(e);
      });
      // Avoid hijacking touch gestures for panning/zooming
      maskCanvas.addEventListener(
        'touchstart',
        (e) => {
          /* let panStage handle */
        },
        { passive: true },
      );
      maskCanvas.addEventListener(
        'touchmove',
        (e) => {
          /* let panStage handle */
        },
        { passive: true },
      );
      maskCanvas.addEventListener(
        'touchend',
        (e) => {
          /* let panStage handle */
        },
        { passive: true },
      );
      window.addEventListener('mousemove', (e) => {
        if (draggingMask) handlePaint(e);
      });
      window.addEventListener('mouseup', () => {
        if (draggingMask) {
          draggingMask = false;
          saveBotSettings();
        }
      });

      if (clearIgnoredBtnEl)
        clearIgnoredBtnEl.addEventListener('click', () => {
          const w = baseCanvas.width,
            h = baseCanvas.height;
          if (state.resizeIgnoreMask) state.resizeIgnoreMask.fill(0);
          _ensureMaskOverlayBuffers(w, h, true);
          _updateResizePreview();
          saveBotSettings();
        });

      if (invertMaskBtn)
        invertMaskBtn.addEventListener('click', () => {
          if (!state.resizeIgnoreMask) return;
          for (let i = 0; i < state.resizeIgnoreMask.length; i++)
            state.resizeIgnoreMask[i] = state.resizeIgnoreMask[i] ? 0 : 1;
          const w = baseCanvas.width,
            h = baseCanvas.height;
          _ensureMaskOverlayBuffers(w, h, true);
          _updateResizePreview();
          saveBotSettings();
        });

      confirmResize.onclick = async () => {
        const newWidth = parseInt(widthSlider.value, 10);
        const newHeight = parseInt(heightSlider.value, 10);

        // Generate the final paletted image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        tempCtx.imageSmoothingEnabled = false;
        if (
          baseProcessor !== processor &&
          (!baseProcessor.img || !baseProcessor.canvas)
        ) {
          await baseProcessor.load();
        }
        tempCtx.drawImage(baseProcessor.img, 0, 0, newWidth, newHeight);
        const imgData = tempCtx.getImageData(0, 0, newWidth, newHeight);
        const data = imgData.data;
        const tThresh2 =
          state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;
        let totalValidPixels = 0;
        const mask =
          state.resizeIgnoreMask &&
          state.resizeIgnoreMask.length === newWidth * newHeight
            ? state.resizeIgnoreMask
            : null;

        const applyFSDitherFinal = async () => {
          const w = newWidth,
            h = newHeight;
          const n = w * h;
          const { work, eligible } = ensureDitherBuffers(n);
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = y * w + x;
              const i4 = idx * 4;
              const r = data[i4],
                g = data[i4 + 1],
                b = data[i4 + 2],
                a = data[i4 + 3];
              const masked = mask && mask[idx];
              const isEligible =
                !masked &&
                a >= tThresh2 &&
                (state.paintWhitePixels || !Utils.isWhitePixel(r, g, b));
              eligible[idx] = isEligible ? 1 : 0;
              work[idx * 3] = r;
              work[idx * 3 + 1] = g;
              work[idx * 3 + 2] = b;
              if (!isEligible) {
                data[i4 + 3] = 0;
              }
            }
            // Yield to keep UI responsive
            if ((y & 15) === 0) await Promise.resolve();
          }

          const diffuse = (nx, ny, er, eg, eb, factor) => {
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) return;
            const nidx = ny * w + nx;
            if (!eligible[nidx]) return;
            const base = nidx * 3;
            work[base] = Math.min(255, Math.max(0, work[base] + er * factor));
            work[base + 1] = Math.min(
              255,
              Math.max(0, work[base + 1] + eg * factor),
            );
            work[base + 2] = Math.min(
              255,
              Math.max(0, work[base + 2] + eb * factor),
            );
          };

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = y * w + x;
              if (!eligible[idx]) continue;
              const base = idx * 3;
              const r0 = work[base],
                g0 = work[base + 1],
                b0 = work[base + 2];
              const [nr, ng, nb] = Utils.findClosestPaletteColor(
                r0,
                g0,
                b0,
                state.activeColorPalette,
              );
              const i4 = idx * 4;
              data[i4] = nr;
              data[i4 + 1] = ng;
              data[i4 + 2] = nb;
              data[i4 + 3] = 255;
              totalValidPixels++;

              const er = r0 - nr;
              const eg = g0 - ng;
              const eb = b0 - nb;

              diffuse(x + 1, y, er, eg, eb, 7 / 16);
              diffuse(x - 1, y + 1, er, eg, eb, 3 / 16);
              diffuse(x, y + 1, er, eg, eb, 5 / 16);
              diffuse(x + 1, y + 1, er, eg, eb, 1 / 16);
            }
            // Yield every row to reduce jank
            await Promise.resolve();
          }
        };

        if (state.ditheringEnabled) {
          await applyFSDitherFinal();
        } else {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i],
              g = data[i + 1],
              b = data[i + 2],
              a = data[i + 3];
            const masked = mask && mask[i >> 2];
            const isTransparent = a < tThresh2 || masked;
            const isWhiteAndSkipped =
              !state.paintWhitePixels && Utils.isWhitePixel(r, g, b);
            if (isTransparent || isWhiteAndSkipped) {
              data[i + 3] = 0; // overlay transparency
              continue;
            }
            totalValidPixels++;
            const [nr, ng, nb] = Utils.findClosestPaletteColor(
              r,
              g,
              b,
              state.activeColorPalette,
            );
            data[i] = nr;
            data[i + 1] = ng;
            data[i + 2] = nb;
            data[i + 3] = 255;
          }
        }
        tempCtx.putImageData(imgData, 0, 0);

        // Save the final pixel data for painting
        // Persist the paletted (and possibly dithered) pixels so painting uses the same output seen in overlay
        const palettedPixels = new Uint8ClampedArray(imgData.data);
        state.imageData.pixels = palettedPixels;
        state.imageData.width = newWidth;
        state.imageData.height = newHeight;
        state.imageData.totalPixels = totalValidPixels;
        state.totalPixels = totalValidPixels;
        state.paintedPixels = 0;

        state.resizeSettings = {
          baseWidth: width,
          baseHeight: height,
          width: newWidth,
          height: newHeight,
        };
        saveBotSettings();

        const finalImageBitmap = await createImageBitmap(tempCanvas);
        await overlayManager.setImage(finalImageBitmap);
        overlayManager.enable();
        toggleOverlayBtn.classList.add('active');
        toggleOverlayBtn.setAttribute('aria-pressed', 'true');

        // Keep state.imageData.processor as the original-based source; painting uses paletted pixels already stored

        updateStats();
        updateUI('resizeSuccess', 'success', {
          width: newWidth,
          height: newHeight,
        });
        closeResizeDialog();
      };

      downloadPreviewBtn.onclick = () => {
        try {
          const w = baseCanvas.width,
            h = baseCanvas.height;
          const out = document.createElement('canvas');
          out.width = w;
          out.height = h;
          const octx = out.getContext('2d');
          octx.imageSmoothingEnabled = false;
          octx.drawImage(baseCanvas, 0, 0);
          octx.drawImage(maskCanvas, 0, 0);
          const link = document.createElement('a');
          link.download = 'wplace-preview.png';
          link.href = out.toDataURL();
          link.click();
        } catch (e) {
          console.warn('Failed to download preview:', e);
        }
      };

      cancelResize.onclick = closeResizeDialog;

      resizeOverlay.style.display = 'block';
      resizeContainer.style.display = 'block';

      // Reinitialize color palette with current available colors
      initializeColorPalette(resizeContainer);

      _updateResizePreview();
      _resizeDialogCleanup = () => {
        try {
          zoomSlider.replaceWith(zoomSlider.cloneNode(true));
        } catch {}
        try {
          if (zoomInBtn) zoomInBtn.replaceWith(zoomInBtn.cloneNode(true));
        } catch {}
        try {
          if (zoomOutBtn) zoomOutBtn.replaceWith(zoomOutBtn.cloneNode(true));
        } catch {}
      };
      setTimeout(() => {
        if (typeof computeFitZoom === 'function') {
          const z = computeFitZoom();
          if (!isNaN(z) && isFinite(z)) {
            applyZoom(z);
            centerInView();
          }
        } else {
          centerInView();
        }
      }, 0);
    }

    function closeResizeDialog() {
      try {
        if (typeof _resizeDialogCleanup === 'function') {
          _resizeDialogCleanup();
        }
      } catch {}
      resizeOverlay.style.display = 'none';
      resizeContainer.style.display = 'none';
      _updateResizePreview = () => {};
      try {
        if (typeof cancelAnimationFrame === 'function' && _panRaf) {
          cancelAnimationFrame(_panRaf);
        }
      } catch {}
      try {
        if (_previewTimer) {
          clearTimeout(_previewTimer);
          _previewTimer = null;
        }
      } catch {}
      _maskImageData = null;
      _maskData = null;
      _dirty = null;
      _ditherWorkBuf = null;
      _ditherEligibleBuf = null;
      _resizeDialogCleanup = null;
    }

    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        const availableColors = Utils.extractAvailableColors();
        if (availableColors.length < 10) {
          updateUI('noColorsFound', 'error');
          Utils.showAlert(Utils.t('noColorsFound'), 'error');
          return;
        }

        if (!state.colorsChecked) {
          state.availableColors = availableColors;
          state.colorsChecked = true;
          updateUI('colorsFound', 'success', { count: availableColors.length });
          updateStats();
          selectPosBtn.disabled = false;
          // Only enable resize button if image is also loaded
          if (state.imageLoaded) {
            resizeBtn.disabled = false;
          }
        }

        try {
          updateUI('loadingImage', 'default');
          const imageSrc = await Utils.createImageUploader();
          if (!imageSrc) {
            updateUI('colorsFound', 'success', {
              count: state.availableColors.length,
            });
            return;
          }

          const processor = new ImageProcessor(imageSrc);
          await processor.load();

          const { width, height } = processor.getDimensions();
          const pixels = processor.getPixelData();

          let totalValidPixels = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const isTransparent =
              pixels[i + 3] <
              (state.customTransparencyThreshold ||
                CONFIG.TRANSPARENCY_THRESHOLD);
            const isWhiteAndSkipped =
              !state.paintWhitePixels &&
              Utils.isWhitePixel(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (!isTransparent && !isWhiteAndSkipped) {
              totalValidPixels++;
            }
          }

          state.imageData = {
            width,
            height,
            pixels,
            totalPixels: totalValidPixels,
            processor,
          };

          state.totalPixels = totalValidPixels;
          state.paintedPixels = 0;
          state.imageLoaded = true;
          state.lastPosition = { x: 0, y: 0 };

          // Initialize painted map for tracking
          Utils.initializePaintedMap(width, height);

          // New image: clear previous resize settings
          state.resizeSettings = null;
          // Also clear any previous ignore mask
          state.resizeIgnoreMask = null;
          // Save original image for this browser (dataUrl + dims)
          state.originalImage = { dataUrl: imageSrc, width, height };
          saveBotSettings();

          // Use the original image for the overlay initially
          const imageBitmap = await createImageBitmap(processor.img);
          await overlayManager.setImage(imageBitmap);
          overlayManager.enable();
          toggleOverlayBtn.disabled = false;
          toggleOverlayBtn.classList.add('active');
          toggleOverlayBtn.setAttribute('aria-pressed', 'true');

          // Only enable resize button if colors have also been captured
          if (state.colorsChecked) {
            resizeBtn.disabled = false;
          }
          saveBtn.disabled = false;

          if (state.startPosition) {
            startBtn.disabled = false;
          }

          updateStats();
          updateDataButtons();
          updateUI('imageLoaded', 'success', { count: totalValidPixels });
        } catch {
          updateUI('imageError', 'error');
        }
      });
    }

    if (resizeBtn) {
      resizeBtn.addEventListener('click', () => {
        if (
          state.imageLoaded &&
          state.imageData.processor &&
          state.colorsChecked
        ) {
          showResizeDialog(state.imageData.processor);
        } else if (!state.colorsChecked) {
          Utils.showAlert(
            'Please upload an image first to capture available colors',
            'warning',
          );
        }
      });
    }

    if (selectPosBtn) {
      selectPosBtn.addEventListener('click', async () => {
        if (state.selectingPosition) return;

        state.selectingPosition = true;
        state.startPosition = null;
        state.region = null;
        startBtn.disabled = true;

        Utils.showAlert(Utils.t('selectPositionAlert'), 'info');
        updateUI('waitingPosition', 'default');

        const tempFetch = async (url, options) => {
          if (
            typeof url === 'string' &&
            url.includes('https://backend.wplace.live/s0/pixel/') &&
            options?.method?.toUpperCase() === 'POST'
          ) {
            try {
              const response = await originalFetch(url, options);
              const clonedResponse = response.clone();
              const data = await clonedResponse.json();

              if (data?.painted === 1) {
                const regionMatch = url.match(/\/pixel\/(\d+)\/(\d+)/);
                if (regionMatch && regionMatch.length >= 3) {
                  state.region = {
                    x: Number.parseInt(regionMatch[1]),
                    y: Number.parseInt(regionMatch[2]),
                  };
                }

                const payload = JSON.parse(options.body);
                if (payload?.coords && Array.isArray(payload.coords)) {
                  state.startPosition = {
                    x: payload.coords[0],
                    y: payload.coords[1],
                  };
                  state.lastPosition = { x: 0, y: 0 };

                  await overlayManager.setPosition(
                    state.startPosition,
                    state.region,
                  );

                  if (state.imageLoaded) {
                    startBtn.disabled = false;
                  }

                  window.fetch = originalFetch;
                  state.selectingPosition = false;
                  updateUI('positionSet', 'success');
                }
              }

              return response;
            } catch {
              return originalFetch(url, options);
            }
          }
          return originalFetch(url, options);
        };

        const originalFetch = window.fetch;
        window.fetch = tempFetch;

        setTimeout(() => {
          if (state.selectingPosition) {
            window.fetch = originalFetch;
            state.selectingPosition = false;
            updateUI('positionTimeout', 'error');
            Utils.showAlert(Utils.t('positionTimeout'), 'error');
          }
        }, 120000);
      });
    }

    async function startPainting() {
      if (!state.imageLoaded || !state.startPosition || !state.region) {
        updateUI('missingRequirements', 'error');
        return false;
      }
      await ensureToken();
      if (!turnstileToken) return false;

      state.running = true;
      state.stopFlag = false;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      uploadBtn.disabled = true;
      selectPosBtn.disabled = true;
      resizeBtn.disabled = true;
      saveBtn.disabled = true;
      toggleOverlayBtn.disabled = true;

      updateUI('startPaintingMsg', 'success');

      try {
        await processImage();
        return true;
      } catch {
        updateUI('paintingError', 'error');
        return false;
      } finally {
        state.running = false;
        stopBtn.disabled = true;
        saveBtn.disabled = false;

        if (!state.stopFlag) {
          startBtn.disabled = true;
          uploadBtn.disabled = false;
          selectPosBtn.disabled = false;
          resizeBtn.disabled = false;
        } else {
          startBtn.disabled = false;
        }
        toggleOverlayBtn.disabled = false;
      }
    }

    if (startBtn) {
      startBtn.addEventListener('click', startPainting);
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        state.stopFlag = true;
        state.running = false;
        stopBtn.disabled = true;
        updateUI('paintingStopped', 'warning');

        if (state.imageLoaded && state.paintedPixels > 0) {
          Utils.saveProgress();
          Utils.showAlert(Utils.t('autoSaved'), 'success');
        }
      });
    }

    const checkSavedProgress = () => {
      const savedData = Utils.loadProgress();
      if (savedData && savedData.state.paintedPixels > 0) {
        const savedDate = new Date(savedData.timestamp).toLocaleString();
        const progress = Math.round(
          (savedData.state.paintedPixels / savedData.state.totalPixels) * 100,
        );

        Utils.showAlert(
          `${Utils.t('savedDataFound')}\n\n` +
            `Saved: ${savedDate}\n` +
            `Progress: ${savedData.state.paintedPixels}/${savedData.state.totalPixels} pixels (${progress}%)\n` +
            `${Utils.t('clickLoadToContinue')}`,
          'info',
        );
      }
    };

    setTimeout(checkSavedProgress, 1000);

    if (cooldownSlider && cooldownValue) {
      cooldownSlider.addEventListener('input', (e) => {
        const threshold = parseInt(e.target.value);
        state.cooldownChargeThreshold = threshold;
        cooldownValue.textContent = threshold;
        saveBotSettings();
        NotificationManager.resetEdgeTracking(); // prevent spurious notify after threshold change
      });
    }

    // Account Manager Event Listeners
    const accountManagerBtn = document.getElementById('accountManagerBtn');
    if (accountManagerBtn) {
      accountManagerBtn.addEventListener('click', () => {
        showAccountManagerModal();
      });
    }

    // Update account UI and set current account cookies
    updateAccountUI();

    // Set cookies for current account if available
    const currentAccount = accountManager.getCurrentAccount();
    if (currentAccount) {
      accountManager
        .setCurrentAccountCookies()
        .then(() => {
          console.log('🍪 Initial account cookies set');
        })
        .catch((e) => {
          console.error('Failed to set initial cookies:', e);
        });
    }

    loadBotSettings();
    // Ensure notification poller reflects current settings
    NotificationManager.syncFromState();
  }

  async function processImage() {
    const { width, height, pixels } = state.imageData;
    const { x: startX, y: startY } = state.startPosition;
    const { x: regionX, y: regionY } = state.region;

    const tThresh2 =
      state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;
    const isEligibleAt = (x, y) => {
      const idx = (y * width + x) * 4;
      const r = pixels[idx],
        g = pixels[idx + 1],
        b = pixels[idx + 2],
        a = pixels[idx + 3];
      if (a < tThresh2) return false;
      if (!state.paintWhitePixels && Utils.isWhitePixel(r, g, b)) return false;
      return true;
    };

    let startRow = 0;
    let startCol = 0;
    let foundStart = false;
    let seen = 0;
    const target = Math.max(
      0,
      Math.min(state.paintedPixels || 0, width * height),
    );
    for (let y = 0; y < height && !foundStart; y++) {
      for (let x = 0; x < width; x++) {
        if (!isEligibleAt(x, y)) continue;
        if (seen === target) {
          startRow = y;
          startCol = x;
          foundStart = true;
          break;
        }
        seen++;
      }
    }
    if (!foundStart) {
      startRow = height;
      startCol = 0;
    }

    let pixelBatch = null;
    let skippedPixels = { transparent: 0, white: 0, alreadyPainted: 0 };

    try {
      outerLoop: for (let y = startRow; y < height; y++) {
        for (let x = y === startRow ? startCol : 0; x < width; x++) {
          if (state.stopFlag) {
            if (pixelBatch && pixelBatch.pixels.length > 0) {
              console.log(
                `🎯 Sending final batch before stop with ${pixelBatch.pixels.length} pixels`,
              );
              const success = await sendBatchWithRetry(
                pixelBatch.pixels,
                pixelBatch.regionX,
                pixelBatch.regionY,
              );
              if (success) {
                pixelBatch.pixels.forEach(() => {
                  state.paintedPixels++;
                });
                state.currentCharges -= pixelBatch.pixels.length;
                updateStats();
              }
            }
            state.lastPosition = { x, y };
            updateUI('paintingPaused', 'warning', { x, y });
            break outerLoop;
          }

          const idx = (y * width + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const alpha = pixels[idx + 3];

          const tThresh2 =
            state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;
          if (
            alpha < tThresh2 ||
            (!state.paintWhitePixels && Utils.isWhitePixel(r, g, b))
          ) {
            if (alpha < tThresh2) {
              skippedPixels.transparent++;
            } else {
              skippedPixels.white++;
            }
            continue;
          }

          let targetRgb;
          if (Utils.isWhitePixel(r, g, b)) {
            targetRgb = [255, 255, 255];
          } else {
            targetRgb = Utils.findClosestPaletteColor(
              r,
              g,
              b,
              state.activeColorPalette,
            );
          }

          const colorId = findClosestColor([r, g, b], state.availableColors);

          let absX = startX + x;
          let absY = startY + y;

          let adderX = Math.floor(absX / 1000);
          let adderY = Math.floor(absY / 1000);
          let pixelX = absX % 1000;
          let pixelY = absY % 1000;

          if (
            !pixelBatch ||
            pixelBatch.regionX !== regionX + adderX ||
            pixelBatch.regionY !== regionY + adderY
          ) {
            if (pixelBatch && pixelBatch.pixels.length > 0) {
              console.log(
                `🌍 Sending region-change batch with ${pixelBatch.pixels.length} pixels (switching to region ${regionX + adderX},${regionY + adderY})`,
              );
              const success = await sendBatchWithRetry(
                pixelBatch.pixels,
                pixelBatch.regionX,
                pixelBatch.regionY,
              );

              if (success) {
                pixelBatch.pixels.forEach((p) => {
                  state.paintedPixels++;
                  // Mark pixel as painted in map
                  Utils.markPixelPainted(
                    p.x,
                    p.y,
                    pixelBatch.regionX,
                    pixelBatch.regionY,
                  );
                });
                state.currentCharges -= pixelBatch.pixels.length;
                updateUI('paintingProgress', 'default', {
                  painted: state.paintedPixels,
                  total: state.totalPixels,
                });

                // Use smart save instead of fixed interval
                Utils.performSmartSave();

                if (
                  CONFIG.PAINTING_SPEED_ENABLED &&
                  state.paintingSpeed > 0 &&
                  pixelBatch.pixels.length > 0
                ) {
                  // paintingSpeed now represents batch size, so add a small delay based on batch size
                  const batchDelayFactor = Math.max(
                    1,
                    100 / state.paintingSpeed,
                  ); // Larger batches = less delay
                  const totalDelay = Math.max(
                    100,
                    batchDelayFactor * pixelBatch.pixels.length,
                  );
                  await Utils.sleep(totalDelay);
                }
                updateStats();
              } else {
                // If batch failed after all retries, stop painting to prevent infinite loops
                console.error(
                  `❌ Batch failed permanently after retries. Stopping painting.`,
                );
                state.stopFlag = true;
                break outerLoop;
              }
            }

            pixelBatch = {
              regionX: regionX + adderX,
              regionY: regionY + adderY,
              pixels: [],
            };
          }

          try {
            const tileRegionX = pixelBatch
              ? pixelBatch.regionX
              : regionX + adderX;
            const tileRegionY = pixelBatch
              ? pixelBatch.regionY
              : regionY + adderY;
            const tileKeyParts = [regionX + adderX, regionY + adderY];
            const existingColorRGBA = await overlayManager
              .getTilePixelColor(
                tileKeyParts[0],
                tileKeyParts[1],
                pixelX,
                pixelY,
              )
              .catch(() => null);
            if (existingColorRGBA && Array.isArray(existingColorRGBA)) {
              const [er, eg, eb] = existingColorRGBA;
              const existingColorId = findClosestColor(
                [er, eg, eb],
                state.availableColors,
              );
              // console.log(`pixel at (${pixelX}, ${pixelY}) has color ${existingColorId} it should be ${colorId}`);
              if (existingColorId === colorId) {
                skippedPixels.alreadyPainted++;
                console.log(
                  `Skipped already painted pixel at (${pixelX}, ${pixelY})`,
                );
                continue; // Skip
              }
            }
          } catch (e) {
            /* ignore */
          }

          pixelBatch.pixels.push({
            x: pixelX,
            y: pixelY,
            color: colorId,
            localX: x,
            localY: y,
          });

          // Calculate batch size based on mode (normal/random)
          const maxBatchSize = calculateBatchSize();
          if (pixelBatch.pixels.length >= maxBatchSize) {
            const modeText =
              state.batchMode === 'random'
                ? `random (${state.randomBatchMin}-${state.randomBatchMax})`
                : 'normal';
            console.log(
              `📦 Sending batch with ${pixelBatch.pixels.length} pixels (mode: ${modeText}, target: ${maxBatchSize})`,
            );
            const success = await sendBatchWithRetry(
              pixelBatch.pixels,
              pixelBatch.regionX,
              pixelBatch.regionY,
            );

            if (success) {
              pixelBatch.pixels.forEach((pixel) => {
                state.paintedPixels++;
                // Mark pixel as painted in map
                Utils.markPixelPainted(
                  pixel.x,
                  pixel.y,
                  pixelBatch.regionX,
                  pixelBatch.regionY,
                );
              });

              state.currentCharges -= pixelBatch.pixels.length;
              updateStats();
              updateUI('paintingProgress', 'default', {
                painted: state.paintedPixels,
                total: state.totalPixels,
              });

              // Use smart save instead of fixed interval
              Utils.performSmartSave();

              if (
                CONFIG.PAINTING_SPEED_ENABLED &&
                state.paintingSpeed > 0 &&
                pixelBatch.pixels.length > 0
              ) {
                const delayPerPixel = 1000 / state.paintingSpeed; // ms per pixel
                const totalDelay = Math.max(
                  100,
                  delayPerPixel * pixelBatch.pixels.length,
                ); // minimum 100ms
                await Utils.sleep(totalDelay);
              }
            } else {
              // If batch failed after all retries, stop painting to prevent infinite loops
              console.error(
                `❌ Batch failed permanently after retries. Stopping painting.`,
              );
              state.stopFlag = true;
              break outerLoop;
            }

            pixelBatch.pixels = [];
          }

          while (
            state.currentCharges < state.cooldownChargeThreshold &&
            !state.stopFlag
          ) {
            const { charges, cooldown } = await WPlaceService.getCharges();
            state.currentCharges = Math.floor(charges);
            state.cooldown = cooldown;

            if (state.currentCharges >= state.cooldownChargeThreshold) {
              // Edge-trigger a notification the instant threshold is crossed
              NotificationManager.maybeNotifyChargesReached(true);
              updateStats();
              break;
            }

            // Enable save button during cooldown wait
            saveBtn.disabled = false;

            updateUI('noChargesThreshold', 'warning', {
              time: Utils.formatTime(state.cooldown),
              threshold: state.cooldownChargeThreshold,
              current: state.currentCharges,
            });
            await updateStats();

            // Allow auto save during cooldown
            Utils.performSmartSave();

            await Utils.sleep(state.cooldown);
          }

          // Disable save button again after exiting wait loop (back to normal painting)
          if (!state.stopFlag) {
            saveBtn.disabled = true;
          }
          if (state.stopFlag) break outerLoop;
        }
      }

      if (pixelBatch && pixelBatch.pixels.length > 0 && !state.stopFlag) {
        console.log(
          `🏁 Sending final batch with ${pixelBatch.pixels.length} pixels`,
        );
        const success = await sendBatchWithRetry(
          pixelBatch.pixels,
          pixelBatch.regionX,
          pixelBatch.regionY,
        );
        if (success) {
          pixelBatch.pixels.forEach((pixel) => {
            state.paintedPixels++;
            // Mark pixel as painted in map
            Utils.markPixelPainted(
              pixel.x,
              pixel.y,
              pixelBatch.regionX,
              pixelBatch.regionY,
            );
          });
          state.currentCharges -= pixelBatch.pixels.length;
          // Final save with painted map
          Utils.saveProgress();

          if (
            CONFIG.PAINTING_SPEED_ENABLED &&
            state.paintingSpeed > 0 &&
            pixelBatch.pixels.length > 0
          ) {
            const delayPerPixel = 1000 / state.paintingSpeed; // ms per pixel
            const totalDelay = Math.max(
              100,
              delayPerPixel * pixelBatch.pixels.length,
            ); // minimum 100ms
            await Utils.sleep(totalDelay);
          }
        } else {
          // If final batch failed after retries, log it
          console.warn(
            `⚠️ Final batch failed with ${pixelBatch.pixels.length} pixels after all retries.`,
          );
        }
      }
    } finally {
      if (window._chargesInterval) clearInterval(window._chargesInterval);
      window._chargesInterval = null;
    }

    if (state.stopFlag) {
      updateUI('paintingStopped', 'warning');
      // Save progress when stopped to preserve painted map
      Utils.saveProgress();
    } else {
      updateUI('paintingComplete', 'success', { count: state.paintedPixels });
      state.lastPosition = { x: 0, y: 0 };
      // Keep painted map until user starts new project
      // state.paintedMap = null  // Commented out to preserve data
      Utils.saveProgress(); // Save final complete state
      overlayManager.clear();
      const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
      if (toggleOverlayBtn) {
        toggleOverlayBtn.classList.remove('active');
        toggleOverlayBtn.disabled = true;
      }
    }

    // Log skip statistics
    console.log(`📊 Pixel Statistics:`);
    console.log(`   Painted: ${state.paintedPixels}`);
    console.log(`   Skipped - Transparent: ${skippedPixels.transparent}`);
    console.log(`   Skipped - White (disabled): ${skippedPixels.white}`);
    console.log(
      `   Skipped - Already painted: ${skippedPixels.alreadyPainted}`,
    );
    console.log(
      `   Total processed: ${state.paintedPixels + skippedPixels.transparent + skippedPixels.white + skippedPixels.alreadyPainted}`,
    );

    updateStats();
  }

  // Helper function to calculate batch size based on mode
  function calculateBatchSize() {
    let targetBatchSize;

    if (state.batchMode === 'random') {
      // Generate random batch size within the specified range
      const min = Math.max(1, state.randomBatchMin);
      const max = Math.max(min, state.randomBatchMax);
      targetBatchSize = Math.floor(Math.random() * (max - min + 1)) + min;
      console.log(
        `🎲 Random batch size generated: ${targetBatchSize} (range: ${min}-${max})`,
      );
    } else {
      // Normal mode - use the fixed paintingSpeed value
      targetBatchSize = state.paintingSpeed;
    }

    // Always limit by available charges
    const maxAllowed = Math.floor(state.currentCharges);
    const finalBatchSize = Math.min(targetBatchSize, maxAllowed);

    return finalBatchSize;
  }

  // Helper function to retry batch until success with exponential backoff
  async function sendBatchWithRetry(
    pixels,
    regionX,
    regionY,
    maxRetries = MAX_BATCH_RETRIES,
  ) {
    let attempt = 0;
    while (attempt < maxRetries && !state.stopFlag) {
      attempt++;
      console.log(
        `🔄 Attempting to send batch (attempt ${attempt}/${maxRetries}) for region ${regionX},${regionY} with ${pixels.length} pixels`,
      );

      const result = await sendPixelBatch(pixels, regionX, regionY);

      if (result === true) {
        console.log(`✅ Batch succeeded on attempt ${attempt}`);
        return true;
      } else if (result === 'token_error') {
        console.log(`🔑 Token error on attempt ${attempt}, regenerating...`);
        updateUI('captchaSolving', 'warning');
        try {
          await handleCaptcha();
          // Don't count token regeneration as a failed attempt
          attempt--;
          continue;
        } catch (e) {
          console.error(
            `❌ Token regeneration failed on attempt ${attempt}:`,
            e,
          );
          updateUI('captchaFailed', 'error');
          // Wait longer before retrying after token failure
          await Utils.sleep(5000);
        }
      } else if (result === 'account_switched') {
        console.log(
          `🔄 Account switched on attempt ${attempt}, retrying with new account...`,
        );
        // Don't count account switch as a failed attempt
        attempt--;
        continue;
      } else {
        console.warn(`⚠️ Batch failed on attempt ${attempt}, retrying...`);
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
        const jitter = Math.random() * 1000; // Add up to 1s random delay
        await Utils.sleep(baseDelay + jitter);
      }
    }

    if (attempt >= maxRetries) {
      console.error(
        `❌ Batch failed after ${maxRetries} attempts (MAX_BATCH_RETRIES=${MAX_BATCH_RETRIES}). This will stop painting to prevent infinite loops.`,
      );
      updateUI('paintingError', 'error');
      return false;
    }

    return false;
  }

  // Account switching logic
  async function shouldSwitchAccount() {
    try {
      // Get current charges using the same method as the main app
      const res = await fetchWithAccountCookies(
        'https://backend.wplace.live/me',
        {},
      );
      const data = await res.json();
      const currentCharges = data.charges?.count || 0;

      // Check if we should switch account
      if (
        accountManager.shouldSwitchAccount(
          currentCharges,
          state.cooldownChargeThreshold,
        )
      ) {
        console.log(
          '🔄 Current account has low charges, attempting to switch...',
        );
        Utils.showAlert(Utils.t('switchingAccount'), 'info');

        // Try to switch to next account
        if (accountManager.switchToNextAccount()) {
          const newAccount = accountManager.getCurrentAccount();
          console.log(`✅ Switched to account: ${newAccount.name}`);

          // Set cookies for new account
          if (await accountManager.setCurrentAccountCookies()) {
            // Update UI
            updateAccountUI();

            // Reset Turnstile state since we switched accounts
            resetTurnstileForAccountSwitch();

            // Wait a moment for cookies to take effect
            await new Promise((resolve) => setTimeout(resolve, 500));

            Utils.showAlert(
              Utils.t('accountSwitched').replace('{name}', newAccount.name),
              'success',
            );
            return false; // Don't switch, continue with new account
          } else {
            console.warn('❌ Failed to set cookies for new account');
          }
        } else {
          console.warn('❌ No other accounts available to switch to');
          Utils.showAlert(Utils.t('noAccountsAvailable'), 'warning');
        }
      }

      return false; // No switch needed or switch failed
    } catch (error) {
      console.error('Error checking account switch:', error);
      return false;
    }
  }

  async function sendPixelBatch(pixelBatch, regionX, regionY) {
    // Check and switch account if needed
    if (await shouldSwitchAccount()) {
      return 'account_switched';
    }

    let token = turnstileToken;

    // Generate new token if we don't have one
    if (!token) {
      try {
        console.log('🔑 Generating Turnstile token for pixel batch...');
        token = await handleCaptcha();
        turnstileToken = token; // Store for potential reuse
      } catch (error) {
        console.error('❌ Failed to generate Turnstile token:', error);
        tokenPromise = new Promise((resolve) => {
          _resolveToken = resolve;
        });
        return 'token_error';
      }
    }

    const coords = new Array(pixelBatch.length * 2);
    const colors = new Array(pixelBatch.length);
    for (let i = 0; i < pixelBatch.length; i++) {
      const pixel = pixelBatch[i];
      coords[i * 2] = pixel.x;
      coords[i * 2 + 1] = pixel.y;
      colors[i] = pixel.color;
    }

    try {
      const payload = { coords, colors, t: token };

      const res = await fetchWithAccountCookies(
        `https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(payload),
        },
      );

      if (res.status === 403) {
        let data = null;
        try {
          data = await res.json();
        } catch (_) {}
        console.error(
          '❌ 403 Forbidden. Turnstile token might be invalid or expired.',
        );

        // Try to generate a new token and retry once
        try {
          console.log('🔄 Regenerating Turnstile token after 403...');
          token = await handleCaptcha();
          turnstileToken = token;

          // Retry the request with new token
          const retryPayload = { coords, colors, t: token };
          const retryRes = await fetchWithAccountCookies(
            `https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
              body: JSON.stringify(retryPayload),
            },
          );

          if (retryRes.status === 403) {
            turnstileToken = null;
            tokenPromise = new Promise((resolve) => {
              _resolveToken = resolve;
            });
            return 'token_error';
          }

          const retryData = await retryRes.json();
          return retryData?.painted === pixelBatch.length;
        } catch (retryError) {
          console.error('❌ Token regeneration failed:', retryError);
          turnstileToken = null;
          tokenPromise = new Promise((resolve) => {
            _resolveToken = resolve;
          });
          return 'token_error';
        }
      }

      const data = await res.json();
      return data?.painted === pixelBatch.length;
    } catch (e) {
      console.error('Batch paint request failed:', e);
      return false;
    }
  }

  function saveBotSettings() {
    try {
      const settings = {
        paintingSpeed: state.paintingSpeed,
        paintingSpeedEnabled:
          document.getElementById('enableSpeedToggle')?.checked,
        batchMode: state.batchMode, // "normal" or "random"
        randomBatchMin: state.randomBatchMin,
        randomBatchMax: state.randomBatchMax,
        cooldownChargeThreshold: state.cooldownChargeThreshold,
        tokenSource: state.tokenSource, // "generator", "hybrid", or "manual"
        minimized: state.minimized,
        overlayOpacity: state.overlayOpacity,
        blueMarbleEnabled: document.getElementById('enableBlueMarbleToggle')
          ?.checked,
        ditheringEnabled: state.ditheringEnabled,
        colorMatchingAlgorithm: state.colorMatchingAlgorithm,
        enableChromaPenalty: state.enableChromaPenalty,
        chromaPenaltyWeight: state.chromaPenaltyWeight,
        customTransparencyThreshold: state.customTransparencyThreshold,
        customWhiteThreshold: state.customWhiteThreshold,
        paintWhitePixels: state.paintWhitePixels,
        resizeSettings: state.resizeSettings,
        originalImage: state.originalImage,
        // Save ignore mask (as base64) with its dimensions
        resizeIgnoreMask:
          state.resizeIgnoreMask &&
          state.resizeSettings &&
          state.resizeSettings.width * state.resizeSettings.height ===
            state.resizeIgnoreMask.length
            ? {
                w: state.resizeSettings.width,
                h: state.resizeSettings.height,
                data: btoa(String.fromCharCode(...state.resizeIgnoreMask)),
              }
            : null,
        // Notifications
        notificationsEnabled: state.notificationsEnabled,
        notifyOnChargesReached: state.notifyOnChargesReached,
        notifyOnlyWhenUnfocused: state.notifyOnlyWhenUnfocused,
        notificationIntervalMinutes: state.notificationIntervalMinutes,
      };
      CONFIG.PAINTING_SPEED_ENABLED = settings.paintingSpeedEnabled;
      // AUTO_CAPTCHA_ENABLED is always true - no need to save/load

      localStorage.setItem('wplace-bot-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save bot settings:', e);
    }
  }

  function loadBotSettings() {
    try {
      const saved = localStorage.getItem('wplace-bot-settings');
      if (!saved) return;
      const settings = JSON.parse(saved);

      state.paintingSpeed =
        settings.paintingSpeed || CONFIG.PAINTING_SPEED.DEFAULT;
      state.batchMode = settings.batchMode || CONFIG.BATCH_MODE; // Default to "normal"
      state.randomBatchMin =
        settings.randomBatchMin || CONFIG.RANDOM_BATCH_RANGE.MIN;
      state.randomBatchMax =
        settings.randomBatchMax || CONFIG.RANDOM_BATCH_RANGE.MAX;
      state.cooldownChargeThreshold =
        settings.cooldownChargeThreshold || CONFIG.COOLDOWN_CHARGE_THRESHOLD;
      state.tokenSource = settings.tokenSource || CONFIG.TOKEN_SOURCE; // Default to "generator"
      state.minimized = settings.minimized ?? false;
      CONFIG.PAINTING_SPEED_ENABLED = settings.paintingSpeedEnabled ?? false;
      CONFIG.AUTO_CAPTCHA_ENABLED = settings.autoCaptchaEnabled ?? false;
      state.overlayOpacity =
        settings.overlayOpacity ?? CONFIG.OVERLAY.OPACITY_DEFAULT;
      state.blueMarbleEnabled =
        settings.blueMarbleEnabled ?? CONFIG.OVERLAY.BLUE_MARBLE_DEFAULT;
      state.ditheringEnabled = settings.ditheringEnabled ?? false;
      state.colorMatchingAlgorithm = settings.colorMatchingAlgorithm || 'lab';
      state.enableChromaPenalty = settings.enableChromaPenalty ?? true;
      state.chromaPenaltyWeight = settings.chromaPenaltyWeight ?? 0.15;
      state.customTransparencyThreshold =
        settings.customTransparencyThreshold ?? CONFIG.TRANSPARENCY_THRESHOLD;
      state.customWhiteThreshold =
        settings.customWhiteThreshold ?? CONFIG.WHITE_THRESHOLD;
      state.paintWhitePixels = settings.paintWhitePixels ?? true;
      state.resizeSettings = settings.resizeSettings ?? null;
      state.originalImage = settings.originalImage ?? null;
      // Notifications
      state.notificationsEnabled =
        settings.notificationsEnabled ?? CONFIG.NOTIFICATIONS.ENABLED;
      state.notifyOnChargesReached =
        settings.notifyOnChargesReached ??
        CONFIG.NOTIFICATIONS.ON_CHARGES_REACHED;
      state.notifyOnlyWhenUnfocused =
        settings.notifyOnlyWhenUnfocused ??
        CONFIG.NOTIFICATIONS.ONLY_WHEN_UNFOCUSED;
      state.notificationIntervalMinutes =
        settings.notificationIntervalMinutes ??
        CONFIG.NOTIFICATIONS.REPEAT_MINUTES;
      // Restore ignore mask if dims match current resizeSettings
      if (
        settings.resizeIgnoreMask &&
        settings.resizeIgnoreMask.data &&
        state.resizeSettings &&
        settings.resizeIgnoreMask.w === state.resizeSettings.width &&
        settings.resizeIgnoreMask.h === state.resizeSettings.height
      ) {
        try {
          const bin = atob(settings.resizeIgnoreMask.data);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          state.resizeIgnoreMask = arr;
        } catch {
          state.resizeIgnoreMask = null;
        }
      } else {
        state.resizeIgnoreMask = null;
      }

      const speedSlider = document.getElementById('speedSlider');
      if (speedSlider) speedSlider.value = state.paintingSpeed;
      const speedValue = document.getElementById('speedValue');
      if (speedValue)
        speedValue.textContent = `${state.paintingSpeed} (batch size)`;

      const enableSpeedToggle = document.getElementById('enableSpeedToggle');
      if (enableSpeedToggle)
        enableSpeedToggle.checked = CONFIG.PAINTING_SPEED_ENABLED;

      // Batch mode UI initialization
      const batchModeSelect = document.getElementById('batchModeSelect');
      if (batchModeSelect) batchModeSelect.value = state.batchMode;

      const normalBatchControls = document.getElementById(
        'normalBatchControls',
      );
      const randomBatchControls = document.getElementById(
        'randomBatchControls',
      );

      // Show/hide appropriate controls based on batch mode
      if (normalBatchControls && randomBatchControls) {
        if (state.batchMode === 'random') {
          normalBatchControls.style.display = 'none';
          randomBatchControls.style.display = 'block';
        } else {
          normalBatchControls.style.display = 'block';
          randomBatchControls.style.display = 'none';
        }
      }

      const randomBatchMin = document.getElementById('randomBatchMin');
      if (randomBatchMin) randomBatchMin.value = state.randomBatchMin;

      const randomBatchMax = document.getElementById('randomBatchMax');
      if (randomBatchMax) randomBatchMax.value = state.randomBatchMax;

      // AUTO_CAPTCHA_ENABLED is always true - no toggle to set

      const cooldownSlider = document.getElementById('cooldownSlider');
      if (cooldownSlider) cooldownSlider.value = state.cooldownChargeThreshold;
      const cooldownValue = document.getElementById('cooldownValue');
      if (cooldownValue)
        cooldownValue.textContent = state.cooldownChargeThreshold;

      const overlayOpacitySlider = document.getElementById(
        'overlayOpacitySlider',
      );
      if (overlayOpacitySlider)
        overlayOpacitySlider.value = state.overlayOpacity;
      const overlayOpacityValue = document.getElementById(
        'overlayOpacityValue',
      );
      if (overlayOpacityValue)
        overlayOpacityValue.textContent = `${Math.round(state.overlayOpacity * 100)}%`;
      const enableBlueMarbleToggle = document.getElementById(
        'enableBlueMarbleToggle',
      );
      if (enableBlueMarbleToggle)
        enableBlueMarbleToggle.checked = state.blueMarbleEnabled;

      const tokenSourceSelect = document.getElementById('tokenSourceSelect');
      if (tokenSourceSelect) tokenSourceSelect.value = state.tokenSource;

      const colorAlgorithmSelect = document.getElementById(
        'colorAlgorithmSelect',
      );
      if (colorAlgorithmSelect)
        colorAlgorithmSelect.value = state.colorMatchingAlgorithm;
      const enableChromaPenaltyToggle = document.getElementById(
        'enableChromaPenaltyToggle',
      );
      if (enableChromaPenaltyToggle)
        enableChromaPenaltyToggle.checked = state.enableChromaPenalty;
      const chromaPenaltyWeightSlider = document.getElementById(
        'chromaPenaltyWeightSlider',
      );
      if (chromaPenaltyWeightSlider)
        chromaPenaltyWeightSlider.value = state.chromaPenaltyWeight;
      const chromaWeightValue = document.getElementById('chromaWeightValue');
      if (chromaWeightValue)
        chromaWeightValue.textContent = state.chromaPenaltyWeight;
      const transparencyThresholdInput = document.getElementById(
        'transparencyThresholdInput',
      );
      if (transparencyThresholdInput)
        transparencyThresholdInput.value = state.customTransparencyThreshold;
      const whiteThresholdInput = document.getElementById(
        'whiteThresholdInput',
      );
      if (whiteThresholdInput)
        whiteThresholdInput.value = state.customWhiteThreshold;
      // Notifications UI
      const notifEnabledToggle = document.getElementById('notifEnabledToggle');
      if (notifEnabledToggle)
        notifEnabledToggle.checked = state.notificationsEnabled;
      const notifOnChargesToggle = document.getElementById(
        'notifOnChargesToggle',
      );
      if (notifOnChargesToggle)
        notifOnChargesToggle.checked = state.notifyOnChargesReached;
      const notifOnlyUnfocusedToggle = document.getElementById(
        'notifOnlyUnfocusedToggle',
      );
      if (notifOnlyUnfocusedToggle)
        notifOnlyUnfocusedToggle.checked = state.notifyOnlyWhenUnfocused;
      const notifIntervalInput = document.getElementById('notifIntervalInput');
      if (notifIntervalInput)
        notifIntervalInput.value = state.notificationIntervalMinutes;
      NotificationManager.resetEdgeTracking();
    } catch (e) {
      console.warn('Could not load bot settings:', e);
    }
  }

  // Initialize Turnstile generator integration
  console.log('🚀 WPlace Auto-Image with Turnstile Token Generator loaded');
  console.log('🔑 Turnstile token generator: ALWAYS ENABLED (Background mode)');
  console.log(
    '🎯 Manual pixel captcha solving: Available as fallback/alternative',
  );
  console.log(
    '📱 Turnstile widgets: DISABLED - pure background token generation only!',
  );

  // Function to enable file operations after initial startup setup is complete
  function enableFileOperations() {
    state.initialSetupComplete = true;

    const loadBtn = document.querySelector('#loadBtn');
    const loadFromFileBtn = document.querySelector('#loadFromFileBtn');
    const uploadBtn = document.querySelector('#uploadBtn');

    if (loadBtn) {
      loadBtn.disabled = false;
      loadBtn.title = '';
      // Add a subtle animation to indicate the button is now available
      loadBtn.style.animation = 'pulse 0.6s ease-in-out';
      setTimeout(() => {
        if (loadBtn) loadBtn.style.animation = '';
      }, 600);
      console.log('✅ Load Progress button enabled after initial setup');
    }

    if (loadFromFileBtn) {
      loadFromFileBtn.disabled = false;
      loadFromFileBtn.title = '';
      // Add a subtle animation to indicate the button is now available
      loadFromFileBtn.style.animation = 'pulse 0.6s ease-in-out';
      setTimeout(() => {
        if (loadFromFileBtn) loadFromFileBtn.style.animation = '';
      }, 600);
      console.log('✅ Load from File button enabled after initial setup');
    }

    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.title = '';
      // Add a subtle animation to indicate the button is now available
      uploadBtn.style.animation = 'pulse 0.6s ease-in-out';
      setTimeout(() => {
        if (uploadBtn) uploadBtn.style.animation = '';
      }, 600);
      console.log('✅ Upload Image button enabled after initial setup');
    }

    // Show a notification that file operations are now available
    Utils.showAlert(
      '📂 File operations (Load/Upload) are now available!',
      'success',
    );
  }

  // Optimized token initialization with better timing and error handling
  async function initializeTokenGenerator() {
    // Skip if already have valid token
    if (isTokenValid()) {
      console.log('✅ Valid token already available, skipping initialization');
      updateUI('tokenReady', 'success');
      enableFileOperations(); // Enable file operations since initial setup is complete
      return;
    }

    try {
      console.log('🔧 Initializing Turnstile token generator...');
      updateUI('initializingToken', 'default');

      // Pre-load Turnstile script first to avoid delays later
      await Utils.loadTurnstile();

      const token = await handleCaptchaWithRetry();
      if (token) {
        setTurnstileToken(token);
        console.log('✅ Startup token generated successfully');
        updateUI('tokenReady', 'success');
        Utils.showAlert('🔑 Token generator ready!', 'success');
        enableFileOperations(); // Enable file operations since initial setup is complete
      } else {
        console.warn(
          '⚠️ Startup token generation failed, will retry when needed',
        );
        updateUI('tokenRetryLater', 'warning');
        // Still enable file operations even if initial token generation fails
        // Users can load progress and use manual/hybrid modes
        enableFileOperations();
      }
    } catch (error) {
      console.warn('⚠️ Startup token generation failed:', error);
      updateUI('tokenRetryLater', 'warning');
      // Still enable file operations even if initial setup fails
      // Users can load progress and use manual/hybrid modes
      enableFileOperations();
      // Don't show error alert for initialization failures, just log them
    }
  }

  // Load theme preference immediately on startup before creating UI
  loadThemePreference();

  createUI().then(() => {
    // Generate token automatically after UI is ready
    setTimeout(initializeTokenGenerator, 1000);

    // Attach advanced color matching listeners (resize dialog)
    const advancedInit = () => {
      const chromaSlider = document.getElementById('chromaPenaltyWeightSlider');
      const chromaValue = document.getElementById('chromaWeightValue');
      const resetBtn = document.getElementById('resetAdvancedColorBtn');
      const algoSelect = document.getElementById('colorAlgorithmSelect');
      const chromaToggle = document.getElementById('enableChromaPenaltyToggle');
      const transInput = document.getElementById('transparencyThresholdInput');
      const whiteInput = document.getElementById('whiteThresholdInput');
      const ditherToggle = document.getElementById('enableDitheringToggle');
      if (algoSelect)
        algoSelect.addEventListener('change', (e) => {
          state.colorMatchingAlgorithm = e.target.value;
          saveBotSettings();
          _updateResizePreview();
        });
      if (chromaToggle)
        chromaToggle.addEventListener('change', (e) => {
          state.enableChromaPenalty = e.target.checked;
          saveBotSettings();
          _updateResizePreview();
        });
      if (chromaSlider && chromaValue)
        chromaSlider.addEventListener('input', (e) => {
          state.chromaPenaltyWeight = parseFloat(e.target.value) || 0.15;
          chromaValue.textContent = state.chromaPenaltyWeight.toFixed(2);
          saveBotSettings();
          _updateResizePreview();
        });
      if (transInput)
        transInput.addEventListener('change', (e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0 && v <= 255) {
            state.customTransparencyThreshold = v;
            CONFIG.TRANSPARENCY_THRESHOLD = v;
            saveBotSettings();
            _updateResizePreview();
          }
        });
      if (whiteInput)
        whiteInput.addEventListener('change', (e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 200 && v <= 255) {
            state.customWhiteThreshold = v;
            CONFIG.WHITE_THRESHOLD = v;
            saveBotSettings();
            _updateResizePreview();
          }
        });
      if (ditherToggle)
        ditherToggle.addEventListener('change', (e) => {
          state.ditheringEnabled = e.target.checked;
          saveBotSettings();
          _updateResizePreview();
        });
      if (resetBtn)
        resetBtn.addEventListener('click', () => {
          state.colorMatchingAlgorithm = 'lab';
          state.enableChromaPenalty = true;
          state.chromaPenaltyWeight = 0.15;
          state.customTransparencyThreshold =
            CONFIG.TRANSPARENCY_THRESHOLD = 100;
          state.customWhiteThreshold = CONFIG.WHITE_THRESHOLD = 250;
          saveBotSettings();
          const a = document.getElementById('colorAlgorithmSelect');
          if (a) a.value = 'lab';
          const ct = document.getElementById('enableChromaPenaltyToggle');
          if (ct) ct.checked = true;
          if (chromaSlider) chromaSlider.value = 0.15;
          if (chromaValue) chromaValue.textContent = '0.15';
          if (transInput) transInput.value = 100;
          if (whiteInput) whiteInput.value = 250;
          _updateResizePreview();
          Utils.showAlert('Advanced color settings reset.', 'success');
        });
    };
    // Delay to ensure resize UI built
    setTimeout(advancedInit, 500);

    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
      Utils.cleanupTurnstile();
    });
  });
})();
