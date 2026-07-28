// Zombie Apocalypse - HUD Manager

class HUD {
  constructor() {
    this.elements = {};
    this.isVisible = false;
  }

  /**
   * Cache all HUD element references.
   */
  init() {
    this.elements = {
      // Top Left
      playerName: document.getElementById('hud-player-name'),
      teamDot: document.getElementById('hud-team-dot'),
      healthFill: document.getElementById('hud-health-fill'),
      healthText: document.getElementById('hud-health-text'),

      // Top Right
      onlineCount: document.getElementById('hud-online'),
      survivorCount: document.getElementById('hud-survivors'),
      zombieCount: document.getElementById('hud-zombies'),

      // Bottom Left
      gpsAccuracy: document.getElementById('hud-gps-accuracy'),
      gpsSpeed: document.getElementById('hud-gps-speed'),
      gpsLocation: document.getElementById('hud-gps-location'),

      // Waypoint info
      waypointInfo: document.getElementById('hud-waypoint-info'),
      waypointDist: document.getElementById('hud-waypoint-dist'),
      waypointDir: document.getElementById('hud-waypoint-dir'),
      waypointClear: document.getElementById('hud-waypoint-clear'),

      // Bottom Right
      compassNeedle: document.getElementById('hud-compass-needle'),

      // Center Bottom
      hearts: document.getElementById('hud-hearts'),
      staminaFill: document.getElementById('hud-stamina-fill'),
      mechParts: document.getElementById('hud-mech-parts'),

      // Inventory
      inventory: document.getElementById('hud-inventory'),

      // Escape panel
      escapePanel: document.getElementById('hud-escape-panel'),
      craftRadioBtn: document.getElementById('hud-craft-radio'),
      escapeBtn: document.getElementById('hud-escape-btn'),
      escapeStatus: document.getElementById('hud-escape-status'),
    };

    // Waypoint clear button
    if (this.elements.waypointClear) {
      this.elements.waypointClear.addEventListener('click', () => {
        if (window.mapManager) window.mapManager.clearWaypoint();
        this.updateWaypoint(null, null, null);
      });
    }
  }

