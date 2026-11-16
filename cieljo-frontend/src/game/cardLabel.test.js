import { describe, expect, it } from 'vitest';
import { cardLabel, discardPileLabel, drawPileLabel, gridLabel } from './cardLabel';

describe('cardLabel', () => {
  it('names a face-up card by its value', () => {
    expect(cardLabel({ face_up: true, value: -2 })).toBe('Card -2');
  });

  it('never gives the value of a face-down card', () => {
    expect(cardLabel({ face_up: false, value: 7 })).toBe('Face-down card');
  });

  it('locates a card in a grid', () => {
    expect(cardLabel({ face_up: true, value: 0 }, { row: 2, column: 3 })).toBe('Card 0, row 2, column 3');
    expect(cardLabel({ face_up: false }, { row: 1, column: 4 })).toBe('Face-down card, row 1, column 4');
  });

  it('names a missing card', () => {
    expect(cardLabel(null)).toBe('Empty');
  });
});

describe('pile labels', () => {
  it('counts the cards of the draw pile', () => {
    expect(drawPileLabel(87)).toBe('Draw pile, 87 cards');
    expect(drawPileLabel(1)).toBe('Draw pile, 1 card');
    expect(drawPileLabel(0)).toBe('Draw pile, empty');
  });

  it('gives the top card of the discard pile', () => {
    expect(discardPileLabel({ face_up: true, value: 5 })).toBe('Discard pile, Card 5');
    expect(discardPileLabel(null)).toBe('Discard pile, empty');
  });
});

describe('gridLabel', () => {
  it("names the player's own grid and the others'", () => {
    expect(gridLabel({ current_user: true, username: 'me' })).toBe('Your grid');
    expect(gridLabel({ current_user: false, username: 'Alice' })).toBe("Alice's grid");
  });
});
