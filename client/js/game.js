// Zombie Apocalypse - Main Game Controller

class Game {
  constructor() {
    this.state = 'menu'; // menu, loading, playing, escaped, dead
    this.player = null;
    this.nearbyPlayers = [];
    this.gameItems = [];
    this.safeZones = [];
    this.extractionPoints = [];
    this.renderDistance = 500;
    this.lastPositionUpdate = 0;
    this.positionUpdateInterval = 1000; // ms
    this.idleUpdateInterval = 10000;
    this.isMoving = false;
    this.survivalTime = 0;
    this.survivalInterval = null;
    this.inSafeZone = false;
    this.currentSafeZoneName = '';

    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
  }

  /**
   * Initialize the game.
   */
  async init() {
    console.log('☣ Zombie Apocalypse initializing...');

    // Initialize modules
    window.mainMenu.init();

    // Register service worker
    window.pwa.register();
    window.pwa.setupInstallPrompt();

    // Listen for menu start
    document.addEventListener('menu-start', (e) => {
      this.startGame(e.detail);
    });

    // Setup settings button
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      window.settings.toggle();
    });

    // Setup radio craft button
    document.getElementById('hud-craft-radio')?.addEventListener('click', () => {
      this.craftRadio();
    });

    // Setup escape button
    document.getElementById('hud-escape-btn')?.addEventListener('click', () => {
      this.attemptEscape();
    });

    // Setup fullscreen toggle
    document.getElementById('hud-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Setup inventory bag toggle
    document.getElementById('hud-inventory-bag')?.addEventListener('click', () => {
      this.toggleInventory();
    });
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => window.mapManager.resize(), 300);
    });

    // Start game loop
    this.gameLoop();
  }

  /**
   * Start the game after menu submission.
   */
  async startGame(playerData) {
    this.state = 'loading';
    window.mainMenu.hide();
    this.showLoadingScreen();

    try {
      // Step 1: Initialize engine
      await this.loadingStep('Initializing Engine...');

      // Step 2: Request GPS
      await this.loadingStep('Requesting GPS Permission...', async () => {
        try {
          const pos = await window.gps.requestPermission();

          // Listen for GPS updates
          window.gps.on('position', (data) => {
            this.handlePositionUpdate(data);
          });

          return pos;
        } catch (err) {
          console.warn('GPS failed, using default position:', err);
          return { latitude: 40.7128, longitude: -74.0060 };
        }
      });

      // Step 3: Connect to server
      await this.loadingStep('Connecting to Server...', async () => {
        return new Promise((resolve) => {
          window.socketManager.connect();

          window.socketManager.on('connect', () => {
            resolve();
          });

          setTimeout(() => {
            console.warn('Server connection timeout, continuing in offline mode');
            resolve();
          }, 5000);
        });
      });

      // Step 4: Download survivor data
      await this.loadingStep('Downloading Survivor Data...', async () => {
        const gpsData = window.gps.getPositionData() || { latitude: 40.7128, longitude: -74.0060 };
        window.socketManager.joinGame({
          name: playerData.name,
          team: playerData.team,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
        });

        this.setupSocketListeners();

        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          window.socketManager.on('game_state', (data) => {
            clearTimeout(timeout);
            this.handleGameState(data);
            resolve();
          });
        });
      });

      // Step 5: Load world
      await this.loadingStep('Loading World...', async () => {
        const gpsData = window.gps.getPositionData() || { latitude: 40.7128, longitude: -74.0060 };
        window.mapManager.init(gpsData.latitude, gpsData.longitude);

        // Now the player renderer exists — render the local player + all known players
        this.renderAllPlayersToMap();
      });

      // Step 6: Enter outbreak!
      await this.loadingStep('Entering Outbreak...', async () => {
        window.mapManager.show();
        window.hud.init();
        window.hud.show();

        // Update player info now that HUD elements exist
        if (this.player) {
          window.hud.updatePlayerInfo(this.player);
        }

        // Re-render HUD counts after init
        this.updateOnlineCount();

        await window.deviceOrientation.requestPermission();
        window.deviceOrientation.start();

        window.deviceOrientation.on('heading', (data) => {
          window.hud.updateCompass(data.heading);
          if (window.playerRenderer && this.player) {
            window.playerRenderer.updatePlayerHeading(this.player.id, data.heading);
          }
        });

        return true;
      });

      this.state = 'playing';
      this.hideLoadingScreen();
      this.startSurvivalTimer();
      window.gps.startWatching();

      // Initial reverse geocode
      this.doReverseGeocode();

      // Periodic reverse geocode every 30s
      this._geocodeInterval = setInterval(() => this.doReverseGeocode(), 30000);

      console.log('☣ Entered outbreak!');

    } catch (err) {
      console.error('Failed to start game:', err);
      this.showLoadingError(err.message);
    }
  }

  /**
   * Show loading screen with sequential steps.
   */
  showLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    screen.classList.add('active');
    this.loadingProgress = 0;
    document.getElementById('loading-progress-fill').style.width = '0%';

    document.querySelectorAll('.loading-line').forEach(line => {
      line.classList.remove('active', 'done', 'failed');
      const textEl = line.querySelector('.loading-text');
      if (textEl) textEl.textContent = line.dataset.defaultText || '';
    });
  }

  /**
   * Execute a loading step with animated line.
   */
  async loadingStep(text, action) {
    const lines = document.querySelectorAll('.loading-line');
    const currentLine = lines[this.loadingProgress];

    if (currentLine) {
      const textEl = currentLine.querySelector('.loading-text');
      const iconEl = currentLine.querySelector('.loading-icon');
      if (textEl) textEl.textContent = text;
      currentLine.classList.add('active');
    }

    const progress = ((this.loadingProgress + 1) / 6) * 100;
    document.getElementById('loading-progress-fill').style.width = `${progress}%`;

    let result;
    try {
      if (action) {
        result = await action();
      } else {
        await new Promise(r => setTimeout(r, 800));
      }

      if (currentLine) {
        currentLine.classList.add('done');
        currentLine.classList.remove('active');
        const iconEl = currentLine.querySelector('.loading-icon');
        if (iconEl) iconEl.textContent = '✓';
      }
    } catch (err) {
      if (currentLine) {
        currentLine.classList.add('failed');
        currentLine.classList.remove('active');
        const iconEl = currentLine.querySelector('.loading-icon');
        if (iconEl) iconEl.textContent = '✗';
      }
      throw err;
    }

    this.loadingProgress++;
    return result;
  }

  /**
   * Hide the loading screen with a fade.
   */
  hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    screen.style.transition = 'opacity 0.5s ease';
    screen.style.opacity = '0';
    setTimeout(() => {
      screen.classList.remove('active');
      screen.style.opacity = '1';
    }, 500);
  }

  /**
   * Show loading error with retry option.
   */
  showLoadingError(message) {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: var(--blood-red);
      text-align: center;
      z-index: 3000;
      font-family: 'Poppins', sans-serif;
    `;
    errorEl.innerHTML = `
      <div style="font-size:2rem;margin-bottom:10px;">⚠</div>
      <div style="font-size:1rem;margin-bottom:20px;">${message}</div>
      <button onclick="location.reload()" style="padding:10px 30px;background:var(--blood-red);border:none;border-radius:6px;color:white;font-size:1rem;cursor:pointer;">Retry</button>
    `;
    document.body.appendChild(errorEl);
  }

  /**
   * Set up socket event listeners.
   */
  setupSocketListeners() {
    window.socketManager.on('game_state', (data) => this.handleGameState(data));
    window.socketManager.on('player_joined', (data) => this.handlePlayerJoined(data));
    window.socketManager.on('player_left', (data) => this.handlePlayerLeft(data));
    window.socketManager.on('player_updated', (data) => this.handlePlayerUpdated(data));
    window.socketManager.on('player_infected', (data) => this.handlePlayerInfected(data));
    window.socketManager.on('item_spawned', (data) => this.handleItemSpawned(data));
    window.socketManager.on('item_collected', (data) => this.handleItemCollected(data));
    window.socketManager.on('item_ping', (data) => this.handleItemPing(data));
    window.socketManager.on('nearby_players', (data) => this.handleNearbyPlayers(data));
    window.socketManager.on('safe_zones', (data) => this.handleSafeZones(data));
    window.socketManager.on('safe_zone_entered', (data) => this.handleSafeZoneEntered(data));
    window.socketManager.on('safe_zone_left', (data) => this.handleSafeZoneLeft(data));
    window.socketManager.on('extraction_active', (data) => this.handleExtractionActive(data));
    window.socketManager.on('escape_success', (data) => this.handleEscapeSuccess(data));
    window.socketManager.on('game_over', (data) => this.handleGameOver(data));
    window.socketManager.on('error', (data) => this.handleError(data));
  }

  /**
   * Handle initial game state from server.
   * Note: playerRenderer doesn't exist yet when this runs (map init is Step 5).
   * We store the data and render players later via renderAllPlayersToMap().
   */
  handleGameState(data) {
    this.player = data.player;
    // Filter local player out — updateOnlineCount() always adds +1 for the local player
    this.nearbyPlayers = (data.players || []).filter(p => p.id !== this.player?.id);
    this.gameItems = data.items || [];
    this.safeZones = data.safeZones || [];
    this.extractionPoints = data.extractionPoints || [];

    // Setup player inventory if missing
    this.player.inventory = this.player.inventory || [
      { type: 'medicine', name: 'Medicine' },
      { type: 'medicine', name: 'Medicine' },
    ];

    if (window.playerRenderer) {
      window.playerRenderer.setLocalPlayerId(this.player.id);
    }

    window.hud.updatePlayerInfo(this.player);
    this.updateOnlineCount();
    this.updateInventoryUI();

    // Update escape UI based on player state
    this.updateEscapeUI();

    // Store items/safe zones for when map is ready
    this._pendingItems = data.items || [];
    this._pendingSafeZones = data.safeZones || [];
    this._pendingExtractionPoints = data.extractionPoints || [];

    // If player renderer already exists (e.g., reconnection), render now
    if (window.playerRenderer) {
      window.playerRenderer.setLocalPlayerId(this.player.id);
      this.renderAllPlayersToMap();
    }
  }

  /**
   * Render all known players on the map.
   * Called after map/playerRenderer is initialized (Step 5).
   */
  renderAllPlayersToMap() {
    if (!window.playerRenderer || !this.player) return;

    window.playerRenderer.setLocalPlayerId(this.player.id);

    // Render local player first
    window.playerRenderer.updatePlayer(this.player);

    // Render all other players
    this.nearbyPlayers.forEach(p => {
      window.playerRenderer.updatePlayer(p);
    });

    // Render pending map items
    if (this._pendingItems) {
      this._pendingItems.forEach(item => {
        if (!item.is_collected) window.mapManager.addItemMarker(item);
      });
      delete this._pendingItems;
    }

    // Render pending safe zones
    if (this._pendingSafeZones) {
      this._pendingSafeZones.forEach(zone => window.mapManager.addSafeZone(zone));
      delete this._pendingSafeZones;
    }

    // Render pending extraction points
    if (this._pendingExtractionPoints) {
      this._pendingExtractionPoints.forEach(ep => window.mapManager.addExtractionPoint(ep));
      delete this._pendingExtractionPoints;
    }
  }

  /**
   * Update the HUD online player count, always including the local player.
   */
  updateOnlineCount() {
    if (!this.player) return;
    const totalOnline = this.nearbyPlayers.length + 1;
    window.hud.updateGameStats({
      online: totalOnline,
      survivors: this.nearbyPlayers.filter(p => p.team === 'survivor').length + (this.player.team === 'survivor' ? 1 : 0),
      zombies: this.nearbyPlayers.filter(p => p.team === 'zombie').length + (this.player.team === 'zombie' ? 1 : 0),
    });
  }

  /**
   * Handle new player joining.
   */
  handlePlayerJoined(data) {
    if (window.playerRenderer) {
      window.playerRenderer.updatePlayer(data);
    }
    window.notifications.showPlayerJoined(data.name, data.team);
  }

  /**
   * Handle player leaving.
   */
  handlePlayerLeft(data) {
    if (window.playerRenderer) {
      window.playerRenderer.removePlayer(data.id);
    }
  }

  /**
   * Handle player position/state update.
   */
  handlePlayerUpdated(data) {
    if (window.playerRenderer) {
      window.playerRenderer.updatePlayer(data);
    }
    // Update local player health if this is us
    if (data.id === this.player?.id && data.health !== undefined) {
      this.player.health = data.health;
      window.hud.updateHealth(data.health);
    }
  }

  /**
   * Handle infection event.
   */
  handlePlayerInfected(data) {
    if (data.playerId === this.player?.id) {
      this.player.team = 'zombie';
      this.player.status = 'infected';
      this.player.mech_parts = 0;
      this.player.has_radio = false;
      window.hud.updatePlayerInfo(this.player);
      this.updateEscapeUI();

      const flash = document.getElementById('infection-flash');
      flash.classList.add('active');
      const container = document.getElementById('game-container');
      container.classList.add('shake');

      setTimeout(() => {
        flash.classList.remove('active');
        container.classList.remove('shake');
      }, 800);

      if (window.audio) {
        window.audio.playInfection();
      }
    }

    if (window.playerRenderer) {
      window.playerRenderer.updatePlayer({
        id: data.playerId,
        team: 'zombie',
        status: 'infected',
      });
    }

    window.notifications.showInfection(data.playerName, data.infectorName);
  }

  /**
   * Handle items spawned.
   */
  handleItemSpawned(data) {
    this.gameItems = data.items || [];
    window.mapManager.clearItemMarkers();
    data.items?.forEach(item => {
      if (!item.is_collected) {
        window.mapManager.addItemMarker(item);
      }
    });
  }

  /**
   * Handle item collected.
   */
  handleItemCollected(data) {
    data.items?.forEach(item => {
      window.mapManager.removeItemMarker(item.id);

      if (item.collectedBy === this.player?.id) {
        if (item.type === 'mech_part') {
          this.player.mech_parts = (this.player.mech_parts || 0) + 1;
          window.hud.updateMechParts(this.player.mech_parts);
          this.updateEscapeUI();
          if (this.player.mech_parts >= 3) {
            window.notifications.show('⚙️ All mech parts collected! Craft your radio!', 'success', 6000);
          }
        }
        window.notifications.showItemCollected(item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
        if (window.audio) window.audio.playItemPickup();
      }
    });
  }

  /**
   * Handle item ping (items ping their location every 5 min).
   */
  handleItemPing(data) {
    data.items?.forEach(item => {
      // Flash the item marker's ping animation
      window.mapManager.pingItem(item.id);
    });
  }

  /**
   * Handle nearby players update.
   */
  handleNearbyPlayers(data) {
    this.nearbyPlayers = data.players || [];
    this.updateOnlineCount();

    // Update extraction points from nearby data
    if (data.extractionPoints) {
      this.extractionPoints = data.extractionPoints;
      window.mapManager.clearExtractionPoints();
      data.extractionPoints.forEach(ep => {
        window.mapManager.addExtractionPoint(ep);
      });
    }
  }

  /**
   * Handle safe zone entered.
   */
  handleSafeZoneEntered(data) {
    this.inSafeZone = true;
    this.currentSafeZoneName = data.name;
    window.notifications.showSafeZoneEnter(data.name);
  }

  /**
   * Handle safe zone left.
   */
  handleSafeZoneLeft() {
    this.inSafeZone = false;
    this.currentSafeZoneName = '';
    window.notifications.show('⚠ Left safe zone', 'warning', 3000);
  }

  /**
   * Handle safe zones data.
   */
  handleSafeZones(data) {
    this.safeZones = data;
    window.mapManager.clearSafeZones();
    data.forEach(zone => window.mapManager.addSafeZone(zone));
  }

  /**
   * Handle extraction point activated (radio crafted).
   */
  handleExtractionActive(data) {
    const ep = data.extractionPoint;
    if (ep) {
      // Update existing or add new extraction point
      window.mapManager.addExtractionPoint(ep);
    }

    // Update escaped count display
    if (data.escapedCount !== undefined) {
      window.hud.updateEscapeStatus(data.escapedCount, ep?.max_capacity || 4);
    }

    window.notifications.show(
      `📻 ${data.craftedBy?.name || 'A survivor'} activated an extraction point!`,
      'info', 6000
    );
  }

  /**
   * Handle escape success.
   */
  handleEscapeSuccess(data) {
    this.state = 'escaped';
    this.cleanupTimers();

    if (data.coins) {
      this.player.coins = (this.player.coins || 0) + data.coins;
    }

    // Show escape overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      animation: fade-in 0.5s ease;
      font-family: 'Cinzel', serif;
    `;
    overlay.innerHTML = `
      <div style="font-size:4rem;margin-bottom:20px;">🚁</div>
      <div style="font-size:2.5rem;color:var(--neon-green);text-shadow:0 0 20px rgba(57,255,20,0.5);margin-bottom:10px;">
        ESCAPED!
      </div>
      <div style="font-family:'Poppins',sans-serif;font-size:1rem;color:rgba(255,255,255,0.7);margin-bottom:5px;">
        ${data.message || 'You made it to the helicopter!'}
      </div>
      <div style="font-family:'Poppins',sans-serif;font-size:0.9rem;color:var(--item-gold);margin-bottom:30px;">
        +${data.coins || 100} coins earned
      </div>
      <button onclick="location.reload()" style="padding:12px 40px;background:var(--blood-red);border:none;border-radius:8px;color:white;font-size:1rem;cursor:pointer;font-family:'Poppins',sans-serif;">
        PLAY AGAIN
      </button>
    `;
    document.body.appendChild(overlay);

    if (window.audio) {
      window.audio.playNotification();
    }
  }

  /**
   * Handle game over (zombie win).
   */
  handleGameOver(data) {
    this.state = 'game_over';
    this.cleanupTimers();

    // Show game over overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      animation: fade-in 0.5s ease;
      font-family: 'Cinzel', serif;
    `;
    overlay.innerHTML = `
      <div style="font-size:4rem;margin-bottom:10px;">🧟☠</div>
      <div style="font-size:2.2rem;color:var(--blood-red);text-shadow:0 0 30px rgba(193,18,31,0.6);margin-bottom:10px;letter-spacing:0.1em;">
        OUTBREAK WINNERS
      </div>
      <div style="font-family:'Poppins',sans-serif;font-size:1.2rem;color:var(--blood-red);margin-bottom:20px;opacity:0.9;">
        ${data.message || 'All survivors have been infected! The zombies win!'}
      </div>
      <div style="font-family:'Poppins',sans-serif;font-size:0.9rem;color:rgba(255,255,255,0.5);margin-bottom:30px;">
        New supplies are being dropped. The hunt begins again...
      </div>
      <button onclick="location.reload()" style="padding:12px 40px;background:var(--blood-red);border:none;border-radius:8px;color:white;font-size:1rem;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;letter-spacing:0.05em;box-shadow:0 0 15px rgba(193,18,31,0.4);transition:transform 0.2s;"
        onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
      >
        PLAY AGAIN
      </button>
    `;
    document.body.appendChild(overlay);

    // Play zombie win sound
    if (window.audio) {
      window.audio.playNotification();
    }

    // Clear survival timer
    if (this.survivalInterval) {
      clearInterval(this.survivalInterval);
    }
  }

  /**
   * Handle error.
   */
  handleError(data) {
    window.notifications.showError(data.message);
    console.warn('Server error:', data.message);
  }

  /**
   * Handle GPS position update.
   */
  handlePositionUpdate(data) {
    if (!data || !this.player) return;

    this.isMoving = data.isMoving;

    window.hud.updateGPSInfo(data.accuracy, data.speed);
    window.hud.updateCompass(window.deviceOrientation.getHeading());

    window.mapManager.centerOnPlayer(data.latitude, data.longitude);      // Update direction line to nearest extraction point
      window.mapManager.updateDirectionLine(data.latitude, data.longitude);

      // Reverse geocode if moved significantly (>150m)
      if (this._lastGeocodePos) {
        const dist = this.calculateDistance(
          this._lastGeocodePos.lat, this._lastGeocodePos.lng,
          data.latitude, data.longitude
        );
        if (dist > 150) {
          this._lastGeocodePos = { lat: data.latitude, lng: data.longitude };
          this.doReverseGeocode();
        }
      } else {
        this._lastGeocodePos = { lat: data.latitude, lng: data.longitude };
      }

    const now = Date.now();
    const interval = this.isMoving ? this.positionUpdateInterval : this.idleUpdateInterval;
    if (now - this.lastPositionUpdate >= interval) {
      window.socketManager.updatePosition(data.latitude, data.longitude);
      this.lastPositionUpdate = now;

      if (window.playerRenderer && this.player) {
        window.playerRenderer.updatePlayer({
          ...this.player,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: window.deviceOrientation.getHeading(),
        });
      }
    }

    if (this.player.team === 'zombie') {
      this.checkZombieVision(data.latitude, data.longitude);
    }

    this.survivalStartTime = this.survivalStartTime || Date.now();
  }

  /**
   * Reverse geocode — use Nominatim to find the current city/place name.
   */
  async doReverseGeocode() {
    // Rate limit: at most once every 5 seconds (Nominatim policy)
    const now = Date.now();
    if (this._lastGeocodeTime && now - this._lastGeocodeTime < 5000) return;

    const gpsData = window.gps.getPositionData();
    if (!gpsData) return;

    const { latitude, longitude } = gpsData;
    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

    // Throttle: don't re-request if position hasn't changed much (≈100m)
    if (this._lastGeocodeKey === cacheKey) return;
    this._lastGeocodeKey = cacheKey;
    this._lastGeocodeTime = now;

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&accept-language=en`,
        { headers: { 'User-Agent': 'ZombieApocalypse/1.0' } }
      );
      if (!resp.ok) return;
      const data = await resp.json();

      let place = data.display_name || '';
      // Shorten: take the first 3 parts of the address (e.g. "Street, District, City")
      const parts = place.split(',').slice(0, 3).map(s => s.trim()).join(', ');
      window.hud.updateLocation(parts || 'Unknown area');
    } catch (err) {
      console.warn('Geocode error:', err);
    }
  }

  /**
   * Check zombie vision for nearby survivors.
   */
  checkZombieVision(lat, lng) {
    let nearestSurvivor = null;
    let nearestDistance = Infinity;

    this.nearbyPlayers.forEach(p => {
      if (p.team !== 'survivor') return;
      const dist = this.calculateDistance(lat, lng, p.latitude, p.longitude);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestSurvivor = p;
      }
    });

    const visionEl = document.getElementById('zombie-vision');
    if (nearestSurvivor && nearestDistance <= 50) {
      visionEl.classList.add('active');
      if (window.audio && Math.random() < 0.05) {
        window.audio.playHeartbeat();
      }
    } else {
      visionEl.classList.remove('active');
    }
  }

  /**
   * Update the escape UI elements based on player state.
   */
  updateEscapeUI() {
    if (!this.player) return;

    const craftBtn = document.getElementById('hud-craft-radio');
    const escapeBtn = document.getElementById('hud-escape-btn');
    const escapePanel = document.getElementById('hud-escape-panel');

    if (!escapePanel) return;

    const isSurvivor = this.player.team === 'survivor';
    const hasRadio = this.player.has_radio;
    const mechParts = this.player.mech_parts || 0;
    const status = this.player.status;

    // Show escape panel only for active survivors
    if (isSurvivor && status === 'active') {
      escapePanel.style.display = 'flex';

      if (hasRadio) {
        if (craftBtn) craftBtn.style.display = 'none';
        if (escapeBtn) escapeBtn.style.display = 'block';
        document.getElementById('hud-escape-status').textContent = '📻 Radio ready! Get to the extraction point!';
        document.getElementById('hud-escape-status').style.color = 'var(--neon-green)';
      } else {
        if (craftBtn) {
          craftBtn.style.display = mechParts >= 3 ? 'block' : 'none';
        }
        if (escapeBtn) escapeBtn.style.display = 'none';
        document.getElementById('hud-escape-status').textContent = `⚙️ Collect mech parts (${mechParts}/3)`;
        document.getElementById('hud-escape-status').style.color = mechParts > 0 ? 'var(--item-gold)' : 'rgba(255,255,255,0.5)';
      }
    } else {
      escapePanel.style.display = 'none';
    }
  }

  /**
   * Craft radio (emit to server).
   */
  craftRadio() {
    if (!this.player || this.player.team !== 'survivor') return;
    const mechParts = this.player.mech_parts || 0;
    if (mechParts < 3) {
      window.notifications.showError(`Need ${3 - mechParts} more mech parts!`);
      return;
    }
    if (this.player.has_radio) {
      window.notifications.show('Radio already crafted!', 'info', 3000);
      return;
    }
    window.socketManager.craftRadio();
    if (window.audio) window.audio.playNotification();
  }

  /**
   * Attempt escape (emit to server).
   */
  attemptEscape() {
    if (!this.player || this.player.team !== 'survivor') return;
    if (!this.player.has_radio) {
      window.notifications.showError('Craft a radio first!');
      return;
    }
    window.socketManager.escape();
  }

  /**
   * Calculate distance between two GPS coordinates.
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Clean up all running timers.
   */
  cleanupTimers() {
    if (this.survivalInterval) {
      clearInterval(this.survivalInterval);
      this.survivalInterval = null;
    }
    if (this._geocodeInterval) {
      clearInterval(this._geocodeInterval);
      this._geocodeInterval = null;
    }
  }

  /**
   * Start survival timer.
   */
  startSurvivalTimer() {
    this.survivalStartTime = Date.now();
    this.survivalInterval = setInterval(() => {
      if (this.state === 'playing') {
        this.survivalTime = Math.floor((Date.now() - this.survivalStartTime) / 1000);
      }
    }, 1000);
  }

  /**
   * Toggle inventory bag open/closed.
   */
  toggleInventory() {
    const bar = document.getElementById('hud-inventory');
    if (!bar) return;
    const isOpen = bar.style.display !== 'none';
    bar.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) this.updateInventoryUI();
  }

  /**
   * Refresh the inventory display from player data.
   */
  updateInventoryUI() {
    if (!this.player) return;
    const items = this.player.inventory || [];
    window.hud.updateInventory(items);
    window.hud.updateInventoryBag(items);
  }

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
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
   * Update fullscreen button icon.
   */
  updateFullscreenIcon() {
    const btn = document.getElementById('hud-fullscreen-btn');
    if (!btn) return;
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    btn.textContent = isFullscreen ? '✕' : '⛶';
    btn.title = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  }

  /**
   * Main game loop (runs at ~60fps via requestAnimationFrame).
   */
  gameLoop() {
    if (this.state === 'playing' && window.deviceOrientation && window.deviceOrientation.supported) {
      window.hud.updateCompass(window.deviceOrientation.getHeading());
    }

    requestAnimationFrame(this.gameLoop);
  }
}
// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game;
  game.init();
});
