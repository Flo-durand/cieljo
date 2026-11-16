// The message shown in the info bubble of the game table (see InfoButton): what to do, or whose turn it is.

// Must match Game::INITIAL_REVEAL_COUNT in the backend
export const INITIAL_REVEAL_COUNT = 2;

export const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// The message for the current state of the table. notice ("player_one removed a column of 5s!") comes first.
export function tableMessage(state) {
  const message = turnMessage(state);
  return state.notice ? `${state.notice} ${message}` : message;
}

function turnMessage({ me, players, initialReveal, currentPlayerId, dealing, hand }) {
  if (dealing) return 'Dealing the cards...';

  if (initialReveal) {
    const left = INITIAL_REVEAL_COUNT - faceUpCount(me);
    if (left > 0) return `Reveal ${left} card${left > 1 ? 's' : ''} of your grid.`;
    return 'Waiting for the other players to reveal their cards...';
  }

  const playing = players.find(player => player.id === currentPlayerId);
  if (!playing) return '';
  if (!playing.current_user) return `It's ${playing.username}'s turn.`;

  if (!hand) return 'Your turn: draw a card from the draw pile, or take the discard pile card.';
  if (hand.drawn_from === 'draw_pile') {
    return 'Drag the card onto your grid to swap it, or click a hidden card to throw it and reveal that card.';
  }
  return 'Drag the card onto your grid to swap it.';
}
