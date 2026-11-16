import { lastRoundText, roundPointsOf, winnersText } from './roundScores';

// The message shown in the info bubble of the game table (see InfoButton): what to do, or whose turn it is.

export const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// The message for the current state of the table. notice ("player_one removed a column of 5s!") comes first,
// then the reminder of the last round. initialRevealCount is the number of cards each player reveals at the
// start (from the rules of the API). Once the round is scored, the message gives the winners: of the round
// between two rounds (roundOver), of the game at its end (the lowest total).
export function tableMessage(state) {
  let parts = [state.notice, lastRoundText(state), turnMessage(state)];
  if (state.roundOver) {
    const winners = winnersText(state.players, { pointsOf: roundPointsOf, what: ' the round' });
    parts = [state.notice, `Round ${state.roundNumber} is over: ${winners} Get ready for the next one.`];
  } else if (state.roundScored) {
    parts = [state.notice, `The game is over: ${winnersText(state.players)}`];
  }
  return parts.filter(Boolean).join(' ');
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
