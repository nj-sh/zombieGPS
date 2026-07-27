-- Zombie Apocalypse - Database Schema
-- Run this in Supabase SQL editor to set up the database

-- ── PLAYERS ──
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(16) NOT NULL CHECK (char_length(name) >= 3),
  team          VARCHAR(8) NOT NULL CHECK (team IN ('survivor', 'zombie')),
  latitude      DOUBLE PRECISION DEFAULT 0,
  longitude     DOUBLE PRECISION DEFAULT 0,
  health        INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  lives         INTEGER DEFAULT 1 CHECK (lives >= 0),
  status        VARCHAR(16) DEFAULT 'active' CHECK (status IN ('active', 'infected', 'escaped', 'dead')),
  coins         INTEGER DEFAULT 0,
  inventory     JSONB DEFAULT '[]',
  mech_parts    INTEGER DEFAULT 0 CHECK (mech_parts >= 0 AND mech_parts <= 3),
  has_radio     BOOLEAN DEFAULT FALSE,
  last_update   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for spatial queries (latitude/longitude)
CREATE INDEX IF NOT EXISTS idx_players_location ON players (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_players_team ON players (team);
CREATE INDEX IF NOT EXISTS idx_players_status ON players (status);

-- ── PLAYER STATS ──
CREATE TABLE IF NOT EXISTS player_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  total_infections  INTEGER DEFAULT 0,
  time_survived_sec INTEGER DEFAULT 0,
  distance_walked_m DOUBLE PRECISION DEFAULT 0,
  items_collected   INTEGER DEFAULT 0,
  games_escaped     INTEGER DEFAULT 0,
  total_deaths      INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats (player_id);

-- ── ITEMS ──
CREATE TABLE IF NOT EXISTS items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(32) NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  is_collected  BOOLEAN DEFAULT FALSE,
  collected_by  UUID REFERENCES players(id),
  spawned_at    TIMESTAMPTZ DEFAULT NOW(),
  despawn_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_items_location ON items (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_items_collected ON items (is_collected);

-- ── SAFE ZONES ──
CREATE TABLE IF NOT EXISTS safe_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(32) NOT NULL CHECK (type IN ('hospital', 'police_station', 'military_base')),
  name        VARCHAR(64) NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  radius_m    INTEGER DEFAULT 30
);

CREATE INDEX IF NOT EXISTS idx_safe_zones_location ON safe_zones (latitude, longitude);

-- Seed default safe zones
INSERT INTO safe_zones (type, name, latitude, longitude, radius_m) VALUES
  ('hospital', 'Central Hospital', 40.7128, -74.0060, 30),
  ('police_station', 'City Police HQ', 40.7150, -74.0080, 25),
  ('military_base', 'Fort Refuge', 40.7200, -74.0100, 40)
ON CONFLICT DO NOTHING;

-- ── LEADERBOARD ──
CREATE TABLE IF NOT EXISTS leaderboard (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID REFERENCES players(id) ON DELETE CASCADE,
  category    VARCHAR(32) NOT NULL,
  score       DOUBLE PRECISION NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard (category, score DESC);

-- ── GAME STATE ──
CREATE TABLE IF NOT EXISTS game_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(64) UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──
-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Players can read all players but only update themselves
CREATE POLICY "players_read_all" ON players FOR SELECT USING (true);
CREATE POLICY "players_update_self" ON players FOR UPDATE USING (id = auth.uid());

-- All authenticated users can read/write items
CREATE POLICY "items_read_all" ON items FOR SELECT USING (true);
CREATE POLICY "items_insert_all" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "items_update_all" ON items FOR UPDATE USING (true);
