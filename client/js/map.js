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
    this.currentZoom = 18;
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
      scrollWheelZoom: false, // Disable scroll zoom for mobile
      doubleClickZoom: false,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
    });

    // Dark tile layer
    this.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      minZoom: 3,
      subdomains: 'abcd',
      noWrap: true,
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
   * Add an item marker to the map.
   */
  addItemMarker(item) {
    if (!this.map) return;

    // Color based on type
    const colors = {
      mech_part: '#ffd700',
      health_pack: '#00cc00',
      ammo: '#ff8800',
      food: '#8B4513',
      medicine: '#00aaff',
      energy_drink: '#00ffee',
      armor: '#888888',
      keys: '#c0c0c0',
    };

    const color = colors[item.type] || '#ffffff';
    const size = item.type === 'mech_part' ? 20 : 16;

    const icon = L.divIcon({
      html: `<div class="item-marker ${item.type}" style="width:${size}px;height:${size}px;background:radial-gradient(circle at 35% 35%, ${color}, #333);box-shadow:0 0 ${size/2}px ${color}44;border-radius:50%;"></div>`,
      className: '',
      iconSize: [size + 4, size + 4],
      iconAnchor: [(size + 4) / 2, (size + 4) / 2],
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
   * Add a safe zone marker.
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
        <div class="safe-zone-marker">
          ${labels[zone.type] || '🏠'}
        </div>
        <div style="text-align:center;font-size:0.65rem;color:var(--safe-zone);text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-top:2px;">
          ${zone.name}
        </div>
      `,
      className: '',
      iconSize: [60, 50],
      iconAnchor: [30, 25],
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

    this.safeZoneMarkers.set(zone.id, { marker, circle });
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
