// The message shown in the info bubble of the game table (see InfoButton): what to do, or whose turn it is.

export const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// The message for the current state of the table. notice ("player_one removed a column of 5s!") comes first.
// initialRevealCount is the number of cards each player reveals at the start (from the rules of the API).
export function tableMessage(state) {
  const message = turnMessage(state);
  return state.notice ? `${state.notice} ${message}` : message;
}

// handSelected is true when the player has clicked the card in hand, to swap it by clicks (see GameTable.jsx).
function turnMessage({ me, players, initialReveal, initialRevealCount, currentPlayerId, dealing, hand, handSelected }) {
  if (dealing) return 'Dealing the cards...';

  if (initialReveal) {
    const left = initialRevealCount - faceUpCount(me);
    if (left > 0) return `Reveal ${left} card${left > 1 ? 's' : ''} of your grid.`;
    return 'Waiting for the other players to reveal their cards...';
  }

  const playing = players.find(player => player.id === currentPlayerId);
  if (!playing) return '';
  if (!playing.current_user) return `It's ${playing.username}'s turn.`;

  if (!hand) return 'Your turn: draw a card from the draw pile, or take the discard pile card.';
  if (handSelected) return 'Click the card of your grid to replace, or click your card again to cancel.';
  const swap = 'Drag the card onto your grid to swap it (or click it, then the card to replace)';
  if (hand.drawn_from === 'draw_pile') return `${swap}, or click a hidden card to throw it and reveal that card.`;
  return `${swap}.`;
}
