import { useEffect, useRef, useState } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';
import flyCard from '../utils/flyCard';

// Animates a card thrown onto the discard pile (the replaced card of a swap, the drawn card of a discard):
// throwToDiscard(card, fromElement, play) plays the move, then makes the card fly from fromElement to the
// discard pile (discardRef). leavingCardId is the card hidden on the discard pile until its flying copy lands,
// flippedDiscardId a face-down card that flips over once there.
export default function useThrowToDiscard(discardRef) {
  // The thrown card, hidden on the discard pile until its flying copy lands there
  const [leavingCardId, setLeavingCardId] = useState(null);
  // A thrown card that was face down: it flips over once on the discard pile
  const [flippedDiscardId, setFlippedDiscardId] = useState(null);
  const animationsAllowed = useAnimationsAllowed();
  // Read when a flight ends, after the render that started it
  const animationsAllowedRef = useRef(animationsAllowed);
  useEffect(() => {
    animationsAllowedRef.current = animationsAllowed;
  }, [animationsAllowed]);

  // Plays a move that throws `card` onto the discard pile, then makes it fly there from `fromElement`.
  // The flight starts once the move is played, so a refused move never shows. A face-down card travels
  // face down and flips over on the pile.
  const throwToDiscard = async (card, fromElement, play) => {
    const animate = Boolean(card && fromElement) && animationsAllowed;
    const from = fromElement?.getBoundingClientRect();

    if (animate) setLeavingCardId(card.id);
    const played = await play();
    if (!played || !animate || !discardRef.current) {
      setLeavingCardId(null);
      return played;
    }

    const { element: flyingCard, finished } = flyCard({
      from,
      to: discardRef.current.getBoundingClientRect(),
      card: card.face_up ? card : { face_up: false },
      duration: card.face_up ? 450 : 650,
      flipAtTheEnd: !card.face_up,
      easing: 'ease-in-out',
    });
    finished.then(async () => {
      // A flight ended because the tab was left: the card shows face up at once, without a flip on return
      if (!card.face_up && animationsAllowedRef.current) setFlippedDiscardId(card.id);
      setLeavingCardId(null);
      // Let React show the real card before removing the flying one, so nothing blinks
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      flyingCard.remove();
    });
    return played;
  };

  return { throwToDiscard, leavingCardId, flippedDiscardId };
}
