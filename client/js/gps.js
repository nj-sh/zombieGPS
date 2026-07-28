// Zombie Apocalypse - GPS Tracker

class GPSTracker {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.lastPosition = null;
    this.accuracy = null;
    this.speed = null;
    this.heading = null;
    this.permissionGranted = false;
    this.isMoving = false;
    this.listeners = new Map();
    this.lastUpdateTime = 0;

    // Adaptive tracking
    this.activeInterval = 1000; // 1s when moving
    this.idleInterval = 10000;  // 10s when stationary
    this.currentInterval = this.activeInterval;

    // Movement detection
    this.movementThreshold = 0.5; // m/s
    this.stationaryCount = 0;
    this.maxStationaryCount = 3; // After 3 idle updates, slow down

    // Distance tracking
    this.totalDistance = 0;
  }

  /**
   * Request GPS permission and start tracking.
   * Returns a promise that resolves with the initial position.
   */
  async requestPermission() {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    try {
      // Try to get a quick single position first
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      });

      this.permissionGranted = true;
      this.updatePosition(position);
      // Don't startWatching here — caller calls it once after full init to avoid double prompts

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
      };
    } catch (err) {
      console.error('GPS permission denied or error:', err.message);
      throw err;
    }
  }

  /**
   * Start watching position with adaptive interval.
   */
  startWatching() {
    if (this.watchId) return;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  /**
   * Handle a position update.
   */
  handlePosition(position) {
    const prevPosition = this.currentPosition;
    this.updatePosition(position);

    // Calculate speed from position change (fallback if GPS speed not available)
    if (prevPosition && this.currentPosition) {
      const dist = this.calculateDistance(
        prevPosition.coords.latitude,
        prevPosition.coords.longitude,
        this.currentPosition.coords.latitude,
        this.currentPosition.coords.longitude
      );
      const timeDiff = (this.currentPosition.timestamp - prevPosition.timestamp) / 1000;

      if (timeDiff > 0) {
        const calculatedSpeed = dist / timeDiff;
        this.speed = calculatedSpeed;
        this.isMoving = calculatedSpeed > this.movementThreshold;

        // Track distance
        this.totalDistance += dist;
      }
    }

    this.lastUpdateTime = Date.now();
    this.notifyListeners('position', this.getPositionData());
  }

  /**
   * Update internal position state.
   */
  updatePosition(position) {
    this.lastPosition = this.currentPosition;
    this.currentPosition = position;
    this.accuracy = position.coords.accuracy;
    this.heading = position.coords.heading;

    // Use GPS-reported speed if available
    if (position.coords.speed !== null && position.coords.speed > 0) {
      this.speed = position.coords.speed;
      this.isMoving = true;
    }
  }

  /**
   * Handle GPS error.
   */
  handleError(err) {
    console.warn('GPS error:', err.message);
    this.notifyListeners('error', { message: err.message, code: err.code });
  }

  /**
   * Get current position data (simplified).
   */
  getPositionData() {
    if (!this.currentPosition) return null;
    return {
      latitude: this.currentPosition.coords.latitude,
      longitude: this.currentPosition.coords.longitude,
      accuracy: this.accuracy,
      speed: this.speed,
      heading: this.heading,
      isMoving: this.isMoving,
      timestamp: this.currentPosition.timestamp,
      totalDistance: this.totalDistance,
    };
  }

  /**
   * Calculate distance between two GPS points using Haversine.
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
   * Register a listener for GPS events.
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove a listener.
   */
  off(event, callback) {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(cb => cb !== callback));
    }
  }

  /**
   * Notify all listeners for an event.
   */
  notifyListeners(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => cb(data));
    }
  }

  /**
   * Stop GPS tracking.
   */
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Check if GPS permission is granted.
   */
  isPermissionGranted() {
    return this.permissionGranted;
  }

  /**
   * Manually set a position (e.g. from IP geolocation fallback).
   * This lets the rest of the system work with non-GPS coordinates.
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} [accuracy=5000] - Estimated accuracy in meters
   */
  setPosition(latitude, longitude, accuracy = 5000) {
    this.currentPosition = {
      coords: {
        latitude,
        longitude,
        accuracy,
        speed: null,
        heading: null,
      },
      timestamp: Date.now(),
    };
    this.accuracy = accuracy;
    this.speed = null;
    this.heading = null;
    this.isMoving = false;
    this.lastUpdateTime = Date.now();

    // Notify listeners so the game can proceed
    this.notifyListeners('position', this.getPositionData());
    console.log(`📍 Position set manually: ${latitude}, ${longitude} (±${Math.round(accuracy)}m)`);
  }
}

// Singleton
const gps = new GPSTracker();
window.gps = gps;
