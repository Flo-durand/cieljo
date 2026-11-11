import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Timings of the deal animation (about 10 seconds in total)
const INTRO_MS = 800; // the room code fades out and the draw pile fades in (see RoomCode.scss, TableCenter.scss)
const DEAL_DURATION_MS = 7800; // from the first card leaving until the last grid card lands
const FLIGHT_MS = 400; // flight of one grid card
const DISCARD_DELAY_MS = 200; // pause before the discard card leaves the pile
const DISCARD_FLIGHT_MS = 700; // flight of the discard card, ending edge-on
const FLIP_MS = 400; // must match the card-flip-in animation in Card.scss

// Cards are dealt one at a time to each player in turn order, like a real deal,
// then the next card goes onto the discard pile.
export function buildDeal(players, discardTop) {
  const cardIds = [];
  const gridSize = Math.max(0, ...players.map(player => player.grid.length));

  for (let index = 0; index < gridSize; index += 1) {
    players.forEach(player => {
      if (player.grid[index]) cardIds.push(player.grid[index].id);
    });
  }

  return { cardIds, discardCardId: discardTop?.id };
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Plays the deal: each card flies from the draw pile to its place, found by its data-card-id.
// Only transform is animated (no layout work). A landed flying card stays in place until React has
// shown the real card, then it is removed before the next paint, so the card never blinks.
// Returns how many cards have landed so far: the grid cards in deal order, then the discard card.
// A component plays at most one deal: the count is not reset.
export default function useDealAnimation(deal, pileRef, onEnd) {
  const [landedCount, setLandedCount] = useState(0);
  // Flying cards that have landed, waiting for the real card to be rendered
  const landedFlyingCardsRef = useRef([]);

  // Runs after React has updated the DOM with the newly landed cards, before the browser paints
  useLayoutEffect(() => {
    landedFlyingCardsRef.current.forEach(flyingCard => flyingCard.remove());
    landedFlyingCardsRef.current = [];
  }, [landedCount]);

  useEffect(() => {
    if (!deal) return undefined;

    const timeouts = [];
    const flyingCards = [];
    const land = () => setLandedCount(count => count + 1);

    const fly = (cardId, duration, flipAtTheEnd = false) => {
      const pile = pileRef.current;
      const target = document.querySelector(`[data-card-id="${cardId}"]`);
      if (!pile || !target) {
        land();
        return;
      }

      const from = pile.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const moved = `translate(${to.left - from.left}px, ${to.top - from.top}px) ` +
        `scale(${to.width / from.width}, ${to.height / from.height})`;

      const flyingCard = document.createElement('div');
      flyingCard.className = 'card card--face-down card--flying';
      Object.assign(flyingCard.style, {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
      });
      document.body.appendChild(flyingCard);
      flyingCards.push(flyingCard);

      const keyframes = flipAtTheEnd
        ? [{ transform: 'none' }, { transform: moved, offset: 0.7 }, { transform: `${moved} rotateY(90deg)` }]
        : [{ transform: 'none' }, { transform: moved }];

      // fill: 'forwards' keeps the flying card on its target until it is removed
      flyingCard.animate(keyframes, { duration, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
        landedFlyingCardsRef.current.push(flyingCard);
        land();
      };
    };

    const { cardIds, discardCardId } = deal;
    const step = cardIds.length > 1 ? (DEAL_DURATION_MS - FLIGHT_MS) / (cardIds.length - 1) : 0;
    cardIds.forEach((cardId, index) => {
      timeouts.push(setTimeout(() => fly(cardId, FLIGHT_MS), INTRO_MS + index * step));
    });

    const discardStart = INTRO_MS + DEAL_DURATION_MS + DISCARD_DELAY_MS;
    timeouts.push(setTimeout(() => fly(discardCardId, DISCARD_FLIGHT_MS, true), discardStart));
    timeouts.push(setTimeout(onEnd, discardStart + DISCARD_FLIGHT_MS + FLIP_MS));

    return () => {
      timeouts.forEach(clearTimeout);
      flyingCards.forEach(flyingCard => flyingCard.remove());
    };
  }, [deal, pileRef, onEnd]);

  return landedCount;
}
