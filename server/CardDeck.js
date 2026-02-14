const CARD_TEMPLATES = [
  { type: 'gold', name: 'Gold Chest', description: 'Adds coins to your score.', value: 6 },
  { type: 'gold', name: 'Gold Pouch', description: 'Adds coins to your score.', value: 4 },
  { type: 'gold', name: 'Gold Nugget', description: 'Adds coins to your score.', value: 5 },
  { type: 'gold', name: 'Treasure Trove', description: 'A hefty pile of gold.', value: 8 },
  { type: 'multiplier', name: 'Double Down', description: 'Your next won card is worth double.', value: 0 },
  { type: 'shield', name: 'Iron Shield', description: 'Blocks one steal attempt against you.', value: 0 },
  { type: 'steal', name: 'Pickpocket', description: 'Steal 3 coins from the richest opponent. Blocked by shield.', value: 3 },
  { type: 'mirror', name: 'Mirror Image', description: 'Repeat the effect of the last card you won.', value: 0 },
  { type: 'wildcard', name: 'Crowd Favorite', description: 'Worth coins equal to the number of players.', value: 0 },
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck() {
  // 8-card deck for 8 auction rounds (rounds 4 and 8 are crash rounds)
  const golds = shuffle(CARD_TEMPLATES.filter(c => c.type === 'gold'));
  const specials = shuffle(CARD_TEMPLATES.filter(c => c.type !== 'gold'));

  // 3 golds + 4 specials + 1 random = 8 cards
  const randomExtra = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
  const deck = [...golds.slice(0, 3), ...specials.slice(0, 4), randomExtra];

  return shuffle(deck).map((card, i) => ({ ...card, id: i }));
}
