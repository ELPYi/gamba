import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../utils/SoundManager.js';

const ANNOUNCE_DURATION = 2000; // ms — "IT'S A TIE!" announcement
const COUNTDOWN_DURATION = 1500; // ms — "3, 2, 1" drumroll
const SPIN_DURATION = 4000; // ms — longer spin for more drama
const REPEATS = 8;

export default function TieBreaker({ tieBreak, onComplete }) {
  const trackRef = useRef(null);
  const [stage, setStage] = useState('announce'); // announce → countdown → spinning → finished
  const [countdownNum, setCountdownNum] = useState(3);
  const tickRef = useRef(null);
  const timersRef = useRef([]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      clearInterval(tickRef.current);
    };
  }, []);

  // Stage 1: Announcement
  useEffect(() => {
    if (!tieBreak) return;
    soundManager.tieBreakAnnounce();

    const t = setTimeout(() => {
      setStage('countdown');
    }, ANNOUNCE_DURATION);
    timersRef.current.push(t);
    return () => clearTimeout(t);
  }, [tieBreak]);

  // Stage 2: Countdown 3, 2, 1
  useEffect(() => {
    if (stage !== 'countdown') return;

    setCountdownNum(3);
    soundManager.tieBreakTick();

    const t2 = setTimeout(() => {
      setCountdownNum(2);
      soundManager.tieBreakTick();
    }, 500);

    const t3 = setTimeout(() => {
      setCountdownNum(1);
      soundManager.tieBreakTick();
    }, 1000);

    const t4 = setTimeout(() => {
      setStage('spinning');
    }, COUNTDOWN_DURATION);

    timersRef.current.push(t2, t3, t4);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [stage]);

  // Stage 3: Spin
  useEffect(() => {
    if (stage !== 'spinning' || !tieBreak) return;

    const { tiedPlayers, winnerId } = tieBreak;
    const track = trackRef.current;
    if (!track) return;

    // Measure actual item width from the DOM
    const firstItem = track.querySelector('.tiebreak-item');
    if (!firstItem) return;
    const itemWidth = firstItem.offsetWidth;

    const winnerIdx = tiedPlayers.findIndex(p => p.playerId === winnerId);
    // Land near the end of the strip for max travel
    const targetRepeat = REPEATS - 2;
    const targetIndex = targetRepeat * tiedPlayers.length + winnerIdx;

    const containerWidth = track.parentElement.offsetWidth;
    const centerOffset = containerWidth / 2 - itemWidth / 2;
    const targetOffset = -(targetIndex * itemWidth) + centerOffset;

    // Sound: fast ticks that slow down dramatically
    let tickCount = 0;
    let tickInterval = 50;
    const scheduleTick = () => {
      tickRef.current = setTimeout(() => {
        tickCount++;
        soundManager.tieBreakSpin();

        // Gradually slow down the ticks — starts fast, gets dramatic
        if (tickCount < 15) {
          tickInterval = 50;
        } else if (tickCount < 25) {
          tickInterval = 80;
        } else if (tickCount < 35) {
          tickInterval = 130;
        } else if (tickCount < 42) {
          tickInterval = 220;
        } else if (tickCount < 48) {
          tickInterval = 350;
        } else {
          return; // stop ticking
        }
        scheduleTick();
      }, tickInterval);
    };
    scheduleTick();

    // CSS animation — fast start with long dramatic deceleration
    // cubic-bezier that starts very fast and slooowly decelerates at end
    track.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.05, 0.5, 0.15, 1)`;

    // Slight delay to ensure the transition is applied after render
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${targetOffset}px)`;
    });

    const finishTimer = setTimeout(() => {
      clearTimeout(tickRef.current);
      setStage('finished');
      soundManager.tieBreakWin();
      if (onComplete) onComplete();
    }, SPIN_DURATION + 400);

    timersRef.current.push(finishTimer);
    return () => { clearTimeout(finishTimer); clearTimeout(tickRef.current); };
  }, [stage, tieBreak, onComplete]);

  if (!tieBreak) return null;

  const { tiedPlayers, winnerId } = tieBreak;
  const items = [];
  for (let r = 0; r < REPEATS; r++) {
    for (const player of tiedPlayers) {
      items.push({ ...player, key: `${r}-${player.playerId}` });
    }
  }

  const winner = tiedPlayers.find(p => p.playerId === winnerId);

  return (
    <div className="tiebreak-container">
      {/* Stage: Announce */}
      {stage === 'announce' && (
        <div className="tiebreak-announce">
          <span className="tiebreak-announce-icon">&#x26A1;</span>
          <h3 className="tiebreak-announce-text">IT'S A TIE!</h3>
          <p className="tiebreak-announce-sub">
            {tiedPlayers.length} players bid the same amount
          </p>
          <div className="tiebreak-announce-players">
            {tiedPlayers.map(p => (
              <span key={p.playerId} className="tiebreak-announce-avatar">{p.avatar}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Countdown */}
      {stage === 'countdown' && (
        <div className="tiebreak-countdown">
          <p className="tiebreak-countdown-label">Spinning in...</p>
          <span className="tiebreak-countdown-num" key={countdownNum}>{countdownNum}</span>
        </div>
      )}

      {/* Stage: Spinning / Finished */}
      {(stage === 'spinning' || stage === 'finished') && (
        <>
          <h4 className="tiebreak-header">TIE BREAK!</h4>
          <div className="tiebreak-viewport">
            <div className="tiebreak-pointer"></div>
            <div className="tiebreak-track" ref={trackRef}>
              {items.map((item) => (
                <div
                  key={item.key}
                  className={`tiebreak-item ${stage === 'finished' && item.playerId === winnerId ? 'tiebreak-winner' : ''}`}
                >
                  <span className="tiebreak-avatar">{item.avatar}</span>
                  <span className="tiebreak-name">{item.playerName}</span>
                </div>
              ))}
            </div>
          </div>
          {stage === 'finished' && (
            <p className="tiebreak-result vfx-winner-pop">
              {winner?.avatar} {winner?.playerName} wins the tie!
            </p>
          )}
        </>
      )}
    </div>
  );
}
