# Zombie Apocalypse — Real-World GPS Multiplayer Web Game

## Specification Document

> **Status:** Draft v1.0  
> **Last Updated:** July 28, 2026  
> **Author:** AI-assisted spec from user interviews

---

## 1. Overview

A modern, multiplayer browser game called **Zombie Apocalypse** where players physically move in the real world using GPS. Inspired by infection games like Humans vs. Zombies and old GPS multiplayer games. The entire game should feel like a polished AAA zombie survival game rather than a simple map application.

---

## 2. Theme & Visual Identity

### 2.1 Theme
Dark, horror, military quarantine, post-apocalyptic atmosphere.

### 2.2 Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Black | `#0a0a0a` | Backgrounds |
| Blood Red | `#c1121f` | Accents, danger, infection |
| Dark Gray | `#1a1a1a` | UI panels, cards |
| White | `#ffffff` | Text |
| Neon Green | `#39ff14` | Survivor team, health |

### 2.3 Typography
- **Cinzel** — Titles, headings, game logo
- **Poppins** — UI text, buttons, HUD elements

### 2.4 Visual Style
- Glowing red accents on interactive elements
- Subtle animations and transitions
- Box shadows, drop shadows, layered depth
- Smooth CSS transitions (0.2s–0.4s ease)
- Fog overlay effects
- Blood particle effects (main menu)
- Red glow on zombie-related elements
- Neon green glow on survivor elements

---

## 3. Technology Stack

### 3.1 Frontend
- **HTML5** — Semantic markup
- **CSS3** — Custom properties, animations, gradients, filters
- **JavaScript (ES6+)** — Vanilla JS, no frameworks
- **Leaflet.js** — Map rendering via OpenStreetMap tiles
- **No bundler** — Plain HTML/CSS/JS served statically via Express

### 3.2 Backend
- **Node.js** — Runtime
- **Express** — HTTP server & static file serving
- **Socket.IO** — Real-time communication (game logic, positions, events)
- **Supabase** — Database (PostgreSQL), authentication, storage

### 3.3 Database
- **Supabase (PostgreSQL)** — Primary database
  - Tables: players, items, safe_zones, game_state, leaderboard, player_stats
  - PostgreSQL-compatible schemas with Row-Level Security where appropriate

### 3.4 Communication
- **Socket.IO** — All real-time game events:
  - Player position updates
  - Infection events
  - Item pickups
  - Chat (future)
  - Game notifications

### 3.5 Hosting
- **Railway** or **Render** — Backend deployment with SSL
- Supabase is a separate hosted service

---

## 4. Project Structure

