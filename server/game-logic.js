import { GAME_CONFIG, TEAMS, PLAYER_STATUS } from '../shared/constants.js';
import { config } from './config.js';

/**
 * Calculate distance in meters between two GPS coordinates using Haversine formula.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if a zombie-player pair should result in infection.
 */
export function checkInfection(zombie, survivor) {
  const distance = calculateDistance(
    zombie.latitude, zombie.longitude,
    survivor.latitude, survivor.longitude
  );
  return distance <= config.game.infectionRadiusMeters;
}

/**
 * Validate a player's position update for anti-cheat.
 * Returns { valid: boolean, reason?: string }
 */
export function validatePosition(prevPosition, newLatitude, newLongitude) {
  if (!prevPosition) return { valid: true };

  const distance = calculateDistance(
    prevPosition.latitude, prevPosition.longitude,
    newLatitude, newLongitude
  );

  // Calculate time since last update in seconds
  const now = Date.now();
  const lastUpdate = new Date(prevPosition.last_update || prevPosition.timestamp || now).getTime();
  const timeDiffSec = (now - lastUpdate) / 1000;

  if (timeDiffSec <= 0) return { valid: true };

  const speedMs = distance / timeDiffSec;
  const speedKmh = speedMs * 3.6;

  if (speedKmh > config.game.maxSpeedKmh) {
    return {
      valid: false,
      reason: `Speed ${speedKmh.toFixed(1)} km/h exceeds limit of ${config.game.maxSpeedKmh} km/h`,
    };
  }

  // Reject teleportation (> 1km in one update)
  if (distance > 1000 && timeDiffSec < 10) {
    return {
      valid: false,
      reason: 'Teleportation detected',
    };
  }

  return { valid: true };
}

/**
 * Check if a player is inside any safe zone.
 * Returns the safe zone if inside, or null.
 */
export function isInSafeZone(latitude, longitude, safeZones) {
  for (const zone of safeZones) {
    const distance = calculateDistance(latitude, longitude, zone.latitude, zone.longitude);
    if (distance <= zone.radius_m) {
      return zone;
    }
  }
  return null;
}

/**
 * Check if a player is close enough to collect an item.
 */
export function canCollectItem(playerLat, playerLng, itemLat, itemLng) {
  const distance = calculateDistance(playerLat, playerLng, itemLat, itemLng);
  return distance <= GAME_CONFIG.ITEM_COLLECT_RADIUS_METERS;
}

/**
 * Create an extraction point near the player's location.
 * Returns the extraction point object.
 */
export function createExtractionPoint(latitude, longitude) {
  // Place the extraction point 50-200m from the player
  const angle = Math.random() * 2 * Math.PI;
  const distance = 50 + Math.random() * 150; // 50-200m away
  const latOffset = (distance / 111320) * Math.cos(angle);
  const lngOffset = (distance / (111320 * Math.cos(toRad(latitude)))) * Math.sin(angle);

  return {
    id: `extract-${Date.now()}`,
    latitude: latitude + latOffset,
    longitude: longitude + lngOffset,
    radius_m: 20, // Must be within 20m to escape
    max_capacity: config.game.helicopterMaxCapacity,
    escaped_count: 0,
    active: true,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };
}

/**
 * Check if a player is within extraction range.
 */
export function canEscape(player, extractionPoint) {
  const distance = calculateDistance(
    player.latitude, player.longitude,
    extractionPoint.latitude, extractionPoint.longitude
  );
  return distance <= extractionPoint.radius_m;
}

/**
 * Check if a player has enough mech parts to craft a radio.
 */
export function canCraftRadio(player) {
  return (player.mech_parts || 0) >= GAME_CONFIG.MECH_PARTS_REQUIRED && !player.has_radio;
}

/**
 * Heal a player gradually in safe zone.
 * Returns the new health value.
 */
export function healInSafeZone(player) {
  if (player.health < 100) {
    return Math.min(100, player.health + 2); // Heal 2 HP per tick
  }
  return player.health;
}

/**
 * Generate a random unique ID.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