  /**
   * Show the HUD.
   */
  show() {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.classList.add('visible');
    }
    this.isVisible = true;
  }

  /**
   * Hide the HUD.
   */
  hide() {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.classList.remove('visible');
    }
    this.isVisible = false;
  }

  /**
   * Update player info (name, team, health).
   */
  updatePlayerInfo(player) {
    if (!player) return;

    // Name
    if (this.elements.playerName) {
      this.elements.playerName.textContent = player.name || 'Unknown';
    }

    // Team dot
    if (this.elements.teamDot) {
      const team = player.team || 'survivor';
      this.elements.teamDot.className = `hud-team-dot ${team}`;
    }

    // Health
    this.updateHealth(player.health || 100);

    // Mech parts
    this.updateMechParts(player.mech_parts || 0);
  }

  /**
   * Update health bar.
   */
  updateHealth(health) {
    if (this.elements.healthFill) {
      this.elements.healthFill.style.width = `${health}%`;
      this.elements.healthFill.className = 'hud-health-fill';
      if (health > 60) {
        this.elements.healthFill.classList.add('high');
      } else if (health > 30) {
        this.elements.healthFill.classList.add('medium');
      } else {
        this.elements.healthFill.classList.add('low');
      }
    }
    if (this.elements.healthText) {
      this.elements.healthText.textContent = `${Math.round(health)}%`;
    }

    // Update hearts
    this.updateHearts(health);
  }

  /**
   * Update heart display based on health.
   */
  updateHearts(health) {
    if (!this.elements.hearts) return;

    const heartCount = Math.max(1, Math.ceil(health / 33));
    const totalHearts = 3;

    let html = '';
    for (let i = 0; i < totalHearts; i++) {
      const filled = i < heartCount;
      html += `<span class="hud-heart ${filled ? '' : 'lost'}">${filled ? '❤' : '🖤'}</span>`;
    }
    this.elements.hearts.innerHTML = html;
  }

  /**
   * Update stamina bar.
   */
  updateStamina(stamina) {
    if (this.elements.staminaFill) {
      this.elements.staminaFill.style.width = `${Math.min(100, stamina)}%`;
    }
  }

  /**
   * Update mech parts display.
   */
  updateMechParts(count) {
    if (!this.elements.mechParts) return;

    let html = '';
    for (let i = 0; i < 3; i++) {
      const collected = i < count;
      html += `<div class="hud-mech-slot ${collected ? 'collected' : ''}"></div>`;
    }
    this.elements.mechParts.innerHTML = html;
  }

  /**
   * Update game stats (player counts).
   */
  updateGameStats(stats) {
    if (this.elements.onlineCount) {
      this.elements.onlineCount.textContent = stats.online || 0;
    }
    if (this.elements.survivorCount) {
      this.elements.survivorCount.textContent = stats.survivors || 0;
    }
    if (this.elements.zombieCount) {
      this.elements.zombieCount.textContent = stats.zombies || 0;
    }
  }

  /**
   * Update GPS info.
   */
  updateGPSInfo(accuracy, speed) {
    if (this.elements.gpsAccuracy) {
      const acc = accuracy !== null ? `${Math.round(accuracy)}m` : '--';
      this.elements.gpsAccuracy.textContent = `GPS: ±${acc}`;
    }
    if (this.elements.gpsSpeed) {
      const spd = speed !== null ? `${(speed * 3.6).toFixed(1)} km/h` : '--';
      this.elements.gpsSpeed.textContent = `Speed: ${spd}`;
    }
  }

  /**
   * Update current location name (reverse geocode result).
   */
  updateLocation(placeName) {
    if (this.elements.gpsLocation) {
      this.elements.gpsLocation.textContent = `📍 ${placeName}`;
    }
  }

  /**
   * Update the waypoint navigation display.
   */
  updateWaypoint(distance, bearing, coords) {
    if (!this.elements.waypointInfo) return;

    if (distance !== null && bearing !== null) {
      this.elements.waypointInfo.style.display = 'flex';

      // Format distance
      let distStr;
      if (distance < 1000) {
        distStr = `${Math.round(distance)}m`;
      } else {
        distStr = `${(distance / 1000).toFixed(1)}km`;
      }

      // Format bearing as compass direction
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const dirIndex = Math.round(bearing / 45) % 8;
      const dirLabel = dirs[dirIndex];

      if (this.elements.waypointDist) {
        this.elements.waypointDist.textContent = distStr;
      }
      if (this.elements.waypointDir) {
        this.elements.waypointDir.textContent = `${dirLabel} ${Math.round(bearing)}°`;
      }
    } else {
      this.elements.waypointInfo.style.display = 'none';
    }
  }

  /**
   * Update compass heading.
   */
  updateCompass(heading) {
    if (this.elements.compassNeedle) {
      this.elements.compassNeedle.style.transform =
        `translate(-50%, -100%) rotate(${heading}deg)`;
    }
  }

  /**
   * Update inventory items with interactive click-to-use slots.
   * Each slot shows the item emoji + extra info (like ammo count).
   * Clicking a slot triggers the useItem callback.
   */
  updateInventory(items) {
    if (!this.elements.inventory) return;

    let html = '';
    const slots = 8;
    for (let i = 0; i < slots; i++) {
      const item = items && items[i];
      const filled = item ? 'filled' : '';
      const usable = item && (item.type === 'medicine' || item.type === 'gun') ? 'usable' : '';
      let label = '';
      let extra = '';

      if (item) {
        label = this.getItemEmoji(item.type);

        // Show extra info for certain items
        if (item.type === 'gun' && item.bullets !== undefined) {
          extra = `<span class="hud-item-extra">${item.bullets}</span>`;
        }
        if (item.type === 'medicine') {
          extra = `<span class="hud-item-extra">+33</span>`;
        }
      }

      html += `<div class="hud-inventory-slot ${filled} ${usable}" data-slot-index="${i}">
        ${label}${extra}
      </div>`;
    }
    this.elements.inventory.innerHTML = html;

    // Attach click handlers for usable items
    const slotsEls = this.elements.inventory.querySelectorAll('.hud-inventory-slot.usable');
    slotsEls.forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt(el.dataset.slotIndex, 10);
        if (window.game && typeof window.game.useItem === 'function') {
          window.game.useItem(index);
        }
      });
    });
  }

  /**
   * Get emoji for item type.
   */
  getItemEmoji(type) {
    const emojis = {
      mech_part: '⚙️',
      health_pack: '❤️',
      ammo: '🔫',
      food: '🍖',
      medicine: '💊',
      gun: '🔫',
      energy_drink: '⚡',
      armor: '🛡️',
      keys: '🔑',
    };
    return emojis[type] || '📦';
  }

  /**
   * Update escape status display.
   */
  updateEscapeStatus(escapedCount, maxCapacity) {
    if (this.elements.escapeStatus) {
      this.elements.escapeStatus.textContent = `🚁 Escaped: ${escapedCount}/${maxCapacity}`;
      this.elements.escapeStatus.style.color = 'var(--neon-green)';
    }
  }

  /**
   * Update the inventory bag display with item count.
   */
  updateInventoryBag(items) {
    const bagEl = document.getElementById('hud-inventory-bag');
    if (!bagEl) return;
    const count = items ? items.length : 0;
    const badge = bagEl.querySelector('.hud-bag-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Show or hide the craft radio button.
   */
  showCraftRadioButton(show) {
    if (this.elements.craftRadioBtn) {
      this.elements.craftRadioBtn.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Show or hide the escape button.
   */
  showEscapeButton(show) {
    if (this.elements.escapeBtn) {
      this.elements.escapeBtn.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Show the escape panel.
   */
  showEscapePanel() {
    if (this.elements.escapePanel) {
      this.elements.escapePanel.style.display = 'flex';
    }
  }

  /**
   * Hide the escape panel.
   */
  hideEscapePanel() {
    if (this.elements.escapePanel) {
      this.elements.escapePanel.style.display = 'none';
    }
  }
}

// Singleton
const hud = new HUD();
window.hud = hud;
