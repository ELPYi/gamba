const AVATARS = [
  { emoji: '🦊', name: 'Sly Fox', cssClass: 'avatar-fox' },
  { emoji: '🐉', name: 'Dragon', cssClass: 'avatar-dragon' },
  { emoji: '🦉', name: 'Wise Owl', cssClass: 'avatar-owl' },
  { emoji: '🐺', name: 'Wolf', cssClass: 'avatar-wolf' },
  { emoji: '🐱', name: 'Cat', cssClass: 'avatar-cat' },
  { emoji: '🤖', name: 'Robot', cssClass: 'avatar-robot' },
  { emoji: '🧙', name: 'Wizard', cssClass: 'avatar-wizard' },
  { emoji: '💀', name: 'Skeleton', cssClass: 'avatar-skeleton' },
  { emoji: '🦈', name: 'Shark', cssClass: 'avatar-shark' },
  { emoji: '🐵', name: 'Monkey', cssClass: 'avatar-monkey' },
  { emoji: '👻', name: 'Ghost', cssClass: 'avatar-ghost' },
  { emoji: '🦅', name: 'Eagle', cssClass: 'avatar-eagle' },
];

export { AVATARS };

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatar-picker">
      <label className="avatar-picker-label">Choose your character</label>
      <div className="avatar-grid">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.emoji}
            className={`avatar-card ${avatar.cssClass} ${value === avatar.emoji ? 'avatar-selected' : ''}`}
            onClick={() => onChange(avatar.emoji)}
            type="button"
          >
            <div className="avatar-card-face">
              <div className="avatar-card-bg"></div>
              <span className="avatar-card-emoji">{avatar.emoji}</span>
            </div>
            <span className="avatar-card-name">{avatar.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
