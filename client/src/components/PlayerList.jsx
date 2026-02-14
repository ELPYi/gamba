export default function PlayerList({ players, currentPlayerId }) {
  if (!players || players.length === 0) {
    return <div className="player-list"><p>Waiting for players...</p></div>;
  }

  return (
    <div className="player-list">
      <h3>Players</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id} className={p.id === currentPlayerId ? 'player-self' : ''}>
            <span className="player-name">
              <span className="avatar-badge">{p.avatar || '🦊'}</span>
              {p.name}
              {p.id === currentPlayerId && ' (you)'}
            </span>
            <span className="player-stats">
              <span className="player-coins">{p.coins} coins</span>
              <span className="player-cards">{p.cardsWon} cards</span>
              {p.shield && <span className="player-shield" title="Shield active">S</span>}
              {p.multiplier && <span className="player-multiplier" title="Multiplier active">x2</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
