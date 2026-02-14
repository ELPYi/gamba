import { useState, useCallback } from 'react';
import socket from '../socket.js';
import TieBreaker from './TieBreaker.jsx';

export default function RoundResult({ revealData, resolveData }) {
  const [tieBreakDone, setTieBreakDone] = useState(false);

  const handleTieBreakComplete = useCallback(() => {
    setTieBreakDone(true);
  }, []);

  if (!revealData) return null;

  const isWinner = revealData.winner?.playerId === socket.id;
  const hasTieBreak = !!revealData.tieBreak;
  const showWinnerBadge = !hasTieBreak || tieBreakDone;

  return (
    <div className={`round-result ${isWinner ? 'round-result-winner' : ''}`}>
      <h3>Bids Revealed</h3>
      <ul className="bid-list">
        {revealData.bids.map((bid, i) => {
          const isTied = hasTieBreak && revealData.tieBreak.tiedPlayers.some(
            tp => tp.playerId === bid.playerId
          );
          return (
            <li
              key={bid.playerId}
              className={`${bid.playerId === revealData.winner?.playerId && showWinnerBadge ? 'bid-winner' : ''} ${isTied ? 'bid-tied' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="bid-avatar">{bid.avatar || '🦊'}</span>
              <span className="bid-player">{bid.playerName}</span>
              <span className="bid-amount-display">{bid.amount} coins</span>
              {bid.playerId === revealData.winner?.playerId && showWinnerBadge && (
                <span className="winner-badge vfx-winner-pop">WINNER</span>
              )}
            </li>
          );
        })}
      </ul>

      {hasTieBreak && !tieBreakDone && (
        <TieBreaker tieBreak={revealData.tieBreak} onComplete={handleTieBreakComplete} />
      )}

      {resolveData && resolveData.effects.length > 0 && (
        <div className="effects-list">
          <h4>Effects</h4>
          {resolveData.effects.map((effect, i) => (
            <p
              key={i}
              className={`effect effect-${effect.type} vfx-slide-up`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {effect.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
