import { useState } from 'react';
import './Card.scss';

// A single Skyjo card: plain black when face down, its value in a bordered box when face up.
// When onClick is given, the card is rendered as a button the player can click.
// When onPointerDown is given, the card can be dragged (see hooks/useCardDrag.js).
// data-card-id lets the animations and the drag and drop find each card on the table.
// A card that turns face up flips over (only transform is animated, so the layout does not move).
export default function Card({ card, small = false, onClick, onPointerDown, className = '' }) {
  const faceUp = Boolean(card?.face_up);

  // Remember the side shown at the previous render, to flip the card when it turns face up.
  // Adjusting state during render is React's pattern for reacting to a prop change.
  const [wasFaceUp, setWasFaceUp] = useState(faceUp);
  const [flipping, setFlipping] = useState(false);
  if (faceUp !== wasFaceUp) {
    setWasFaceUp(faceUp);
    setFlipping(faceUp);
  }

  const classes = ['card'];
  if (small) classes.push('card--small');
  if (!card) classes.push('card--empty');
  else classes.push(faceUp ? 'card--face-up' : 'card--face-down');
  if (onClick) classes.push('card--clickable');
  if (onPointerDown) classes.push('card--draggable');
  if (flipping) classes.push('card--flip-in');
  if (className) classes.push(className);

  const content = faceUp && card.value;
  const props = {
    className: classes.join(' '),
    'data-card-id': card?.id,
    // Only this card's own flip ends here, not an animation of a child
    onAnimationEnd: event => {
      if (event.target === event.currentTarget) setFlipping(false);
    },
  };

  if (onClick) {
    return <button type="button" {...props} onClick={onClick}>{content}</button>;
  }

  return <div {...props} onPointerDown={onPointerDown}>{content}</div>;
}
