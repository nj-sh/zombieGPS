// Zombie Apocalypse - Settings Panel

class SettingsPanel {
  constructor() {
    this.panel = null;
    this.isOpen = false;

    // Settings state
    this.settings = {
      musicVolume: 0.3,
      sfxVolume: 0.7,
      ambientVolume: 0.2,
      muted: false,
      renderDistance: 500,
      quality: 'high', // low, medium, high
      fullscreen: false,
      satelliteView: false,
    };

    this.loadSettings();
  }

  /**
   * Create the settings panel.
   */
  create() {
    if (this.panel) return;

    this.panel = document.createElement('div');
    this.panel.id = 'settings-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 0; right: -320px;
      width: 300px; height: 100%;
      background: rgba(10, 10, 10, 0.95);
      border-left: 1px solid rgba(193, 18, 31, 0.3);
      z-index: 800;
      display: flex;
      flex-direction: column;
      padding: 20px;
      transition: right 0.3s ease;
      font-family: 'Poppins', sans-serif;
      pointer-events: auto;
      overflow-y: auto;
    `;

    this.panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="font-family:'Cinzel',serif;font-size:1.2rem;color:var(--blood-red);letter-spacing:0.1em;">SETTINGS</h2>
        <button id="settings-close" style="background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;">✕</button>
      </div>

      <div class="settings-section" style="margin-bottom:20px;">
        <h3 style="font-size:0.8rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Audio</h3>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:0.85rem;">
          <input type="checkbox" id="setting-mute" ${this.settings.muted ? 'checked' : ''}>
          Mute All
        </label>
        <div style="margin-bottom:8px;">
          <span style="font-size:0.8rem;">Music</span>
          <input type="range" id="setting-music-volume" min="0" max="100" value="${this.settings.musicVolume * 100}">
        </div>
        <div style="margin-bottom:8px;">
          <span style="font-size:0.8rem;">SFX</span>
          <input type="range" id="setting-sfx-volume" min="0" max="100" value="${this.settings.sfxVolume * 100}">
        </div>
        <div style="margin-bottom:8px;">
          <span style="font-size:0.8rem;">Ambient</span>
          <input type="range" id="setting-ambient-volume" min="0" max="100" value="${this.settings.ambientVolume * 100}">
        </div>
      </div>

      <div class="settings-section" style="margin-bottom:20px;">
        <h3 style="font-size:0.8rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Graphics</h3>
        <div style="margin-bottom:8px;">
          <span style="font-size:0.8rem;">Render Distance</span>
          <input type="range" id="setting-render-distance" min="50" max="1000" step="50" value="${this.settings.renderDistance}">
          <span id="setting-render-distance-value" style="font-size:0.7rem;color:rgba(255,255,255,0.5);">${this.settings.renderDistance}m</span>
        </div>
        <div style="margin-bottom:8px;">
          <span style="font-size:0.8rem;">Quality</span>
          <select id="setting-quality" style="width:100%;padding:6px;background:var(--dark-gray);color:white;border:1px solid rgba(255,255,255,0.15);border-radius:4px;">
            <option value="low" ${this.settings.quality === 'low' ? 'selected' : ''}>Low (Battery Saver)</option>
            <option value="medium" ${this.settings.quality === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${this.settings.quality === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>

      <div class="settings-section" style="margin-bottom:20px;">
        <h3 style="font-size:0.8rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Display</h3>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:0.85rem;">
          <input type="checkbox" id="setting-fullscreen" ${this.settings.fullscreen ? 'checked' : ''}>
          Fullscreen
        </label>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:0.85rem;">
          <input type="checkbox" id="setting-satellite" ${this.settings.satelliteView ? 'checked' : ''}>
          🛰️ Satellite View
        </label>
      </div>

      <div style="margin-top:auto;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
        <p style="font-size:0.65rem;color:rgba(255,255,255,0.3);text-align:center;">
          Zombie Apocalypse v1.0<br>
          Made with ☣ for the brave
        </p>
      </div>
    `;

    document.body.appendChild(this.panel);
    this.bindEvents();
  }

  /**
   * Bind settings event handlers.
   */
  bindEvents() {
    document.getElementById('settings-close')?.addEventListener('click', () => this.close());

    // Mute
    document.getElementById('setting-mute')?.addEventListener('change', (e) => {
      this.settings.muted = e.target.checked;
      if (window.audio) window.audio.toggleMute();
      this.saveSettings();
    });

    // Music Volume
    document.getElementById('setting-music-volume')?.addEventListener('input', (e) => {
      this.settings.musicVolume = e.target.value / 100;
      if (window.audio) window.audio.setMusicVolume(this.settings.musicVolume);
      this.saveSettings();
    });

    // SFX Volume
    document.getElementById('setting-sfx-volume')?.addEventListener('input', (e) => {
      this.settings.sfxVolume = e.target.value / 100;
      if (window.audio) window.audio.setSfxVolume(this.settings.sfxVolume);
      this.saveSettings();
    });

    // Ambient Volume
    document.getElementById('setting-ambient-volume')?.addEventListener('input', (e) => {
      this.settings.ambientVolume = e.target.value / 100;
      if (window.audio) window.audio.setAmbientVolume(this.settings.ambientVolume);
      this.saveSettings();
    });

    // Render Distance
    document.getElementById('setting-render-distance')?.addEventListener('input', (e) => {
      this.settings.renderDistance = parseInt(e.target.value);
      document.getElementById('setting-render-distance-value').textContent = `${this.settings.renderDistance}m`;
      if (window.game) window.game.renderDistance = this.settings.renderDistance;
      this.saveSettings();
    });

    // Quality
    document.getElementById('setting-quality')?.addEventListener('change', (e) => {
      this.settings.quality = e.target.value;
      this.saveSettings();
    });

    // Fullscreen
    document.getElementById('setting-fullscreen')?.addEventListener('change', (e) => {
      this.settings.fullscreen = e.target.checked;
      this.toggleFullscreen(e.target.checked);
      this.saveSettings();
    });

    // Satellite View
    document.getElementById('setting-satellite')?.addEventListener('change', (e) => {
      this.settings.satelliteView = e.target.checked;
      if (window.mapManager) {
        window.mapManager.toggleSatellite(e.target.checked);
      }
      this.saveSettings();
    });
  }

  /**
   * Toggle fullscreen.
   */
  toggleFullscreen(enabled) {
    if (enabled) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  /**
   * Open the settings panel.
   */
  open() {
    if (!this.panel) this.create();
    this.panel.style.right = '0';
    this.isOpen = true;
  }

  /**
   * Close the settings panel.
   */
  close() {
    if (!this.panel) return;
    this.panel.style.right = '-320px';
    this.isOpen = false;
  }

  /**
   * Toggle settings panel.
   */
  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  /**
   * Save settings to localStorage.
   */
  saveSettings() {
    try {
      localStorage.setItem('za_settings', JSON.stringify(this.settings));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Load settings from localStorage.
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('za_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.settings, parsed);
      }
    } catch (e) {
      // ignore
    }
  }
}

// Singleton
const settings = new SettingsPanel();
window.settings = settings;
