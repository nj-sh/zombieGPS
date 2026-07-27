// Zombie Apocalypse - Notification System

class NotificationManager {
  constructor() {
    this.container = null;
    this.activeNotifications = [];
    this.maxNotifications = 5;
  }

  /**
   * Initialize the notification container.
   */
  init() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 15px;
      z-index: 700;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Show a notification.
   * @param {string} message - The notification text
   * @param {string} type - 'info', 'success', 'warning', 'danger'
   * @param {number} duration - Display duration in ms
   */
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    // Remove oldest if at max
    if (this.activeNotifications.length >= this.maxNotifications) {
      const oldest = this.activeNotifications.shift();
      this.removeNotification(oldest);
    }

    const el = document.createElement('div');
    el.className = `hud-notification ${type}`;
    el.textContent = message;
    el.style.cssText = `
      animation: notification-slide ${duration / 1000}s ease forwards;
    `;

    this.container.appendChild(el);
    this.activeNotifications.push(el);

    // Auto-remove after animation
    setTimeout(() => {
      this.removeNotification(el);
    }, duration);

    return el;
  }

  /**
   * Show an infection notification.
   */
  showInfection(playerName, infectorName) {
    this.show(`☣ ${playerName} was infected by ${infectorName}!`, 'danger', 5000);
  }

  /**
   * Show an item collected notification.
   */
  showItemCollected(itemName) {
    this.show(`📦 Collected: ${itemName}`, 'success', 3000);
  }

  /**
   * Show a safe zone notification.
   */
  showSafeZoneEnter(name) {
    this.show(`🏥 Entered safe zone: ${name}`, 'info', 3000);
  }

  /**
   * Show a player joined notification.
   */
  showPlayerJoined(playerName, team) {
    const icon = team === 'survivor' ? '💚' : '🧟';
    this.show(`${icon} ${playerName} has entered the outbreak`, 'info', 3000);
  }

  /**
   * Show an error notification.
   */
  showError(message) {
    this.show(`⚠ ${message}`, 'danger', 6000);
  }

  /**
   * Remove a notification element.
   */
  removeNotification(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    this.activeNotifications = this.activeNotifications.filter(n => n !== el);
  }

  /**
   * Clear all notifications.
   */
  clear() {
    this.activeNotifications.forEach(n => this.removeNotification(n));
    this.activeNotifications = [];
  }
}

// Singleton
const notifications = new NotificationManager();
window.notifications = notifications;
