import { useState } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';
import './Card.scss';

// A single Skyjo card: plain black when face down, its value in a bordered box when face up.
// When onClick is given, the card is rendered as a button the player can click (or press with the keyboard).
// When onPointerDown is given, the card can be dragged (see hooks/useCardDrag.js), and clicked as well.
// label names the card for screen readers (see game/cardLabel.js); pressed makes the button a toggle
// (aria-pressed), e.g. the card in hand selected for a swap.
// data-card-id lets the animations and the drag and drop find each card on the table.
// A card that turns face up flips over (only transform is animated, so the layout does not move), when the
// animations are allowed (see AnimationsContext).
// style places the card in its grid (row and column).
export default function Card({ card, onClick, onPointerDown, label, pressed, className = '', style }) {
  const faceUp = Boolean(card?.face_up);

  // Remember the side shown at the previous render, to flip the card when it turns face up.
  // Adjusting state during render is React's pattern for reacting to a prop change.
  const [wasFaceUp, setWasFaceUp] = useState(faceUp);
  const [flipping, setFlipping] = useState(false);
  const animationsAllowed = useAnimationsAllowed();
  if (faceUp !== wasFaceUp) {
    setWasFaceUp(faceUp);
    setFlipping(faceUp && animationsAllowed);
  }
  // Leaving the tab ends a flip at once
  if (flipping && !animationsAllowed) setFlipping(false);

  const classes = ['card'];
  if (!card) classes.push('card--empty');
  else classes.push(faceUp ? 'card--face-up' : 'card--face-down');
  if (onClick) classes.push('card--clickable');
  if (onPointerDown) classes.push('card--draggable');
  if (flipping) classes.push('card--flip-in');
  if (className) classes.push(className);

  const content = faceUp && card.value;
  const props = {
    className: classes.join(' '),
    style,
    'data-card-id': card?.id,
    // Only this card's own flip ends here, not an animation of a child
    onAnimationEnd: event => {
      if (event.target === event.currentTarget) setFlipping(false);
    },
  };

  if (onClick) {
    return (
      <button type="button" {...props} aria-label={label} aria-pressed={pressed} onClick={onClick} onPointerDown={onPointerDown}>
        {content}
      </button>
    );
  }

  // A card that cannot be clicked is still described to screen readers, as an image with its label
  return (
    <div {...props} role={label ? 'img' : undefined} aria-label={label} onPointerDown={onPointerDown}>
      {content}
    </div>
  );
}
