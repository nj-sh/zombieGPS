// Zombie Apocalypse - Map Manager

class MapManager {
  constructor() {
    this.map = null;
    this.tileLayer = null;
    this.mainLayer = null;
    this.itemLayer = null;
    this.safeZoneLayer = null;
    this.playerRenderer = null;
    this.isInitialized = false;
    this.currentCenter = [0, 0];
    this.currentZoom = 16;
    this.itemMarkers = new Map();
    this.safeZoneMarkers = new Map();
    this.extractionPointMarkers = new Map();
    this.extractionPointLayer = null;
    this.renderDistance = 500; // meters
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

    // Satellite tile layer (Esri World Imagery)
    this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      minZoom: 3,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
      noWrap: true,
    }).addTo(this.map);

    // Street names + labels overlay (CartoDB light only labels)
    this.labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      minZoom: 3,
      subdomains: 'abcd',
      noWrap: true,
      pane: 'overlayPane',
      opacity: 0.85,
    }).addTo(this.map);

    // Create layers
    this.itemLayer = L.layerGroup().addTo(this.map);
    this.safeZoneLayer = L.layerGroup().addTo(this.map);
    this.extractionPointLayer = L.layerGroup().addTo(this.map);

    // Create player renderer
    this.playerRenderer = new window.PlayerRenderer(this.map);
    window.playerRenderer = this.playerRenderer;

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
          font-size:${cfg.size - 6}px;
          filter:drop-shadow(0 0 8px ${cfg.glow});
          animation:item-ping 3s ease-in-out infinite;
        ">${cfg.emoji}</div>
      `,
      className: '',
      iconSize: [cfg.size + 8, cfg.size + 8],
      iconAnchor: [(cfg.size + 8) / 2, (cfg.size + 8) / 2],
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
