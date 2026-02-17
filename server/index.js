import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

// Serve the built client
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/socket.io')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const roomManager = new RoomManager();
const bidTimers = new Map(); // roomCode -> timeout id
const crashIntervals = new Map(); // roomCode -> interval id

function clearBidTimer(roomCode) {
  if (bidTimers.has(roomCode)) {
    clearTimeout(bidTimers.get(roomCode));
    bidTimers.delete(roomCode);
  }
}

function clearCrashInterval(roomCode) {
  if (crashIntervals.has(roomCode)) {
    clearInterval(crashIntervals.get(roomCode));
    crashIntervals.delete(roomCode);
  }
}

const ROUND_ANNOUNCE_BUFFER = 2000; // client shows round announcement for 2s

function startBidTimer(roomCode) {
  clearBidTimer(roomCode);

  const timer = setTimeout(() => {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.game) return;

    // Fill in missing bids as 0
    for (const player of room.game.players) {
      if (!room.game.bids.has(player.id)) {
        room.game.bids.set(player.id, 0);
      }
    }

    finishBidding(roomCode);
  }, 30000 + ROUND_ANNOUNCE_BUFFER);

  bidTimers.set(roomCode, timer);
}

function finishBidding(roomCode) {
  clearBidTimer(roomCode);
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  const revealData = room.game.reveal();
  io.to(roomCode).emit('round-reveal', revealData);

  // Increase delay if there's a tie-break to allow announcement + countdown + spinner
  const revealDelay = revealData.tieBreak ? 10000 : 3000;

  // After a short delay, resolve and move to next round
  setTimeout(() => {
    const winnerId = revealData.winner?.playerId;
    const resolveData = room.game.resolve(winnerId);
    io.to(roomCode).emit('round-resolve', resolveData);

    if (room.game.isGameOver()) {
      const finalScores = room.game.getFinalScores();
      io.to(roomCode).emit('game-over', finalScores);
      room.status = 'finished';
    } else {
      // Start next round after a pause (includes round announcement buffer)
      setTimeout(() => {
        startNextRound(roomCode);
      }, 3000);
    }
  }, revealDelay);
}

// Unified function to start the next round (auction or crash)
function startNextRound(roomCode) {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  const roundData = room.game.startRound();

  if (roundData.type === 'crash') {
    io.to(roomCode).emit('crash-round-start', roundData);
    startCrashBetTimer(roomCode);
  } else if (roundData.type === 'slot') {
    io.to(roomCode).emit('slot-round-start', roundData);
    startSlotBetTimer(roomCode);
  } else {
    io.to(roomCode).emit('round-start', roundData);
    startBidTimer(roomCode);
  }
}

// --- Crash Round Functions ---

function startCrashBetTimer(roomCode) {
  clearBidTimer(roomCode);

  const timer = setTimeout(() => {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.game) return;

    // Fill in missing crash bets as 0
    for (const player of room.game.players) {
      if (!room.game.crashBets.has(player.id)) {
        room.game.crashBets.set(player.id, 0);
      }
    }

    beginCrashMultiplier(roomCode);
  }, 10000 + ROUND_ANNOUNCE_BUFFER);

  bidTimers.set(roomCode, timer);
}

function beginCrashMultiplier(roomCode) {
  clearBidTimer(roomCode);
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  room.game.startCrashMultiplier();
  io.to(roomCode).emit('crash-multiplier-start');

  const interval = setInterval(() => {
    const r = roomManager.getRoom(roomCode);
    if (!r || !r.game) {
      clearCrashInterval(roomCode);
      return;
    }

    r.game.crashTickCount++;
    const multiplier = r.game.getCurrentMultiplier();

    if (multiplier >= r.game.crashPoint) {
      // CRASH!
      clearCrashInterval(roomCode);
      const result = r.game.resolveCrash();
      io.to(roomCode).emit('crash-result', result);

      // Move to next round or end game
      if (r.game.isGameOver()) {
        const finalScores = r.game.getFinalScores();
        io.to(roomCode).emit('game-over', finalScores);
        r.status = 'finished';
      } else {
        setTimeout(() => {
          startNextRound(roomCode);
        }, 7000);
      }
    } else {
      io.to(roomCode).emit('crash-tick', {
        multiplier: Math.round(multiplier * 100) / 100,
      });
    }
  }, 100);

  crashIntervals.set(roomCode, interval);
}

// --- Slot Round Functions ---

