import { ITEM_TYPES, TEAMS, GAME_CONFIG } from '../shared/constants.js';
import { calculateDistance } from './game-logic.js';

/**
 * Generate a random position near a center point.
 */
function randomPosition(lat, lng, radiusKm = 5) {
  const latOffset = (Math.random() - 0.5) * radiusKm / 111.32;
  const lngOffset = (Math.random() - 0.5) * radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  return {
    latitude: lat + latOffset,
    longitude: lng + lngOffset,
  };
}

/**
 * Spawn initial game items.
 */
export function spawnItems(centerLat = 40.7128, centerLng = -74.0060) {
  const items = [];

  // Spawn 3 mech parts (required for escape)
  for (let i = 0; i < GAME_CONFIG.MECH_PARTS_REQUIRED; i++) {
    const pos = randomPosition(centerLat, centerLng, 3);
    items.push({
      id: `mech-${i}`,
      type: ITEM_TYPES.MECH_PART,
      latitude: pos.latitude,
      longitude: pos.longitude,
      is_collected: false,
    });
  }

  // Spawn health packs
  for (let i = 0; i < 5; i++) {
    const pos = randomPosition(centerLat, centerLng, 4);
    items.push({
      id: `health-${i}`,
      type: ITEM_TYPES.HEALTH_PACK,
      latitude: pos.latitude,
      longitude: pos.longitude,
      is_collected: false,
    });
  }

  // Spawn other supplies
  const supplyTypes = [ITEM_TYPES.AMMO, ITEM_TYPES.FOOD, ITEM_TYPES.MEDICINE, ITEM_TYPES.ENERGY_DRINK];
  for (let i = 0; i < supplyTypes.length; i++) {
    const pos = randomPosition(centerLat, centerLng, 3);
    items.push({
      id: `supply-${i}`,
      type: supplyTypes[i],
      latitude: pos.latitude,
      longitude: pos.longitude,
      is_collected: false,
    });
  }

  return items;
}

/**
 * Check if the player has collected any items.
 * Returns collected items and remaining items.
 */
export function checkItemCollection(player, items) {
  const collected = [];
  const remaining = [];

  for (const item of items) {
    if (item.is_collected) continue;

    const distance = calculateDistance(
      player.latitude, player.longitude,
      item.latitude, item.longitude
    );

    if (distance <= GAME_CONFIG.ITEM_COLLECT_RADIUS_METERS) {
      item.is_collected = true;
      item.collectedBy = player.id;
      collected.push(item);

      // Only survivors benefit from item effects
      if (player.team !== TEAMS.SURVIVOR) continue;

      // Handle mech part collection
      if (item.type === ITEM_TYPES.MECH_PART) {
        player.mech_parts = (player.mech_parts || 0) + 1;
        if (player.mech_parts >= GAME_CONFIG.MECH_PARTS_REQUIRED) {
          player.has_radio = true;
        }
      }

      // Handle health pack collection
      if (item.type === ITEM_TYPES.HEALTH_PACK) {
        player.health = Math.min(100, (player.health || 100) + 25);
      }
    } else {
      remaining.push(item);
    }
  }

  return { collected, remainingItems: remaining };
}


