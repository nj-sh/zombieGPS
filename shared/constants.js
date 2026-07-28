// Zombie Apocalypse - Shared Constants

export const TEAMS = {
  SURVIVOR: 'survivor',
  ZOMBIE: 'zombie',
};

export const PLAYER_STATUS = {
  ACTIVE: 'active',
  INFECTED: 'infected',
  ESCAPED: 'escaped',
  DEAD: 'dead',
};

export const ITEM_TYPES = {
  MECH_PART: 'mech_part',
  HEALTH_PACK: 'health_pack',
  AMMO: 'ammo',
  FOOD: 'food',
  MEDICINE: 'medicine',
  GUN: 'gun',
  ENERGY_DRINK: 'energy_drink',
  ARMOR: 'armor',
  KEYS: 'keys',
};

export const SAFE_ZONE_TYPES = {
  HOSPITAL: 'hospital',
  POLICE_STATION: 'police_station',
  MILITARY_BASE: 'military_base',
};

export const GAME_CONFIG = {
  INFECTION_RADIUS_METERS: 15,
  ITEM_COLLECT_RADIUS_METERS: 10,
  GPS_UPDATE_INTERVAL_MS: 1000,
  GPS_IDLE_INTERVAL_MS: 10000,
  MAX_SPEED_KMH: 30,
  RENDER_DISTANCE_DEFAULT_M: 500,
  MECH_PARTS_REQUIRED: 3,
  HELICOPTER_MAX_CAPACITY: 4,
  ZOMBIE_VISION_RADIUS_METERS: 50,
  MAX_PLAYER_NAME_LENGTH: 16,
  MIN_PLAYER_NAME_LENGTH: 3,
  MAX_PLAYERS_PER_GAME: 5000,
};

export const COLORS = {
  BLACK: '#0a0a0a',
  BLOOD_RED: '#c1121f',
  DARK_GRAY: '#1a1a1a',
  WHITE: '#ffffff',
  NEON_GREEN: '#39ff14',
  SURVIVOR: '#39ff14',
  ZOMBIE: '#c1121f',
  HEALTH_GREEN: '#39ff14',
  HEALTH_YELLOW: '#ffdd00',
  HEALTH_RED: '#c1121f',
  ITEM_GOLD: '#ffd700',
  SAFE_ZONE_BLUE: '#00aaff',
  MECH_PART: '#ffd700',
};

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_GAME: 'join_game',
  UPDATE_POSITION: 'update_position',
  COLLECT_ITEM: 'collect_item',
  UPDATE_HEALTH: 'update_health',
  CRAFT_RADIO: 'craft_radio',
  ESCAPE: 'escape',

  // Server → Client
  GAME_STATE: 'game_state',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_UPDATED: 'player_updated',
  PLAYER_INFECTED: 'player_infected',
  ITEM_SPAWNED: 'item_spawned',
  ITEM_COLLECTED: 'item_collected',
  ITEM_PING: 'item_ping',
  SAFE_ZONES: 'safe_zones',
  SAFE_ZONE_ENTERED: 'safe_zone_entered',
  SAFE_ZONE_LEFT: 'safe_zone_left',
  EXTRACTION_ACTIVE: 'extraction_active',
  ESCAPE_SUCCESS: 'escape_success',
  ERROR: 'error',
  NEARBY_PLAYERS: 'nearby_players',
  GAME_OVER: 'game_over',
};