function startSlotBetTimer(roomCode) {
  clearBidTimer(roomCode);

  const timer = setTimeout(() => {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.game) return;

    // Fill in missing slot bets as skip
    for (const player of room.game.players) {
      if (!room.game.slotBets.has(player.id)) {
        room.game.slotBets.set(player.id, false);
      }
    }

    finishSlotBetting(roomCode);
  }, 10000 + ROUND_ANNOUNCE_BUFFER);

  bidTimers.set(roomCode, timer);
}

function finishSlotBetting(roomCode) {
  clearBidTimer(roomCode);
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  const result = room.game.resolveSlots();
  io.to(roomCode).emit('slot-spin-result', result);

  if (room.game.isGameOver()) {
    const finalScores = room.game.getFinalScores();
    setTimeout(() => {
      io.to(roomCode).emit('game-over', finalScores);
      room.status = 'finished';
    }, 8000);
  } else {
    setTimeout(() => {
      startNextRound(roomCode);
    }, 8000);
  }
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('create-room', ({ playerName, avatar }) => {
    try {
      const room = roomManager.createRoom(socket.id, playerName, avatar);
      currentRoom = room.code;
      socket.join(room.code);
      socket.emit('room-created', {
        roomCode: room.code,
        players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, coins: p.coins })),
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('join-room', ({ roomCode, playerName, avatar }) => {
    try {
      const code = roomCode.toUpperCase();
      const room = roomManager.joinRoom(code, socket.id, playerName, avatar);
      currentRoom = code;
      socket.join(code);

      const playerList = room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, coins: p.coins }));
      socket.emit('room-joined', { roomCode: code, players: playerList });
      socket.to(code).emit('player-joined', { playerName, players: playerList });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('start-game', ({ roomCode }) => {
    try {
      const room = roomManager.startGame(roomCode, socket.id);
      startNextRound(roomCode);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('submit-bid', ({ roomCode, amount }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.game) throw new Error('No active game.');

      const bidStatus = room.game.submitBid(socket.id, amount);
      io.to(roomCode).emit('bid-received', bidStatus);

      if (room.game.allBidsIn()) {
        finishBidding(roomCode);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Crash Round Events ---

  socket.on('crash-bet', ({ roomCode, amount }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.game) throw new Error('No active game.');

      const betStatus = room.game.submitCrashBet(socket.id, amount);
      io.to(roomCode).emit('crash-bet-received', {
        ...betStatus,
        players: room.game.getPlayerStates(),
      });

      if (room.game.allCrashBetsIn()) {
        beginCrashMultiplier(roomCode);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Slot Round Events ---

  socket.on('slot-bet', ({ roomCode, participate }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.game) throw new Error('No active game.');

      const betStatus = room.game.submitSlotBet(socket.id, participate);
      io.to(roomCode).emit('slot-bet-received', {
        ...betStatus,
        players: room.game.getPlayerStates(),
      });

      if (room.game.allSlotBetsIn()) {
        finishSlotBetting(roomCode);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('crash-cashout', ({ roomCode }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room || !room.game) throw new Error('No active game.');

      const cashoutData = room.game.crashCashout(socket.id);
      io.to(roomCode).emit('crash-cashout-confirm', cashoutData);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Leave / Disconnect ---

  socket.on('leave-room', ({ roomCode }) => {
    handleLeave(socket, roomCode);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      handleLeave(socket, currentRoom);
    }
  });

  function handleLeave(sock, roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === sock.id);
    const playerName = player?.name || 'Unknown';

    // Handle mid-game disconnect
    if (room.game) {
      room.game.handleDisconnect(sock.id);
      // Remove from game players
      room.game.players = room.game.players.filter(p => p.id !== sock.id);

      if (room.game.allBidsIn() && room.game.state === 'BIDDING') {
        finishBidding(roomCode);
      }
      if (room.game.allCrashBetsIn() && room.game.state === 'CRASH_BETTING') {
        beginCrashMultiplier(roomCode);
      }
      if (room.game.allSlotBetsIn() && room.game.state === 'SLOT_BETTING') {
        finishSlotBetting(roomCode);
      }
    }

    const updatedRoom = roomManager.leaveRoom(roomCode, sock.id);
    sock.leave(roomCode);
    currentRoom = null;

    if (updatedRoom) {
      io.to(roomCode).emit('player-left', {
        playerName,
        players: updatedRoom.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, coins: p.coins })),
        hostId: updatedRoom.hostId,
      });
    }
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Gamba server running on port ${PORT}`);
});
