import './Card.scss';

// A single Skyjo card: plain black when face down, its value in a bordered box when face up
export default function Card({ card, small = false }) {
  const classes = ['card'];
  if (small) classes.push('card--small');
  if (!card) classes.push('card--empty');
  else classes.push(card.face_up ? 'card--face-up' : 'card--face-down');

  return (
    <div className={classes.join(' ')}>
      {card?.face_up && card.value}
    </div>
  );
}
