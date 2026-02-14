import socket from '../socket.js';

export default function WaitingRoom({ roomCode, players, hostId, onLeave }) {
  const isHost = socket.id === hostId;

  function handleStart() {
    socket.emit('start-game', { roomCode });
  }

  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <h2>Waiting Room</h2>

        <div className="room-code-display">
          <span className="label">Room Code</span>
          <span className="code">{roomCode}</span>
        </div>

        <p className="subtitle">Share this code with friends to join.</p>

        <div className="player-list-waiting">
          <h3>Players ({players.length})</h3>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                <span className="avatar-badge">{p.avatar || '🦊'}</span>
                {p.name}
                {p.id === hostId && <span className="host-badge">HOST</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="waiting-actions">
          {isHost && (
            <button
              onClick={handleStart}
              className="btn btn-primary"
              disabled={players.length < 2}
            >
              {players.length < 2 ? 'Need 2+ players' : 'Start Game'}
            </button>
          )}
          <button onClick={onLeave} className="btn btn-ghost">
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
