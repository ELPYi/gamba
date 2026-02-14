export default function Tutorial({ onClose }) {
  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
        <button className="tutorial-close" onClick={onClose}>&times;</button>

        <h2>How to Play</h2>

        <section className="tutorial-section">
          <h3>Overview</h3>
          <p>
            Gamba is a 10-round multiplayer game. Pick a character, join a room,
            and compete to finish with the most coins. Rounds include auctions,
            crash betting, and a slot machine!
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Characters</h3>
          <p>
            Before joining, pick a character avatar from 12 options. Your avatar
            appears next to your name throughout the game so everyone knows who's who.
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Coins</h3>
          <ul>
            <li>You start with <strong>10 coins</strong></li>
            <li>You earn <strong>+1 coin</strong> at the start of every round</li>
            <li>The player with the most coins at the end wins</li>
            <li>Even at 0 coins, you can still play &mdash; rack up your free coins!</li>
          </ul>
        </section>

        <section className="tutorial-section">
          <h3>Auction Rounds (1-3, 5, 7, 9-10)</h3>
          <p>
            A card goes up for auction. All players secretly bid their coins at the same time.
            The highest bidder wins the card and its effect, but <strong>everyone pays their bid</strong> regardless
            of winning.
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Tie Breaks</h3>
          <p>
            If two or more players bid the same highest amount, a <strong>tie-break spinner</strong> determines
            the winner. The tied players' avatars spin on a wheel and a random winner is chosen &mdash; no
            more unfair advantages!
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Card Types</h3>
          <div className="tutorial-cards">
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#d4a017' }}>GOLD</span>
              <span>Adds coins directly to your total (values vary: 4-8)</span>
            </div>
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#8b5cf6' }}>MULTIPLIER</span>
              <span>Your next gold card is worth <strong>2x</strong></span>
            </div>
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#3b82f6' }}>SHIELD</span>
              <span>Blocks one steal attempt against you</span>
            </div>
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#ef4444' }}>STEAL</span>
              <span>Steal 3 coins from the richest opponent (blocked by shield)</span>
            </div>
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#6366f1' }}>MIRROR</span>
              <span>Repeat the effect of the last card you won</span>
            </div>
            <div className="tutorial-card-row">
              <span className="tutorial-badge" style={{ background: '#10b981' }}>WILDCARD</span>
              <span>Gain coins equal to the number of players</span>
            </div>
          </div>
        </section>

        <section className="tutorial-section">
          <h3>Crash Rounds (4 &amp; 8)</h3>
          <p>
            Rounds 4 and 8 are special <strong>Crash Rounds</strong>. Instead of an auction:
          </p>
          <ol>
            <li><strong>Bet phase</strong> &mdash; Choose how many coins to risk, up to 5 max (10 seconds)</li>
            <li><strong>Multiplier climbs</strong> &mdash; A graph shows the multiplier going up (1.0x, 1.5x, 2.0x...)</li>
            <li><strong>Cash out!</strong> &mdash; Hit the button to lock in <em>your bet &times; current multiplier</em></li>
            <li><strong>Crash!</strong> &mdash; The multiplier eventually crashes at a hidden threshold. If you didn't cash out, you lose your entire bet</li>
          </ol>
          <p className="tutorial-tip">
            Tip: You can bet up to <strong>5 coins max</strong> per crash round. The crash point is random
            between 1.2x and 3.0x. Playing it safe at 1.5x is consistent, but holding for 2.5x+ can pay off!
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Slot Machine Round (6)</h3>
          <p>
            Round 6 is a <strong>Slot Machine Round</strong>:
          </p>
          <ol>
            <li><strong>Join or skip</strong> &mdash; Pay 4 coins to enter, or sit it out (10 seconds)</li>
            <li><strong>Spin!</strong> &mdash; Three reels spin and land on random symbols</li>
            <li><strong>Best result wins</strong> &mdash; Triples beat pairs, pairs beat singles. The winner takes the whole pool!</li>
          </ol>
          <p>
            Symbols ranked: &#x1F48E; Diamond &gt; &#x2B50; Star &gt; &#x1F352; Cherry &gt; &#x1FA99; Coin. &#x1F480; Skulls are bad luck!
          </p>
        </section>

        <section className="tutorial-section">
          <h3>Strategy Tips</h3>
          <ul>
            <li>Bid 0 on cards you don't need &mdash; save coins for high-value rounds</li>
            <li>Watch opponent coin counts to decide how aggressively to bid</li>
            <li>Getting a Multiplier before a Gold card can be game-changing</li>
            <li>Shield protects your coins from Steal &mdash; timing matters</li>
            <li>In crash rounds, greed kills &mdash; but so does being too cautious</li>
            <li>Slot rounds are high risk &mdash; only join if you can afford to lose 4 coins</li>
          </ul>
        </section>

        <button className="btn btn-primary tutorial-got-it" onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
}
