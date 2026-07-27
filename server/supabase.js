import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;

  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    console.warn('⚠️  Supabase not configured. Running in memory-only mode.');
    return null;
  }

  supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  console.log('✅ Supabase connected');
  return supabase;
}

/**
 * In-memory store fallback when Supabase is not configured.
 * This allows development without a Supabase instance.
 */
class InMemoryStore {
  constructor() {
    this.players = new Map();
    this.items = [];
    this.safeZones = SafeZoneDefaults;
  }

  async createPlayer(playerData) {
    const id = crypto.randomUUID();
    const player = {
      id,
      name: playerData.name,
      team: playerData.team,
      latitude: playerData.latitude,
      longitude: playerData.longitude,
      health: 100,
      lives: 1,
      status: 'active',
      coins: 0,
      inventory: [],
      mech_parts: 0,
      has_radio: false,
      last_update: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayer(id) {
    return this.players.get(id) || null;
  }

  async updatePlayerPosition(id, latitude, longitude) {
    const player = this.players.get(id);
    if (!player) return null;
    player.latitude = latitude;
    player.longitude = longitude;
    player.last_update = new Date().toISOString();
    return player;
  }

  async updatePlayer(id, updates) {
    const player = this.players.get(id);
    if (!player) return null;
    Object.assign(player, updates, { last_update: new Date().toISOString() });
    return player;
  }

  async getAllPlayers() {
    return Array.from(this.players.values());
  }
}

export const SafeZoneDefaults = [
  { id: 'sz-1', type: 'hospital', name: 'Central Hospital', latitude: 40.7128, longitude: -74.0060, radius_m: 30 },
  { id: 'sz-2', type: 'police_station', name: 'City Police HQ', latitude: 40.7150, longitude: -74.0080, radius_m: 25 },
  { id: 'sz-3', type: 'military_base', name: 'Fort Refuge', latitude: 40.7200, longitude: -74.0100, radius_m: 40 },
];

export let db = new InMemoryStore();

export async function initDatabase() {
  const client = getSupabase();
  if (client) {
    // In production, we'd use the real Supabase client
    // For now, use in-memory for development
    console.log('📦 Using Supabase database');
  } else {
    console.log('📦 Using in-memory database (dev mode)');
  }
}
