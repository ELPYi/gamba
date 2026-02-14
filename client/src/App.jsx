import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket.js';
import { soundManager } from './utils/SoundManager.js';
import Lobby from './screens/Lobby.jsx';
import WaitingRoom from './screens/WaitingRoom.jsx';
import GameBoard from './screens/GameBoard.jsx';
import Tutorial from './components/Tutorial.jsx';
import CoinRain from './components/CoinRain.jsx';

export default function App() {
  const [screen, setScreen] = useState('lobby');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState('');
  const [soundInited, setSoundInited] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gamba-dark');
    return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const initialRoundRef = useRef(null);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('gamba-dark', darkMode);
  }, [darkMode]);

  function handleSplashTap() {
    soundManager.init();
    soundManager.startMusic();
    setSoundInited(true);
    setShowSplash(false);
  }

  const initSound = useCallback(() => {
    if (!soundInited) {
      soundManager.init();
      soundManager.startMusic();
      setSoundInited(true);
    }
  }, [soundInited]);

  useEffect(() => {
    socket.on('room-created', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setHostId(socket.id);
      setScreen('waiting');
    });

    socket.on('room-joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setScreen('waiting');
    });

    socket.on('player-joined', (data) => {
      setPlayers(data.players);
    });

    socket.on('player-left', (data) => {
      setPlayers(data.players);
      if (data.hostId) setHostId(data.hostId);
    });

    socket.on('round-start', (data) => {
      initialRoundRef.current = { type: 'auction', data };
      setScreen('game');
    });

    socket.on('crash-round-start', (data) => {
      initialRoundRef.current = { type: 'crash', data };
      setScreen('game');
    });

    socket.on('slot-round-start', (data) => {
      initialRoundRef.current = { type: 'slot', data };
      setScreen('game');
    });

    socket.on('game-over', () => {});

    socket.on('error', (data) => {
      alert(data.message);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('round-start');
      socket.off('crash-round-start');
      socket.off('slot-round-start');
      socket.off('game-over');
      socket.off('error');
    };
  }, []);

  function handleBackToLobby() {
    if (roomCode) {
      socket.emit('leave-room', { roomCode });
    }
    initialRoundRef.current = null;
    setScreen('lobby');
    setRoomCode('');
    setPlayers([]);
    setHostId('');
  }

  function handleToggleSfx() {
    initSound();
    const muted = soundManager.toggleMute();
    setSfxMuted(muted);
  }

  function handleToggleMusic() {
    initSound();
    const muted = soundManager.toggleMusic();
    setMusicMuted(muted);
  }

  if (showSplash) {
    return (
      <div className="splash-overlay" onClick={handleSplashTap}>
        <div className="splash-content">
          <span className="splash-icon">&#x1F3B0;</span>
          <h1 className="splash-title">Gamba!</h1>
          <p className="splash-sub">Tap anywhere to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <CoinRain />

      <header className="app-header">
        <h1>&#x1F3B0; Gamba! &#x1F3B0;</h1>
        <div className="header-controls">
          <div className="sound-controls">
            <button
              className={`btn btn-small sound-btn ${sfxMuted ? 'sound-off' : ''}`}
              onClick={handleToggleSfx}
              title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
            >
              {sfxMuted ? 'SFX Off' : 'SFX On'}
            </button>
            <button
              className={`btn btn-small sound-btn ${musicMuted ? 'sound-off' : ''}`}
              onClick={handleToggleMusic}
              title={musicMuted ? 'Unmute Music' : 'Mute Music'}
            >
              {musicMuted ? 'Music Off' : 'Music On'}
            </button>
          </div>
          <div className="util-controls">
            <button
              className="btn btn-small"
              onClick={() => setShowTutorial(true)}
              title="How to play"
            >
              ? Help
            </button>
            <button
              className="btn btn-small"
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <main>
        {screen === 'lobby' && (
          <Lobby
            playerName={playerName}
            setPlayerName={setPlayerName}
            onShowTutorial={() => setShowTutorial(true)}
          />
        )}
        {screen === 'waiting' && (
          <WaitingRoom
            roomCode={roomCode}
            players={players}
            hostId={hostId}
            onLeave={handleBackToLobby}
          />
        )}
        {screen === 'game' && (
          <GameBoard
            roomCode={roomCode}
            players={players}
            onGameEnd={handleBackToLobby}
            initialRound={initialRoundRef.current}
          />
        )}
      </main>

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
