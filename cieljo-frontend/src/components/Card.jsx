import './Card.scss';

// A single Skyjo card: plain black when face down, its value in a bordered box when face up.
// When onClick is given, the card is rendered as a button the player can click.
export default function Card({ card, small = false, onClick }) {
  const classes = ['card'];
  if (small) classes.push('card--small');
  if (!card) classes.push('card--empty');
  else classes.push(card.face_up ? 'card--face-up' : 'card--face-down');

  const content = card?.face_up && card.value;

  if (onClick) {
    return (
      <button type="button" className={`${classes.join(' ')} card--clickable`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={classes.join(' ')}>{content}</div>;
}
