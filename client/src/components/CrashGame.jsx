import { useState, useEffect, useRef } from 'react';
import socket from '../socket.js';
import { soundManager } from '../utils/SoundManager.js';

export default function CrashGame({ roomCode, myCoins, maxBet = 5 }) {
  const [phase, setPhase] = useState('betting'); // betting | active | result
  const [betAmount, setBetAmount] = useState(1);
  const [hasBet, setHasBet] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [betStatus, setBetStatus] = useState({ count: 0, total: 0 });
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutData, setCashoutData] = useState(null);
  const [result, setResult] = useState(null);
  const [otherCashouts, setOtherCashouts] = useState([]);

  const canvasRef = useRef(null);
  const historyRef = useRef([1.0]);
  const multiplierRef = useRef(1.0);
  const phaseRef = useRef('betting');
  const animFrameRef = useRef(null);

  useEffect(() => {
    function onCrashMultiplierStart() {
      setPhase('active');
      phaseRef.current = 'active';
      historyRef.current = [1.0];
      soundManager.crashStart();
    }

    function onCrashTick(data) {
      setMultiplier(data.multiplier);
      multiplierRef.current = data.multiplier;
      historyRef.current = [...historyRef.current, data.multiplier];
      // Play subtle rising tick every 5th tick
      if (historyRef.current.length % 5 === 0) {
        soundManager.crashTick(data.multiplier);
      }
    }

    function onCrashCashoutConfirm(data) {
      if (data.playerId === socket.id) {
        setCashedOut(true);
        setCashoutData(data);
        soundManager.cashOut();
      } else {
        setOtherCashouts(prev => [...prev, data]);
      }
    }

    function onCrashResult(data) {
      setResult(data);
      setPhase('result');
      phaseRef.current = 'result';
      soundManager.crashBoom();
    }

    function onCrashBetReceived(data) {
      setBetStatus({ count: data.count, total: data.total });
    }

    socket.on('crash-multiplier-start', onCrashMultiplierStart);
    socket.on('crash-tick', onCrashTick);
    socket.on('crash-cashout-confirm', onCrashCashoutConfirm);
    socket.on('crash-result', onCrashResult);
    socket.on('crash-bet-received', onCrashBetReceived);

    return () => {
      socket.off('crash-multiplier-start', onCrashMultiplierStart);
      socket.off('crash-tick', onCrashTick);
      socket.off('crash-cashout-confirm', onCrashCashoutConfirm);
      socket.off('crash-result', onCrashResult);
      socket.off('crash-bet-received', onCrashBetReceived);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0f1923';
      ctx.fillRect(0, 0, w, h);

      const history = historyRef.current;
      const currentPhase = phaseRef.current;

      // Grid lines
      ctx.strokeStyle = '#1a2a3a';
      ctx.lineWidth = 1;
      const maxMult = Math.max(...history, 2.0);
      const gridStep = maxMult > 5 ? 2 : maxMult > 3 ? 1 : 0.5;
      for (let m = 1; m <= maxMult + 1; m += gridStep) {
        const y = h - ((m - 1) / (maxMult - 0.8)) * (h - 50) - 30;
        if (y < 10 || y > h - 10) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = '#3a4a5a';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${m.toFixed(1)}x`, 4, y - 4);
      }

      if (history.length < 2) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw curve
      const crashed = currentPhase === 'result';
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      if (crashed) {
        gradient.addColorStop(0, '#ef444480');
        gradient.addColorStop(1, '#ef444410');
      } else {
        gradient.addColorStop(0, '#10b98180');
        gradient.addColorStop(1, '#10b98110');
      }

      // Fill area under curve
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < history.length; i++) {
        const x = (i / Math.max(history.length - 1, 1)) * w;
        const y = h - ((history[i] - 1) / (maxMult - 0.8)) * (h - 50) - 30;
        ctx.lineTo(x, Math.max(10, y));
      }
      ctx.lineTo(((history.length - 1) / Math.max(history.length - 1, 1)) * w, h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.strokeStyle = crashed ? '#ef4444' : '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = crashed ? '#ef4444' : '#10b981';
      ctx.shadowBlur = 8;
      for (let i = 0; i < history.length; i++) {
        const x = (i / Math.max(history.length - 1, 1)) * w;
        const y = h - ((history[i] - 1) / (maxMult - 0.8)) * (h - 50) - 30;
        if (i === 0) ctx.moveTo(x, Math.max(10, y));
        else ctx.lineTo(x, Math.max(10, y));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw current multiplier dot
      if (!crashed && history.length > 0) {
        const lastX = w;
        const lastY = h - ((history[history.length - 1] - 1) / (maxMult - 0.8)) * (h - 50) - 30;
        ctx.beginPath();
        ctx.arc(lastX, Math.max(10, lastY), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  function handleBet() {
    socket.emit('crash-bet', { roomCode, amount: betAmount });
    setHasBet(true);
    soundManager.bidSubmit();
  }

  function handleSkip() {
    socket.emit('crash-bet', { roomCode, amount: 0 });
    setHasBet(true);
    setSkipped(true);
  }

  function handleCashout() {
    socket.emit('crash-cashout', { roomCode });
  }

  // --- Betting Phase ---
  if (phase === 'betting') {
    const effectiveMax = Math.min(myCoins, maxBet);

    return (
      <div className="crash-game">
        <div className="crash-header">
          <span className="crash-icon">📈</span>
          <h3>Crash Round!</h3>
          <p className="crash-subtitle">
            Bet your coins and cash out before the multiplier crashes!
          </p>
        </div>

        {!hasBet ? (
          <div className="crash-bet-input">
            <label className="bid-label">Your Bet</label>
            <div className="bid-controls">
              <input
                type="range"
                min={1}
                max={effectiveMax}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="bid-slider"
              />
              <span className="bid-amount">{betAmount}</span>
            </div>
            <p className="crash-bet-cap">Max bet: {maxBet} coins</p>
            <div className="bid-presets">
              <button className="btn btn-small" onClick={() => setBetAmount(1)}>1</button>
              <button className="btn btn-small" onClick={() => setBetAmount(Math.max(1, Math.min(Math.floor(myCoins / 4), maxBet)))}>25%</button>
              <button className="btn btn-small" onClick={() => setBetAmount(Math.max(1, Math.min(Math.floor(myCoins / 2), maxBet)))}>50%</button>
              <button className="btn btn-small" onClick={() => setBetAmount(effectiveMax)}>Max</button>
            </div>
            <button
              onClick={handleBet}
              className="btn btn-primary bid-submit"
              disabled={effectiveMax < 1}
            >
              {effectiveMax < 1 ? 'Not enough coins' : `Place Bet (${betAmount} coins)`}
            </button>
            <button onClick={handleSkip} className="btn btn-ghost crash-skip-btn">
              Sit Out
            </button>
          </div>
        ) : (
          <div className="bid-waiting vfx-fade-in">
            <div className="waiting-spinner" />
            <p>{skipped ? 'Sitting this one out!' : 'Bet placed!'} Waiting for others...</p>
            <p className="bid-count">{betStatus.count} / {betStatus.total} ready</p>
          </div>
        )}
      </div>
    );
  }

  // --- Active Phase ---
  if (phase === 'active') {
    return (
      <div className="crash-game">
        {skipped && (
          <div className="crash-spectating">
            <span className="crash-spectating-icon">👀</span>
            <span>Spectating — you sat this round out</span>
          </div>
        )}

        <div className="crash-multiplier-display">
          <span className={`crash-multiplier-number ${multiplier >= 2 ? 'crash-hot' : ''}`}>
            {multiplier.toFixed(2)}x
          </span>
        </div>

        <div className="crash-canvas-container">
          <canvas ref={canvasRef} className="crash-canvas" />
        </div>

        {skipped ? null : cashedOut ? (
          <div className="crash-cashed-out">
            <p>Cashed out at <strong>{cashoutData.multiplier.toFixed(2)}x</strong></p>
            <p className="crash-winnings">Won {cashoutData.winnings} coins!</p>
          </div>
        ) : (
          <button
            onClick={handleCashout}
            className="btn crash-cashout-btn"
          >
            CASH OUT
          </button>
        )}

        {otherCashouts.length > 0 && (
          <div className="crash-other-cashouts">
            {otherCashouts.map((c, i) => (
              <span key={i} className="crash-cashout-tag">
                {c.playerName} @ {c.multiplier.toFixed(2)}x
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Result Phase ---
  if (phase === 'result' && result) {
    return (
      <div className="crash-game">
        <div className="crash-result-header">
          <span className="crash-crashed-text">CRASHED</span>
          <span className="crash-crashed-at">@ {result.crashPoint.toFixed(2)}x</span>
        </div>

        <div className="crash-canvas-container">
          <canvas ref={canvasRef} className="crash-canvas" />
        </div>

        <div className="crash-results-list">
          <h4>Results</h4>
          {result.results.map((r) => (
            <div
              key={r.playerId}
              className={`crash-result-row ${r.cashedOut ? 'crash-win' : 'crash-lose'}`}
            >
              <span className="crash-result-name">
                {r.playerName}
                {r.playerId === socket.id && ' (you)'}
              </span>
              <span className="crash-result-bet">Bet: {r.bet}</span>
              {r.cashedOut ? (
                <span className="crash-result-outcome crash-result-won">
                  Won {r.winnings} @ {r.multiplier.toFixed(2)}x
                </span>
              ) : (
                <span className="crash-result-outcome crash-result-lost">
                  {r.bet > 0 ? 'Busted!' : 'Sat out'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
