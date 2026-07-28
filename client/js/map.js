// Zombie Apocalypse - Map Manager

class MapManager {
  constructor() {
    this.map = null;
    this.tileLayer = null;
    this.satelliteLayer = null;
    this.activeLayer = null;
    this.mainLayer = null;
    this.itemLayer = null;
    this.safeZoneLayer = null;
    this.playerRenderer = null;
    this.isInitialized = false;
    this.currentCenter = [0, 0];
    this.currentZoom = 17;
    this.itemMarkers = new Map();
    this.safeZoneMarkers = new Map();
    this.extractionPointMarkers = new Map();
    this.extractionPointLayer = null;
    this.renderDistance = 500; // meters
    this.satelliteMode = false;
    // Waypoint state
    this.waypointMarker = null;
    this.waypointLine = null;
    this.waypointCoords = null;
    this.waypointLayer = null;
  }

  /**
   * Initialize the Leaflet map.
   */
  init(centerLat = 40.7128, centerLng = -74.0060) {
    if (this.isInitialized) return;

    this.currentCenter = [centerLat, centerLng];

    // Create map
    this.map = L.map('map', {
      center: this.currentCenter,
      zoom: this.currentZoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,  // Allow scroll-to-zoom
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      zoomSnap: 0.5,
      zoomDelta: 1,
    });

    // OpenStreetMap tiles (works worldwide, includes labels)
    this.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 17,  // ~2-3 buildings only — keeps the game location-realistic
      attribution: '&copy; OpenStreetMap contributors',
      noWrap: true,
    });

    // Esri Satellite tiles (for satellite mode toggle)
    this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      minZoom: 17,
      attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      noWrap: true,
    });

    // Start with OSM
    this.activeLayer = this.tileLayer;
    this.activeLayer.addTo(this.map);

    // Create layers
    this.itemLayer = L.layerGroup().addTo(this.map);
    this.safeZoneLayer = L.layerGroup().addTo(this.map);
    this.extractionPointLayer = L.layerGroup().addTo(this.map);
    this.waypointLayer = L.layerGroup().addTo(this.map);

    // Create player renderer
    this.playerRenderer = new window.PlayerRenderer(this.map);
    window.playerRenderer = this.playerRenderer;

    // Set up click handler for waypoints
    this.map.on('click', (e) => this.handleMapClick(e));

    // Restore satellite preference
    try {
      const pref = localStorage.getItem('za_satellite');
      if (pref === 'true') {
        this.toggleSatellite(true);
      }
    } catch (e) {}

    this.isInitialized = true;
    console.log('🗺️ Map initialized');
  }

  /**
   * Show the map with a fade-in animation.
   */
  show() {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.add('visible');
    }
    this.map.invalidateSize();
  }

  /**
   * Hide the map.
   */
  hide() {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.remove('visible');
    }
  }

  /**
   * Move the map to a specific location smoothly.
   */
  flyTo(lat, lng, zoom = this.currentZoom) {
    if (!this.map) return;
    this.currentCenter = [lat, lng];
    this.currentZoom = zoom;
    this.map.flyTo([lat, lng], zoom, {
      duration: 1.5,
      easeLinearity: 0.5,
    });
  }

  /**
   * Pan the map to a location smoothly.
   */
  panTo(lat, lng) {
    if (!this.map) return;
    this.currentCenter = [lat, lng];
    this.map.panTo([lat, lng], {
      duration: 0.5,
      animate: true,
    });
  }

  /**
   * Center the map on the local player.
   */
  centerOnPlayer(lat, lng) {
    if (!this.map) return;
    this.currentCenter = [lat, lng];
    this.map.panTo([lat, lng], {
      duration: 0.3,
      animate: true,
    });
  }

  /**
   * Add an item marker to the map (with emoji icons).
   */
  addItemMarker(item) {
    if (!this.map) return;

    // Emoji + glow per type
    const icons = {
      mech_part: { emoji: '⚙️', size: 28, glow: '#ffd700' },
      health_pack: { emoji: '❤️', size: 24, glow: '#00cc00' },
      ammo: { emoji: '🔫', size: 24, glow: '#ff8800' },
      food: { emoji: '🍖', size: 24, glow: '#8B4513' },
      medicine: { emoji: '💊', size: 24, glow: '#00aaff' },
      energy_drink: { emoji: '⚡', size: 24, glow: '#00ffee' },
      armor: { emoji: '🛡️', size: 24, glow: '#888888' },
      keys: { emoji: '🔑', size: 24, glow: '#c0c0c0' },
    };

    const cfg = icons[item.type] || { emoji: '📦', size: 24, glow: '#ffffff' };

    const icon = L.divIcon({
      html: `
        <div class="item-marker ${item.type}" style="
          width:${cfg.size}px;height:${cfg.size}px;
          display:flex;align-items:center;justify-content:center;
          font-size:${cfg.size}px;
          line-height:1;
          font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Android Emoji',sans-serif;
          filter:drop-shadow(0 0 8px ${cfg.glow});
          animation:item-ping 3s ease-in-out infinite;
        ">${cfg.emoji}</div>
      `,
      className: '',
      iconSize: [cfg.size + 10, cfg.size + 10],
      iconAnchor: [(cfg.size + 10) / 2, (cfg.size + 10) / 2],
    });

    const marker = L.marker([item.latitude, item.longitude], {
      icon,
      interactive: false,
    }).addTo(this.itemLayer);

    this.itemMarkers.set(item.id, marker);
  }

  /**
   * Remove an item marker.
   */
  removeItemMarker(itemId) {
    const marker = this.itemMarkers.get(itemId);
    if (marker) {
      this.itemLayer.removeLayer(marker);
      this.itemMarkers.delete(itemId);
    }
  }

  /**
   * Clear all item markers.
   */
  clearItemMarkers() {
    this.itemLayer.clearLayers();
    this.itemMarkers.clear();
  }

  /**
   * Add a safe zone marker — now with loot indicator.
   */
  addSafeZone(zone) {
    if (!this.map) return;

    const labels = {
      hospital: '🏥',
      police_station: '👮',
      military_base: '⚔️',
    };

    const icon = L.divIcon({
      html: `
        <div class="safe-zone-marker" style="position:relative;">
          ${labels[zone.type] || '🏠'}
          <div style="
            position:absolute;top:-6px;right:-6px;
            font-size:0.7rem;
            filter:drop-shadow(0 0 4px rgba(255,215,0,0.8));
            animation:glow-pulse 1.5s ease-in-out infinite;
          ">🎒</div>
        </div>
        <div style="text-align:center;font-size:0.65rem;color:var(--safe-zone);text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">
          ${zone.name}
        </div>
        <div style="text-align:center;font-size:0.55rem;color:var(--item-gold);text-shadow:0 1px 3px rgba(0,0,0,0.8);opacity:0.8;">
          🎒 Loot
        </div>
      `,
      className: '',
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });

    const marker = L.marker([zone.latitude, zone.longitude], {
      icon,
      interactive: false,
    }).addTo(this.safeZoneLayer);

    // Add a radius circle
    const circle = L.circle([zone.latitude, zone.longitude], {
      radius: zone.radius_m,
      color: '#00aaff',
      fillColor: '#00aaff',
      fillOpacity: 0.1,
      weight: 1,
      opacity: 0.3,
    }).addTo(this.safeZoneLayer);

    // Inner ring — lootable area highlight
    const lootCircle = L.circle([zone.latitude, zone.longitude], {
      radius: zone.radius_m * 0.5,
      color: '#ffd700',
      fillColor: '#ffd700',
      fillOpacity: 0.04,
      weight: 1,
      opacity: 0.2,
      dashArray: '4, 6',
    }).addTo(this.safeZoneLayer);

    this.safeZoneMarkers.set(zone.id, { marker, circle, lootCircle });
  }

  /**
   * Clear safe zone markers.
   */
  clearSafeZones() {
    this.safeZoneLayer.clearLayers();
    this.safeZoneMarkers.clear();
  }

  /**
   * Add an extraction point marker (helicopter landing zone).
   */
  addExtractionPoint(ep) {
    if (!this.map || !this.extractionPointLayer) return;

    // Remove existing marker for this ID
    const existing = this.extractionPointMarkers.get(ep.id);
    if (existing) {
      this.extractionPointLayer.removeLayer(existing.marker);
      this.extractionPointLayer.removeLayer(existing.circle);
    }

    const label = ep.escaped_count !== undefined
      ? `🚁 ${ep.escaped_count}/${ep.max_capacity}`
      : '🚁 Extraction';

    const icon = L.divIcon({
      html: `
        <div style="
          width:40px;height:40px;
          display:flex;align-items:center;justify-content:center;
          font-size:1.8rem;
          filter:drop-shadow(0 0 10px rgba(0,255,0,0.6));
          animation:glow-pulse 2s ease-in-out infinite;
        ">
          🚁
        </div>
        <div style="
          text-align:center;font-size:0.7rem;
          color:var(--neon-green);
          text-shadow:0 1px 3px rgba(0,0,0,0.9);
          font-weight:700;
          white-space:nowrap;
        ">${label}</div>
      `,
      className: '',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    const marker = L.marker([ep.latitude, ep.longitude], {
      icon,
      interactive: false,
    }).addTo(this.extractionPointLayer);

    // Add a glowing radius circle
    const circle = L.circle([ep.latitude, ep.longitude], {
      radius: ep.radius_m || 20,
      color: '#39ff14',
      fillColor: '#39ff14',
      fillOpacity: 0.08,
      weight: 2,
      opacity: 0.5,
      className: 'extraction-circle',
    }).addTo(this.extractionPointLayer);

    this.extractionPointMarkers.set(ep.id, { marker, circle });

    // Fly to the extraction point for the first one
    if (this.extractionPointMarkers.size === 1) {
      this.flyTo(ep.latitude, ep.longitude, 16);
    }
  }

  /**
   * Clear all extraction point markers.
   */
  clearExtractionPoints() {
    if (this.extractionPointLayer) {
      this.extractionPointLayer.clearLayers();
    }
    this.extractionPointMarkers.clear();
    this.removeDirectionLine();
  }

  // ── SATELLITE TOGGLE ──

  /**
   * Toggle between OSM street map and satellite view.
   */
  toggleSatellite(enable) {
    if (!this.map || !this.tileLayer || !this.satelliteLayer) return;

    this.satelliteMode = enable;

    if (enable) {
      this.map.removeLayer(this.tileLayer);
      this.satelliteLayer.addTo(this.map);
      this.activeLayer = this.satelliteLayer;
      // Add label overlay on satellite for street names
      if (this.labelLayer) {
        this.map.removeLayer(this.labelLayer);
      }
      this.labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        minZoom: 17,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        noWrap: true,
        opacity: 0.85,
      }).addTo(this.map);
    } else {
      this.map.removeLayer(this.satelliteLayer);
      if (this.labelLayer) {
        this.map.removeLayer(this.labelLayer);
        this.labelLayer = null;
      }
      this.tileLayer.addTo(this.map);
      this.activeLayer = this.tileLayer;
    }

    try {
      localStorage.setItem('za_satellite', enable.toString());
    } catch (e) {}
  }

  /**
   * Check if satellite mode is active.
   */
  isSatelliteMode() {
    return this.satelliteMode;
  }

  // ── WAYPOINT NAVIGATION ──

  /**
   * Handle a click on the map — set a waypoint.
   */
  handleMapClick(e) {
    if (!this.map || !window.game || window.game?.state !== 'playing') return;
    this.setWaypoint(e.latlng.lat, e.latlng.lng);
  }

  /**
   * Set a navigation waypoint at the given coordinates.
   */
  setWaypoint(lat, lng) {
    if (!this.waypointLayer) return;

    this.waypointCoords = { lat, lng };

    // Clear existing waypoint
    this.clearWaypoint();

    // Create waypoint marker (pulsing green target)
    const icon = L.divIcon({
      html: `
        <div style="
          width:24px;height:24px;
          display:flex;align-items:center;justify-content:center;
          position:relative;
        ">
          <div style="
            width:16px;height:16px;
            border:3px solid #39ff14;
            border-radius:50%;
            background:rgba(57,255,20,0.2);
            animation:glow-pulse 1.5s ease-in-out infinite;
            box-shadow:0 0 10px rgba(57,255,20,0.5);
          "></div>
          <div style="
            position:absolute;top:-14px;left:50%;transform:translateX(-50%);
            font-size:0.55rem;color:#39ff14;
            font-family:'Poppins',sans-serif;
            font-weight:700;
            text-shadow:0 1px 3px rgba(0,0,0,0.9);
            white-space:nowrap;
          ">📍 Waypoint</div>
        </div>
      `,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    this.waypointMarker = L.marker([lat, lng], {
      icon,
      interactive: false,
    }).addTo(this.waypointLayer);

    // Draw navigation line (dashed yellow)
    const playerPos = window.gps?.getPositionData();
    if (playerPos) {
      this.waypointLine = L.polyline([[playerPos.latitude, playerPos.longitude], [lat, lng]], {
        color: '#ffd700',
        weight: 2,
        opacity: 0.4,
        dashArray: '6, 8',
        interactive: false,
      }).addTo(this.waypointLayer);
    }

    // Calculate and show distance/bearing
    this.updateWaypointInfo(playerPos);

    // Notify the game controller
    if (window.game && typeof window.game.onWaypointSet === 'function') {
      window.game.onWaypointSet(this.waypointCoords);
    }
  }

  /**
   * Update the waypoint direction line as the player moves.
   */
  updateWaypointLine(playerLat, playerLng) {
    if (!this.waypointCoords || !this.waypointLayer) return;

    if (this.waypointLine) {
      this.waypointLine.setLatLngs([[playerLat, playerLng], [this.waypointCoords.lat, this.waypointCoords.lng]]);
    } else {
      this.waypointLine = L.polyline([[playerLat, playerLng], [this.waypointCoords.lat, this.waypointCoords.lng]], {
        color: '#ffd700',
        weight: 2,
        opacity: 0.4,
        dashArray: '6, 8',
        interactive: false,
      }).addTo(this.waypointLayer);
    }

    // Update distance/bearing info
    this.updateWaypointInfo({ latitude: playerLat, longitude: playerLng });

    // Check if player reached waypoint (within 10m)
    const dist = this.map.distance([playerLat, playerLng], [this.waypointCoords.lat, this.waypointCoords.lng]);
    if (dist < 10) {
      this.clearWaypoint();
      if (window.game && typeof window.game.onWaypointReached === 'function') {
        window.game.onWaypointReached();
      }
    }
  }

  /**
   * Calculate and update HUD with waypoint distance and bearing.
   */
  updateWaypointInfo(playerPos) {
    if (!this.waypointCoords || !playerPos) return;

    const dist = this.map.distance(
      [playerPos.latitude, playerPos.longitude],
      [this.waypointCoords.lat, this.waypointCoords.lng]
    );

    const bearing = this.getBearing(
      playerPos.latitude, playerPos.longitude,
      this.waypointCoords.lat, this.waypointCoords.lng
    );

    window.hud.updateWaypoint(dist, bearing, this.waypointCoords);
  }

  /**
   * Get bearing (direction) from one point to another.
   */
  getBearing(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => deg * (Math.PI / 180);
    const toDeg = (rad) => rad * (180 / Math.PI);
    const dLng = toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Clear the waypoint marker and line.
   */
  clearWaypoint() {
    if (this.waypointMarker) {
      this.waypointLayer.removeLayer(this.waypointMarker);
      this.waypointMarker = null;
    }
    if (this.waypointLine) {
      this.waypointLayer.removeLayer(this.waypointLine);
      this.waypointLine = null;
    }
    this.waypointCoords = null;
    // Clear HUD display
    if (window.hud && typeof window.hud.updateWaypoint === 'function') {
      window.hud.updateWaypoint(null, null, null);
    }
  }

  /**
   * Direction line — a dotted line from the player to the nearest extraction point.
   */
  directionLine = null;

  /**
   * Draw (or update) a direction line from the player to the nearest extraction point.
   */
  updateDirectionLine(playerLat, playerLng) {
    if (!this.map || this.extractionPointMarkers.size === 0) {
      this.removeDirectionLine();
      return;
    }

    // Find nearest active extraction point
    let nearest = null;
    let nearestDist = Infinity;
    this.extractionPointMarkers.forEach((data, id) => {
      const marker = data.marker;
      if (!marker) return;
      const ll = marker.getLatLng();
      const d = this.map.distance([playerLat, playerLng], ll);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = ll;
      }
    });

    if (!nearest) {
      this.removeDirectionLine();
      return;
    }

    if (this.directionLine) {
      this.directionLine.setLatLngs([[playerLat, playerLng], nearest]);
    } else {
      this.directionLine = L.polyline([[playerLat, playerLng], nearest], {
        color: '#39ff14',
        weight: 2,
        opacity: 0.6,
        dashArray: '8, 10',
        interactive: false,
      }).addTo(this.map);
    }
  }

  /**
   * Remove the direction line.
   */
  removeDirectionLine() {
    if (this.directionLine) {
      this.map.removeLayer(this.directionLine);
      this.directionLine = null;
    }
  }

  /**
   * Ping an item on the map (flash animation).
   */
  pingItem(itemId) {
    const marker = this.itemMarkers.get(itemId);
    if (!marker) return;

    const el = marker.getElement();
    if (!el) return;

    // Flash the item with a ping effect
    el.style.transition = 'all 0.3s ease';
    el.style.transform = 'scale(2)';
    el.style.filter = 'brightness(1.5)';
    el.style.boxShadow = '0 0 30px rgba(255,215,0,0.8)';

    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.filter = '';
      el.style.boxShadow = '';
    }, 600);
  }

  /**
   * Resize the map (call on orientation change).
   */
  resize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    }
  }

  /**
   * Clean up.
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.isInitialized = false;
  }
}

// Singleton
const mapManager = new MapManager();
window.mapManager = mapManager;
