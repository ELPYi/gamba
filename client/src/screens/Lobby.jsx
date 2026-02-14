import { useState } from 'react';
import socket from '../socket.js';
import AvatarPicker from '../components/AvatarPicker.jsx';

export default function Lobby({ playerName, setPlayerName, onShowTutorial }) {
  const [joinCode, setJoinCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');

  function handleCreate() {
    if (!playerName.trim()) return alert('Enter a nickname first.');
    socket.emit('create-room', { playerName: playerName.trim(), avatar: selectedAvatar });
  }

  function handleJoin() {
    if (!playerName.trim()) return alert('Enter a nickname first.');
    if (!joinCode.trim()) return alert('Enter a room code.');
    socket.emit('join-room', { roomCode: joinCode.trim(), playerName: playerName.trim(), avatar: selectedAvatar });
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h2>Welcome</h2>
        <p className="subtitle">Enter your nickname to create or join a game.</p>

        <input
          type="text"
          placeholder="Your nickname"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={16}
          className="input-primary"
        />

        <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} />

        <button onClick={handleCreate} className="btn btn-primary">
          Create Room
        </button>

        <div className="divider">
          <span>or join existing</span>
        </div>

        <input
          type="text"
          placeholder="Room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={4}
          className="input-code input-code-full"
        />
        <button onClick={handleJoin} className="btn btn-secondary" style={{ width: '100%' }}>
          Join
        </button>

        <button onClick={onShowTutorial} className="btn btn-ghost lobby-help-btn">
          ? How to Play
        </button>
      </div>
    </div>
  );
}
