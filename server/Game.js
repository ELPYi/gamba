import { createDeck } from './CardDeck.js';

const STATES = {
  ROUND_START: 'ROUND_START',
  BIDDING: 'BIDDING',
  REVEAL: 'REVEAL',
  RESOLVE: 'RESOLVE',
  CRASH_BETTING: 'CRASH_BETTING',
  CRASH_ACTIVE: 'CRASH_ACTIVE',
  CRASH_RESULT: 'CRASH_RESULT',
  SLOT_BETTING: 'SLOT_BETTING',
  SLOT_SPINNING: 'SLOT_SPINNING',
  SLOT_RESULT: 'SLOT_RESULT',
  GAME_OVER: 'GAME_OVER',
};

const BID_TIME_LIMIT = 30; // seconds
const CRASH_BET_TIME_LIMIT = 10; // seconds
const SLOT_BET_TIME_LIMIT = 10; // seconds
const SLOT_ANTE = 4;
const TOTAL_ROUNDS = 10;
const CRASH_ROUNDS = new Set([4, 8]); // rounds 4 and 8 are crash rounds
const SLOT_ROUNDS = new Set([6]); // round 6 is a slot machine round

const SLOT_SYMBOLS = ['🪙', '💎', '🍒', '⭐', '💀'];

// Weights: Coin most common, Diamond rarest
const SLOT_WEIGHTS = [30, 5, 20, 15, 10]; // 🪙, 💎, 🍒, ⭐, 💀
const SLOT_WEIGHT_TOTAL = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);

function pickSlotSymbol() {
  let roll = Math.random() * SLOT_WEIGHT_TOTAL;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) {
    roll -= SLOT_WEIGHTS[i];
    if (roll <= 0) return SLOT_SYMBOLS[i];
  }
  return SLOT_SYMBOLS[0];
}

function generateSpin() {
  return [pickSlotSymbol(), pickSlotSymbol(), pickSlotSymbol()];
}

// Higher is better
function scoreSlotResult(reels) {
  const [a, b, c] = reels;
  const symbolRank = { '💎': 4, '⭐': 3, '🍒': 2, '🪙': 1, '💀': 0 };

  // Triple
  if (a === b && b === c) {
    if (a === '💀') return 0; // Triple skull — worst
    return 100 + symbolRank[a]; // Triple diamond=104, triple star=103, etc.
  }

  // Pair
  const counts = {};
  for (const s of reels) counts[s] = (counts[s] || 0) + 1;
  for (const s of reels) {
    if (counts[s] === 2 && s !== '💀') {
      return 10 + symbolRank[s]; // Pair diamond=14, pair star=13, etc.
    }
  }

  // All different / skull pair
  return 1;
}

