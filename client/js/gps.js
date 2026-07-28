// Zombie Apocalypse - GPS Tracker
//
// ── DESIGN PHILOSOPHY ──
//
// This GPS system is inspired by professional location-based games (Pokémon GO,
// Geocaching) where the game adapts to varying GPS quality instead of blocking
// the player. Key design decisions:
//
// 1. watchPosition from the start: Unlike getCurrentPosition (one-shot),
//    watchPosition gives continuous updates. This means the very first fix
//    starts the tracking loop — no need for a separate "startWatching" call.
//
// 2. Jitter filtering: GPS chips on phones often report tiny position changes
//    (2-5m) even when the phone is sitting still. We ignore movements under
//    a threshold (5m default). We also reject unrealistic "jumps" (>500m)
//    which happen when GPS briefly loses lock and re-acquires with a different
//    satellite constellation.
//
// 3. Accuracy-based acquisition: Instead of a fixed timeout, we wait for
//    the GPS to reach an acceptable accuracy level. This feels natural:
//   - Under 30m: "Ideal" — good enough for street-level gameplay
//   - Under 100m: "Acceptable" — may jitter a little but playable
//   - Over 100m: "Weak" — still receive updates but warn the player
//
// 4. Stabilization detection: GPS accuracy typically improves over the first
//    10-30 seconds as more satellites lock in. We track recent accuracy
//    readings and only consider the signal "stable" when readings converge.
//
// 5. Graceful degradation: If GPS fails completely (denied, unavailable),
//    the game falls back to IP geolocation (ip-api.com) for a rough position.
//    The player can then play with approximate coordinates.
//
// 6. Adaptive error recovery: Temporary errors (timeout, unavailable) are
//    handled internally — the watch keeps running. Only repeated errors or
//    permission denial trigger a fallback.

class GPSTracker {
  constructor() {
    // ── Core state ──
    this.watchId = null;                    // watchPosition ID for cleanup
    this.currentPosition = null;            // Last accepted (filtered) position
    this.lastRawPosition = null;            // Last raw position from browser (for jitter calc)
    this.accuracy = null;                   // Current accuracy in meters
    this.speed = null;                      // Current speed in m/s
    this.heading = null;                    // Current heading in degrees
    this.permissionGranted = false;         // Whether user granted GPS permission
    this.isMoving = false;                  // Whether the player is currently moving
    this.listeners = new Map();             // Event listeners
    this.lastUpdateTime = 0;                // Timestamp of last accepted update
    this.isFirstFix = true;                 // True until we get the first position

    // ── Jitter filtering ──
    // GPS chips often report tiny (2-5m) position changes when stationary.
    // This threshold ignores those and keeps the player steady.
    this.minMovementMeters = 5;

    // ── Jump detection ──
    // When GPS loses lock and re-acquires, it can "jump" hundreds of meters.
    // We reject any movement larger than this as unrealistic.
    this.maxJumpMeters = 500;

    // ── Smoothed position (exponential moving average) ──
    // Prevents the player icon from "dancing" on the map when accuracy is low.
    // Only applied for small movements (<50m) to avoid lag when actually walking.
    this.smoothedLatitude = null;
    this.smoothedLongitude = null;
    this.smoothFactor = 0.35; // 35% new position, 65% history — balances responsiveness vs smoothness

    // ── Accuracy thresholds ──
    this.idealAccuracy = 30;       // Green — street-level, good for gameplay
    this.acceptableAccuracy = 100;  // Yellow — playable but may jitter

    // ── Stabilization tracking ──
    // GPS accuracy improves over time. We track the last N readings to detect
    // when the signal has "settled" (consecutive readings within 10m of each other).
    this.accuracyReadings = [];
    this.stabilizationSamples = 5;

    // ── Error handling ──
    this.errorCount = 0;
    this.maxErrorsBeforeFallback = 3;
    this.lastErrorMessage = '';
    this.consecutiveTimeouts = 0;

    // ── Signal quality (updated on each position) ──
    this.signalQuality = 'unknown'; // 'excellent' | 'good' | 'weak' | 'none'

    // ── Distance tracking ──
    this.totalDistance = 0;

    // ── Acquisition promise ──
    // Stored so we can check whether acquisition is still pending
    this._acquisitionInProgress = false;

    // ── IP fallback cache ──
    // We only call IP geolocation once per session
    this._ipLocationAttempted = false;
    this._ipLocationResult = null;
  }

