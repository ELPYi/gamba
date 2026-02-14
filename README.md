# Gamba! 🎰

A real-time multiplayer party game where players compete across auctions, crash betting, and slot machines to finish with the most coins.

Built with React, Socket.IO, and Node.js — no database needed, everything runs in-memory.

## How It Works

- **10 rounds** per game with 3 different round types
- **2–8 players** per room, all playing from their own device
- Everyone starts with **10 coins** and earns +1 each round
- The player with the most coins at the end wins

### Round Types

| Rounds | Type | Description |
|--------|------|-------------|
| 1–3, 5, 7, 9–10 | **Auction** | A card goes up for blind auction. Everyone secretly bids — highest bidder wins the card's effect, but *everyone pays their bid* |
| 4 & 8 | **Crash** | Bet coins and watch a multiplier climb. Cash out before it crashes, or lose everything. Max bet: 5 coins, crash range: 1.2x–3.0x |
| 6 | **Slot Machine** | Pay 4 coins to spin. Best spin (triples > pairs > singles) wins the entire pool |

### Card Types

- **Gold** (4–8 coins) — Direct coin gain
- **Multiplier** — Doubles your next gold card
- **Shield** — Blocks one steal attempt
- **Steal** — Take 3 coins from the richest player
- **Mirror** — Repeat your last card's effect
- **Wildcard** — Gain coins equal to the number of players

### Tie Breaks

When two or more players bid the same highest amount, a dramatic tie-break spinner randomly picks the winner — complete with countdown, spinning animation, and sound effects.

## Features

- **Character avatars** — Pick from 12 emoji characters (Fox, Dragon, Owl, Wolf, Cat, Robot, Wizard, Skeleton, Shark, Monkey, Ghost, Eagle)
- **Synthesized sound effects & music** — All audio is generated via Web Audio API, no audio files needed. Plays "The Entertainer" by Scott Joplin as background music
- **Dark/light mode** — Respects system preference, toggleable
- **Coin rain background** — Animated falling coins
- **Mobile friendly** — Works on phones and tablets
- **Round announcements** — Dramatic overlay between rounds
- **How to Play** — Built-in tutorial explaining all mechanics

## Tech Stack

- **Client:** React 19, Vite, Socket.IO Client
- **Server:** Node.js, Express, Socket.IO
- **Audio:** Web Audio API (synthesized — zero audio files)
- **Styling:** Vanilla CSS with CSS custom properties for theming

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
# Clone the repo
git clone https://github.com/ELPYi/gamba.git
cd gamba

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

You need two terminals:

**Terminal 1 — Server:**
```bash
cd server
node index.js
# Server runs on http://localhost:3001
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser. Other players on the same network can join using your local IP (shown in Vite's terminal output).

### Building for Production

```bash
cd client
npm run build
```

The built files will be in `client/dist/`. Serve them with any static file server and point the Socket.IO connection to your server.

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── AvatarPicker  # Character selection grid
│   │   │   ├── BidInput      # Auction bid slider
│   │   │   ├── Card          # Auction card display
│   │   │   ├── CoinRain      # Background animation
│   │   │   ├── CrashGame     # Crash round (bet, graph, cashout)
│   │   │   ├── PlayerList    # Sidebar player standings
│   │   │   ├── RoundResult   # Bid reveal + effects
│   │   │   ├── Scoreboard    # Final scores + winner
│   │   │   ├── SlotMachine   # Slot round (reels, pool)
│   │   │   ├── TieBreaker    # Tie-break spinner animation
│   │   │   ├── Timer         # Countdown timer
│   │   │   └── Tutorial      # How to Play modal
│   │   ├── screens/          # Full-page views
│   │   │   ├── Lobby         # Name + avatar + create/join
│   │   │   ├── WaitingRoom   # Pre-game lobby
│   │   │   └── GameBoard     # Main game screen
│   │   ├── utils/
│   │   │   └── SoundManager  # Web Audio API synth engine
│   │   ├── App.jsx           # Root component + routing
│   │   ├── socket.js         # Socket.IO client instance
│   │   └── main.jsx          # Entry point
│   └── vite.config.js
│
└── server/
    ├── index.js              # Express + Socket.IO server
    ├── Game.js               # Game state machine
    ├── CardDeck.js           # Card definitions + deck builder
    └── RoomManager.js        # Room lifecycle management
```

## License

All rights reserved. This code is provided for viewing purposes only. You may not copy, modify, distribute, or use this code without explicit written permission from the author.
