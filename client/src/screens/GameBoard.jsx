import { useState, useEffect, useRef } from 'react';
import socket from '../socket.js';
import { soundManager } from '../utils/SoundManager.js';
import Card from '../components/Card.jsx';
import BidInput from '../components/BidInput.jsx';
import PlayerList from '../components/PlayerList.jsx';
import RoundResult from '../components/RoundResult.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import Timer from '../components/Timer.jsx';
import CrashGame from '../components/CrashGame.jsx';
import SlotMachine from '../components/SlotMachine.jsx';

export default function GameBoard({ roomCode, onGameEnd, initialRound }) {
  const [phase, setPhase] = useState('bidding');
  const [round, setRound] = useState(0);
  const [card, setCard] = useState(null);
  const [timeLimit, setTimeLimit] = useState(30);
  const [bidStatus, setBidStatus] = useState({ count: 0, total: 0 });
  const [hasBid, setHasBid] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [resolveData, setResolveData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState(null);
  const [coinBonus, setCoinBonus] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [phaseFlash, setPhaseFlash] = useState('');
  const [cardKey, setCardKey] = useState(0); // force re-mount for animation
  const [roundAnnounce, setRoundAnnounce] = useState(null); // { round, type }

  const prevCoinsRef = useRef(null);
  const initialConsumedRef = useRef(false);
  const announceTimerRef = useRef(null);

  const ANNOUNCE_DURATION = 2000; // ms to show round announcement

  function showRoundAnnounce(roundNum, type, callback) {
    setRoundAnnounce({ round: roundNum, type });
    soundManager.roundAnnounce();
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => {
      setRoundAnnounce(null);
      callback();
    }, ANNOUNCE_DURATION);
  }

  // Process initial round data passed from App (fixes first round missing card)
  useEffect(() => {
    if (initialRound && !initialConsumedRef.current) {
      initialConsumedRef.current = true;
      const data = initialRound.data;

      setRound(data.round);
      if (data.players) setPlayers(data.players);

      const roundType = initialRound.type === 'crash' ? 'crash' : initialRound.type === 'slot' ? 'slot' : 'auction';

      showRoundAnnounce(data.round, roundType, () => {
        if (roundType === 'auction') {
          setCard(data.card);
          setCardKey(prev => prev + 1);
          setTimeLimit(data.timeLimit);
          setPhase('bidding');
        } else if (roundType === 'crash') {
          setCard(null);
          setTimeLimit(data.timeLimit);
          setPhase('crash');
        } else if (roundType === 'slot') {
          setCard(null);
          setTimeLimit(data.timeLimit);
          setPhase('slot');
        }
        soundManager.roundStart();
        if (data.coinBonus) {
          setCoinBonus(true);
          soundManager.bonusCoin();
          setTimeout(() => setCoinBonus(false), 1500);
        }
      });
    }
  }, [initialRound]);

  useEffect(() => {
    function onRoundStart(data) {
      // Skip if this is the initial round we already consumed
      if (initialConsumedRef.current && data.round === 1) {
        initialConsumedRef.current = false; // reset for future games
        return;
      }
      setRound(data.round);
      setHasBid(false);
      setBidStatus({ count: 0, total: 0 });
      setRevealData(null);
      setResolveData(null);
      if (data.players) setPlayers(data.players);

      showRoundAnnounce(data.round, 'auction', () => {
        setCard(data.card);
        setCardKey(prev => prev + 1);
        setTimeLimit(data.timeLimit);
        setPhase('bidding');
        soundManager.roundStart();
        setPhaseFlash('new-round');
        setTimeout(() => setPhaseFlash(''), 600);
        if (data.coinBonus) {
          setCoinBonus(true);
          soundManager.bonusCoin();
          setTimeout(() => setCoinBonus(false), 1500);
        }
      });
    }

    function onCrashRoundStart(data) {
      if (initialConsumedRef.current && data.round === 1) {
        initialConsumedRef.current = false;
        return;
      }
      setRound(data.round);
      setHasBid(false);
      setRevealData(null);
      setResolveData(null);
      if (data.players) setPlayers(data.players);

      showRoundAnnounce(data.round, 'crash', () => {
        setCard(null);
        setTimeLimit(data.timeLimit);
        setPhase('crash');
        soundManager.roundStart();
        setPhaseFlash('crash-incoming');
        setTimeout(() => setPhaseFlash(''), 800);
        if (data.coinBonus) {
          setCoinBonus(true);
          soundManager.bonusCoin();
          setTimeout(() => setCoinBonus(false), 1500);
        }
      });
    }

    function onSlotRoundStart(data) {
      if (initialConsumedRef.current && data.round === 1) {
        initialConsumedRef.current = false;
        return;
      }
      setRound(data.round);
      setHasBid(false);
      setRevealData(null);
      setResolveData(null);
      if (data.players) setPlayers(data.players);

      showRoundAnnounce(data.round, 'slot', () => {
        setCard(null);
        setTimeLimit(data.timeLimit);
        setPhase('slot');
        soundManager.roundStart();
        setPhaseFlash('slot-incoming');
        setTimeout(() => setPhaseFlash(''), 800);
        if (data.coinBonus) {
          setCoinBonus(true);
          soundManager.bonusCoin();
          setTimeout(() => setCoinBonus(false), 1500);
        }
      });
    }

    function onSlotBetReceived(data) {
      if (data.players) setPlayers(data.players);
    }

    function onSlotSpinResult(data) {
      if (data.players) setPlayers(data.players);
      const me = data.players.find(p => p.id === socket.id);
      if (me && prevCoinsRef.current !== null) {
        if (me.coins > prevCoinsRef.current) {
          soundManager.coinGain();
        } else if (me.coins < prevCoinsRef.current) {
          soundManager.coinLoss();
        }
      }
      if (me) prevCoinsRef.current = me.coins;
    }

    function onBidReceived(data) {
      setBidStatus(data);
    }

    function onRoundReveal(data) {
      setRevealData(data);
      setPhase('reveal');
      soundManager.reveal();
      setPhaseFlash('reveal');
      setTimeout(() => setPhaseFlash(''), 400);
    }

    function onRoundResolve(data) {
      setResolveData(data);
      setPlayers(data.players);
      setPhase('resolve');

      const me = data.players.find(p => p.id === socket.id);
      if (me && prevCoinsRef.current !== null) {
        if (me.coins > prevCoinsRef.current) {
          soundManager.coinGain();
        } else if (me.coins < prevCoinsRef.current) {
          soundManager.coinLoss();
        }
      }
      if (me) prevCoinsRef.current = me.coins;
    }

    function onCrashBetReceived(data) {
      if (data.players) setPlayers(data.players);
    }

    function onCrashCashoutConfirm() {}

    function onCrashResult(data) {
      if (data.players) setPlayers(data.players);
      // Screen shake on crash
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
      const me = data.players.find(p => p.id === socket.id);
      if (me && prevCoinsRef.current !== null) {
        if (me.coins > prevCoinsRef.current) {
          soundManager.coinGain();
        } else if (me.coins < prevCoinsRef.current) {
          soundManager.coinLoss();
        }
      }
      if (me) prevCoinsRef.current = me.coins;
    }

    function onGameOver(data) {
      setScores(data);
      setPhase('gameover');
      soundManager.gameOver();
    }

    socket.on('round-start', onRoundStart);
    socket.on('crash-round-start', onCrashRoundStart);
    socket.on('slot-round-start', onSlotRoundStart);
    socket.on('bid-received', onBidReceived);
    socket.on('round-reveal', onRoundReveal);
    socket.on('round-resolve', onRoundResolve);
    socket.on('crash-bet-received', onCrashBetReceived);
    socket.on('crash-cashout-confirm', onCrashCashoutConfirm);
    socket.on('crash-result', onCrashResult);
    socket.on('slot-bet-received', onSlotBetReceived);
    socket.on('slot-spin-result', onSlotSpinResult);
    socket.on('game-over', onGameOver);

    return () => {
      socket.off('round-start', onRoundStart);
      socket.off('crash-round-start', onCrashRoundStart);
      socket.off('slot-round-start', onSlotRoundStart);
      socket.off('bid-received', onBidReceived);
      socket.off('round-reveal', onRoundReveal);
      socket.off('round-resolve', onRoundResolve);
      socket.off('crash-bet-received', onCrashBetReceived);
      socket.off('crash-cashout-confirm', onCrashCashoutConfirm);
      socket.off('crash-result', onCrashResult);
      socket.off('slot-bet-received', onSlotBetReceived);
      socket.off('slot-spin-result', onSlotSpinResult);
      socket.off('game-over', onGameOver);
    };
  }, []);

  function handleBid(amount) {
    socket.emit('submit-bid', { roomCode, amount });
    setHasBid(true);
    soundManager.bidSubmit();
  }

  const myPlayer = players.find(p => p.id === socket.id);
  const myCoins = myPlayer?.coins ?? 10;

  if (prevCoinsRef.current === null && myPlayer) {
    prevCoinsRef.current = myPlayer.coins;
  }

  if (phase === 'gameover' && scores) {
    return (
      <div className="game-board">
        <Scoreboard scores={scores} onBack={onGameEnd} />
      </div>
    );
  }

  const isCrashPhase = phase === 'crash';
  const isSlotPhase = phase === 'slot';

  return (
    <div className={`game-board ${screenShake ? 'vfx-shake' : ''} ${phaseFlash ? `vfx-flash-${phaseFlash}` : ''}`}>
      {/* Round Announcement Overlay */}
      {roundAnnounce && (
        <div className="round-announce-overlay">
          <div className="round-announce-card">
            <span className="round-announce-label">Round</span>
            <span className="round-announce-number">{roundAnnounce.round}</span>
            <span className="round-announce-type">
              {roundAnnounce.type === 'crash' && 'CRASH ROUND'}
              {roundAnnounce.type === 'slot' && 'SLOT MACHINE'}
              {roundAnnounce.type === 'auction' && 'AUCTION'}
            </span>
          </div>
        </div>
      )}

      <div className="game-top-bar">
        <span className="round-label">
          Round {round} / 10
          {isCrashPhase && <span className="crash-round-badge">CRASH</span>}
          {isSlotPhase && <span className="slot-round-badge">SLOTS</span>}
        </span>
        {phase === 'bidding' && <Timer seconds={timeLimit} />}
        {isCrashPhase && <Timer seconds={timeLimit} />}
        {isSlotPhase && <Timer seconds={timeLimit} />}
        <span className="coin-label">
          <span className="coin-icon-wrap">
            <span className="coin-icon">&#x1FA99;</span>
            <span className={`coin-value ${coinBonus ? 'coin-pop' : ''}`}>{myCoins}</span>
          </span>
          {coinBonus && <span className="coin-bonus-popup">+1</span>}
        </span>
      </div>

      <div className="game-content">
        <div className="game-left">
          {/* Normal Auction Rounds */}
          {!isCrashPhase && card && (
            <div className="card-entrance" key={cardKey}>
              <Card card={card} glowing={phase === 'bidding'} />
            </div>
          )}

          {!isCrashPhase && phase === 'bidding' && !hasBid && (
            <div className="vfx-slide-up">
              <BidInput maxCoins={myCoins} onSubmit={handleBid} />
            </div>
          )}

          {!isCrashPhase && phase === 'bidding' && hasBid && (
            <div className="bid-waiting vfx-fade-in">
              <div className="waiting-spinner" />
              <p>Bid submitted! Waiting for others...</p>
              <p className="bid-count">{bidStatus.count} / {bidStatus.total} bids in</p>
            </div>
          )}

          {!isCrashPhase && (phase === 'reveal' || phase === 'resolve') && revealData && (
            <RoundResult revealData={revealData} resolveData={resolveData} />
          )}

          {/* Crash Round */}
          {isCrashPhase && (
            <div className="vfx-fade-in">
              <CrashGame roomCode={roomCode} myCoins={myCoins} maxBet={5} />
            </div>
          )}

          {/* Slot Round */}
          {isSlotPhase && (
            <div className="vfx-fade-in">
              <SlotMachine roomCode={roomCode} myCoins={myCoins} ante={4} />
            </div>
          )}
        </div>

        <div className="game-right">
          <PlayerList players={players} currentPlayerId={socket.id} />
        </div>
      </div>
    </div>
  );
}
