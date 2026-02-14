import { useMemo } from 'react';

export default function CoinRain() {
  const coins = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => {
      const duration = 5 + Math.random() * 7;
      return {
        id: i,
        left: Math.random() * 100,
        delay: -(Math.random() * duration), // negative delay = start mid-animation
        duration,
        size: 16 + Math.random() * 18,
        opacity: 0.15 + Math.random() * 0.2,
        drift: (Math.random() - 0.5) * 50,
      };
    }),
  []);

  return (
    <div className="coin-rain" aria-hidden="true">
      {coins.map(c => (
        <div
          key={c.id}
          className="coin-drop"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            fontSize: `${c.size}px`,
            opacity: c.opacity,
            '--drift': `${c.drift}px`,
          }}
        >
          &#x1FA99;
        </div>
      ))}
    </div>
  );
}
