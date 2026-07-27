// Zombie Apocalypse - Utility Functions

/**
 * Generate a unique ID (crypto-based if available).
 */
function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Clamp a value between min and max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Distance between two points.
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Debounce a function.
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function.
 */
function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Get device type.
 */
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

/**
 * Check if vibration API is supported.
 */
function supportsVibration() {
  return 'vibrate' in navigator;
}

/**
 * Check if device orientation API is supported.
 */
function supportsOrientation() {
  return 'DeviceOrientationEvent' in window;
}

/**
 * Vibration wrapper.
 */
function vibrate(pattern) {
  if (supportsVibration()) {
    navigator.vibrate(pattern);
  }
}

/**
 * Convert degrees to radians.
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 */
function toDeg(rad) {
  return rad * (180 / Math.PI);
}

/**
 * Get bearing between two GPS coordinates.
 */
function getBearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Save to localStorage with safety check.
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(`za_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * Load from localStorage with safety check.
 */
function loadFromStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(`za_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Check if a value is a valid GPS coordinate.
 */
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}