```
zombie-apocalypse/
├── client/
│   ├── index.html          # Main game page (entry point)
│   ├── css/
│   │   ├── main.css        # Core styles
│   │   ├── menu.css        # Main menu styles
│   │   ├── hud.css         # HUD overlay styles
│   │   ├── map.css         # Map-specific styles
│   │   └── animations.css  # Keyframe animations
│   ├── js/
│   │   ├── game.js         # Main game controller
│   │   ├── menu.js         # Main menu logic
│   │   ├── map.js          # Leaflet map setup & management
│   │   ├── player.js       # Player entity & rendering
│   │   ├── hud.js          # HUD updates & UI management
│   │   ├── audio.js        # Sound manager (Web Audio API)
│   │   ├── items.js        # Item spawning & collection
│   │   ├── infection.js    # Infection radius checking
│   │   ├── socket.js       # Socket.IO client connection
│   │   ├── gps.js          # GPS tracking & permission
│   │   ├── orientation.js  # Device orientation API
│   │   ├── compass.js      # Compass / direction indicator
│   │   ├── notifications.js # Toast notifications
│   │   ├── leaderboard.js  # Leaderboard UI
│   │   ├── settings.js     # Settings management
│   │   ├── pwa.js          # Service worker registration
│   │   ├── particles.js    # Particle effects
│   │   └── utils.js        # Utility functions
│   ├── assets/
│   │   ├── sounds/         # .mp3/.ogg audio files
│   │   │   ├── ambient-wind.mp3
│   │   │   ├── zombie-growl.mp3
│   │   │   ├── heartbeat.mp3
│   │   │   ├── infection.mp3
│   │   │   ├── footstep.mp3
│   │   │   ├── item-pickup.mp3
│   │   │   ├── helicopter.mp3
│   │   │   ├── menu-bg.mp3
│   │   │   └── notification.mp3
│   │   └── images/         # Sprites, logos, icons
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # PWA icons (192x192, 512x512)
├── server/
│   ├── index.js            # Express + Socket.IO server entry
│   ├── config.js           # Configuration & env vars
│   ├── supabase.js         # Supabase client init
│   ├── socket-handlers.js  # Socket.IO event handlers
│   ├── game-logic.js       # Core game logic (infection, items, etc.)
│   ├── validators.js       # Anti-cheat & GPS validation
│   ├── leaderboard.js      # Leaderboard calculation
│   ├── items-spawner.js    # Item spawning logic
│   └── utils.js            # Server utilities
├── shared/
│   ├── constants.js        # Shared game constants
│   └── types.js            # (Optional) JSDoc type definitions
├── .env.example            # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## 5. Game Flow

### 5.1 Main Menu (Cinematic)
When the website opens, display a cinematic main menu:

**Screen contains:**
- Large zombie logo (custom drawn or SVG)
- Title: **ZOMBIE APOCALYPSE** (Cinzel font, large, glowing red)
- Subtitle: *"Survive... or Become the Hunter."* (italic, Poppins)
- Input: Player Name (text field with validation, 3-16 chars)
- Input: Team Selection (radio or toggle)
  - **Survivor** (neon green highlight)
  - **Zombie** (blood red highlight)
- Button: **ENTER OUTBREAK** (large, animated, glowing)
- Background: Animated fog, blood particles, red glow overlay
- Audio: Ambient zombie sounds looping

### 5.2 Pre-Game Team Assignment
- If player selects **Zombie**, they start as zombie
- If player selects **Survivor**, they start as survivor
- Team can be randomly assigned as a game option (future)
- Zombie players are shown a brief intro: *"Hunt the living. Spread the infection."*
- Survivor players see: *"Stay alive. Find the parts. Escape."*

### 5.3 Loading Screen
After clicking **ENTER OUTBREAK**, show a fullscreen loading screen:

**Loading sequence (each line animates in, one after another, ~500ms apart):**

```
☣ Initializing Engine...           [DONE]
☣ Requesting GPS Permission...     [WAITING → DONE on grant]
☣ Connecting to Server...          [DONE]
☣ Downloading Survivor Data...     [DONE]
☣ Loading World...                 [DONE]
☣ Entering Outbreak...             [DONE → FADE OUT]
```

**Visual elements:**
- Progress bar (smooth fill, CSS transitions)
- Rotating biohazard icon (CSS animation, infinite spin)
- Dark background with red glow edges
- Each line appears with a typewriter or fade-in effect
- When GPS permission is denied, show a retry overlay

### 5.4 Map Loading
- After loading completes, the map fades in
- The map centers on the player's GPS location
- The camera smoothly zooms to street level
- A brief "spawn-in" animation for the player icon

---

## 6. Map System

### 6.1 Technology
- **Leaflet.js** with **OpenStreetMap** tile layer
- Dark-styled tiles (use a dark tile theme like CartoDB dark or custom CSS filter)
- Fullscreen map
- No default Leaflet markers — custom circular icons only

### 6.2 Map Features
- Player icons move smoothly (CSS transition or `requestAnimationFrame` interpolation)
- Player names displayed above icons
- Camera follows local player with smooth panning
- Render distance setting (like Minecraft) — configurable in settings
  - Nearby players: within render distance (default 500m)
  - Far players: hidden to preserve performance
- Dark map CSS filter: `filter: invert(1) hue-rotate(180deg)` or custom tile layer

### 6.3 Player Icons
- **Survivor:** Neon green circle with direction arrow, player name, health ring
- **Zombie:** Blood red circle with direction arrow, player name

Icon design:
```
      [PlayerName]       ← text label
    ┌─────────────┐
    │   ▲           │      ← direction arrow (points where phone faces)
    │  ╭───╮        │
    │  │ ● │        │      ← colored body (green/red)
    │  ╰───╯        │
    └─────────────┘
   ════════════════        ← health ring (survivors only)
