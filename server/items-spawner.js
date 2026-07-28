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
 * Generate safe zone locations near a center point.
 */
function generateSafeZonesNear(lat, lng) {
  return [
    {
      id: 'sz-1', type: 'hospital', name: 'Central Hospital',
      latitude: lat + 0.002, longitude: lng + 0.003, radius_m: 30,
    },
    {
      id: 'sz-2', type: 'police_station', name: 'City Police HQ',
      latitude: lat + 0.006, longitude: lng - 0.002, radius_m: 25,
    },
    {
      id: 'sz-3', type: 'military_base', name: 'Fort Refuge',
      latitude: lat - 0.004, longitude: lng + 0.005, radius_m: 40,
    },
  ];
}

/**
 * Spawn loot items at a specific safe zone.
 * Each zone type has its own loot table — realistic distribution by building type.
 *   Hospital → mostly health packs + medicine
 *   Police Station → mostly ammo
 *   Military Base → armor + keys + some ammo
 */
function spawnSafeZoneLoot(zone, zoneIndex) {
  const items = [];

  // Loot tables per zone type
  const lootTables = {
    hospital: [
      { type: ITEM_TYPES.HEALTH_PACK, count: 4 },  // Lots of health at hospital
      { type: ITEM_TYPES.MEDICINE, count: 3 },       // Extra medicine
      { type: ITEM_TYPES.FOOD, count: 1 },
      { type: ITEM_TYPES.ENERGY_DRINK, count: 1 },
    ],
    police_station: [
      { type: ITEM_TYPES.AMMO, count: 4 },            // Lots of ammo at police
      { type: ITEM_TYPES.MEDICINE, count: 1 },
      { type: ITEM_TYPES.FOOD, count: 1 },
      { type: ITEM_TYPES.ENERGY_DRINK, count: 1 },
    ],
    military_base: [
      { type: ITEM_TYPES.ARMOR, count: 2 },            // Armor at military
      { type: ITEM_TYPES.KEYS, count: 2 },             // Keys at military
      { type: ITEM_TYPES.AMMO, count: 2 },             // Some ammo too
      { type: ITEM_TYPES.HEALTH_PACK, count: 1 },
      { type: ITEM_TYPES.FOOD, count: 1 },
      { type: ITEM_TYPES.ENERGY_DRINK, count: 1 },
    ],
  };

  const lootTable = lootTables[zone.type] || lootTables.hospital;

  let idx = 0;
  for (const entry of lootTable) {
    for (let j = 0; j < entry.count; j++) {
      const pos = randomPosition(zone.latitude, zone.longitude, zone.radius_m / 1000);
      items.push({
        id: `loot-${zoneIndex}-${idx++}`,
        type: entry.type,
        latitude: pos.latitude,
        longitude: pos.longitude,
        is_collected: false,
        fromSafeZone: zone.id,  // Tag so clients know it's safe-zone loot
      });
    }
  }

  return items;
}

/**
 * Spawn world items — mech parts and basic supplies across the map.
 * Guns/ammo are rare outside of police stations (handled by safe zone loot above).
 */
function spawnWorldItems(centerLat, centerLng) {
  const items = [];

  // Spawn 3 mech parts (required for escape) — scattered across world
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

  // Spawn health packs (some in world, fewer than at hospital)
  for (let i = 0; i < 3; i++) {
    const pos = randomPosition(centerLat, centerLng, 4);
    items.push({
      id: `health-${i}`,
      type: ITEM_TYPES.HEALTH_PACK,
      latitude: pos.latitude,
      longitude: pos.longitude,
      is_collected: false,
    });
  }

  // Basic supplies (no ammo, no armor, no keys in world spawn)
  const supplyTypes = [
    { type: ITEM_TYPES.FOOD, count: 4 },
    { type: ITEM_TYPES.MEDICINE, count: 2 },
    { type: ITEM_TYPES.ENERGY_DRINK, count: 3 },
  ];

  for (const entry of supplyTypes) {
    for (let i = 0; i < entry.count; i++) {
      const pos = randomPosition(centerLat, centerLng, 3);
      items.push({
        id: `supply-${entry.type}-${i}`,
        type: entry.type,
        latitude: pos.latitude,
        longitude: pos.longitude,
        is_collected: false,
      });
    }
  }

  return items;
}

/**
 * Spawn initial game items — both world-spawn and safe zone loot.
 * Items and safe zones are centered on the given position (player's GPS).
 */
export function spawnItems(centerLat = 40.7128, centerLng = -74.0060) {
  const items = [];

  // ── World-spawn items (food, medicine, mech parts, some health packs) ──
  // No ammo, armor, or keys in the wild — those are at police stations / military only
  const worldItems = spawnWorldItems(centerLat, centerLng);
  items.push(...worldItems);

  // ── Safe zone loot items — generated near the player ──
  // Each safe zone type has its own themed loot table
  const safeZones = generateSafeZonesNear(centerLat, centerLng);
  safeZones.forEach((zone, i) => {
    const loot = spawnSafeZoneLoot(zone, i);
    items.push(...loot);
  });

  return items;
}

/**
 * Get safe zones generated near a player position (for client display).
 */
export function getSafeZonesNear(lat, lng) {
  return generateSafeZonesNear(lat, lng);
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


