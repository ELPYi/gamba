import { useEffect, useRef } from 'react';

function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 1.5 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 8,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;
        if (p.y > canvas.height + 20) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

export default function Scoreboard({ scores, onBack }) {
  if (!scores) return null;

  return (
    <div className="scoreboard vfx-fade-in">
      <Confetti />
      <h2 className="vfx-slide-up">Game Over</h2>
      <div className="winner-announcement vfx-winner-pop">
        <span className="trophy">&#x1F3C6;</span>
        <span className="winner-name">{scores.winner.avatar || '🦊'} {scores.winner.playerName}</span>
        <span className="winner-coins">{scores.winner.coins} coins</span>
      </div>

      <table className="score-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Coins</th>
            <th>Cards Won</th>
          </tr>
        </thead>
        <tbody>
          {scores.scores.map((s, i) => (
            <tr
              key={s.playerId}
              className={`${i === 0 ? 'rank-first' : ''} vfx-slide-up`}
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              <td>
                {i === 0 && <span className="rank-medal rank-gold">1st</span>}
                {i === 1 && <span className="rank-medal rank-silver">2nd</span>}
                {i === 2 && <span className="rank-medal rank-bronze">3rd</span>}
                {i > 2 && (i + 1)}
              </td>
              <td>{s.avatar || '🦊'} {s.playerName}</td>
              <td>{s.coins}</td>
              <td>{s.cardsWon}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onBack} className="btn btn-primary">
        Back to Lobby
      </button>
    </div>
  );
}
