import { useState, useEffect } from 'react';

export default function Timer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const pct = (remaining / seconds) * 100;
  const urgent = remaining <= 10;

  return (
    <div className={`timer ${urgent ? 'timer-urgent' : ''}`}>
      <div className="timer-bar" style={{ width: `${pct}%` }} />
      <span className="timer-text">{remaining}s</span>
    </div>
  );
}