```

### 6.4 Map Layers
1. Base tile layer (dark-themed OSM)
2. Player icons layer (moving entities)
3. Item layer (mech parts, supplies, etc.)
4. Safe zone layer (police, hospital, military markers)
5. Extraction point layer (helicopter landing zone)

---

## 7. Player System

### 7.1 Player Schema (Supabase Table)

```sql
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(16) NOT NULL,
  team          VARCHAR(8) CHECK (team IN ('survivor', 'zombie')),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  health        INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  lives         INTEGER DEFAULT 1,
  status        VARCHAR(16) DEFAULT 'active' CHECK (status IN ('active', 'infected', 'escaped', 'dead')),
  coins         INTEGER DEFAULT 0,
  items_inventory JSONB DEFAULT '[]',
  mech_parts    INTEGER DEFAULT 0 CHECK (mech_parts >= 0 AND mech_parts <= 3),
  has_radio     BOOLEAN DEFAULT FALSE,
  last_update   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Player Stats Schema

```sql
CREATE TABLE player_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID REFERENCES players(id) UNIQUE,
  total_infections  INTEGER DEFAULT 0,
  time_survived_sec INTEGER DEFAULT 0,
  distance_walked_m DOUBLE PRECISION DEFAULT 0,
  items_collected   INTEGER DEFAULT 0,
  games_escaped     INTEGER DEFAULT 0,
  total_deaths      INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Player Properties
- **ID:** Unique UUID
- **Name:** 3–16 characters, alphanumeric + underscore
- **Team:** `survivor` or `zombie`
- **Latitude/Longitude:** GPS coordinates, updated every tick
- **Health:** 0–100 (survivors only)
- **Lives:** 1 (default), can be increased via items/coins
- **Status:** `active`, `infected`, `escaped`, `dead`
- **Items Inventory:** JSON array of collected items
- **Mech Parts:** 0–3 collected mech items
- **Has Radio:** Boolean — crafted when 3 mech parts collected
- **Coins:** Earned by escaping, killing zombies, surviving. Used to buy health/armor upgrades
- **Last Update:** Timestamp of last position update

### 7.4 Player Persistence
- **Persistent always:** Player stays in the world indefinitely unless killed
- If browser closes and reopens, the player logs back into their existing character at their last position
- Death/kill: player remains as a zombie (if infected) or is removed (if dead)
- Account system via Supabase Auth links player identity across sessions

---

## 8. Game Mechanics

### 8.1 GPS Tracking
- **Adaptive frequency:**
  - Moving (speed > 0.5 m/s): Update every **1 second**
  - Stationary (speed ≤ 0.5 m/s): Update every **10 seconds**
- GPS coordinates sent to server via Socket.IO
- Server broadcasts nearby player positions
- Use `Geolocation.watchPosition()` with `enableHighAccuracy: true`

### 8.2 Team Roles

#### Survivors
- Must physically move in real life
- Goal: Collect 3 mech items → craft radio → reach helicopter extraction point
- Max 4 survivors can escape per helicopter
- Can heal themselves using health packs
- Can revive downed teammates (future)
- Must avoid zombies (stay outside 15m infection radius)
- Safe zones provide protection and healing

#### Zombies
- Must physically chase survivors
- Goal: Infect all survivors before they escape
- When within **15 meters** of a survivor:
  - Automatically infect the survivor
  - Infected player's team changes to zombie
  - Icon changes from green to red
  - Infection sound plays
  - Phone vibrates (if supported via Vibration API)
  - Broadcast infection event to all nearby players

### 8.3 Infection Mechanics
- Server calculates GPS distance between zombie and survivor
- Infection radius: **15 meters**
- If zombie enters radius → survivor becomes zombie
- New zombie gets: full health, team change, notification
- Infection is broadcast to all players within 200m radius
- Screen flash (red) + shake effect on infected player's screen
- Previous team(s) see a notification: *"PlayerName has been infected!"*

### 8.4 Win Condition
1. Survivors must collect **3 mech items** scattered on the map
2. Items ping their location on the map every **5 minutes** (visible to all)
3. With 3 mech items, survivors can craft a **radio** (automatic when 3 collected)
4. The radio reveals a **helicopter extraction point** on the map
5. Survivor must physically walk to the extraction point
6. Only **4 survivors** can escape per helicopter
7. Escaped players go to lobby, earn **coins**, can buy health/armor upgrades
8. After escape, player can start a new "level" (new life in the persistent world)
9. The game world continues — new mech items spawn, new players join

### 8.5 Coins & Economy
- Earned by: Escaping via helicopter, infecting survivors (as zombie), surviving long periods
- Spent on: Health refills, armor upgrades, cosmetic items (future)
- Coin amounts: TBD during balancing

---

## 9. Items System

### 9.1 Item Schema

```sql
CREATE TABLE items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(32) NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  is_collected BOOLEAN DEFAULT FALSE,
  collected_by UUID REFERENCES players(id),
  spawned_at  TIMESTAMPTZ DEFAULT NOW(),
  despawn_at  TIMESTAMPTZ
);
```

### 9.2 Item Types

| Item | Color | Effect | Rarity |
|------|-------|--------|--------|
| **Mech Part** | Gold/Yellow | Required for escape (need 3) | Rare (3 per cycle) |
| **Health Pack** | Green + Cross | +25 health | Common |
| **Ammo** | Orange | Future use | Common |
| **Food** | Brown | Future use (stamina) | Common |
| **Medicine** | Blue | Curse infection (future) | Uncommon |
| **Energy Drink** | Cyan | Speed boost (future) | Uncommon |
| **Armor** | Gray | Damage reduction (future) | Rare |
| **Keys** | Silver | Unlock vehicles/buildings (future) | Rare |

### 9.3 Item Behavior
- Items randomly spawn on the map
- Items ping location every **5 minutes** (visible to all players)
- Players collect items by walking to them (within 10m radius)
- Items respawn after being collected (with a cooldown)
- Mech parts only appear when no active escape is in progress

### 9.4 Safe Zones

```sql
CREATE TABLE safe_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(32) CHECK (type IN ('hospital', 'police_station', 'military_base')),
  name        VARCHAR(64),
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  radius_m    INTEGER DEFAULT 30
);
```

**Safe zone types:**
- **Hospitals:** Health regeneration, healing
- **Police Stations:** Ammo resupply (future)
- **Military Bases:** Armor, supply drops (future)

**Safe zone rules:**
- No infection allowed inside safe zones
- Healing is enabled (gradual health regen)
- Supply drops appear periodically
- Marked with distinct icons on the map (blue shield or similar)

---

## 10. Zombie Vision

When a survivor enters a **50-meter radius** of a zombie:
1. Zombie's screen pulses red (CSS animation)
2. Heartbeat sound becomes louder (Web Audio gain increase)
3. An arrow/direction indicator points toward the nearest survivor
4. The survivor's icon pulses more rapidly on the zombie's map
5. Distance to nearest survivor shown on HUD

**Visual effect:**
```
Normal view:          Zombie vision:
┌──────────────┐     ┌──────────────┐
│  Normal map  │     │  ╔══ RED ══╗ │
│              │     │  ║ PULSE   ║ │
│  ● Player    │     │  ║ EFFECT  ║ │
│              │     │  ╚═════════╝ │
│              │     │  ➤ Survivor  │
└──────────────┘     └──────────────┘
```

---

## 11. HUD (Heads-Up Display)

### 11.1 Layout

```
┌──────────────────────────────────────────────────────┐
│ [Name - Team]        │     │ [Online] [Survivors] [Zombies] │
│ [████████░░] Health  │     │ [Compass / Direction]          │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│         [GAME MAP - MAIN VIEWPORT]                   │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ GPS Accuracy │ Speed │  │ ❤❤❤ │ ⚡⚡⚡ │ ████ │     │
│ Settings ⚙   │       │  │ Health│ Stamina│ Armor│     │
└──────────────────────────────────────────────────────┘
```

### 11.2 HUD Elements

**Top Left:**
- Player name + team indicator (colored dot)
- Health bar (animated, smooth transitions)
- Lives remaining (heart icons)

**Top Right:**
- Players online (count)
- Survivors remaining (green count)
- Zombie count (red count)
- Compass / orientation indicator

**Bottom Left:**
- GPS accuracy (meters)
- Current speed (km/h or m/s)
- Settings gear icon (clickable)

**Bottom Right:**
- Compass rose (rotates with device orientation)
- Fullscreen toggle button

**Center Bottom:**
- Health hearts (❤❤❤)
- Stamina bar (⚡⚡⚡)
- Armor bar (future)
- Inventory quick-bar (shows collected items)

### 11.3 Compass / Orientation
- Uses **Device Orientation API** (`deviceorientation` event)
- The direction the phone is pointing = the direction the character faces on the map
- Always-visible compass indicator rotates with phone
- Player icon arrow updates based on device orientation

---

## 12. Sound System

### 12.1 Sound Sources
- **Mix of:**
  - Free sound libraries (Freesound.org, ZapSplat, Mixkit)
  - Web Audio API synthesis (heartbeat, alarms, pulses)

### 12.2 Sound List

| Sound | Trigger | Source |
|-------|---------|--------|
| Ambient wind | Loop during gameplay | Free sound library |
| Zombie growl | Random, proximity | Free sound library |
| Heartbeat | Low health, zombie vision | Web Audio synthesis |
| Footsteps | Player movement | Free sound library |
| Infection alarm | Player gets infected | Web Audio synthesis |
| Item pickup | Collect item | Free sound library |
| Helicopter | Extraction point active | Free sound library |
| Menu ambient | Main menu loop | Free sound library |
| Notification | General events | Web Audio synthesis |
| UI click | Buttons | Web Audio synthesis |

### 12.3 Audio Controls
- Mute toggle (global)
- Volume slider
- Individual sound categories: SFX, Music, Ambient
- Audio context started on first user interaction (browser autoplay policy)

---

## 13. Animation & Visual Effects

### 13.1 CSS Animations
- **Menu fog:** CSS gradient + opacity keyframes overlay
- **Blood particles:** Multiple small red divs with randomized CSS animation
- **Red glow:** `box-shadow` with red color, pulsing via animation
- **Loading lines:** Sequential fade-in with `animation-delay`
- **Biohazard spin:** `rotate(360deg)` infinite
- **Screen flash:** Fullscreen overlay, red, fades out quickly (infection event)
- **Screen shake:** `transform: translate()` keyframes on game container
- **Item ping:** Radial ripple animation on map
- **Player spawn:** Scale from 0 to 1 with ease-out bounce
- **Compass rotation:** Smooth CSS transition on device orientation change

### 13.2 JavaScript Animations
- Smooth icon movement using `requestAnimationFrame` interpolation
- Fade in/out transitions on HUD elements
- Notification toast slide-in from top
- Progress bar fill with `requestAnimationFrame`

### 13.3 Transition Timings
- Standard transition: 0.3s ease
- Menu transitions: 0.5s ease
- Infection flash: 0.15s
- Screen shake: 0.5s
- Loading screen: ~3s total

---

## 14. Leaderboard

### 14.1 Leaderboard Schema

```sql
CREATE TABLE leaderboard (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID REFERENCES players(id),
  category          VARCHAR(32) NOT NULL,
  -- Categories: 'top_survivors', 'top_zombies', 'longest_survival', 
  --             'most_infections', 'distance_walked', 'daily_ranking'
  score             DOUBLE PRECISION NOT NULL,
  achieved_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 14.2 Leaderboard Categories
1. **Top Survivors** — By time survived (longest continuous survival)
2. **Top Zombies** — By number of infections caused
3. **Longest Survival** — Total time as survivor (cumulative)
4. **Most Infections** — Total players infected as zombie
5. **Distance Walked** — Cumulative distance tracked via GPS
6. **Daily Ranking** — Combined score for the day

### 14.3 Leaderboard UI
- Accessible via a button on HUD
- Slide-out panel from right side
- Top 10 shown by default, expandable to 50
- Current player's rank highlighted
- Refreshes every 30 seconds
- Map overlay with semi-transparent background

---

## 15. Statistics

### 15.1 Stats Display
Available via a stats panel (accessible from HUD or settings):

- Distance walked today (total meters)
- Total infections caused
- Total time survived (cumulative)
- Time in current life
- Current speed (km/h)
- Current GPS accuracy (meters)
- Items collected
- Games escaped
- Total deaths

### 15.2 Stats Tracking
- Distance: Sum of GPS coordinate deltas each update
- Time survived: Elapsed time since last spawn/death
- Infections: Counted on server when infection event fires
- All stats persisted in `player_stats` table

---

## 16. Anti-Cheat System

### 16.1 Server-Side Validation

| Check | Rule | Action |
|-------|------|--------|
| Teleport limit | >30m in 1 second = suspicious | Warn, flag for review |
| Max speed | >30 km/h (~8.3 m/s) = teleporting | Reject update, flag account |
| Impossible movement | Through buildings/water (future) | Flag for review |
| GPS altitude change | >50m/s altitude change = fake GPS | Reject update |
| Server-authoritative infection | Server calculates distances | Cheat-proof |

### 16.2 Client-Side
- Detect mock GPS providers (Android/iOS mock location apps)
- Check `geolocation` API availability and accuracy

### 16.3 Penalties
- Warning on first offense
- Temporary ban (5 min) on repeated offense
- Permanent ban after 5+ offenses (future)
- Flagged accounts logged for admin review

---

## 17. Performance Targets

### 17.1 Goals
- Support **5000+ concurrent players** (aspirational, tested progressively)
- Smooth 60 FPS on mid-range phones
- Battery-efficient GPS updates

### 17.2 Optimization Strategies
- **Spatial partitioning:** Only download/update nearby players (within render distance setting)
- **Throttle GPS:** Adaptive frequency based on movement
- **`requestAnimationFrame`** for all JS animations
- **CSS animations** for GPU-accelerated effects
- **Debounced Socket.IO emits** (batch updates where possible)
- **Minimal DOM updates** — cache references, batch changes
- **Lazy load** sounds and assets

### 17.3 Render Distance Setting
- Configurable in settings (50m / 200m / 500m / 1000m / Unlimited)
- Default: 500m
- Players outside render distance are hidden (not fetched/rendered)

---

## 18. Mobile First

### 18.1 Responsive Design
- Primary target: Mobile browsers (Android + iPhone)
- Landscape and portrait support
- Touch-optimized UI (minimum 44px touch targets)
- No hover-dependent interactions (touch-friendly)

### 18.2 PWA Support
- **Manifest:** `manifest.json` with app name, icons, theme color
- **Service Worker:** `sw.js` for caching assets, basic offline support
- **Install prompt:** "Add to Home Screen" for Android Chrome
- **Icons:** 192x192 and 512x512 PNG icons
- **Theme color:** `#0a0a0a` (black)

---

## 19. Future Features (Roadmap)

### Phase 2 — Items & Economy
- [ ] Full loot system with rarities
- [ ] Crafting system (combine items for better gear)
- [ ] Coin economy and shop

### Phase 3 — Social & Vehicles
- [ ] Vehicles (cars, bikes) found on map / speed boost
- [ ] Clan/guild system
- [ ] Voice chat (WebRTC)
- [ ] Text chat (proximity + team + global)

### Phase 4 — Progression
- [ ] Daily missions
- [ ] Achievements
- [ ] XP and leveling system
- [ ] Global map events
- [ ] Supply helicopter drops

### Phase 5 — Atmosphere
- [ ] Weather system (fog, rain, day/night cycle)
- [ ] Global map events
- [ ] Private matches
- [ ] Admin panel

---

## 20. Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Game
MAX_PLAYERS_PER_GAME=5000
INFECTION_RADIUS_METERS=15
GPS_UPDATE_INTERVAL_MS=1000
GPS_IDLE_INTERVAL_MS=10000
MAX_SPEED_KMH=30
RENDER_DISTANCE_DEFAULT_M=500
MECH_PARTS_REQUIRED=3
HELICOPTER_MAX_CAPACITY=4
```

---

## 21. Initial Development Phases

### Phase 1 — Foundation (Current Scope)
1. Project structure setup
2. Server with Express + Socket.IO
3. Supabase connection and schema creation
4. Main menu (HTML/CSS with cinematic styling)
5. Loading screen with animated sequence
6. Leaflet map with dark tiles
7. GPS permission request and tracking
8. Player location display (custom circles)
9. Socket.IO position broadcasting
10. Basic HUD (health, player count, compass)

### Phase 2 — Gameplay
11. Team assignment (survivor/zombie)
12. Infection radius logic (server-side)
13. Infection effects (screen flash, sound, vibration)
14. Item spawning (mech parts, health packs)
15. Item collection (walk-to-pickup)
16. Safe zones
17. Mech part ping system
18. Radio crafting
19. Helicopter extraction point
20. Escape logic (max 4 players)

### Phase 3 — Polish
21. Coin system and shop
22. Leaderboard
23. Player stats
24. Zombie vision (pulse, heartbeat, arrow)
25. Sound system implementation
26. PWA manifest + service worker
27. Anti-cheat validation
28. Performance optimization
29. Render distance setting
30. Device orientation / compass

---

## 22. Design Decisions Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend architecture | Plain HTML/CSS/JS | User wanted simple, no bundler needed |
| Project structure | `client/` + `server/` + `shared/` | Clean separation of concerns |
| Database | Supabase (PostgreSQL) | Scalable, auth included, realtime available |
| Realtime | Socket.IO for game logic | Supabase Realtime too slow for 1s GPS updates |
| Authentication | Supabase Auth | Built-in, handles sessions, social login ready |
| PWA | Full support | Installable, app-like experience on mobile |
| GPS frequency | Adaptive (1s moving / 10s idle) | Battery optimization |
| Player persistence | Persistent always | User preference, supports reconnect |
| Win condition | 3 mech parts → craft radio → helicopter | Unique, engaging, cooperative goal |
| World scope | Global (anywhere on Earth) | Maximum player reach |
| Map visuals | Custom circular icons + dark tiles | Immersive, not generic Leaflet markers |
| Anti-cheat | Server-authoritative + speed/teleport checks | Trust the server, validate the client |
| Sound | Mix of free assets + Web Audio synthesis | Balance of quality and file size |

---

*End of Specification Document*
