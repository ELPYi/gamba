import { useState, useEffect, useRef } from 'react';
import socket from '../socket.js';
import { soundManager } from '../utils/SoundManager.js';

const SYMBOLS = ['🪙', '💎', '🍒', '⭐', '💀'];
const SPIN_DURATION = 2000; // ms total
const REEL_STAGGER = 500; // ms between each reel stopping

export default function SlotMachine({ roomCode, myCoins, ante }) {
  const [phase, setPhase] = useState('betting'); // betting | spinning | result
  const [hasBet, setHasBet] = useState(false);
  const [betStatus, setBetStatus] = useState({ count: 0, total: 0, pool: 0 });
  const [result, setResult] = useState(null);

  // Spinning animation state
  const [spinningReels, setSpinningReels] = useState([true, true, true]);
  const [displayReels, setDisplayReels] = useState(['🪙', '🪙', '🪙']);
  const spinIntervals = useRef([]);
  const myResult = useRef(null);

  useEffect(() => {
    function onSlotBetReceived(data) {
      setBetStatus({ count: data.count, total: data.total, pool: data.pool });
      if (data.players) {
        // Players state updated via parent
      }
    }

    function onSlotSpinResult(data) {
      setResult(data);
      // Find my result
      const me = data.results.find(r => r.playerId === socket.id);
      myResult.current = me;

      if (me && me.joined && me.reels) {
        // Start spinning animation
        setPhase('spinning');
        startSpinAnimation(me.reels, data);
      } else {
        // Skipped — go straight to result
        setPhase('result');
      }
    }

    socket.on('slot-bet-received', onSlotBetReceived);
    socket.on('slot-spin-result', onSlotSpinResult);

    return () => {
      socket.off('slot-bet-received', onSlotBetReceived);
      socket.off('slot-spin-result', onSlotSpinResult);
      spinIntervals.current.forEach(clearInterval);
    };
  }, []);

  function startSpinAnimation(finalReels, fullResult) {
    setSpinningReels([true, true, true]);
    soundManager.slotSpin();

    // Rapidly cycle symbols on each reel
    for (let i = 0; i < 3; i++) {
      const interval = setInterval(() => {
        setDisplayReels(prev => {
          const next = [...prev];
          next[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          return next;
        });
      }, 80);
      spinIntervals.current.push(interval);
    }

    // Stop reels one by one
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        clearInterval(spinIntervals.current[i]);
        setDisplayReels(prev => {
          const next = [...prev];
          next[i] = finalReels[i];
          return next;
        });
        setSpinningReels(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        soundManager.slotStop();
      }, SPIN_DURATION + i * REEL_STAGGER);
    }

    // After all reels stop, show result
    setTimeout(() => {
      setPhase('result');
      const isWinner = fullResult.winners.some(w => w.playerId === socket.id);
      if (isWinner) {
        soundManager.slotWin();
      }
    }, SPIN_DURATION + 3 * REEL_STAGGER + 400);
  }

  function handleJoin() {
    socket.emit('slot-bet', { roomCode, participate: true });
    setHasBet(true);
    soundManager.bidSubmit();
  }

  function handleSkip() {
    socket.emit('slot-bet', { roomCode, participate: false });
    setHasBet(true);
  }

  // --- Betting Phase ---
  if (phase === 'betting') {
    const canAfford = myCoins >= ante;

    return (
      <div className="slot-game">
        <div className="slot-header">
          <span className="slot-icon">🎰</span>
          <h3>Jackpot Pool!</h3>
          <p className="slot-subtitle">
            Ante {ante} coins to spin the slots. Best spin wins the entire pool!
          </p>
        </div>

        <div className="slot-reels-preview">
          <div className="slot-reel">❓</div>
          <div className="slot-reel">❓</div>
          <div className="slot-reel">❓</div>
        </div>

        <div className="slot-pool-display">
          <span className="slot-pool-label">Jackpot Pool</span>
          <span className="slot-pool-amount">🪙 {betStatus.pool}</span>
        </div>

        {!hasBet ? (
          <div className="slot-bet-actions">
            <button
              onClick={handleJoin}
              className="btn btn-primary slot-join-btn"
              disabled={!canAfford}
            >
              Ante {ante} Coins
            </button>
            <button onClick={handleSkip} className="btn btn-ghost slot-skip-btn">
              Skip
            </button>
            {!canAfford && (
              <p className="slot-cant-afford">Not enough coins to ante!</p>
            )}
          </div>
        ) : (
          <div className="bid-waiting vfx-fade-in">
            <div className="waiting-spinner" />
            <p>Decision locked in! Waiting for others...</p>
            <p className="bid-count">{betStatus.count} / {betStatus.total} ready</p>
          </div>
        )}
      </div>
    );
  }

  // --- Spinning Phase ---
  if (phase === 'spinning') {
    return (
      <div className="slot-game">
        <div className="slot-header">
          <span className="slot-icon">🎰</span>
          <h3>Spinning!</h3>
        </div>

        <div className="slot-reels-container">
          {displayReels.map((symbol, i) => (
            <div
              key={i}
              className={`slot-reel slot-reel-large ${spinningReels[i] ? 'slot-reel-spinning' : 'slot-reel-stopped'}`}
            >
              {symbol}
            </div>
          ))}
        </div>

        <div className="slot-pool-display">
          <span className="slot-pool-label">Jackpot Pool</span>
          <span className="slot-pool-amount">🪙 {betStatus.pool || result?.pool || 0}</span>
        </div>
      </div>
    );
  }

  // --- Result Phase ---
  if (phase === 'result' && result) {
    const isWinner = result.winners.some(w => w.playerId === socket.id);

    return (
      <div className="slot-game">
        <div className="slot-header">
          <span className="slot-icon">{isWinner ? '🏆' : '🎰'}</span>
          <h3>{result.pool === 0 ? 'No Pool' : isWinner ? 'You Won!' : 'Results'}</h3>
        </div>

        {result.pool > 0 && (
          <div className={`slot-pool-display ${isWinner ? 'slot-pool-won' : ''}`}>
            <span className="slot-pool-label">Jackpot Pool</span>
            <span className="slot-pool-amount">🪙 {result.pool}</span>
            {result.payout > 0 && (
              <span className="slot-payout-info">
                {result.winners.length > 1 ? `Split ${result.winners.length} ways` : 'Winner takes all'}
                {' — '} 🪙 {result.payout} each
              </span>
            )}
          </div>
        )}

        <div className="slot-results-list">
          {result.results.map((r) => {
            const isMe = r.playerId === socket.id;
            const didWin = result.winners.some(w => w.playerId === r.playerId);

            return (
              <div
                key={r.playerId}
                className={`slot-result-row ${didWin ? 'slot-win' : ''} ${!r.joined ? 'slot-skipped' : ''}`}
              >
                <span className="slot-result-name">
                  {r.playerName}
                  {isMe && ' (you)'}
                </span>
                {r.joined && r.reels ? (
                  <span className="slot-result-reels">
                    {r.reels.map((s, i) => (
                      <span key={i} className="slot-result-symbol">{s}</span>
                    ))}
                  </span>
                ) : (
                  <span className="slot-result-skip">Skipped</span>
                )}
                {didWin && (
                  <span className="slot-result-badge">+{result.payout} 🪙</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