export class Game {
  constructor(players) {
    this.players = players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar || '🦊',
      coins: 10,
      cardsWon: [],
      shield: false,
      multiplier: false,
      lastWonCard: null,
    }));
    this.deck = createDeck(); // 8 cards for 8 auction rounds
    this.round = 0;
    this.auctionRoundIndex = 0;
    this.currentCard = null;
    this.bids = new Map();
    this.state = STATES.ROUND_START;
    this.timer = null;
    this.effects = [];

    // Crash round state
    this.crashPoint = null;
    this.crashBets = new Map();
    this.crashCashouts = new Map();
    this.crashTickCount = 0;

    // Slot round state
    this.slotBets = new Map(); // playerId -> true (participating) or false (skipped)
    this.slotPool = 0;
  }

  startRound() {
    this.round++;
    this.effects = [];

    // Give +1 coin to all players every round
    for (const player of this.players) {
      player.coins += 1;
    }

    const isSlotRound = SLOT_ROUNDS.has(this.round);
    const isCrashRound = CRASH_ROUNDS.has(this.round);

    if (isSlotRound) {
      return this.startSlotRound();
    }

    if (isCrashRound) {
      this.state = STATES.CRASH_BETTING;
      // Crash point between 1.2x and 3.0x
      this.crashPoint = 1.2 + Math.random() * 1.8;
      this.crashBets = new Map();
      this.crashCashouts = new Map();
      this.crashTickCount = 0;

      return {
        round: this.round,
        type: 'crash',
        maxBet: 5,
        timeLimit: CRASH_BET_TIME_LIMIT,
        coinBonus: 1,
        players: this.getPlayerStates(),
      };
    }

    // Normal auction round
    this.currentCard = this.deck[this.auctionRoundIndex];
    this.auctionRoundIndex++;
    this.bids = new Map();
    this.state = STATES.BIDDING;

    return {
      round: this.round,
      type: 'auction',
      card: this.currentCard,
      timeLimit: BID_TIME_LIMIT,
      coinBonus: 1,
      players: this.getPlayerStates(),
    };
  }

  // --- Normal Auction Methods ---

  submitBid(playerId, amount) {
    if (this.state !== STATES.BIDDING) throw new Error('Not in bidding phase.');
    if (this.bids.has(playerId)) throw new Error('Already submitted a bid.');

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found.');

    const clamped = Math.max(0, Math.min(amount, player.coins));
    this.bids.set(playerId, clamped);

    return {
      count: this.bids.size,
      total: this.players.length,
    };
  }

  allBidsIn() {
    return this.bids.size >= this.players.length;
  }

  reveal() {
    this.state = STATES.REVEAL;

    const bidsArray = this.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      amount: this.bids.get(p.id) ?? 0,
    }));

    // Find highest bid amount
    let highestBid = -1;
    for (const bid of bidsArray) {
      if (bid.amount > highestBid) {
        highestBid = bid.amount;
      }
    }

    // Collect all players with the highest bid
    const tiedBids = bidsArray.filter(b => b.amount === highestBid);

    let winner = null;
    let tieBreak = null;

    if (tiedBids.length > 1) {
      // Tie detected — pick random winner
      winner = tiedBids[Math.floor(Math.random() * tiedBids.length)];
      tieBreak = {
        tiedPlayers: tiedBids.map(b => ({
          playerId: b.playerId,
          playerName: b.playerName,
          avatar: b.avatar,
        })),
        winnerId: winner.playerId,
      };
    } else {
      winner = tiedBids[0];
    }

    // Everyone who bid pays their bid
    const penalty = [];
    for (const bid of bidsArray) {
      const player = this.players.find(p => p.id === bid.playerId);
      player.coins -= bid.amount;
      if (bid.amount > 0) {
        penalty.push({ playerId: bid.playerId, paid: bid.amount });
      }
    }

    return { bids: bidsArray, winner, tieBreak, penalty };
  }

  resolve(winnerId) {
    this.state = STATES.RESOLVE;
    const winner = this.players.find(p => p.id === winnerId);
    if (!winner) return { players: this.getPlayerStates(), effects: [] };

    const card = this.currentCard;
    this.effects = [];

    this._applyCardEffect(winner, card);

    winner.cardsWon.push(card);
    winner.lastWonCard = card;

    const result = {
      players: this.getPlayerStates(),
      effects: this.effects,
    };

    if (this.round >= TOTAL_ROUNDS) {
      this.state = STATES.GAME_OVER;
    }

    return result;
  }

  _applyCardEffect(winner, card) {
    let effectiveValue = card.value;

    // Apply multiplier if active
    if (winner.multiplier && card.type === 'gold') {
      effectiveValue *= 2;
      this.effects.push({ type: 'multiplier', playerId: winner.id, message: `${winner.name}'s multiplier doubled the gold!` });
      winner.multiplier = false;
    }

    switch (card.type) {
      case 'gold':
        winner.coins += effectiveValue;
        this.effects.push({ type: 'gold', playerId: winner.id, message: `${winner.name} gained ${effectiveValue} coins.` });
        break;

      case 'multiplier':
        winner.multiplier = true;
        this.effects.push({ type: 'multiplier', playerId: winner.id, message: `${winner.name}'s next gold card is doubled!` });
        break;

      case 'shield':
        winner.shield = true;
        this.effects.push({ type: 'shield', playerId: winner.id, message: `${winner.name} gained a shield!` });
        break;

      case 'steal': {
        // Find richest opponent
        const opponents = this.players.filter(p => p.id !== winner.id);
        const richest = opponents.reduce((a, b) => (a.coins >= b.coins ? a : b), opponents[0]);

        if (richest) {
          if (richest.shield) {
            richest.shield = false;
            this.effects.push({ type: 'shield-block', playerId: richest.id, message: `${richest.name}'s shield blocked the steal!` });
          } else {
            const stolen = Math.min(card.value, richest.coins);
            richest.coins -= stolen;
            winner.coins += stolen;
            this.effects.push({ type: 'steal', playerId: winner.id, message: `${winner.name} stole ${stolen} coins from ${richest.name}!` });
          }
        }
        break;
      }

      case 'mirror':
        if (winner.lastWonCard && winner.lastWonCard.type !== 'mirror') {
          this.effects.push({ type: 'mirror', playerId: winner.id, message: `${winner.name}'s mirror repeats ${winner.lastWonCard.name}!` });
          this._applyCardEffect(winner, winner.lastWonCard);
        } else {
          this.effects.push({ type: 'mirror', playerId: winner.id, message: `${winner.name}'s mirror has nothing to reflect.` });
        }
        break;

      case 'wildcard': {
        const bonus = this.players.length;
        winner.coins += bonus;
        this.effects.push({ type: 'wildcard', playerId: winner.id, message: `${winner.name} gained ${bonus} coins (1 per player)!` });
        break;
      }
    }
  }

  // --- Slot Round Methods ---

  isSlotRound() {
    return SLOT_ROUNDS.has(this.round);
  }

  startSlotRound() {
    this.state = STATES.SLOT_BETTING;
    this.slotBets = new Map();
    this.slotPool = 0;

    return {
      round: this.round,
      type: 'slot',
      ante: SLOT_ANTE,
      timeLimit: SLOT_BET_TIME_LIMIT,
      coinBonus: 1,
      players: this.getPlayerStates(),
    };
  }

  submitSlotBet(playerId, participate) {
    if (this.state !== STATES.SLOT_BETTING) throw new Error('Not in slot betting phase.');
    if (this.slotBets.has(playerId)) throw new Error('Already submitted slot decision.');

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found.');

    if (participate && player.coins >= SLOT_ANTE) {
      player.coins -= SLOT_ANTE;
      this.slotPool += SLOT_ANTE;
      this.slotBets.set(playerId, true);
    } else {
      this.slotBets.set(playerId, false);
    }

    return {
      count: this.slotBets.size,
      total: this.players.length,
      pool: this.slotPool,
    };
  }

  allSlotBetsIn() {
    return this.slotBets.size >= this.players.length;
  }

  resolveSlots() {
    this.state = STATES.SLOT_RESULT;

    const participants = [];
    const results = [];

    for (const [playerId, joined] of this.slotBets) {
      const player = this.players.find(p => p.id === playerId);
      if (joined) {
        const reels = generateSpin();
        const score = scoreSlotResult(reels);
        participants.push({ playerId, playerName: player.name, reels, score });
        results.push({ playerId, playerName: player.name, reels, score, joined: true });
      } else {
        results.push({ playerId, playerName: player.name, reels: null, score: 0, joined: false });
      }
    }

    let winners = [];
    let winnerPayout = 0;

    if (participants.length > 0) {
      const bestScore = Math.max(...participants.map(p => p.score));
      winners = participants.filter(p => p.score === bestScore);
      winnerPayout = Math.floor(this.slotPool / winners.length);

      for (const w of winners) {
        const player = this.players.find(p => p.id === w.playerId);
        player.coins += winnerPayout;
      }
    }

    if (this.round >= TOTAL_ROUNDS) {
      this.state = STATES.GAME_OVER;
    }

    return {
      results,
      winners: winners.map(w => ({ playerId: w.playerId, playerName: w.playerName })),
      pool: this.slotPool,
      payout: winnerPayout,
      players: this.getPlayerStates(),
    };
  }

  // --- Crash Round Methods ---

  isCrashRound() {
    return CRASH_ROUNDS.has(this.round);
  }

  submitCrashBet(playerId, amount) {
    if (this.state !== STATES.CRASH_BETTING) throw new Error('Not in crash betting phase.');
    if (this.crashBets.has(playerId)) throw new Error('Already placed a bet.');

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found.');

    const maxBet = 5; // Cap crash bets to limit runaway gains
    const clamped = Math.max(0, Math.min(amount, player.coins, maxBet));
    this.crashBets.set(playerId, clamped);
    // Deduct coins immediately
    player.coins -= clamped;

    return {
      count: this.crashBets.size,
      total: this.players.length,
    };
  }

  allCrashBetsIn() {
    return this.crashBets.size >= this.players.length;
  }

  startCrashMultiplier() {
    this.state = STATES.CRASH_ACTIVE;
    this.crashTickCount = 0;
  }

  getCurrentMultiplier() {
    return Math.pow(1.03, this.crashTickCount);
  }

  crashCashout(playerId) {
    if (this.state !== STATES.CRASH_ACTIVE) throw new Error('Crash not active.');
    if (this.crashCashouts.has(playerId)) throw new Error('Already cashed out.');
    if (!this.crashBets.has(playerId) || this.crashBets.get(playerId) === 0) {
      throw new Error('No bet placed.');
    }

    const multiplier = this.getCurrentMultiplier();
    this.crashCashouts.set(playerId, multiplier);

    const bet = this.crashBets.get(playerId);
    const winnings = Math.floor(bet * multiplier);
    const profit = winnings - bet; // Crash tax: only gain the profit, bet was already deducted
    const player = this.players.find(p => p.id === playerId);
    player.coins += winnings;

    return {
      playerId,
      playerName: player.name,
      multiplier: Math.round(multiplier * 100) / 100,
      winnings,
    };
  }

  resolveCrash() {
    this.state = STATES.CRASH_RESULT;
    const results = [];

    for (const [playerId, bet] of this.crashBets) {
      const player = this.players.find(p => p.id === playerId);
      if (this.crashCashouts.has(playerId)) {
        const multiplier = this.crashCashouts.get(playerId);
        const winnings = Math.floor(bet * multiplier);
        results.push({
          playerId,
          playerName: player.name,
          bet,
          cashedOut: true,
          multiplier: Math.round(multiplier * 100) / 100,
          winnings,
        });
      } else {
        // Lost - didn't cash out before crash
        results.push({
          playerId,
          playerName: player.name,
          bet,
          cashedOut: false,
          multiplier: 0,
          winnings: 0,
        });
      }
    }

    if (this.round >= TOTAL_ROUNDS) {
      this.state = STATES.GAME_OVER;
    }

    return {
      results,
      crashPoint: Math.round(this.crashPoint * 100) / 100,
      players: this.getPlayerStates(),
    };
  }

  // --- Common Methods ---

  isGameOver() {
    return this.state === STATES.GAME_OVER;
  }

  getFinalScores() {
    const scores = this.players
      .map(p => ({
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        coins: p.coins,
        cardsWon: p.cardsWon.length,
      }))
      .sort((a, b) => b.coins - a.coins);

    return {
      scores,
      winner: scores[0],
    };
  }

  getPlayerStates() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      coins: p.coins,
      cardsWon: p.cardsWon.length,
      shield: p.shield,
      multiplier: p.multiplier,
    }));
  }

  handleDisconnect(playerId) {
    // If in bidding and player hasn't bid, submit 0
    if (this.state === STATES.BIDDING && !this.bids.has(playerId)) {
      this.bids.set(playerId, 0);
    }
    // If in crash betting, submit 0
    if (this.state === STATES.CRASH_BETTING && !this.crashBets.has(playerId)) {
      this.crashBets.set(playerId, 0);
    }
    // If in slot betting, mark as skip
    if (this.state === STATES.SLOT_BETTING && !this.slotBets.has(playerId)) {
      this.slotBets.set(playerId, false);
    }
  }
}
