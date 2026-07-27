// Zombie Apocalypse - Orientation Tracker

class OrientationTracker {
  constructor() {
    this.heading = 0; // 0-360 degrees
    this.beta = 0;    // Front-to-back tilt
    this.gamma = 0;   // Left-to-right tilt
    this.absolute = false;
    this.supported = false;
    this.permissionGranted = false;
    this.listeners = new Map();
    this.isActive = false;

    // Compass calibration
    this.calibrationOffset = 0;
    this.smoothHeading = 0;
  }

  /**
   * Request permission (required on iOS 13+).
   */
  async requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        this.permissionGranted = permission === 'granted';
      } catch (e) {
        console.warn('Orientation permission request failed:', e);
        this.permissionGranted = false;
      }
    } else {
      // Android / older iOS - no permission needed
      this.permissionGranted = true;
    }
  }

  /**
   * Start tracking orientation.
   */
  start() {
    if (this.isActive) return;
    if (!this.permissionGranted) return;

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
      this.isActive = true;
      this.supported = true;
      console.log('🧭 Orientation tracking started');
    } else {
      console.warn('DeviceOrientation not supported');
      this.supported = false;
    }
  }

  /**
   * Handle orientation event.
   */
  handleOrientation(event) {
    let alpha = event.alpha; // 0-360, compass heading
    this.beta = event.beta;
    this.gamma = event.gamma;
    this.absolute = event.absolute;

    if (alpha !== null) {
      // Smooth the heading
      this.heading = alpha;
      this.smoothHeading = this.lerpAngle(this.smoothHeading, alpha, 0.3);
      this.notifyListeners('heading', { heading: this.smoothHeading, raw: alpha });
    }
  }

  /**
   * Smooth angle interpolation.
   */
  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return a + diff * t;
  }

  /**
   * Get current heading (smoothed).
   */
  getHeading() {
    return this.smoothHeading;
  }

  /**
   * Get raw heading.
   */
  getRawHeading() {
    return this.heading;
  }

  /**
   * Register a listener.
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

  notifyListeners(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => cb(data));
    }
  }

  /**
   * Stop tracking.
   */
  stop() {
    if (this.isActive) {
      window.removeEventListener('deviceorientation', this.handleOrientation);
      this.isActive = false;
    }
  }
}

// Singleton
const orientation = new OrientationTracker();
window.deviceOrientation = orientation;
