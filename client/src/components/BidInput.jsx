import { useState } from 'react';

export default function BidInput({ maxCoins, onSubmit }) {
  const [amount, setAmount] = useState(0);

  function handleSubmit() {
    onSubmit(amount);
  }

  return (
    <div className="bid-input">
      <label className="bid-label">Your Bid</label>
      <div className="bid-controls">
        <input
          type="range"
          min={0}
          max={maxCoins}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="bid-slider"
        />
        <span className="bid-amount">{amount}</span>
      </div>
      <div className="bid-presets">
        <button className="btn btn-small" onClick={() => setAmount(0)}>0</button>
        <button className="btn btn-small" onClick={() => setAmount(Math.floor(maxCoins / 4))}>25%</button>
        <button className="btn btn-small" onClick={() => setAmount(Math.floor(maxCoins / 2))}>50%</button>
        <button className="btn btn-small" onClick={() => setAmount(maxCoins)}>All</button>
      </div>
      <button onClick={handleSubmit} className="btn btn-primary bid-submit">
        Submit Bid
      </button>
    </div>
  );
}
