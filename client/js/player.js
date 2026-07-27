// Zombie Apocalypse - Player Renderer

class PlayerRenderer {
  constructor(map) {
    this.map = map;
    this.markers = new Map(); // playerId → Leaflet marker
    this.localPlayerId = null;
    this.icons = {};
  }

  /**
   * Get the map instance.
   */
  getMap() {
    return this.map;
  }

  /**
   * Create a custom Leaflet divIcon for a player.
   */
  createPlayerIcon(player, isLocal = false) {
    const team = player.team || 'survivor';
    const health = player.health || 100;
    const name = player.name || 'Unknown';
    const mechParts = player.mech_parts || 0;

    let healthClass = 'high';
    if (health <= 60) healthClass = 'medium';
    if (health <= 30) healthClass = 'low';

    const mechIndicators = Array.from({ length: 3 }, (_, i) =>
      `<div class="hud-mech-slot ${i < mechParts ? 'collected' : ''}" style="width:6px;height:6px;display:inline-block;margin:0 1px;"></div>`
    ).join('');

    // Build heart icons based on lives
    const hearts = Array.from({ length: player.lives || 1 }, (_, i) =>
      `<span class="hud-heart" style="font-size:0.6rem;filter:drop-shadow(0 0 2px rgba(193,18,31,0.5));">❤</span>`
    ).join('');

    const html = `
      <div class="player-marker ${team} ${isLocal ? 'local-player' : ''}" data-player-id="${player.id}">
        <div class="player-label">${this.escapeHtml(name)}</div>
        ${team === 'survivor' ? `<div class="health-ring ${healthClass}"></div>` : ''}
        <div class="player-arrow"></div>
        <div class="player-circle"></div>
        <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);display:flex;gap:2px;">
          ${mechIndicators}
        </div>
        <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:1px;">
          ${hearts}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: '', // Remove default Leaflet class
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  /**
   * Escape HTML to prevent XSS.
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Add or update a player marker on the map.
   */
  updatePlayer(player) {
    const marker = this.markers.get(player.id);
    const isLocal = player.id === this.localPlayerId;
    const icon = this.createPlayerIcon(player, isLocal);

    if (marker) {
      // Update position smoothly
      marker.setLatLng([player.latitude, player.longitude]);
      marker.setIcon(icon);

      // Update rotation (direction arrow)
      const arrow = marker.getElement()?.querySelector('.player-arrow');
      if (arrow && player.heading !== undefined) {
        arrow.style.transform = `translateX(-50%) rotate(${player.heading}deg)`;
      }
    } else {
      // Create new marker
      const newMarker = L.marker([player.latitude, player.longitude], {
        icon,
        zIndexOffset: isLocal ? 1000 : 0,
        interactive: false,
      }).addTo(this.map);

      newMarker.playerId = player.id;
      this.markers.set(player.id, newMarker);
    }

    return this.markers.get(player.id);
  }

  /**
   * Remove a player marker.
   */
  removePlayer(playerId) {
    const marker = this.markers.get(playerId);
    if (marker) {
      this.map.removeLayer(marker);
      this.markers.delete(playerId);
    }
  }

  /**
   * Remove all player markers.
   */
  clearAll() {
    this.markers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.markers.clear();
  }

  /**
   * Set the local player ID.
   */
  setLocalPlayerId(id) {
    this.localPlayerId = id;
  }

  /**
   * Update the direction arrow for a specific player.
   */
  updatePlayerHeading(playerId, heading) {
    const marker = this.markers.get(playerId);
    if (!marker) return;
    const arrow = marker.getElement()?.querySelector('.player-arrow');
    if (arrow) {
      arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }
  }

  /**
   * Get number of visible players.
   */
  getPlayerCount() {
    return this.markers.size;
  }
}

window.PlayerRenderer = PlayerRenderer;