  // ════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════

  /**
   * Start GPS acquisition and continuous tracking.
   *
   * WHY watchPosition over getCurrentPosition:
   *   - getCurrentPosition() fires ONCE and returns. If accuracy is poor,
   *     you'd have to re-call it. This causes "double permission prompts"
   *     on some browsers (the user's complaint!).
   *   - watchPosition() fires EVERY time the GPS chip reports a new fix.
   *     It automatically gives us improving accuracy as the chip warms up.
   *   - A single watchPosition() call replaces both the old
   *     requestPermission() AND startWatching() methods.
   *
   * @returns {Promise<{latitude, longitude, accuracy}>}
   *   Resolves when accuracy is acceptable (<100m and stable, or <30m).
   *   Rejects with 'GPS_DENIED', 'GPS_TIMEOUT', or 'GPS_UNAVAILABLE'.
   */
  async acquirePosition() {
    if (!navigator.geolocation) {
      throw Object.assign(new Error('Geolocation is not supported by this browser.'), {
        code: 'GPS_UNSUPPORTED',
      });
    }

    if (this._acquisitionInProgress) {
      throw Object.assign(new Error('GPS acquisition already in progress.'), {
        code: 'GPS_IN_PROGRESS',
      });
    }

    this._acquisitionInProgress = true;
    this.accuracyReadings = [];
    this.errorCount = 0;
    this.isFirstFix = true;
    this.currentPosition = null;

    return new Promise((resolve, reject) => {
      let bestPosition = null;       // Best position we've seen so far
      let hasResolved = false;       // Prevent double-resolve
      let consecutiveWeakReadings = 0;

      // ── Watch timeout ──
      // If we haven't gotten a usable position after 25s, resolve with whatever
      // we have (best effort) so the player isn't stuck forever.
      const acquisitionTimeout = setTimeout(() => {
        if (hasResolved) return;
        if (bestPosition) {
          console.log(`⏱ GPS acquisition timed out after 25s, using best: ±${Math.round(bestPosition.accuracy)}m`);
          hasResolved = true;
          this._acquisitionInProgress = false;
          resolve(bestPosition);
        } else {
          hasResolved = true;
          this._acquisitionInProgress = false;
          reject(Object.assign(new Error('GPS_TIMEOUT'), { code: 'GPS_TIMEOUT' }));
        }
      }, 25000);

      // ── Start continuous watching ──
      // This single watch lasts the entire game session for continuous updates.
      // When acquisition criteria are met, we resolve the promise but keep watching.
      this.watchId = navigator.geolocation.watchPosition(
        // ── SUCCESS CALLBACK ──
        (position) => {
          const accuracy = position.coords.accuracy;

          // ── Permission tracking ──
          if (!this.permissionGranted) {
            this.permissionGranted = true;
          }

          // ── Update signal quality ──
          this.updateSignalQuality(accuracy);

          // ── Track best accuracy from RAW data (unaffected by jitter filter) ──
          // This ensures the timeout fallback always uses the best coordinates seen
          if (!bestPosition || accuracy < bestPosition.accuracy) {
            bestPosition = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
            };
          }

          // ── Process the position (filter + notify) ──
          // handlePosition returns true if the position was accepted (not filtered)
          const accepted = this.handlePosition(position);

          // ── Notify with the raw data so UI can show live accuracy ──
          this.notifyListeners('acquisition_update', {
            accuracy: this.accuracy,
            signalQuality: this.signalQuality,
            bestAccuracy: bestPosition?.accuracy || null,
            hasFix: !!this.currentPosition,
          });

          // ── Check if we should resolve the acquisition promise ──
          if (!hasResolved && this.currentPosition) {
            const shouldResolve = this.shouldResolveAcquisition(accuracy);

            if (shouldResolve) {
              console.log(`📍 GPS acquired: ±${Math.round(accuracy)}m (${this.signalQuality})`);
              hasResolved = true;
              this._acquisitionInProgress = false;
              clearTimeout(acquisitionTimeout);

              // Resolve with the position data
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: accuracy,
              });
            }
          }
        },

        // ── ERROR CALLBACK ──
        (err) => {
          console.warn(`📡 GPS watch error (${err.code}): ${err.message}`);
          this.errorCount++;

          // Categorize the error
          if (err.code === 1) {
            // PERMISSION_DENIED — no use retrying
            if (!hasResolved) {
              hasResolved = true;
              this._acquisitionInProgress = false;
              clearTimeout(acquisitionTimeout);
              this.stop();
              reject(Object.assign(new Error('GPS_DENIED'), { code: 'GPS_DENIED' }));
            }
          } else if (err.code === 3) {
            // TIMEOUT — temporary, keep watching
            this.consecutiveTimeouts++;
          } else {
            // POSITION_UNAVAILABLE (code 2) — temporary, keep watching
            this.consecutiveTimeouts = 0;
          }

          // If too many consecutive errors during acquisition, give up
          if (!hasResolved && this.errorCount >= this.maxErrorsBeforeFallback) {
            hasResolved = true;
            this._acquisitionInProgress = false;
            clearTimeout(acquisitionTimeout);
            reject(Object.assign(new Error('GPS_UNAVAILABLE'), { code: 'GPS_UNAVAILABLE' }));
          }

          // Notify UI of error
          this.notifyListeners('acquisition_update', {
            error: true,
            errorMessage: this.getFriendlyErrorMessage(err.code),
            errorCode: err.code,
          });
        },

        // ── OPTIONS ──
        {
          enableHighAccuracy: true,  // Request GPS satellite lock, not WiFi triangulation
          timeout: 5000,             // Wait 5s for each fix attempt
          maximumAge: 0,             // Don't use cached positions — always fresh
        }
      );
    });
  }

  /**
   * Evaluate whether the current accuracy is good enough to start playing.
   *
   * Decision logic:
   *   - accuracy ≤ 30m (ideal): resolve immediately — street-level precision
   *   - accuracy ≤ 100m AND stabilized: resolve — playable with minor jitter
   *   - accuracy ≤ 100m AND NOT stabilized: wait for improvement
   *   - accuracy > 100m: wait, keep collecting readings
   *
   * "Stabilized" means the last N readings are all within 10m of each other,
   * indicating the GPS chip has locked onto a consistent satellite set.
   */
  shouldResolveAcquisition(accuracy) {
    // Update accuracy history
    this.accuracyReadings.push(accuracy);
    if (this.accuracyReadings.length > this.stabilizationSamples) {
      this.accuracyReadings.shift();
    }

    // Ideal accuracy: resolve immediately
    if (accuracy <= this.idealAccuracy) {
      return true;
    }

    // Acceptable accuracy: only resolve if stabilized
    if (accuracy <= this.acceptableAccuracy) {
      if (this.accuracyReadings.length >= this.stabilizationSamples) {
        // Check if readings are converging (all within 10m of current)
        const allClose = this.accuracyReadings.every(
          r => Math.abs(r - accuracy) < 15
        );
        if (allClose) return true;
      }
    }

    return false;
  }

  /**
   * Handle an incoming GPS position update.
   * Applies jitter filtering, jump detection, and exponential smoothing.
   *
   * Returns true if the position was accepted, false if filtered as noise.
   *
   * ── FILTER PIPELINE ──
   * 1. First fix? → Always accept (seed the position)
   * 2. Movement < 5m? → Reject (GPS jitter while stationary)
   * 3. Movement > 500m? → Reject (unrealistic jump — GPS glitch)
   * 4. Movement < 50m? → Apply exponential smoothing (reduce icon dancing)
   * 5. Accept → Update currentPosition, notify listeners
   */
  handlePosition(position) {
    const coords = position.coords;
    const accuracy = coords.accuracy;
    const newLat = coords.latitude;
    const newLng = coords.longitude;
    const timestamp = position.timestamp || Date.now();

    // ── STEP 1: First fix — always accept ──
    if (!this.currentPosition) {
      // Store raw position as the seed
      this.lastRawPosition = { lat: newLat, lng: newLng };
      this.smoothedLatitude = newLat;
      this.smoothedLongitude = newLng;

      // Set initial position
      this.setCurrentPosition(position);

      // Calculate speed from GPS if available
      if (coords.speed !== null && coords.speed >= 0) {
        this.speed = coords.speed;
        this.isMoving = coords.speed > 0.5;
      }

      this.notifyListeners('position', this.getPositionData());
      this.isFirstFix = false;
      this.lastUpdateTime = Date.now();
      return true;
    }

    // ── STEP 2: Calculate distance from last accepted position ──
    const dist = this.calculateDistance(
      this.currentPosition.coords.latitude,
      this.currentPosition.coords.longitude,
      newLat,
      newLng
    );

    // ── STEP 3: Reject tiny movements (jitter filter) ──
    // Stationary phones still report 2-8m position changes. This filter
    // prevents the player icon from shaking on the map.
    if (dist < this.minMovementMeters) {
      // Still update accuracy (so the HUD shows the latest accuracy reading)
      // and speed, even if we don't move the player
      this.accuracy = accuracy;
      this.speed = coords.speed;
      if (coords.heading !== null && coords.heading !== undefined) {
        this.heading = coords.heading;
      }
      this.lastUpdateTime = Date.now();
      return false;
    }

    // ── STEP 4: Reject unrealistic jumps ──
    // When GPS briefly loses lock and re-acquires, it can "jump" to a
    // position hundreds of meters away. This filter catches that.
    if (dist > this.maxJumpMeters) {
      console.warn(`📡 GPS jump rejected: ${Math.round(dist)}m (max: ${this.maxJumpMeters}m)`);
      return false;
    }

    // ── STEP 5: Apply exponential smoothing for gradual movements ──
    // When walking <50m per tick, smoothing prevents the "dancing" effect
    // caused by accuracy fluctuation. For larger movements (>50m running/
    // driving), we accept the raw position immediately for responsiveness.
    let finalLat = newLat;
    let finalLng = newLng;

    if (dist < 50 && this.smoothedLatitude !== null) {
      // Exponential moving average: blend new + old position
      // Formula: smoothed = old + (new - old) * factor
      // With factor=0.35, 65% of the old position is preserved each tick.
      // This creates a natural "chase" effect that feels responsive but smooth.
      finalLat = this.smoothedLatitude + (newLat - this.smoothedLatitude) * this.smoothFactor;
      finalLng = this.smoothedLongitude + (newLng - this.smoothedLongitude) * this.smoothFactor;
    }

    // Update smoothed position
    this.smoothedLatitude = finalLat;
    this.smoothedLongitude = finalLng;

    // ── STEP 6: Update accepted position ──
    // Create a modified position with smoothed coordinates
    const smoothedPosition = {
      coords: {
        latitude: finalLat,
        longitude: finalLng,
        accuracy: accuracy,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        speed: coords.speed,
      },
      timestamp: timestamp,
    };

    this.setCurrentPosition(smoothedPosition);

    // Calculate speed from position change (more reliable than GPS-reported speed)
    // Use lastPosition.timestamp which was saved BEFORE setCurrentPosition overwrote it
    const timeDiff = (timestamp - (this.lastPosition?.timestamp || timestamp)) / 1000;
    if (timeDiff > 0) {
      const calculatedSpeed = dist / timeDiff;
      this.speed = calculatedSpeed;
      this.isMoving = calculatedSpeed > 0.5;

      // Track total distance
      this.totalDistance += dist;
    }

    // Use GPS-reported heading if available
    if (coords.heading !== null && coords.heading !== undefined) {
      this.heading = coords.heading;
    }

    this.lastUpdateTime = Date.now();

    // ── Notify listeners ──
    this.notifyListeners('position', this.getPositionData());

    return true;
  }

  /**
   * Update signal quality label based on accuracy.
   *
   *   ≤30m:  🟢 Excellent — street-level, perfect for gameplay
   *   ≤100m: 🟡 Good — playable, minor jitter
   *   ≤500m: 🟠 Weak — rough position, game still works
   *   >500m: 🔴 None — essentially no fix
   */
  updateSignalQuality(accuracy) {
    if (accuracy <= this.idealAccuracy) {
      this.signalQuality = 'excellent';
    } else if (accuracy <= this.acceptableAccuracy) {
      this.signalQuality = 'good';
    } else if (accuracy <= 500) {
      this.signalQuality = 'weak';
    } else {
      this.signalQuality = 'none';
    }
  }

  /**
   * Get a user-friendly error message based on GPS error code.
   * These messages guide the player toward a solution instead of
   * just showing a technical error.
   */
  getFriendlyErrorMessage(code) {
    switch (code) {
      case 1:
        return 'GPS permission denied. Please enable location access in your browser settings.';
      case 2:
        return 'GPS signal unavailable. Move near a window or go outside for better reception.';
      case 3:
        return 'GPS request timed out. The signal may be weak — try moving to an open area.';
      default:
        return 'GPS error. Try moving to a different location with better sky visibility.';
    }
  }

  /**
   * Get the current signal quality indicator.
   * Returns an object with label and color for UI display.
   */
  getSignalQualityIndicator() {
    const indicators = {
      excellent: { label: 'Excellent', emoji: '🟢', color: '#39ff14' },
      good:      { label: 'Good',      emoji: '🟡', color: '#ffdd00' },
      weak:      { label: 'Weak',      emoji: '🟠', color: '#ff8800' },
      none:      { label: 'None',      emoji: '🔴', color: '#c1121f' },
      unknown:   { label: 'Searching', emoji: '⏳', color: '#888888' },
    };
    return indicators[this.signalQuality] || indicators.unknown;
  }

  /**
   * Stop GPS tracking and clean up.
   */
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this._acquisitionInProgress = false;
    this.currentPosition = null;
    this.permissionGranted = false;
    console.log('📡 GPS tracking stopped');
  }

  /**
   * Manually inject a position (used by IP geolocation fallback).
   * This lets the rest of the system work with non-GPS coordinates.
   */
  setPosition(latitude, longitude, accuracy = 5000) {
    const pos = {
      coords: {
        latitude,
        longitude,
        accuracy,
        speed: null,
        heading: null,
        altitude: null,
        altitudeAccuracy: null,
      },
      timestamp: Date.now(),
    };

    this.currentPosition = pos;
    this.lastRawPosition = { lat: latitude, lng: longitude };
    this.smoothedLatitude = latitude;
    this.smoothedLongitude = longitude;
    this.accuracy = accuracy;
    this.speed = null;
    this.heading = null;
    this.isMoving = false;
    this.signalQuality = accuracy <= 100 ? 'good' : 'weak';
    this.lastUpdateTime = Date.now();
    this.isFirstFix = false;

    this.notifyListeners('position', this.getPositionData());
    console.log(`📍 Position set manually: ${latitude}, ${longitude} (±${Math.round(accuracy)}m)`);
  }

  /**
   * Get the current position data in a simplified format.
   * Returns null if no position has been acquired yet.
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
      signalQuality: this.signalQuality,
    };
  }

  /**
   * Check if GPS permission has been granted (or we have a manual position).
   */
  isPermissionGranted() {
    return this.permissionGranted || (this.currentPosition !== null);
  }

  /**
   * Whether GPS acquisition is still running.
   */
  isAcquiring() {
    return this._acquisitionInProgress;
  }

  // ════════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ════════════════════════════════════════════════════════════════

  /**
   * Set the current position and update derived state.
   */
  setCurrentPosition(position) {
    this.lastPosition = this.currentPosition;
    this.currentPosition = position;
    this.accuracy = position.coords.accuracy;
    if (position.coords.heading !== null && position.coords.heading !== undefined) {
      this.heading = position.coords.heading;
    }
  }

  /**
   * Calculate distance between two GPS coordinates using the Haversine formula.
   * Accurate to ~0.5% for distances > 1m.
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
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

  // ════════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ════════════════════════════════════════════════════════════════

  /**
   * Register an event listener.
   *
   * Events:
   *   'position'         → Position update (filtered + smoothed)
   *   'acquisition_update' → Live acquisition progress (accuracy, signal quality)
   *   'error'            → GPS error occurred
   *   'signal_change'    → Signal quality changed
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
   * Notify all listeners for an event.
   */
  notifyListeners(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in GPS listener for ${event}:`, e);
        }
      });
    }
  }
}

// Singleton
const gps = new GPSTracker();
window.gps = gps;
