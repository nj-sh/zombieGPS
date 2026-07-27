import { SOCKET_EVENTS, TEAMS, PLAYER_STATUS, ITEM_TYPES, GAME_CONFIG } from '../shared/constants.js';
import { db, SafeZoneDefaults } from './supabase.js';
import { 
  calculateDistance, checkInfection, validatePosition, isInSafeZone, canCollectItem,
  createExtractionPoint, canEscape, canCraftRadio, healInSafeZone, generateId
} from './game-logic.js';
import { spawnItems, checkItemCollection } from './items-spawner.js';

/**
 * Initialize all Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
export function setupSocketHandlers(io) {
  // Track connected players: socketId → playerId
  const socketPlayerMap = new Map();
  // Track all active players: playerId → playerData
  const activePlayers = new Map();
  // Active game items
  let gameItems = [];
  // Active extraction points
  let extractionPoints = [];
  // Track safe zone state per player: playerId → { inside: bool, zoneId: string }
  const playerSafeZoneState = new Map();
  // Intervals (stored for cleanup)
  let itemPingInterval = null;
  let healingInterval = null;

  // ── Item Ping Interval ──
  function startItemPing() {
    if (itemPingInterval) return;
    itemPingInterval = setInterval(() => {
      const itemsToPing = gameItems.filter(item => !item.is_collected);
      if (itemsToPing.length > 0) {
        io.emit(SOCKET_EVENTS.ITEM_PING, {
          items: itemsToPing.map(item => ({
            id: item.id,
            type: item.type,
            latitude: item.latitude,
            longitude: item.longitude,
          })),
        });
      }
    }, 5 * 60 * 1000);
  }

  // ── Safe Zone Healing Tick ──
  healingInterval = setInterval(() => {
    for (const [playerId, player] of activePlayers) {
      if (player.team !== TEAMS.SURVIVOR || player.status !== PLAYER_STATUS.ACTIVE) continue;
      if (player.health >= 100) continue;

      const zone = isInSafeZone(player.latitude, player.longitude, SafeZoneDefaults);
      if (zone) {
        const newHealth = healInSafeZone(player);
        if (newHealth !== player.health) {
          player.health = newHealth;
          io.to(`player:${playerId}`).emit(SOCKET_EVENTS.PLAYER_UPDATED, {
            id: playerId,
            health: player.health,
            status: player.status,
            team: player.team,
            latitude: player.latitude,
            longitude: player.longitude,
          });
          db.updatePlayer(playerId, { health: player.health }).catch(() => {});
        }
      }
    }
  }, 2000);

  io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // ── JOIN GAME ──
    socket.on(SOCKET_EVENTS.JOIN_GAME, async (data) => {
      try {
        const { name, team, latitude, longitude } = data;

        // Validate name
        if (!name || name.length < 3 || name.length > 16) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Name must be 3-16 characters.' });
          return;
        }

        // Validate team
        if (![TEAMS.SURVIVOR, TEAMS.ZOMBIE].includes(team)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid team selection.' });
          return;
        }

        // Create player in database
        const player = await db.createPlayer({
          name,
          team,
          latitude: latitude || 0,
          longitude: longitude || 0,
        });

        // Track the socket-to-player mapping
        socketPlayerMap.set(socket.id, player.id);
        activePlayers.set(player.id, { ...player, socketId: socket.id });

        // Join the player to their team room and personal room
        socket.join(`team:${team}`);
        socket.join(`player:${player.id}`);
        socket.join('game');

        // Send initial game state to the new player
        socket.emit(SOCKET_EVENTS.GAME_STATE, {
          player,
          players: Array.from(activePlayers.values()).map(p => ({
            id: p.id,
            name: p.name,
            team: p.team,
            latitude: p.latitude,
            longitude: p.longitude,
            health: p.health,
            status: p.status,
            mech_parts: p.mech_parts,
            has_radio: p.has_radio,
          })),
          safeZones: SafeZoneDefaults,
          items: gameItems,
          extractionPoints: extractionPoints.filter(ep => ep.active),
        });

        // Broadcast new player to others
        socket.broadcast.emit(SOCKET_EVENTS.PLAYER_JOINED, {
          id: player.id,
          name: player.name,
          team: player.team,
          latitude: player.latitude,
          longitude: player.longitude,
          health: player.health,
          status: player.status,
        });

        // Spawn initial items if needed
        if (gameItems.length === 0) {
          gameItems = spawnItems();
          io.emit(SOCKET_EVENTS.ITEM_SPAWNED, { items: gameItems });
          startItemPing();
        }

        console.log(`✅ ${player.name} (${team}) joined as player ${player.id}`);
      } catch (err) {
        console.error('Error joining game:', err);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join game.' });
      }
    });

    // ── UPDATE POSITION ──
    socket.on(SOCKET_EVENTS.UPDATE_POSITION, async (data) => {
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const player = activePlayers.get(playerId);
      if (!player) return;

      const { latitude, longitude } = data;

      // Anti-cheat validation
      const validation = validatePosition(player, latitude, longitude);
      if (!validation.valid) {
        console.warn(`⚠️  Anti-cheat: ${player.name} - ${validation.reason}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: `Movement rejected: ${validation.reason}` });
        return;
      }

      // Store previous position for safe zone detection
      const prevLat = player.latitude;
      const prevLng = player.longitude;

      // Update player position
      player.latitude = latitude;
      player.longitude = longitude;
      player.last_update = new Date().toISOString();

      // Update in database (non-blocking)
      db.updatePlayerPosition(playerId, latitude, longitude).catch(() => {});

      // ── Safe Zone Entry/Exit Detection ──
      if (player.team === TEAMS.SURVIVOR) {
        const prevZone = isInSafeZone(prevLat, prevLng, SafeZoneDefaults);
        const currentZone = isInSafeZone(latitude, longitude, SafeZoneDefaults);

        const prevState = playerSafeZoneState.get(playerId);

        // Entered safe zone
        if (currentZone && (!prevState || !prevState.inside)) {
          playerSafeZoneState.set(playerId, { inside: true, zoneId: currentZone.id });
          socket.emit(SOCKET_EVENTS.SAFE_ZONE_ENTERED, {
            zoneId: currentZone.id,
            name: currentZone.name,
            type: currentZone.type,
          });
          console.log(`🏥 ${player.name} entered safe zone: ${currentZone.name}`);
        }
        // Left safe zone
        else if (!currentZone && prevState && prevState.inside) {
          playerSafeZoneState.set(playerId, { inside: false, zoneId: null });
          socket.emit(SOCKET_EVENTS.SAFE_ZONE_LEFT, {});
          console.log(`🚶 ${player.name} left safe zone`);
        }
        // Still inside
        else if (currentZone) {
          playerSafeZoneState.set(playerId, { inside: true, zoneId: currentZone.id });
        }
      }

      // ── Infection Check ──
      if (player.team === TEAMS.SURVIVOR) {
        const currentZone = isInSafeZone(latitude, longitude, SafeZoneDefaults);
        if (!currentZone) {
          for (const [otherId, otherPlayer] of activePlayers) {
            if (otherId !== playerId && otherPlayer.team === TEAMS.ZOMBIE && otherPlayer.status === PLAYER_STATUS.ACTIVE) {
              if (checkInfection(otherPlayer, player)) {
                // Infection!
                player.team = TEAMS.ZOMBIE;
                player.status = PLAYER_STATUS.INFECTED;
                player.health = 100;
                player.mech_parts = 0; // Reset mech parts on infection
                player.has_radio = false;

                db.updatePlayer(playerId, { 
                  team: TEAMS.ZOMBIE, status: PLAYER_STATUS.INFECTED, health: 100,
                  mech_parts: 0, has_radio: false 
                }).catch(() => {});

                // Broadcast infection to everyone
                io.emit(SOCKET_EVENTS.PLAYER_INFECTED, {
                  playerId,
                  infectorId: otherId,
                  playerName: player.name,
                  infectorName: otherPlayer.name,
                  latitude,
                  longitude,
                });

                // Remove from survivor team room, add to zombie team room
                socket.leave(`team:${TEAMS.SURVIVOR}`);
                socket.join(`team:${TEAMS.ZOMBIE}`);

                console.log(`🧟 ${player.name} was infected by ${otherPlayer.name}!`);
                break;
              }
            }
          }
        }
      }

      // Broadcast position update to nearby players
      socket.broadcast.emit(SOCKET_EVENTS.PLAYER_UPDATED, {
        id: playerId,
        latitude,
        longitude,
        team: player.team,
        health: player.health,
        status: player.status,
        mech_parts: player.mech_parts,
        has_radio: player.has_radio,
      });

      // Send nearby players to this player (also include extraction points)
      const nearbyPlayers = Array.from(activePlayers.values())
        .filter(p => p.id !== playerId && p.status === PLAYER_STATUS.ACTIVE)
        .map(p => ({
          id: p.id,
          name: p.name,
          team: p.team,
          latitude: p.latitude,
          longitude: p.longitude,
          health: p.health,
          status: p.status,
          mech_parts: p.mech_parts,
          has_radio: p.has_radio,
        }));

      socket.emit(SOCKET_EVENTS.NEARBY_PLAYERS, { 
        players: nearbyPlayers,
        extractionPoints: extractionPoints.filter(ep => ep.active),
      });

      // Check item collection
      const { collected, remainingItems } = checkItemCollection(player, gameItems);
      if (collected.length > 0) {
        gameItems = remainingItems;
        socket.emit(SOCKET_EVENTS.ITEM_COLLECTED, { items: collected });
        // Broadcast remaining items to everyone
        io.emit(SOCKET_EVENTS.ITEM_SPAWNED, { items: gameItems });
      }
    });

    // ── CRAFT RADIO ──
    socket.on(SOCKET_EVENTS.CRAFT_RADIO, async () => {
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const player = activePlayers.get(playerId);
      if (!player) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Player not found.' });
        return;
      }

      // Check if player can craft radio
      if (!canCraftRadio(player)) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
          message: player.has_radio 
            ? 'Radio already crafted!' 
            : `Need ${GAME_CONFIG.MECH_PARTS_REQUIRED} mech parts to craft radio. (${player.mech_parts || 0}/${GAME_CONFIG.MECH_PARTS_REQUIRED})` 
        });
        return;
      }

      // Craft the radio
      player.has_radio = true;

      // Create extraction point near player
      const extractionPoint = createExtractionPoint(player.latitude, player.longitude);
      extractionPoints.push(extractionPoint);

      db.updatePlayer(playerId, { has_radio: true }).catch(() => {});

      // Broadcast to all players that extraction is active
      io.emit(SOCKET_EVENTS.EXTRACTION_ACTIVE, {
        extractionPoint,
        craftedBy: {
          id: player.id,
          name: player.name,
        },
      });

      // Notify the crafting player
      socket.emit(SOCKET_EVENTS.ESCAPE_SUCCESS, {
        message: 'Radio crafted! Extraction point marked on your map. Make your way there!',
        extractionPoint,
      });

      console.log(`📻 ${player.name} crafted radio! Extraction point at ${extractionPoint.latitude}, ${extractionPoint.longitude}`);
    });

    // ── ESCAPE ──
    socket.on(SOCKET_EVENTS.ESCAPE, async () => {
      const playerId = socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const player = activePlayers.get(playerId);
      if (!player) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Player not found.' });
        return;
      }

      // Must have radio crafted
      if (!player.has_radio) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'You need to craft a radio first! Collect 3 mech parts.' });
        return;
      }

      // Must be a survivor
      if (player.team !== TEAMS.SURVIVOR) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only survivors can escape!' });
        return;
      }

      // Find nearest active extraction point
      let nearestEP = null;
      let nearestDistance = Infinity;

      for (const ep of extractionPoints) {
        if (!ep.active) continue;
        if (ep.escaped_count >= ep.max_capacity) {
          ep.active = false; // Helicopter full
          continue;
        }
        const dist = calculateDistance(player.latitude, player.longitude, ep.latitude, ep.longitude);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEP = ep;
        }
      }

      if (!nearestEP) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'No active extraction point available. Craft a radio first!' });
        return;
      }

      // Check if within extraction range
      if (!canEscape(player, nearestEP)) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
          message: `You need to be closer to the extraction point (${Math.round(nearestDistance)}m away, need ${nearestEP.radius_m}m).` 
        });
        return;
      }

      // ESCAPE!
      nearestEP.escaped_count++;
      player.status = PLAYER_STATUS.ESCAPED;
      player.coins = (player.coins || 0) + 100; // 100 coins for escaping

      if (nearestEP.escaped_count >= nearestEP.max_capacity) {
        nearestEP.active = false;
      }

      db.updatePlayer(playerId, { 
        status: PLAYER_STATUS.ESCAPED, 
        coins: player.coins,
        has_radio: false,
        mech_parts: 0,
      }).catch(() => {});

      // Notify the escaping player
      socket.emit(SOCKET_EVENTS.ESCAPE_SUCCESS, {
        message: '🚁 ESCAPED! You made it to the helicopter!',
        coins: 100,
        extractionPointId: nearestEP.id,
      });

      // Broadcast to all players
      io.emit(SOCKET_EVENTS.PLAYER_LEFT, { id: playerId, reason: 'escaped' });
      io.emit(SOCKET_EVENTS.EXTRACTION_ACTIVE, {
        extractionPoint: nearestEP,
        escapedCount: nearestEP.escaped_count,
      });

      // Remove player from active tracking after a delay
      setTimeout(() => {
        activePlayers.delete(playerId);
        socketPlayerMap.delete(socket.id);
      }, 5000);

      console.log(`🚁 ${player.name} escaped via helicopter! (${nearestEP.escaped_count}/${nearestEP.max_capacity})`);
    });

    // ── DISCONNECT ──
    socket.on('disconnect', () => {
      const playerId = socketPlayerMap.get(socket.id);
      if (playerId) {
        const player = activePlayers.get(playerId);
        if (player) {
          // Don't remove — persistent world keeps them
          console.log(`🔌 ${player.name} disconnected (persistent)`);
        }
        socketPlayerMap.delete(socket.id);
        socket.broadcast.emit(SOCKET_EVENTS.PLAYER_LEFT, { id: playerId });
      }
    });
  });
}
