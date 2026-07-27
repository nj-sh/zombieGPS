// Zombie Apocalypse - Socket.IO Client Manager

class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.serverUrl = ''; // Same origin by default
  }

  /**
   * Connect to the Socket.IO server.
   */
  connect(serverUrl = '') {
    if (this.socket && this.socket.connected) return;

    this.serverUrl = serverUrl;
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.setupDefaultHandlers();
  }

  /**
   * Setup default socket event handlers.
   */
  setupDefaultHandlers() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('_connected', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      this.connected = false;
      this.emit('_disconnected', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️  Connection error:', err.message);
      this.reconnectAttempts++;
      this.emit('_connection_error', { message: err.message });
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnect attempt ${attempt}`);
      this.emit('_reconnecting', { attempt });
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected');
      this.connected = true;
      this.emit('_reconnected', null);
    });

    // Forward all game events to registered listeners
    this.socket.onAny((event, data) => {
      this.emit(event, data);
    });
  }

  /**
   * Join a game as a player.
   */
  joinGame(playerData) {
    if (!this.socket || !this.connected) {
      console.warn('Cannot join game: not connected');
      return;
    }
    this.socket.emit('join_game', playerData);
  }

  /**
   * Update player position.
   */
  updatePosition(latitude, longitude) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('update_position', { latitude, longitude });
  }

  /**
   * Collect an item.
   */
  collectItem(itemId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('collect_item', { itemId });
  }

  /**
   * Craft radio (when 3 mech parts collected).
   */
  craftRadio() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('craft_radio');
  }

  /**
   * Attempt escape.
   */
  escape() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('escape');
  }

  /**
   * Register an event listener.
   * Use '_connected', '_disconnected' for connection events.
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove an event listener.
   */
  off(event, callback) {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(cb => cb !== callback));
    }
  }

  /**
   * Internal emit to registered listeners.
   */
  emit(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    }
  }

  /**
   * Check if connected.
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Disconnect.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Singleton
const socketManager = new SocketManager();
window.socketManager = socketManager;
