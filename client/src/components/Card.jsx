const TYPE_COLORS = {
  gold: '#d4a017',
  multiplier: '#8b5cf6',
  shield: '#3b82f6',
  steal: '#ef4444',
  mirror: '#6366f1',
  wildcard: '#10b981',
};

const TYPE_ICONS = {
  gold: '\u2B50',
  multiplier: '\u00D72',
  shield: '\uD83D\uDEE1\uFE0F',
  steal: '\uD83D\uDC7E',
  mirror: '\uD83E\uDE9E',
  wildcard: '\uD83C\uDFB2',
};

export default function Card({ card, glowing }) {
  const color = TYPE_COLORS[card.type] || '#888';

  return (
    <div
      className={`card ${glowing ? 'card-glow' : ''}`}
      style={{
        borderColor: color,
        '--card-color': color,
      }}
    >
      <div className="card-type" style={{ backgroundColor: color }}>
        <span className="card-icon">{TYPE_ICONS[card.type]}</span>
        <span>{card.type.toUpperCase()}</span>
      </div>
      <div className="card-body">
        <h3 className="card-name">{card.name}</h3>
        <p className="card-desc">{card.description}</p>
        {card.value > 0 && (
          <span className="card-value">
            <span className="card-value-icon">&#x1FA99;</span> Value: {card.value}
          </span>
        )}
      </div>
    </div>
  );
}
