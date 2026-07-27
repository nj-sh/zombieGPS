// Zombie Apocalypse - PWA Manager

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.installPromptShown = false;
  }

  /**
   * Register service worker.
   */
  async register() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');
        return registration;
      } catch (err) {
        console.warn('⚠️ Service Worker registration failed:', err);
      }
    }
  }

  /**
   * Setup install prompt handler.
   * Shows a custom install button when the beforeinstallprompt event fires.
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install prompt after a short delay (don't annoy immediately)
      setTimeout(() => {
        if (!this.installPromptShown) {
          this.showInstallPrompt();
        }
      }, 60000); // 1 minute into gameplay
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ App installed');
      this.deferredPrompt = null;
      this.installPromptShown = true;
    });
  }

  /**
   * Show a custom install prompt notification.
   */
  showInstallPrompt() {
    if (!this.deferredPrompt || this.installPromptShown) return;

    // Create a subtle install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 70px;
      left: 15px;
      right: 15px;
      background: rgba(26, 26, 26, 0.95);
      border: 1px solid var(--blood-red);
      border-radius: 10px;
      padding: 12px 16px;
      z-index: 900;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 0 20px rgba(193, 18, 31, 0.3);
      font-family: 'Poppins', sans-serif;
      animation: slide-up 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="font-size:1.5rem;">☣</div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Install Zombie Apocalypse</div>
        <div style="font-size:0.7rem;color:rgba(255,255,255,0.5);">Add to home screen for the best experience</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="pwa-install-yes" style="padding:6px 12px;background:var(--blood-red);border:none;border-radius:4px;color:white;font-size:0.8rem;cursor:pointer;font-weight:600;">Install</button>
        <button id="pwa-install-no" style="padding:6px 12px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:white;font-size:0.8rem;cursor:pointer;">Not now</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-install-yes').addEventListener('click', async () => {
      this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        console.log('User accepted install');
      }
      this.installPromptShown = true;
      banner.remove();
    });

    document.getElementById('pwa-install-no').addEventListener('click', () => {
      this.installPromptShown = true;
      banner.remove();
    });
  }

  /**
   * Check if running in standalone mode (already installed).
   */
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
}

// Singleton
const pwa = new PWAManager();
window.pwa = pwa;
