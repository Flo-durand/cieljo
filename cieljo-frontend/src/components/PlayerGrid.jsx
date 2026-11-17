import { useLayoutEffect, useRef } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';
import Card from './Card';
import { cardLabel, gridLabel } from '../game/cardLabel';
import { livePoints, pointsText } from '../game/liveScores';
import './PlayerGrid.scss';

const CLOSE_MS = 400; // the remaining columns slide together after a column is removed

// A player's grid of cards with their name and the points of the round so far (once the cards are dealt), in a
// seat as wide as a full grid of 4 columns, so a grid that loses a column never moves the players next to it.
// Each card is placed at its row and column. A removed column leaves no gap: the remaining columns close up,
// centered, and slide to their new place (FLIP: the cards are drawn at their new place, moved back to the old
// one with transform, then animated to the new one).
// Before the deal (empty grid), invisible slots keep the grid's size, so the table does not grow at the start:
// gridRows x gridColumns, from the rules of the API.
// extraCards are shown in the grid as well (a removed column whose cards are still flying to the discard pile).
// canClickCard(card) tells which cards the player can click, and onCardClick(card) handles the click.
// isCardHidden(card) hides the cards that an animation has not brought yet or has taken away.
// isDropTarget(card) highlights the card under a dragged card.
// For screen readers, the cards form a group named after the player, and each card says where it is in the grid
// (rows and columns counted from 1, as drawn: a removed column is not counted).
export default function PlayerGrid({
  player, gridRows, gridColumns, small = false, isPlaying = false, canClickCard, onCardClick, isCardHidden, isDropTarget,
  extraCards = [],
}) {
  const cards = [...player.grid, ...extraCards];
  // The columns still in the grid, in order: they are drawn next to each other, without gaps
  const columns = [...new Set(cards.map(card => card.column))].sort((a, b) => a - b);
  const columnsKey = columns.join(',');

  // --- FLIP animation when the columns change ---
  const rootRef = useRef(null);
  const animationsAllowed = useAnimationsAllowed();
  // Where each card was drawn at the previous render, relative to the seat (which never moves)
  const layoutRef = useRef(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const origin = root.getBoundingClientRect();
    const positions = new Map();
    root.querySelectorAll('.player-grid__cards [data-card-id]').forEach(element => {
      const rect = element.getBoundingClientRect();
      positions.set(element.dataset.cardId, { element, left: rect.left - origin.left, top: rect.top - origin.top });
    });

    const previous = layoutRef.current;
    if (previous && previous.columnsKey !== columnsKey && animationsAllowed) {
      positions.forEach(({ element, left, top }, cardId) => {
        const before = previous.positions.get(cardId);
        if (!before || (before.left === left && before.top === top)) return;
        element.animate(
          [{ transform: `translate(${before.left - left}px, ${before.top - top}px)` }, { transform: 'none' }],
          { duration: CLOSE_MS, easing: 'ease-in-out' },
        );
      });
    }
    layoutRef.current = { columnsKey, positions };
  });

  const classes = ['player-grid'];
  if (small) classes.push('player-grid--small');
  if (isPlaying) classes.push('player-grid--playing');

  const placeAt = (row, column) => ({ gridRow: row + 1, gridColumn: columns.indexOf(column) + 1 });

  return (
    <div className={classes.join(' ')} ref={rootRef}>
      <div className="player-grid__name">
        {player.host && '👑 '}
        {player.username}
        {player.current_user && ' (you)'}
      </div>
      {/* The points of the round so far: the face-up cards (the total of the game is in the info bubble) */}
      {player.grid.length > 0 && (
        <div className="player-grid__points">{pointsText(livePoints(player))}</div>
      )}
      <div className="player-grid__cards" role="group" aria-label={gridLabel(player)} style={{ gridTemplateColumns: `repeat(${columns.length || gridColumns}, auto)` }}>
        {cards.length > 0
          ? cards.map(card => (
            <Card
              key={card.id}
              card={card}
              style={placeAt(card.row, card.column)}
              label={cardLabel(card, { row: card.row + 1, column: columns.indexOf(card.column) + 1 })}
              className={[
                isCardHidden?.(card) && 'card--hidden',
                isDropTarget?.(card) && 'card--drop-target',
              ].filter(Boolean).join(' ')}
              onClick={canClickCard?.(card) ? () => onCardClick(card) : undefined}
            />
          ))
          : Array.from({ length: gridRows * gridColumns }, (_, index) => (
            <Card
              key={index}
              card={null}
              style={{ gridRow: Math.floor(index / gridColumns) + 1, gridColumn: (index % gridColumns) + 1 }}
              className="card--hidden"
            />
          ))}
      </div>
    </div>
  );
}
