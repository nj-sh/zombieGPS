import dotenv from 'dotenv';
import { GAME_CONFIG } from '../shared/constants.js';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  game: {
    infectionRadiusMeters: parseFloat(process.env.INFECTION_RADIUS_METERS || String(GAME_CONFIG.INFECTION_RADIUS_METERS)),
    gpsUpdateIntervalMs: parseInt(process.env.GPS_UPDATE_INTERVAL_MS || String(GAME_CONFIG.GPS_UPDATE_INTERVAL_MS), 10),
    gpsIdleIntervalMs: parseInt(process.env.GPS_IDLE_INTERVAL_MS || String(GAME_CONFIG.GPS_IDLE_INTERVAL_MS), 10),
    maxSpeedKmh: parseFloat(process.env.MAX_SPEED_KMH || String(GAME_CONFIG.MAX_SPEED_KMH)),
    renderDistanceDefaultM: parseInt(process.env.RENDER_DISTANCE_DEFAULT_M || String(GAME_CONFIG.RENDER_DISTANCE_DEFAULT_M), 10),
    mechPartsRequired: parseInt(process.env.MECH_PARTS_REQUIRED || String(GAME_CONFIG.MECH_PARTS_REQUIRED), 10),
    helicopterMaxCapacity: parseInt(process.env.HELICOPTER_MAX_CAPACITY || String(GAME_CONFIG.HELICOPTER_MAX_CAPACITY), 10),
  },
};
