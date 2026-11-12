import './Card.scss';

// A single Skyjo card: plain black when face down, its value in a bordered box when face up.
// When onClick is given, the card is rendered as a button the player can click.
// When onPointerDown is given, the card can be dragged (see hooks/useCardDrag.js).
// data-card-id lets the animations and the drag and drop find each card on the table.
export default function Card({ card, small = false, onClick, onPointerDown, className = '' }) {
  const classes = ['card'];
  if (small) classes.push('card--small');
  if (!card) classes.push('card--empty');
  else classes.push(card.face_up ? 'card--face-up' : 'card--face-down');
  if (onClick) classes.push('card--clickable');
  if (onPointerDown) classes.push('card--draggable');
  if (className) classes.push(className);

  const content = card?.face_up && card.value;

  if (onClick) {
    return (
      <button type="button" className={classes.join(' ')} data-card-id={card?.id} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes.join(' ')} data-card-id={card?.id} onPointerDown={onPointerDown}>
      {content}
    </div>
  );
}
