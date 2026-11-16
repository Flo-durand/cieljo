// What screen readers say for a card of the table (aria-label, see Card.jsx).
// The value of a face-down card is never known, so it is only "Face-down card".
// place ({ row, column }, counted from 1 as seen on screen) locates a card in a grid.

export function cardLabel(card, place) {
  if (!card) return 'Empty';
  const side = card.face_up ? `Card ${card.value}` : 'Face-down card';
  return place ? `${side}, row ${place.row}, column ${place.column}` : side;
}

// The draw pile, with the number of cards left in it
export function drawPileLabel(count) {
  if (count === 0) return 'Draw pile, empty';
  return `Draw pile, ${count} card${count > 1 ? 's' : ''}`;
}

// The discard pile, with its top card
export function discardPileLabel(card) {
  return card ? `Discard pile, ${cardLabel(card)}` : 'Discard pile, empty';
}

// The cards of a player's grid, as a group: "Your grid" or "Alice's grid"
export function gridLabel(player) {
  return player.current_user ? 'Your grid' : `${player.username}'s grid`;
}
