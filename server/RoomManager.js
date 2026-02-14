import { Game } from './Game.js';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(hostId, hostName, avatar) {
    let code;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const room = {
      code,
      hostId,
      players: [{ id: hostId, name: hostName, avatar: avatar || '🦊', coins: 10, cardsWon: [], shield: false, multiplier: false }],
      game: null,
      status: 'waiting', // waiting | playing | finished
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, playerId, playerName, avatar) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found.');
    if (room.status !== 'waiting') throw new Error('Game already in progress.');
    if (room.players.length >= 8) throw new Error('Room is full (max 8 players).');
    if (room.players.some(p => p.id === playerId)) throw new Error('Already in this room.');

    room.players.push({ id: playerId, name: playerName, avatar: avatar || '🦊', coins: 10, cardsWon: [], shield: false, multiplier: false });
    return room;
  }

  leaveRoom(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return null;
    }

    // Reassign host if host left
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }

    return room;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  startGame(code, requesterId) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found.');
    if (room.hostId !== requesterId) throw new Error('Only the host can start the game.');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start.');

    room.status = 'playing';
    room.game = new Game(room.players);
    return room;
  }

  cleanupRoom(code) {
    this.rooms.delete(code);
  }
}
